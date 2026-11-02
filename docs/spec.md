# Today: design spec

Written 2026-10-02.

## 1. Purpose

A software version of the user's morning pen-and-paper task list, for a single user.

**The problem.** Previous task apps (built and tried) "felt worse than paper" and "seemed not worth opening". Paper wins on four things the user named:

1. Zero friction: the pen is right there.
2. Crossing off feels good.
3. Always in sight.
4. Writing the list is how the day gets planned.

Plus: paper is a pleasant canvas with room for personal expression.

**Success.** The user opens this each morning instead of reaching for paper, and keeps doing so after the novelty wears off.

**Core rule.** The app holds today, and nothing else. No backlog, projects, tags, due dates, priorities, reminders, stats or streaks. Headings can group a page's lines the way they would on paper, but they are written words, not projects: nothing about them is kept between days.

## 2. Platforms

Phone and laptop. Installable web app (PWA), one codebase, synced between devices. Not built: native app with home-screen widget (parked), local-only app (ruled out).

## 3. Experience

Layout: a dot-grid journal. Dot-grid paper, a handwritten-style font, the day's date as a large numeral at the top. Wide screens show the journal open: today on the left page, This week and old pages on the right. The open journal fills the window and grows with it (up to one and a half times its normal size on very wide screens). Phones show one page at a time, and a folded corner turns to the other. Parked alternatives: free page and desk scraps.

| Action | Desktop | Phone |
|---|---|---|
| Open | Lands on today's page, cursor on first empty line. No splash, no menu. | Same |
| Write a task | Type, Enter for next line | Type, Return for next line |
| Edit a task | Click the text | Tap the text |
| Make a sub-step | Tab (Shift+Tab to undo) | ⇥ / ⇤ buttons in a bar above the keyboard while editing |
| Cross off / undo | Drag the mouse across the line | Swipe a finger across the line |
| Reorder | Drag the dotted grip that appears on hover at the line's left edge | Long-press, then drag |
| Margin mark | Click the margin to cycle: none, star (highlights the line), !, ? | Tap the margin |
| Make a heading | Start the line with `# ` or end it with `:` | Same |
| Delete | Backspace on an empty line, or drag the line into the bin at the bottom right of the week page | Backspace on an empty line, or long-press and drag the line into the bin that appears above the corners |
| Night pages | Click the moon in today's header | Tap the moon |

- Each line starts with a bullet dot. Crossing off turns the dot into a cross and draws a thin pen stroke across the text. Crossed-off tasks stay on the page, greyed.
- Sub-steps are one level deep only (indent 0 or 1).
- ! and ? sit in the margin; a star highlights the line instead. Freehand drawing is not in v1.
- Crossing off is a horizontal stroke across the line, like running a pen through it. The same stroke across a crossed-off task un-crosses it. Tap/click only ever places the cursor for editing.

**Tomorrow.** A "Tomorrow" heading sits folded on the bottom edge of today's page, for writing the next day's list the evening before. Tapping it opens a writing line under it. It stays open while it has lines and grows upward as they are written, leaving blank paper between today's lines and Tomorrow. Lines can be dragged into it from today, the week and old pages (a drop on the folded heading adds to the end), and back out to today or the week. At 4am its lines are simply today's lines.

**Headings.** A line becomes a heading when it starts with `#` and a space (`# Garden`) or ends with a colon (`Garden:`), with words besides the symbol. A heading is a label, not a task: it has no bullet, can't be crossed off, takes no margin mark and is drawn without indent. The `#` or `:` is hidden once you leave the line and shows again while you edit it; deleting the symbol turns the heading back into an ordinary line. Headings move, delete and edit like any line, and work everywhere lines do (today, Tomorrow, This week). A heading doesn't own the lines under it: dragging it moves only the heading. Headings never count as unfinished, so they never keep an old page open; an old page shows a heading only when an unfinished line sits under it, before the next heading.

**Old pages.** Each morning today's page starts blank. Every earlier day that still has unfinished lines is listed under This week, newest first. Lines on an old page can be crossed off, sent to the end of today with the > at the end of the line, or dragged onto today or into This week (the line moves), but nothing can be added or edited. When every line is crossed off the page greys out and offers "bin page"; a page can also be binned early, which takes a second tap ("bin 3 open lines?") because binning can't be undone. The point is to keep a backlog in view without crowding today's list.

