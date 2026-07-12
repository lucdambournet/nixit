# Online Status Indicators — Design

Issue: #56

## Problem

`Avatar` already renders a status dot (`online` / `away` / `busy` / `offline`) but every
call site hardcodes `status="online"`. There is no real presence tracking, no idle
detection, and no way for a user to signal Do Not Disturb.

## States

Four states, three of them fully automatic:

| State   | Color              | Meaning                                          | User-controlled? |
|---------|--------------------|--------------------------------------------------|-------------------|
| Online  | green              | Connected + actively using the app               | No — automatic    |
| Away    | orange             | Connected but idle or tab not focused             | No — automatic    |
| Offline | grey               | Not connected                                     | No — automatic    |
| DND     | red                | Manual override; beats all of the above           | Yes — manual only |

Users cannot set themselves "online"/"away"/"offline" directly — those are derived
purely from presence + activity. The only thing a user controls is toggling DND
on/off.

## Scope

- Cohort member grid (`HomeScreen` in `Dashboard.tsx`)
- Chat header mini-avatars and chat message avatars (`ChatScreen` in `Dashboard.tsx`)
- Own avatar in side nav footer and chat input bar (reflects your own resolved status;
  the DND toggle affordance lives here too)

Out of scope: status dots on avatars outside a cohort context (e.g. `Signup.tsx` has no
real user yet).

## Data model

Add a column to `users`:

```sql
alter table public.users
  add column dnd boolean not null default false;
```

Single boolean — there is no other manual state to represent. No RLS changes needed —
the existing "users can update own row" (self-only) and "users can read own row" (self +
cohort mates, via `get_my_cohort_ids()`) policies already cover reading and writing this
column.

Online / away / offline are never persisted — derived live from presence on every
connected client.

## Activity detection (online vs. away)

A client is "active" when the tab is focused **and** there's been input recently.
Either condition failing flips it to "away" immediately; the reverse brings it back to
"online" immediately.

```ts
function useIsActive(idleMs = 5 * 60_000) {
  const [active, setActive] = useState(!document.hidden);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const markActive = () => {
      setActive(!document.hidden);
      clearTimeout(timer);
      timer = setTimeout(() => setActive(false), idleMs);
    };

    document.addEventListener('visibilitychange', markActive);
    ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt =>
      document.addEventListener(evt, markActive, { passive: true })
    );
    markActive();

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', markActive);
      ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt =>
        document.removeEventListener(evt, markActive)
      );
    };
  }, [idleMs]);

  return active;
}
```

5 minute idle threshold (adjustable constant, not user-facing).

## Presence (online / away / offline)

Supabase Realtime Presence, joined once per cohort at the `Dashboard` top level (not
re-joined per sub-screen, so status stays live regardless of which page — home, chat,
dates, profile — the user is on). The tracked payload carries the activity flag so
peers can tell online from away without a second channel:

```ts
const isActive = useIsActive();
const channel = supabase.channel(`presence:cohort-${cohort.id}`, {
  config: { presence: { key: user.id } },
});

useEffect(() => {
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ active: boolean }>();
      setPresence(
        new Map(Object.entries(state).map(([id, entries]) => [id, entries[0]?.active ?? false]))
      );
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') channel.track({ active: isActive });
    });

  return () => { supabase.removeChannel(channel); };
}, [cohort.id]);

// re-track (not re-subscribe) whenever activity flips
useEffect(() => {
  channel.track({ active: isActive });
}, [isActive]);
```

`presence: Map<string, boolean>` (user id → active) lives in `Dashboard` state and is
passed down as a prop to `HomeScreen` and `ChatScreen` alongside the existing
`members`/`user` props. Presence key absent = offline.

## Status resolution

For any member being rendered:

```ts
function resolveStatus(
  member: Member,
  presence: Map<string, boolean>
): 'online' | 'away' | 'offline' | 'dnd' {
  if (member.user.dnd) return 'dnd';
  if (!presence.has(member.user.id)) return 'offline';
  return presence.get(member.user.id) ? 'online' : 'away';
}
```

## Avatar / colors

`Avatar.tsx`'s `Status` union and `STATUS_COLORS` need updating — current states are
`online | away | busy | offline` mapped to on-brand lavender/purple/neutral. This
issue calls for literal, non-brand colors instead, since the semantics (go/caution/
stop) are the point:

```ts
type Status = 'online' | 'away' | 'offline' | 'dnd';

const STATUS_COLORS: Record<Status, string> = {
  online:  'var(--status-online)',
  away:    'var(--status-away)',
  offline: 'var(--status-offline)',
  dnd:     'var(--status-dnd)',
};
```

New tokens in `styles.css` (light, with dark-theme overrides for contrast — offline
stays a neutral, it's the one state that isn't semantically colored):

```css
:root {
  --status-online:  #22C55E; /* green  */
  --status-away:    #F59E0B; /* orange */
  --status-offline: var(--neutral-300);
  --status-dnd:     #DC2626; /* red    */
}
[data-theme="dark"] {
  --status-online:  #4ADE80;
  --status-away:    #FBBF24;
  --status-offline: var(--neutral-600);
  --status-dnd:     #F87171;
}
```

## DND toggle

Two entry points, both writing to `users.dnd` via
`supabase.from('users').update({ dnd }).eq('id', user.id)`:

1. **Profile screen** (`ProfileScreen.tsx`) — new section using the existing `Switch`
   component pattern already used for notification/sound prefs. Labeled "Do Not
   Disturb". Reached via the existing side-nav → profile navigation.
2. **Status dot popover** — clicking the status dot on your own avatar (side nav
   footer avatar, chat input bar avatar) opens a small popover with a single DND
   on/off control. Click handler calls `stopPropagation()` so it doesn't also trigger
   the side nav's `onUserClick` (navigate to profile). The popover shows your current
   resolved status (online/away/offline) as read-only context above the toggle, since
   that part isn't something the user can change here.

Both call the same update; local `userData.dnd` state updates optimistically so all
avatars re-render immediately.

## Error handling

- Presence channel failing to subscribe: fall back to `offline` for everyone (fail
  closed, no false "online" claims). No user-facing error — this mirrors how the
  existing chat channel silently no-ops on failure.
- DND toggle update failing: revert optimistic state, surface via the existing `Toast`
  pattern already used for chat send failures.

## Testing

- Unit: `resolveStatus()` covers all four states + precedence (dnd overrides
  presence); `useIsActive` covers visibility-change and idle-timeout transitions
  (fake timers).
- Manual/E2E: two browser sessions in the same cohort — verify backgrounding one tab
  flips the other's view of that user to away within the idle window (or immediately
  on visibility change); verify closing a session flips it to offline; verify DND
  toggle from both entry points overrides presence and persists across reload.
