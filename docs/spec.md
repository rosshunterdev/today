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

**Core rule.** The app holds today, and nothing else. No backlog, projects, tags, due dates, priorities, reminders, stats or streaks.

## 2. Platforms

Phone and laptop. Installable web app (PWA), one codebase, synced between devices. Not built: native app with home-screen widget (parked), local-only app (ruled out).

## 3. Experience

Layout: notebook page. Lined paper, margin line, handwritten-style font, date at top. Parked alternatives: free page and desk scraps.

| Action | Desktop | Phone |
|---|---|---|
| Open | Lands on today's page, cursor on first empty line. No splash, no menu. | Same |
| Write a task | Type, Enter for next line | Type, Return for next line |
| Edit a task | Click the text | Tap the text |
| Make a sub-step | Tab (Shift+Tab to undo) | ⇥ / ⇤ buttons in a bar above the keyboard while editing |
| Cross off / undo | Drag the mouse across the line | Swipe a finger across the line |
| Reorder | Drag the ⠿ handle that appears on hover at the line's left edge | Long-press, then drag |
| Margin mark | Click margin to cycle: none, ★, !, ? | Tap margin |
| Delete | Backspace on an empty line | Backspace on an empty line |

- Crossing off animates a red hand-drawn pen stroke across the text. Crossed-off tasks stay on the page, greyed.
- Sub-steps are one level deep only (indent 0 or 1).
- Marks are hand-drawn style glyphs. Freehand drawing is not in v1.
- Crossing off is a horizontal stroke across the line, like running a pen through it. The same stroke across a crossed-off task un-crosses it. Tap/click only ever places the cursor for editing.

**Leftovers.** When the page for a new day opens and an earlier day has unfinished tasks, a small note shows at the top: "Thursday: 3 left". Tapping it opens a short list with a checkbox per task; confirming copies the chosen tasks onto today. A dismiss control hides the note. Shown until used or dismissed, once per day.

**Not in v1:** browsing past days, settings, reminders/notifications, stats/streaks, themes, freehand drawing, sharing.

## 4. Day rules

- Logical day = date of (device local time minus 4 hours). 02:30 Friday belongs to Thursday.
- The page shown is always the current logical day. If the app is left open across 04:00, it switches to the new day on next focus or interaction.
- Leftovers source = the most recent earlier day that has at least one task with `done = false` and `deleted = false`. Skipped days are fine: Friday's leftovers show on Monday.
- Bringing a task over creates a new task on today with the same `text`, `indent` and `mark`, `done = false`. The original is not modified.
- A day's leftovers offer is finished when the user confirms or dismisses it; recorded as `leftovers_dismissed = true` on today's day record.

## 5. Data model

Both the local store (Dexie) and Supabase hold the same two tables.

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
| `created_at` | timestamp | |
| `updated_at` | timestamp | set on every local change; drives sync and conflicts |
| `deleted` | boolean | soft delete so deletions sync |

**days**

| field | type | notes |
|---|---|---|
| `user_id` | uuid | |
| `day` | text `YYYY-MM-DD` | primary key with `user_id` |
| `leftovers_dismissed` | boolean | |
| `updated_at` | timestamp | |

## 6. Architecture

```
 Phone / laptop (installed PWA)              Cloud
┌───────────────────────────────┐        ┌──────────────────┐
│ UI (React)                    │        │ Supabase         │
│   ↕                           │        │  • Postgres      │
│ store (Dexie / IndexedDB)     │ ⇄sync⇄ │  • Auth (email)  │
│   ↕                           │        │  • Row security  │
│ sync                          │        └──────────────────┘
└───────────────────────────────┘
 Static files hosted on Vercel
```

Stack: React + TypeScript + Vite, vite-plugin-pwa, Dexie, Supabase JS client, Vercel.

**Units**

| unit | job | depends on |
|---|---|---|
| `day` | pure functions: logical day from a Date, leftovers source selection, copy-over task building | nothing |
| `order` | pure functions: fractional position between two positions | nothing |
| `store` | local reads/writes of tasks and days; sets `updated_at`; exposes live queries to the UI | Dexie |
| `sync` | push/pull between store and Supabase; conflict resolution | store, Supabase client |
| `auth` | email code sign-in, session state | Supabase client |
| UI | notebook page, task line, leftovers note, sign-in screen | store, day, order, auth |

The UI never calls Supabase directly. It only reads and writes `store`.

**Auth.** Email + emailed 6-digit code (not magic link: on iOS a magic link opens Safari, not the installed PWA). Requires being online once, on first use. Supabase row-level security restricts every row to `user_id = auth.uid()`.

**Sync.** Triggers: app open, window focus, 2 seconds after the last local edit, and on reconnect. Push: local rows with `updated_at` newer than the last successful push. Pull: remote rows with `updated_at` newer than the last successful pull. Conflict: per row, the newer `updated_at` wins (last-write-wins). Fonts are cached by the service worker so the page renders offline.

## 7. Error handling

Rule: nothing ever stops the user writing.

| situation | behaviour |
|---|---|
| Offline | Everything works locally. A small dot shows unsynced changes. No popups. |
| Sync request fails | Retry with backoff. Data stays local. |
| Session expired, refresh fails | Keep working locally; show a quiet "sign in to sync" note. |
| Browser storage eviction (iOS) | Call `navigator.storage.persist()` on start. Cloud copy is the backup; on a fresh store, pull restores data after sign-in. |
| Device time zone changes | Logical day follows device clock. Odd rollover hour while travelling is accepted. |
| First open while offline | Show sign-in screen explaining it needs a connection once. |

## 8. Testing

1. **Unit (Vitest):** `day` (04:00 boundary both sides, leftovers source across skipped days, copy-over fields), `order` (positions between, before first, after last, many inserts), `sync` merge (newer wins, deletes propagate).
2. **Component (Vitest + Testing Library):** Enter creates a line, Tab/Shift+Tab indents, Backspace on empty line deletes, horizontal drag/swipe toggles crossed-off, click places cursor, leftovers confirm/dismiss.
3. **End-to-end (Playwright):** write tasks, cross one off, reload, state persists. Also used for screenshot verification. To be added once there is UI (user to confirm).
4. **Manual device pass:** install on phone and laptop; airplane mode, edit, reconnect; both devices match.

## 9. Open questions

- Parked: alternative layouts (free page, desk scraps), native home-screen widget.
