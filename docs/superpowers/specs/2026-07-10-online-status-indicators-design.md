# Online Status Indicators — Design

Issue: #56

## Problem

`Avatar` already renders a status dot (`online` / `away` / `busy` / `offline`) but every
call site hardcodes `status="online"`. There is no real presence tracking and no way for
a user to signal Do Not Disturb.

## Scope

- Cohort member grid (`HomeScreen` in `Dashboard.tsx`)
- Chat header mini-avatars and chat message avatars (`ChatScreen` in `Dashboard.tsx`)
- Own avatar in side nav footer and chat input bar (reflects your own toggled status,
  and doubles as the DND toggle affordance)

Out of scope: status dots on avatars outside a cohort context (e.g. `Signup.tsx` has no
real user yet).

## Data model

Add a column to `users`:

```sql
alter table public.users
  add column status text not null default 'available'
    check (status in ('available', 'dnd'));
```

No RLS changes needed — the existing "users can update own row" policy (self-only) and
"users can read own row" policy (self + cohort mates, via `get_my_cohort_ids()`) already
cover reading and writing this column.

`status` is the manual override only. Online/offline is never persisted — it's derived
live from presence.

## Presence (online/offline)

Use Supabase Realtime Presence, joined once per cohort at the `Dashboard` top level
(not re-joined per sub-screen, so status stays live regardless of which page — home,
chat, dates, profile — the user is on):

```ts
const channel = supabase.channel(`presence:cohort-${cohort.id}`, {
  config: { presence: { key: user.id } },
});

channel
  .on('presence', { event: 'sync' }, () => {
    setOnlineIds(new Set(Object.keys(channel.presenceState())));
  })
  .subscribe(status => {
    if (status === 'SUBSCRIBED') channel.track({ user_id: user.id });
  });
```

`onlineIds: Set<string>` lives in `Dashboard` state and is passed down as a prop to
`HomeScreen` and `ChatScreen` alongside the existing `members`/`user` props. Cleanup
via `supabase.removeChannel(channel)` on unmount, matching the existing chat-channel
pattern already in `ChatScreen`.

## Status resolution

For any member being rendered:

```ts
function resolveStatus(member: Member, onlineIds: Set<string>): 'online' | 'busy' | 'offline' {
  if (member.user.status === 'dnd') return 'busy';
  return onlineIds.has(member.user.id) ? 'online' : 'offline';
}
```

Feeds directly into `Avatar`'s existing `status` prop — no changes to `Avatar.tsx`'s
prop shape.

## Colors

No new tokens. Keep the on-brand palette already defined in `Avatar.tsx`'s
`STATUS_COLORS`:

- online → `var(--lavender-500)`
- offline → `var(--neutral-300)`
- dnd (busy) → `var(--purple-500)`

(Issue text says literal green/grey/purple; the app has no green anywhere — even
`--color-success` maps to lavender — so this stays consistent with the existing
monochrome palette instead of introducing a one-off green.)

## DND toggle

Two entry points, both writing to `users.status` via
`supabase.from('users').update({ status }).eq('id', user.id)`:

1. **Profile screen** (`ProfileScreen.tsx`) — new section using the existing `Switch`
   component pattern already used for notification/sound prefs. Labeled "Do Not
   Disturb". Reached via the existing side-nav → profile navigation.
2. **Status dot popover** — clicking the status dot on your own avatar (side nav
   footer avatar, chat input bar avatar) opens a small popover with
   Available / Do Not Disturb options. Click handler calls `stopPropagation()` so it
   doesn't also trigger the side nav's `onUserClick` (navigate to profile).

Both call the same update; local `userData.status` state updates optimistically so all
avatars re-render immediately.

## Error handling

- Presence channel failing to subscribe: fall back to `offline` for everyone (fail
  closed, no false "online" claims). No user-facing error — this mirrors how the
  existing chat channel silently no-ops on failure.
- DND toggle update failing: revert optimistic state, surface via the existing `Toast`
  pattern already used for chat send failures.

## Testing

- Unit: `resolveStatus()` covers all three states + precedence (dnd overrides online).
- Manual/E2E: two browser sessions in the same cohort — verify one going offline flips
  the other's view of them within a few seconds; verify DND toggle from both entry
  points overrides presence and persists across reload.
