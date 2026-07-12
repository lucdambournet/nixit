# Online Status Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a live status dot (online/away/offline auto-detected, DND manually toggled) on cohort members' avatars in Home, Chat, and the side nav, per issue #56 and `docs/superpowers/specs/2026-07-10-online-status-indicators-design.md`.

**Architecture:** A Supabase Realtime Presence channel per cohort tracks each connected client's activity flag (tab-focus + idle-timer, combined). A pure `resolveStatus()` function combines that live presence with a persisted `users.dnd` boolean (the one thing a user can set) into one of four states. `Avatar` renders the resulting color; a new `StatusPopover` wraps `Avatar` wherever the *current* user's own avatar appears, exposing only the DND toggle.

**Tech Stack:** React 18 + TypeScript, Supabase (`@supabase/supabase-js` Realtime Presence + Postgres), Vitest (unit), Playwright (e2e).

## Global Constraints

- Online/away/offline are 100% automatic — no UI ever lets a user set them directly. Only `dnd` is user-settable.
- Colors are literal, not drawn from the app's lavender/purple scale: online `#22C55E`/`#4ADE80` (dark), away `#F59E0B`/`#FBBF24`, offline reuses `--neutral-300`/`--neutral-600`, dnd `#DC2626`/`#F87171`.
- Idle threshold is 5 minutes (`5 * 60_000` ms), combined with tab-visibility — either condition flips to "away" immediately.
- `users.dnd` is a plain boolean (not an enum) — there is no other manual state to represent.
- No new npm dependencies. No new test infra (no jsdom/RTL) — keep DOM-touching hook logic thin and put all testable logic in plain, DOM-free functions, matching the existing `tests/unit/chat-messages.test.ts` style.
- Single quotes, no semicolon-first style changes — match existing file conventions exactly (see `Avatar.tsx`, `Dashboard.tsx`).
- ~~A cohort-mate toggling their own DND is only reflected for other members after they reload...~~ **Revised during Task 10:** the e2e test requires DND to propagate live (a red dot going stale mid-chat is confusing), so `Dashboard` now also subscribes to `postgres_changes` UPDATE on `public.users` (filtered by `active_cohort_id`) and patches the matching member's `dnd` in state. `public.users` was added to the `supabase_realtime` publication (`supabase/schema.sql`) to make this fire.

---

### Task 1: Database — add `users.dnd`

**Files:**
- Modify: `supabase/schema.sql` (append at end of file)

**Interfaces:**
- Produces: a `dnd boolean not null default false` column on `public.users`, readable/writable under the existing "users can read own row" / "users can update own row" RLS policies (no policy changes needed).

- [x] **Step 1: Append the column migration to schema.sql**

Add to the end of `supabase/schema.sql`:

```sql

-- Online status: manual Do Not Disturb override. Online/away/offline are
-- derived live from presence and never persisted.
alter table public.users
  add column if not exists dnd boolean not null default false;
```

- [x] **Step 2: Apply it to the live Supabase project**