**Notes.** Any task or goal can hold a free-text note, like writing on the back of the card. A small pencil at the end of a line (shown while you're on the line, always when a note exists) unfolds the note in place under the line; Escape or the pencil folds it. Enter adds a new line inside the note. Notes move with their line everywhere and are read-only on old pages. A line with blank text but a note still counts as a real line.

**Week goals.** This week holds a few bigger aims for the week, at the top of the right-hand page (the second page on phones). Type a goal in, or drag a task from today onto it (the task moves); on a phone, drop the task on the folded corner. Drag a goal back onto today's page to move it back; on a phone, drop it on the "back to today" corner. Goals cross off with the same stroke as tasks and can be reordered. A week runs Monday to Sunday on the same 4am boundary. When a new week starts, the week offers last week's unfinished goals with a Bring all / pick / dismiss note.

**Bin.** Any line (a task, a goal or an old line) can be dragged into the bin to throw it away. A slip then shows the line's words with an undo for five seconds, held while the pointer or focus is on it. Undo, or Ctrl+Z while the slip shows, puts the line back where it was. Only the last bin can be undone.

**Night pages.** A moon in today's header turns the journal dark: black pages, white ink, pink crossing off. The choice is remembered on the device.

**Not in v1:** browsing past days beyond old pages, settings (the night switch is the only one), reminders/notifications, stats/streaks, themes beyond night pages, freehand drawing, sharing.

## 4. Day rules

- Logical day = date of (device local time minus 4 hours). 02:30 Friday belongs to Thursday.
- The page shown is always the current logical day. If the app is left open across 04:00, it switches to the new day on next focus or interaction.
- Tomorrow's lines are tasks dated the next logical day. At 04:00 they are the new day's lines, with nothing copied.
- A day ends at 04:00 on the next calendar day. An old page shows that day's lines that were unfinished when it ended: still open, or crossed off since (`done_at` after the day end). Blank and deleted lines never count.
- An old page appears for every earlier day with at least one such line, unless its day record is `binned`.
- Moving a line off an old page soft-deletes it there and creates it on today (same `text`, `indent`, `mark`) or as a goal, always open.
- Binning sets `binned = true` on the day record and soft-deletes the page's remaining lines.

## 5. Data model

Both the local store (Dexie) and Supabase hold the same four tables. Headings add no field: whether a line is a heading is worked out from its `text` each time it is drawn.

**tasks**

| field | type | notes |
|---|---|---|
| `id` | uuid | generated on device |
| `user_id` | uuid | Supabase auth user; set on sync |
| `day` | text `YYYY-MM-DD` | logical day |
| `text` | text | |
| `done` | boolean | |
| `done_at` | timestamp, nullable | |
| `position` | text | fractional index; sorts lexically; inserting between two lines never renumbers others |
| `indent` | 0 or 1 | |
| `mark` | null, `star`, `bang`, `question` | |
| `notes` | text | free text behind the line, may be empty |
| `created_at` | timestamp | |
| `updated_at` | timestamp | set on every local change; drives sync and conflicts |
| `deleted` | boolean | soft delete so deletions sync |

**days**

| field | type | notes |
|---|---|---|
| `user_id` | uuid | |
| `day` | text `YYYY-MM-DD` | primary key with `user_id` |
| `binned` | boolean | the old page was thrown away |
| `updated_at` | timestamp | |

**goals**

| field | type | notes |
|---|---|---|
| `id` | uuid | generated on device |
| `user_id` | uuid | Supabase auth user; set on sync |
| `week` | text `YYYY-MM-DD` | the Monday of the week, on the 4am day boundary |
| `text` | text | |
| `notes` | text | free text behind the line, may be empty |
| `done` | boolean | |
| `done_at` | timestamp, nullable | |
| `position` | text | fractional index |
| `created_at` | timestamp | |
| `updated_at` | timestamp | set on every local change |
| `deleted` | boolean | soft delete; moving a line between today and the week soft-deletes it on one side and creates it on the other |

**weeks**

| field | type | notes |
|---|---|---|
| `user_id` | uuid | |
| `week` | text `YYYY-MM-DD` | primary key with `user_id` |
| `leftovers_dismissed` | boolean | |
| `updated_at` | timestamp | |

## 6. Architecture

```
 Phone / laptop (installed PWA)              Cloud
┌───────────────────────────────┐        ┌──────────────────┐
│ UI (React)                    │        │ Supabase         │
│   ↕                           │        │  • Postgres      │
│ store (Dexie / IndexedDB)     │ ⇄sync⇄ │  • Auth          │
│   ↕                           │        │  • Row security  │
│ sync                          │        └──────────────────┘
└───────────────────────────────┘
 Static files hosted on Vercel
```

Stack: React + TypeScript + Vite, vite-plugin-pwa, Dexie, Supabase JS client, Vercel.

**Units**

| unit | job | depends on |
|---|---|---|
| `day` | pure functions: logical day from a Date, old page lines, week maths | nothing |
| `order` | pure functions: fractional position between two positions | nothing |
| `store` | local reads/writes of tasks and days; sets `updated_at`; exposes live queries to the UI | Dexie |
| `sync` | push/pull between store and Supabase; conflict resolution | store, Supabase client |
| `auth` | username and password sign-in, session state | Supabase client |
| UI | notebook page, task line, old pages, sync card | store, day, order, auth |

The UI never calls Supabase directly. It only reads and writes `store`.

**Auth.** Optional. The app works fully with no account; data stays on the device. A cloud button beside the moon opens a card to sign in, or create an account, with a username and password. Supabase needs an email, so a username is stored as `<name>@today.invalid`, a reserved domain that never receives mail; no email is ever sent and "Confirm email" is off. Usernames are 3 to 20 of a-z, 0-9 and _, ignoring case; passwords are at least 6 characters. There's no self-service reset: the owner sets a new password in the Supabase dashboard. The first sign-in on a device that already has lines asks whether to add them to the account or remove them. Signing out syncs first, warns about anything unsynced, then empties the device. Delete account removes the account and every row. Supabase row-level security restricts every row to `user_id = auth.uid()`.

**Sync.** Triggers: app open, window focus, 2 seconds after the last local edit, and on reconnect. Push: local rows whose `updatedAt` differs from the `updatedAt` the server last confirmed. Pull: rows whose server-set `server_updated_at` is newer than the last pull (minus a minute, to catch late commits). Conflict: per row, the newer `updated_at` wins (last-write-wins); the server drops a write older than what it holds. After a pull, lines two devices gave the same position are spread out, the same way on every device. Fonts are cached by the service worker so the page renders offline.

## 7. Error handling

Rule: nothing ever stops the user writing.

| situation | behaviour |
|---|---|
| Offline | Everything works locally. A small dot shows unsynced changes. No popups. |
| Sync request fails | Retry with backoff. Data stays local. |
| Session expired, refresh fails | Keep working locally; show a quiet "sign in to sync" note. |
| Browser storage eviction (iOS) | Call `navigator.storage.persist()` on start. Cloud copy is the backup; on a fresh store, pull restores data after sign-in. |
| Device time zone changes | Logical day follows device clock. Odd rollover hour while travelling is accepted. |
| First open while offline | Works as usual; sign-in waits for a connection. |

## 8. Testing

1. **Unit (Vitest):** `day` (04:00 boundary both sides, old page lines either side of the day end), `order` (positions between, before first, after last, many inserts), `sync` merge (newer wins, deletes propagate), heading detection (`# ` and trailing `:`, a symbol alone is not a heading, `#1` is not a heading), old page lines with headings.
2. **Component (Vitest + Testing Library):** Enter creates a line, Tab/Shift+Tab indents, Backspace on empty line deletes, horizontal drag/swipe toggles crossed-off, click places cursor, old pages cross off and bin.
3. **End-to-end (Playwright):** write tasks, cross one off, reload, state persists. Also used for screenshot verification. To be added once there is UI (user to confirm).
4. **Manual device pass:** install on phone and laptop; airplane mode, edit, reconnect; both devices match.

## 9. Open questions

- Parked: alternative layouts (free page, desk scraps), native home-screen widget.
