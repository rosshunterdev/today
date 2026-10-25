-- Sync tables for Today: each person's rows mirror the IndexedDB tables on their devices.
-- Devices never delete (deletes are soft), never set user_id, and never set server_updated_at.
-- Limits are generous: a row the server refuses would block every later push from that device.

create table public.tasks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  day date not null,
  text text not null default '' check (char_length(text) <= 10000),
  done boolean not null default false,
  done_at timestamptz,
  position text not null check (char_length(position) between 1 and 500),
  indent smallint not null default 0 check (indent in (0, 1)),
  mark text check (mark in ('star', 'bang', 'question')),
  notes text not null default '' check (char_length(notes) <= 100000),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table public.goals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  week date not null,
  text text not null default '' check (char_length(text) <= 10000),
  notes text not null default '' check (char_length(notes) <= 100000),
  done boolean not null default false,
  done_at timestamptz,
  position text not null check (char_length(position) between 1 and 500),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table public.days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  binned boolean not null default false,
  updated_at timestamptz not null,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, day)
);

create table public.weeks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week date not null,
  leftovers_dismissed boolean not null default false,
  updated_at timestamptz not null,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, week)
);

-- The server's own clock orders changes for pulls, so a device's wrong clock can't hide a row from the others.
-- An update that isn't newer than the stored row is dropped: a late, older write never undoes a newer one.
create function public.stamp_server_time() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at <= old.updated_at then
    return null;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

-- The same trigger, index, policies and grants on every table.
do $$
declare
  t text;
begin
  foreach t in array array['tasks', 'goals', 'days', 'weeks'] loop
    execute format('create trigger stamp_server_time before insert or update on public.%I
      for each row execute function public.stamp_server_time()', t);
    execute format('create index %I on public.%I (user_id, server_updated_at)', t || '_pull', t);

    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "read own rows" on public.%I for select to authenticated
      using ((select auth.uid()) = user_id)', t);
    execute format('create policy "add own rows" on public.%I for insert to authenticated
      with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "change own rows" on public.%I for update to authenticated
      using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);

    -- New tables aren't exposed automatically on this project: grant exactly what the app needs. No delete.
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end;
$$;

-- Deletes the signed-in account; its rows go with it (on delete cascade).
create function public.delete_account() returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
revoke execute on function public.stamp_server_time() from public, anon, authenticated;