This mutates the shared project schema — confirm with the user before running.
Run the statement above via the Supabase Dashboard → SQL Editor (same flow used
for the `chat_messages` migration in issue #57), or:

```bash
supabase db execute --file supabase/schema.sql --linked
```

Expected: no error. Verify with:

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'users' and column_name = 'dnd';
```

Expected: one row — `dnd | boolean | false`.

- [x] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "db: add users.dnd column for manual Do Not Disturb override"
```

---

### Task 2: Activity detection (`computeActive` + `useIsActive`)

**Files:**
- Create: `src/app/hooks/useIsActive.ts`
- Test: `tests/unit/activity.test.ts`

**Interfaces:**
- Produces: `computeActive(hidden: boolean, lastInputAt: number, now: number, idleMs: number): boolean` (pure, DOM-free, unit-tested).
- Produces: `useIsActive(idleMs?: number): boolean` (React hook — combines `document.hidden` + a rolling idle timer via `computeActive`; not unit-tested directly, since the repo has no jsdom/RTL — it's a thin wrapper, same convention as untested `useEffect`s in `Dashboard.tsx`).

- [x] **Step 1: Write the failing test**

Create `tests/unit/activity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeActive } from '../../src/app/hooks/useIsActive';

describe('computeActive', () => {
  const idleMs = 5 * 60_000;

  it('is active when the tab is visible and input was recent', () => {
    expect(computeActive(false, 1_000, 1_000, idleMs)).toBe(true);
  });

  it('is inactive when the tab is hidden, even with recent input', () => {
    expect(computeActive(true, 1_000, 1_000, idleMs)).toBe(false);
  });

  it('is inactive once the idle threshold has fully elapsed', () => {
    expect(computeActive(false, 0, idleMs, idleMs)).toBe(false);
  });

  it('is active just under the idle threshold', () => {
    expect(computeActive(false, 0, idleMs - 1, idleMs)).toBe(true);
  });
});
```

- [x] **Step 2: Run it to confirm it fails**

Run: `npm test -- tests/unit/activity.test.ts`
Expected: FAIL — `Cannot find module '../../src/app/hooks/useIsActive'`.

- [x] **Step 3: Implement**

Create `src/app/hooks/useIsActive.ts`:

```ts
import { useEffect, useRef, useState } from 'react';

/**
 * Pure: a client is active when its tab is focused AND there's been input
 * within idleMs. Either condition failing means "away".
 */
export function computeActive(hidden: boolean, lastInputAt: number, now: number, idleMs: number): boolean {
  if (hidden) return false;
  return now - lastInputAt < idleMs;
}

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'scroll', 'touchstart'] as const;
const DEFAULT_IDLE_MS = 5 * 60_000;

export function useIsActive(idleMs: number = DEFAULT_IDLE_MS): boolean {
  const lastInputRef = useRef(Date.now());
  const [, forceRender] = useState(0);

  useEffect(() => {
    const markInput = () => {
      lastInputRef.current = Date.now();
      forceRender(n => n + 1);
    };
    const markVisibility = () => forceRender(n => n + 1);

    ACTIVITY_EVENTS.forEach(evt => document.addEventListener(evt, markInput, { passive: true }));
    document.addEventListener('visibilitychange', markVisibility);
    const interval = setInterval(() => forceRender(n => n + 1), 1000);

    return () => {
      ACTIVITY_EVENTS.forEach(evt => document.removeEventListener(evt, markInput));
      document.removeEventListener('visibilitychange', markVisibility);
      clearInterval(interval);
    };
  }, []);

  return computeActive(document.hidden, lastInputRef.current, Date.now(), idleMs);
}
```

- [x] **Step 4: Run the test to confirm it passes**

Run: `npm test -- tests/unit/activity.test.ts`
Expected: PASS (4 tests).

- [x] **Step 5: Commit**

```bash
git add src/app/hooks/useIsActive.ts tests/unit/activity.test.ts
git commit -m "feat: add tab-focus + idle-timer activity detection"
```

---

### Task 3: Status resolution (`resolveStatus`)

**Files:**
- Create: `src/app/lib/presence.ts`
- Test: `tests/unit/presence.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `type ResolvedStatus = 'online' | 'away' | 'offline' | 'dnd'` and
  `resolveStatus(userId: string, dnd: boolean, presence: Map<string, boolean>): ResolvedStatus`
  — used by Task 8 (Dashboard) to compute every avatar's status, and by Task 4
  (`Avatar`) as the type for its `status` prop.

- [x] **Step 1: Write the failing test**

Create `tests/unit/presence.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveStatus } from '../../src/app/lib/presence';

describe('resolveStatus', () => {
  it('returns dnd when dnd is on, even if present and active', () => {
    expect(resolveStatus('user-1', true, new Map([['user-1', true]]))).toBe('dnd');
  });

  it('returns dnd when dnd is on and the user is not present at all', () => {
    expect(resolveStatus('user-1', true, new Map())).toBe('dnd');
  });

  it('returns offline when the user is not present and dnd is off', () => {
    expect(resolveStatus('user-1', false, new Map())).toBe('offline');
  });

  it('returns online when present and active', () => {
    expect(resolveStatus('user-1', false, new Map([['user-1', true]]))).toBe('online');
  });

  it('returns away when present but inactive', () => {
    expect(resolveStatus('user-1', false, new Map([['user-1', false]]))).toBe('away');
  });
});
```

- [x] **Step 2: Run it to confirm it fails**

Run: `npm test -- tests/unit/presence.test.ts`
Expected: FAIL — `Cannot find module '../../src/app/lib/presence'`.

- [x] **Step 3: Implement**

Create `src/app/lib/presence.ts`:

```ts
export type ResolvedStatus = 'online' | 'away' | 'offline' | 'dnd';

/**
 * dnd is a manual override and always wins. Otherwise: not present -> offline;
 * present -> online or away depending on the tracked activity flag.
 */
export function resolveStatus(userId: string, dnd: boolean, presence: Map<string, boolean>): ResolvedStatus {
  if (dnd) return 'dnd';
  if (!presence.has(userId)) return 'offline';
  return presence.get(userId) ? 'online' : 'away';
}
```

- [x] **Step 4: Run the test to confirm it passes**

Run: `npm test -- tests/unit/presence.test.ts`
Expected: PASS (5 tests).

- [x] **Step 5: Commit**

```bash
git add src/app/lib/presence.ts tests/unit/presence.test.ts
git commit -m "feat: add resolveStatus for combining presence with manual dnd"
```

---

### Task 4: `Avatar` — four-state colors + clickable status dot

**Files:**
- Modify: `src/app/components/ui/Avatar.tsx` (full file, ~73 lines)
- Modify: `src/styles.css:199-213` (light tokens) and `src/styles.css:350-362` (dark tokens)

**Interfaces:**
- Consumes: `ResolvedStatus` type from Task 3 (`src/app/lib/presence.ts`).
- Produces: `Avatar`'s `status` prop is now typed `Status` (`'online' | 'away' | 'offline' | 'dnd'`, structurally identical to `ResolvedStatus`), and a new optional prop
  `onStatusClick?: (e: React.MouseEvent) => void` — when passed, the dot becomes a
  focusable, clickable element that calls `stopPropagation()` before invoking it.
  Task 5 (`StatusPopover`) relies on this prop existing.

- [x] **Step 1: Add status color tokens to styles.css**

In `src/styles.css`, inside `:root { ... }` right after the existing status
section (after `--color-info-border: var(--lavender-200);` around line 213), add:

```css

  /* Presence status — literal, non-brand (go/caution/stop semantics) */
  --status-online:  #22C55E;
  --status-away:    #F59E0B;
  --status-offline: var(--neutral-300);
  --status-dnd:     #DC2626;
```

In the `[data-theme="dark"]` block, right after the existing
`--color-info-border: rgba(150, 126, 255, 0.24);` line (around line 362), add:

```css

  --status-online:  #4ADE80;
  --status-away:    #FBBF24;
  --status-offline: var(--neutral-600);
  --status-dnd:     #F87171;
```

- [x] **Step 2: Rewrite Avatar.tsx**

Replace the full contents of `src/app/components/ui/Avatar.tsx`:

```tsx
import React from 'react';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type Status = 'online' | 'away' | 'offline' | 'dnd';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: Size;
  status?: Status;
  onStatusClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

const SIZE_PX: Record<Size, number> = { xs: 24, sm: 32, md: 40, lg: 48, xl: 56, '2xl': 80 };

const BG_COLORS = [
  'var(--lavender-400)',
  'var(--purple-400)',
  'var(--lavender-300)',
  'var(--purple-500)',
  'var(--lavender-500)',
];

const STATUS_COLORS: Record<Status, string> = {
  online:  'var(--status-online)',
  away:    'var(--status-away)',
  offline: 'var(--status-offline)',
  dnd:     'var(--status-dnd)',
};

export function Avatar({ src, name, size = 'md', status, onStatusClick, style }: AvatarProps) {
  const px = SIZE_PX[size] ?? SIZE_PX.md;
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const bg = name ? BG_COLORS[name.charCodeAt(0) % BG_COLORS.length] : BG_COLORS[0];
  const dotSize = Math.max(8, Math.round(px * 0.26));

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, ...style }}>
      {src ? (
        <img src={src} alt={name}
          style={{ width: px, height: px, borderRadius: 'var(--radius-full)', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: px, height: px,
          borderRadius: 'var(--radius-full)',
          background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--weight-bold)',
          color: 'white',
          fontSize: Math.round(px * 0.38),
          userSelect: 'none',
        }}>
          {initials}
        </div>
      )}
      {status && (
        <span
          role={onStatusClick ? 'button' : undefined}
          tabIndex={onStatusClick ? 0 : undefined}
          aria-label={onStatusClick ? 'Open status menu' : `${name ?? 'User'} status: ${status}`}
          data-status={status}
          onClick={onStatusClick ? (e: React.MouseEvent) => { e.stopPropagation(); onStatusClick(e); } : undefined}
          style={{
            position: 'absolute',
            bottom: px > 36 ? 2 : 1, right: px > 36 ? 2 : 1,
            width: dotSize, height: dotSize,
            borderRadius: 'var(--radius-full)',
            background: STATUS_COLORS[status] ?? STATUS_COLORS.offline,
            border: '2px solid var(--surface-card)',
            display: 'block',
            cursor: onStatusClick ? 'pointer' : undefined,
          }}
        />
      )}
    </div>
  );
}
```

- [x] **Step 3: Verify it compiles and existing tests still pass**

Run: `npx tsc --noEmit`
Expected: no errors (no other file references the old `'busy'` status value —
already confirmed via `grep -rn 'status="busy"' src` returning nothing).

Run: `npm test`
Expected: PASS — unaffected (`chat-messages.test.ts`, `auth-join.test.ts`, plus
Tasks 2/3's new tests).

- [x] **Step 4: Commit**

```bash
git add src/app/components/ui/Avatar.tsx src/styles.css
git commit -m "feat: Avatar supports 4 literal status colors + clickable dot"
```

---

### Task 5: `StatusPopover` — the one DND control

**Files:**
- Create: `src/app/components/ui/StatusPopover.tsx`

**Interfaces:**
- Consumes: `Avatar` + `Status` from Task 4, `ResolvedStatus` from Task 3.
- Produces: `StatusPopover({ src, name, size, status, dnd, onToggleDnd })` — a
  drop-in replacement for `Avatar` anywhere the *current user's own* avatar is
  rendered. `onToggleDnd: (next: boolean) => void`. Task 8 uses this in the
  chat input bar and the side-nav footer.

- [x] **Step 1: Implement**

Create `src/app/components/ui/StatusPopover.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Avatar, type Status } from './Avatar';

