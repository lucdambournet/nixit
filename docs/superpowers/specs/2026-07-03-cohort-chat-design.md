# Cohort Chat Design

Date: 2026-07-03

## Overview

Wire real cohort group chat into NixIt. The `ChatScreen` UI already exists in `src/pages/Dashboard.tsx` but renders hardcoded mock messages. This design replaces the mock with a persisted, RLS-scoped `chat_messages` table and live updates via Supabase Realtime, so members of a cohort can actually chat with one another.

## Scope

### Included

- Members of a cohort can send and receive plain-text messages within their active cohort's chatroom.
- Messages persist and are visible to any member of that cohort (RLS-scoped, no cross-cohort leakage).
- New messages appear live for all cohort members currently viewing chat, via Supabase Realtime — no polling, no manual refresh.
- Last 50 messages load on opening chat, oldest → newest, scrolled to the latest.

### Deferred (not in this pass)

- Help-alert system messages (the "Need help" button posting to chat).
- Tap-out request/approval system messages.
- Message editing, deletion, reactions, read receipts.
- Pagination/infinite scroll beyond the initial 50.
- Push notifications for new chat messages (separate MVP feature, tracked elsewhere in the sprint backlog).

The `type` column on `chat_messages` supports `'normal'` and `'help-alert'` so the deferred features can land later without a schema migration, but this pass only ever writes `'normal'`.

## Data Model

### `chat_messages` table

```sql
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0),
  type text not null default 'normal' check (type in ('normal', 'help-alert')),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_cohort_created
  on chat_messages(cohort_id, created_at);
```

### RLS

Reuses the existing `get_my_cohort_ids()` SECURITY DEFINER helper (already backing `cohort_members` and `users` policies) to avoid the recursive-RLS issue previously hit on `users`.

```sql
alter table chat_messages enable row level security;

create policy "cohort members can read their cohort's messages"
  on chat_messages for select
  to authenticated
  using (cohort_id in (select get_my_cohort_ids()));

create policy "cohort members can send messages as themselves"
  on chat_messages for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and cohort_id in (select get_my_cohort_ids())
  );
```

No update/delete policies — messages are immutable and permanent for this pass.

### Realtime

Add `chat_messages` to the `supabase_realtime` publication so `postgres_changes` INSERT events broadcast to subscribed clients:

```sql
alter publication supabase_realtime add table chat_messages;
```

## Frontend Changes

All changes are within `src/pages/Dashboard.tsx`'s `ChatScreen` component (and a small extracted helper module for testability).

### Message mapping helper (new, testable in isolation)

A pure function module (e.g. `src/lib/chatMessages.ts`) that:
- maps a raw `chat_messages` row + author profile into the display shape the UI renders (author name/avatar, formatted time, `isMe` flag given the current user id),
- decides whether to show the author name above a message bubble (`showName`): true when the previous message in the list has a different `author_id`.

This is pulled out of the component so it can be unit tested without a Supabase client.

### Data loading

On mount (and whenever `cohort.id` changes):
1. Fetch the last 50 messages for the cohort, joined with author `username`/`profile_image_url`, ordered by `created_at` ascending.
2. Render them, scrolled to bottom (existing `listRef` scroll effect already does this on `msgs` change — kept as-is).

### Sending

`send()`:
1. Guard on non-empty trimmed text (existing behavior).
2. Insert a row: `{ cohort_id: cohort.id, author_id: <current user id>, text, type: 'normal' }`.
3. Optimistically clear the input immediately.
4. On insert error: show an inline error via the existing `Toast` component and restore the input text so the user doesn't lose their message.
5. Do not manually append the sent message to local state — let the Realtime subscription's echo of the INSERT drive the UI, so there's a single source of truth for what's rendered (avoids duplicate-message bugs from racing local-append + realtime-echo).

### Realtime subscription

On mount (and whenever `cohort.id` changes):
1. Open a channel subscribed to `postgres_changes` (`INSERT`, schema `public`, table `chat_messages`, filter `cohort_id=eq.<cohort.id>`).
2. On event, map the new row through the message-mapping helper and append to local state. The row only contains `author_id`, not the joined username/avatar — resolve the author's display info from the already-loaded `members` list (already fetched by `Dashboard`) rather than issuing a fresh query per incoming message.
3. Unsubscribe the channel on unmount / when `cohort.id` changes.

### Error handling

| Scenario | Behavior |
|---|---|
| Initial history fetch fails | Show existing error-state pattern (matches `Dashboard`'s top-level error handling) with a retry option. |
| Send fails (RLS reject, network) | Toast error, restore input text, no optimistic message added. |
| Realtime channel drops | Supabase JS client auto-reconnects the socket; no custom retry logic needed for this pass. |

## Testing

### Unit (Vitest)

`tests/unit/chat-messages.test.ts` covering the pure mapping helper:
- maps a row to the correct display shape (name, time formatting, `isMe`).
- `showName` is `true` for the first message and whenever the author changes from the previous message; `false` for consecutive same-author messages.

### E2E (Playwright)

`tests/e2e/cohort-chat.spec.ts` using the two existing seeded test users (already enrolled in the same cohort per prior test setup):
- two browser contexts log in as the two test users,
- user A sends a message via the chat input,
- assert user B's chat view shows the message text via `toContainText`/`toBeVisible` with Playwright's built-in auto-retry (no manual waits/sleeps),
- assert the message attributed to the correct sender name on both sides.

## Success Criteria

- A cohort member can send a text message and see it appear in their own chat view.
- Another member of the same cohort sees that message appear live, without refreshing.
- A user not in the cohort cannot read or write that cohort's messages (enforced by RLS, not just UI).
- Reopening the chat screen reloads the last 50 messages in order.