const STATUS_LABEL: Record<Status, string> = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
  dnd: 'Do Not Disturb',
};

interface StatusPopoverProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md';
  status: Status;
  dnd: boolean;
  onToggleDnd: (next: boolean) => void;
}

export function StatusPopover({ src, name, size = 'sm', status, dnd, onToggleDnd }: StatusPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }} onClick={e => e.stopPropagation()}>
      <Avatar src={src} name={name} size={size} status={status} onStatusClick={() => setOpen(o => !o)} />
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 20,
          background: 'var(--surface-card)', border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', padding: 12, width: 208,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
            paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--color-border-subtle)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--status-${status})`, flexShrink: 0 }} />
            {STATUS_LABEL[status]}{status !== 'dnd' ? ' — detected automatically' : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                Do Not Disturb
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Only thing you control here
              </div>
            </div>
            <button
              type="button" role="switch" aria-checked={dnd}
              onClick={() => onToggleDnd(!dnd)}
              style={{
                width: 38, height: 22, flexShrink: 0, padding: 0, border: 'none', cursor: 'pointer',
                borderRadius: 'var(--radius-full)',
                background: dnd ? 'var(--status-dnd)' : 'var(--neutral-300)',
                position: 'relative',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: dnd ? 18 : 2,
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                boxShadow: 'var(--shadow-xs)', transition: 'left 140ms ease',
              }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/app/components/ui/StatusPopover.tsx
git commit -m "feat: add StatusPopover, the DND-only control for your own avatar"
```

---

### Task 6: Data plumbing — carry `dnd` through types and queries

**Files:**
- Modify: `src/app/pages/Dashboard.tsx:58` (`UserData` type)
- Modify: `src/app/pages/Dashboard.tsx:59` (`Member` type)
- Modify: `src/app/pages/Dashboard.tsx:487` (top-level user select)
- Modify: `src/app/pages/Dashboard.tsx:499` (members select)

**Interfaces:**
- Produces: `UserData.dnd: boolean` and `Member.user.dnd: boolean`, which
  Task 7/8 read to compute each avatar's resolved status.

- [x] **Step 1: Extend the types**

In `src/app/pages/Dashboard.tsx`, change line 58 from:

```ts
type UserData = { id: string; username: string; email: string; created_at: string; profile_image_url: string | null; active_cohort: CohortData | null };
```

to:

```ts
type UserData = { id: string; username: string; email: string; created_at: string; profile_image_url: string | null; dnd: boolean; active_cohort: CohortData | null };
```

Change line 59 from:

```ts
type Member = { user: { id: string; username: string; profile_image_url: string | null } };
```

to:

```ts
type Member = { user: { id: string; username: string; profile_image_url: string | null; dnd: boolean } };
```

- [x] **Step 2: Extend the two Supabase selects**

Change line 487 from:

```ts
        .select('username, email, created_at, profile_image_url, active_cohort:active_cohort_id(id, start_date, member_count, max_members, status, nix_date:nix_date_id(month, start_date))')
```

to:

```ts
        .select('username, email, created_at, profile_image_url, dnd, active_cohort:active_cohort_id(id, start_date, member_count, max_members, status, nix_date:nix_date_id(month, start_date))')
```

Change line 499 from:

```ts
        .select('user:user_id(id, username, profile_image_url)')
```

to:

```ts
        .select('user:user_id(id, username, profile_image_url, dnd)')
```

- [x] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: errors at every call site still using the old `Member`/`UserData`
shape without `dnd` — expected at this point; Tasks 7-9 fix them. If `tsc`
reports **only** those (in `HomeScreen`, `ChatScreen`, the `SideNav`
`userAvatar`, and the `ProfileScreen` call), this step is done correctly.

Run: `npm test`
Expected: PASS — these are TypeScript-only changes, no runtime behavior
changed yet, and the affected unit tests (`chat-messages`, `auth-join`) don't
touch these types.

- [x] **Step 4: Commit**

```bash
git add src/app/pages/Dashboard.tsx
git commit -m "refactor: carry users.dnd through UserData/Member types and queries"
```

---

### Task 7: Presence channel + `toggleDnd` in `Dashboard`

**Files:**
- Modify: `src/app/pages/Dashboard.tsx` (imports, `Dashboard()` body, `SideNav` invocation)

**Interfaces:**
- Consumes: `useIsActive` (Task 2), `resolveStatus`/`ResolvedStatus` (Task 3), `StatusPopover` (Task 5).
- Produces (passed to Task 8's `HomeScreen`/`ChatScreen`, and used directly in this task's `SideNav` wiring):
  - `presence: Map<string, boolean>` — user id → active.
  - `selfStatus: ResolvedStatus` — the signed-in user's own resolved status.
  - `toggleDnd(next: boolean): Promise<boolean>` — writes `users.dnd`, optimistic with rollback on failure, returns whether it succeeded.

- [x] **Step 1: Add the new imports**

At the top of `src/app/pages/Dashboard.tsx`, after the existing `import { Toast } ...` line (line 12), add:

```ts
import { StatusPopover } from '../components/ui/StatusPopover';
import { useIsActive } from '../hooks/useIsActive';
import { resolveStatus, type ResolvedStatus } from '../lib/presence';
```

- [x] **Step 2: Add presence state, the channel effect, and `toggleDnd`**

In `Dashboard()`, immediately after the existing data-load `useEffect` (right
after the closing `}, [navigate]);` that follows the `load()` call, currently
at line 507), insert:

```ts

  const isActive = useIsActive();
  const [presence, setPresence] = useState<Map<string, boolean>>(new Map());
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const cohortId = userData?.active_cohort?.id;

  useEffect(() => {
    if (!cohortId || !userData) return;

    const channel = supabase.channel(`presence:cohort-${cohortId}`, {
      config: { presence: { key: userData.id } },
    });
    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ active: boolean }>();
        setPresence(new Map(Object.entries(state).map(([id, entries]) => [id, entries[0]?.active ?? false])));
      })
      .subscribe(subscribeStatus => {
        if (subscribeStatus === 'SUBSCRIBED') channel.track({ active: isActive });
      });

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId, userData?.id]);

  useEffect(() => {
    presenceChannelRef.current?.track({ active: isActive });
  }, [isActive]);

  const toggleDnd = async (next: boolean): Promise<boolean> => {
    if (!userData) return false;
    const prev = userData.dnd;
    setUserData(u => (u ? { ...u, dnd: next } : u));

    const { error: dndError } = await supabase.from('users').update({ dnd: next }).eq('id', userData.id);
    if (dndError) {
      setUserData(u => (u ? { ...u, dnd: prev } : u));
      return false;
    }
    return true;
  };
```

- [x] **Step 3: Compute `selfStatus` and wire the side-nav avatar**

Immediately after the existing line `const cohort = userData.active_cohort;`
(line 541), add:

```ts
  const selfStatus: ResolvedStatus = resolveStatus(userData.id, userData.dnd, presence);
```

Then change the `SideNav` invocation's `userAvatar` prop (line 566) from:

```tsx
          userAvatar={<Avatar src={userData.profile_image_url} name={userData.username} size="sm" status="online" />}
```

to:

```tsx
          userAvatar={<StatusPopover src={userData.profile_image_url} name={userData.username} size="sm" status={selfStatus} dnd={userData.dnd} onToggleDnd={toggleDnd} />}
```

- [x] **Step 4: Pass the new data down to `HomeScreen` and `ChatScreen`**

Change the `HomeScreen` invocation (starting at line 578) from:

```tsx
          <HomeScreen
            user={userData}
            cohort={cohort}
            members={members}
            onGoToChat={() => setPage('chat')}
            onTapOut={async () => {
```

to:

```tsx
          <HomeScreen
            user={userData}
            cohort={cohort}
            members={members}
            presence={presence}
            onGoToChat={() => setPage('chat')}
            onTapOut={async () => {
```

Change the `ChatScreen` invocation (line 592) from:

```tsx
          <ChatScreen user={userData} cohort={cohort} members={members} />
```

to:

```tsx
          <ChatScreen user={userData} cohort={cohort} members={members} presence={presence} selfStatus={selfStatus} onToggleDnd={toggleDnd} />
```

- [x] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: remaining errors only inside `HomeScreen`/`ChatScreen` function
bodies (they don't accept these new props yet — fixed in Task 8) and inside
`ProfileScreen`'s invocation (fixed in Task 9). No errors anywhere else.

- [x] **Step 6: Commit**

```bash
git add src/app/pages/Dashboard.tsx
git commit -m "feat: join a per-cohort presence channel and wire the side-nav DND toggle"
```

---

### Task 8: `HomeScreen` + `ChatScreen` render resolved status

**Files:**
- Modify: `src/app/pages/Dashboard.tsx` (`HomeScreen` and `ChatScreen` function signatures + bodies)

**Interfaces:**
- Consumes: `presence`, `selfStatus`, `onToggleDnd` from Task 7; `resolveStatus` from Task 3; `StatusPopover` from Task 5.

- [x] **Step 1: `HomeScreen` accepts `presence` and resolves member status**

Change the `HomeScreen` signature (line 73) from:

```ts
function HomeScreen({ user, cohort, members, onGoToChat, onTapOut }: { user: UserData; cohort: CohortData; members: Member[]; onGoToChat: () => void; onTapOut: () => void }) {
```

to:

```ts
function HomeScreen({ user, cohort, members, presence, onGoToChat, onTapOut }: { user: UserData; cohort: CohortData; members: Member[]; presence: Map<string, boolean>; onGoToChat: () => void; onTapOut: () => void }) {
```

Change the member-grid avatar (line 133) from:

```tsx
                <Avatar src={m.user.profile_image_url} name={m.user.username} size="md" status="online" />
```

to:

```tsx
                <Avatar src={m.user.profile_image_url} name={m.user.username} size="md" status={resolveStatus(m.user.id, m.user.dnd, presence)} />
```

- [x] **Step 2: `ChatScreen` accepts `presence`/`selfStatus`/`onToggleDnd`**

Change the `ChatScreen` signature (line 166) from:

```ts
function ChatScreen({ user, cohort, members }: { user: UserData; cohort: CohortData; members: Member[] }) {
```

to:

```ts
function ChatScreen({ user, cohort, members, presence, selfStatus, onToggleDnd }: { user: UserData; cohort: CohortData; members: Member[]; presence: Map<string, boolean>; selfStatus: ResolvedStatus; onToggleDnd: (next: boolean) => Promise<boolean> }) {
```

- [x] **Step 3: Resolve status for the header mini-avatars**

Change line 277 from:

```tsx
                <Avatar src={m.user.profile_image_url} name={m.user.username} size="sm" />
```

to:

```tsx
                <Avatar src={m.user.profile_image_url} name={m.user.username} size="sm" status={resolveStatus(m.user.id, m.user.dnd, presence)} />
```

- [x] **Step 4: Resolve status for the message-list author avatar**

Change line 303 from:

```tsx
                  <Avatar name={msg.from} size="xs" />
```

to:

```tsx
                  <Avatar name={msg.from} size="xs" status={msg.isMe ? selfStatus : resolveStatus(msg.authorId, resolveAuthor(msg.authorId)?.dnd ?? false, presence)} />
```

- [x] **Step 5: Replace the input-bar self avatar with `StatusPopover`**

Change line 327 from:

```tsx
        <Avatar src={user.profile_image_url} name={user.username} size="sm" status="online" />
```

to:

```tsx
        <StatusPopover src={user.profile_image_url} name={user.username} size="sm" status={selfStatus} dnd={user.dnd} onToggleDnd={onToggleDnd} />
```

- [x] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no errors except inside the `ProfileScreen` call site (Task 9 fixes it).

Run: `npm test`
Expected: PASS.

Run: `npm run dev -- --port 5174` and manually check in a browser:
- Home screen member grid shows a green dot on each member (all "online" since
  there's one connected session).
- Chat header mini-avatars and message avatars show green dots.
- Clicking your own avatar's dot (input bar, and side-nav footer) opens the
  popover; toggling "Do Not Disturb" turns every one of your own dots red
  immediately, and unchecking returns them to green.
- Check both light and dark (toggle OS theme or `prefers-color-scheme`) — the
  dot colors switch (`#22C55E`/`#4ADE80`, `#DC2626`/`#F87171`).

- [x] **Step 7: Commit**

```bash
git add src/app/pages/Dashboard.tsx
git commit -m "feat: render resolved status dots in Home and Chat screens"
```

---

### Task 9: `ProfileScreen` — Do Not Disturb section

**Files:**
- Modify: `src/components/profile/ProfileScreen.tsx` (`ProfileUser`/`ProfileScreenProps` interfaces, component signature, JSX)
- Modify: `src/app/pages/Dashboard.tsx:597-609` (the `ProfileScreen` invocation)

**Interfaces:**
- Consumes: `toggleDnd` from Task 7 (passed through as `onToggleDnd`), existing `Switch` component already defined in this file.

- [x] **Step 1: Extend the interfaces**

In `src/components/profile/ProfileScreen.tsx`, change `ProfileUser` (line 59-65) from:

```ts
interface ProfileUser {
  username: string;
  email: string;
  profile_image_url: string | null;
  created_at: string;
  cohortLabel?: string | null;
}
```

to:

```ts
interface ProfileUser {
  username: string;
  email: string;
  profile_image_url: string | null;
  created_at: string;
  cohortLabel?: string | null;
  dnd: boolean;
}
```

Change `ProfileScreenProps` (line 67-71) from:

```ts
interface ProfileScreenProps {
  user: ProfileUser;
  onUserUpdate: (patch: Partial<Pick<ProfileUser, 'username' | 'profile_image_url'>>) => void;
  onSignOut: () => void;
}
```

to:

```ts
interface ProfileScreenProps {
  user: ProfileUser;
  onUserUpdate: (patch: Partial<Pick<ProfileUser, 'username' | 'profile_image_url'>>) => void;
  onSignOut: () => void;
  onToggleDnd: (next: boolean) => Promise<boolean>;
}
```

- [x] **Step 2: Accept the new prop**

Change line 73 from:

```ts
export function ProfileScreen({ user, onUserUpdate, onSignOut }: ProfileScreenProps) {
```

to:

```ts
export function ProfileScreen({ user, onUserUpdate, onSignOut, onToggleDnd }: ProfileScreenProps) {
```

- [x] **Step 3: Add the Status card**

Insert a new card right after the Identity header card's closing `</Card>`
(line 211) and before the `{/* ── Account details ── */}` comment (line 213):

```tsx

      {/* ── Status ── */}
      <Card variant="default" padding="lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
              Do Not Disturb
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-snug)', marginTop: 2 }}>
              Shows a red status to your cohort regardless of whether you're actually online. Online, away, and offline are detected automatically and can't be set manually.
            </div>
          </div>
          <Switch
            checked={user.dnd}
            onChange={async v => {
              const ok = await onToggleDnd(v);
              if (!ok) flash('error', 'Could not update your status. Try again.');
            }}
          />
        </div>
      </Card>
```

- [x] **Step 4: Pass `dnd` and `onToggleDnd` from `Dashboard`**

In `src/app/pages/Dashboard.tsx`, change the `ProfileScreen` invocation
(lines 597-608) from:

```tsx
          <ProfileScreen
            user={{
              username: userData.username,
              email: userData.email,
              profile_image_url: userData.profile_image_url,
              created_at: userData.created_at,
              cohortLabel: cohort.nix_date?.month ?? null,
            }}
            onUserUpdate={(patch: Partial<Pick<UserData, 'username' | 'profile_image_url'>>) => setUserData(u => (u ? { ...u, ...patch } : u))}
            onSignOut={() => supabase.auth.signOut().then(() => navigate('/login'))}
          />
```

to:

```tsx
          <ProfileScreen
            user={{
              username: userData.username,
              email: userData.email,
              profile_image_url: userData.profile_image_url,
              created_at: userData.created_at,
              cohortLabel: cohort.nix_date?.month ?? null,
              dnd: userData.dnd,
            }}
            onUserUpdate={(patch: Partial<Pick<UserData, 'username' | 'profile_image_url'>>) => setUserData(u => (u ? { ...u, ...patch } : u))}
            onSignOut={() => supabase.auth.signOut().then(() => navigate('/login'))}
            onToggleDnd={toggleDnd}
          />
```

- [x] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: zero errors anywhere in the project now.

Run: `npm test`
Expected: PASS.

Run the dev server and manually confirm: toggling the switch on the Profile
page flips your side-nav avatar dot between green and red immediately, and
the change survives a page reload (reads back from `users.dnd`).

- [x] **Step 6: Commit**

```bash
git add src/components/profile/ProfileScreen.tsx src/app/pages/Dashboard.tsx
git commit -m "feat: add Do Not Disturb toggle to the Profile screen"
```

---

### Task 10: E2E — presence and DND across two sessions

**Files:**
- Create: `tests/e2e/status-indicators.spec.ts`

**Interfaces:**
- Consumes: the running app from Tasks 1-9; no new production code.

- [x] **Step 1: Write the test**

Create `tests/e2e/status-indicators.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const admin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const USER_C = { email: 'test5@nixit.com', password: '12qwaszx', username: 'test5' };
const USER_D = { email: 'test6@nixit.com', password: '12qwaszx', username: 'test6' };

let cohortId: string;

async function resetUser(user: typeof USER_C): Promise<string> {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users.find(entry => entry.email === user.email);

  if (existing) {
    await admin.from('cohort_members').delete().eq('user_id', existing.id);
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }

  const { data } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  });

  return data.user!.id;
}

test.beforeAll(async () => {
  const { data: cohort } = await admin.from('cohorts').select('id').eq('start_date', '2026-11-01').single();
  cohortId = cohort!.id;

  const idC = await resetUser(USER_C);
  const idD = await resetUser(USER_D);

  await admin.from('users').insert([
    { id: idC, email: USER_C.email, username: USER_C.username, active_cohort_id: cohortId, dnd: false },
    { id: idD, email: USER_D.email, username: USER_D.username, active_cohort_id: cohortId, dnd: false },
  ]);

  await admin.from('cohort_members').insert([
    { user_id: idC, cohort_id: cohortId },
    { user_id: idD, cohort_id: cohortId },
  ]);
});

test.afterAll(async () => {
  for (const user of [USER_C, USER_D]) {
    const { data: { users } } = await admin.auth.admin.listUsers();
    const existing = users.find(entry => entry.email === user.email);

    if (existing) {
      await admin.from('cohort_members').delete().eq('user_id', existing.id);
      await admin.from('users').delete().eq('id', existing.id);
      await admin.auth.admin.deleteUser(existing.id);
    }
  }
});

async function signIn(page: Page, user: typeof USER_C) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Online status indicators', () => {
  test('DND is visible to cohort mates, and closing a session shows offline', async ({ browser }) => {
    test.setTimeout(60000);

    const contextC = await browser.newContext();
    const contextD = await browser.newContext();
    const pageC = await contextC.newPage();
    const pageD = await contextD.newPage();

    await test.step('both members sign in', async () => {
      await signIn(pageC, USER_C);
      await signIn(pageD, USER_D);
    });

    const dStatusDot = pageC.getByLabel(new RegExp(`^${USER_D.username} status:`));

    await test.step('user D shows online to user C by default', async () => {
      await expect(dStatusDot).toHaveAttribute('data-status', 'online');
    });

    await test.step('user D turns on Do Not Disturb from their profile', async () => {
      await pageD.getByRole('button', { name: 'Profile' }).click();
      await pageD.getByRole('switch').first().click();
    });

    await test.step('user C sees user D go red', async () => {
      await expect(dStatusDot).toHaveAttribute('data-status', 'dnd');
    });

    await test.step('user D turns Do Not Disturb back off', async () => {
      await pageD.getByRole('switch').first().click();
    });

    await test.step('user C sees user D back to online', async () => {
      await expect(dStatusDot).toHaveAttribute('data-status', 'online');
    });

    await test.step("user D's session ends", async () => {
      await contextD.close();
    });

    await test.step('user C sees user D go offline', async () => {
      await expect(dStatusDot).toHaveAttribute('data-status', 'offline', { timeout: 15000 });
    });

    await contextC.close();
  });
});
```

- [x] **Step 2: Run it**

Run: `npm run test:e2e -- tests/e2e/status-indicators.spec.ts`

This creates/removes real rows in the live Supabase project (`test5@nixit.com`,
`test6@nixit.com`), the same way `tests/e2e/cohort-chat.spec.ts` already does —
confirm with the user before running if this is the first time hitting the
live project in this session.

Expected: PASS (1 test, 7 steps).

- [x] **Step 3: Commit**

```bash
git add tests/e2e/status-indicators.spec.ts
git commit -m "test: cover DND visibility and offline transition across two sessions"
```

---

## Self-Review Notes

- **Spec coverage:** schema (Task 1), activity detection (Task 2), status
  resolution (Task 3), colors (Task 4), DND-only control surfaced in both
  required places — side nav + chat input via `StatusPopover` (Tasks 5, 7, 8)
  and Profile screen (Task 9) — scope (Home grid, chat header, chat messages,
  chat input, side nav — Tasks 7, 8), error handling (optimistic + rollback in
  `toggleDnd`, Task 7; failure toast in Task 9), testing (unit in Tasks 2-3,
  e2e in Task 10). No spec section is unaddressed.
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `ResolvedStatus` (Task 3) and `Status` (Task 4) are
  structurally identical (`'online' | 'away' | 'offline' | 'dnd'`) by design —
  `resolveStatus`'s return value is passed directly into `Avatar`'s `status`
  prop with no cast needed. `toggleDnd`'s signature
  (`(next: boolean) => Promise<boolean>`) is used identically in Task 7
  (definition), Task 8 (`ChatScreen`/`StatusPopover`), and Task 9
  (`ProfileScreen`'s `onToggleDnd`).
