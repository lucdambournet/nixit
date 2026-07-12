# DailyCheckIn — Technical Design

**Issue**: #64 · companion to `2026-07-10-daily-checkin-requirements.md`

## 1. Decision Record — Scope

### Decision — 2026-07-10
**Decision**: Ship DailyCheckIn v1 as a server-authoritative streak tracker only — no credits/XP/level
economy, no `localStorage` state, no `motion`/`framer-motion` dependency.

**Context**: The source component (`vape-zero`) bundles four concerns: (1) daily check-in gating,
(2) streak math, (3) a spendable-credits/XP/leveling economy, (4) client-only persistence. NixIt's
own MVP design doc already deferred "gamification or streak rewards beyond the cohort timer," and
NixIt has zero existing economy primitives (no credits table, no shop, no XP anywhere in schema or
UI). Porting the full economy would be net-new product surface disguised as a port.

**Options**:
- **A. Full 1:1 port** (credits, XP, levels, 7-day reward table, epic badge) — pros: matches source
  exactly, visually rich; cons: invents an economy with no sink (no shop in NixIt), contradicts the
  MVP doc's explicit deferral, large surface area for a "spec-only" issue, client-trust bugs if ported
  as-is (source computes streak and rewards entirely client-side).
- **B. Streak-only, server-authoritative** (this decision) — pros: matches NixIt's actual habit-tracking
  value proposition (staying quit, cohort accountability), reuses the `join_cohort` security-definer
  RPC pattern already established, small enough to actually ship; cons: visually less flashy than
  source, no "epic reward" moment.
- **C. Streak + minimal milestone badges** (no spendable currency) — middle ground, deferred to
  Phase 2 in this doc (see §6).

**Rationale**: Option B is the smallest change consistent with NixIt's existing architecture and
explicit prior scope decision. It's also the correct foundation for Option C/A later — the
`daily_check_ins` table and RPC don't need to change shape if a rewards layer is added on top.

**Impact**: No new dependencies, no economy tables, faster to implement, directly reviewable against
existing `join_cohort`/`chat_messages` patterns. Visual polish (streak flame icon, milestone toasts)
still gives the "reward" feeling without a currency system.

**Review**: Revisit if product wants a rewards/shop system — re-open as Phase 2 against this same
`daily_check_ins` table.

## 2. Architecture

```
┌─────────────────────┐        supabase-js         ┌──────────────────────────┐
│ Dashboard/HomeScreen │ ───────────────────────────▶ │ record_check_in() RPC    │
│  <DailyCheckInCard>  │ ◀─────────────────────────── │ (security definer,       │
└─────────┬────────────┘   { current_streak,          │  auth.uid()-scoped)      │
          │                  longest_streak,          └───────────┬──────────────┘
          │                  already_checked_in_today }           │
          ▼                                                       ▼
┌──────────────────────┐                             ┌──────────────────────────┐
│ src/app/lib/          │                             │ public.daily_check_ins   │
│ dailyCheckIn.ts        │  (pure streak-math          │  (user_id, check_in_date,│
│  — helpers, no I/O)    │   helpers, unit-tested)     │   created_at)            │
└──────────────────────┘                             └──────────────────────────┘
```

- **Component**: `src/app/components/nix/DailyCheckInCard.tsx` — follows the existing `nix/`
  domain-component folder (`CohortTimer.tsx`, `NixDateCard.tsx`).
- **Pure logic**: `src/app/lib/dailyCheckIn.ts` — streak-window formatting, "time until next check-in"
  display math, mirroring `chatMessages.ts`'s role as pure/testable helpers separate from I/O.
- **Data**: new `public.daily_check_ins` table + `record_check_in()` RPC + `get_check_in_status()`
  read RPC (or a plain `select`, see §4).
- **Integration point**: `HomeScreen` in `src/app/pages/Dashboard.tsx`, inserted between the stats
  grid and the cohort-members card (see Requirements §Open Questions Q3 default).

## 3. Data Model

```sql
-- New table: one row per user per calendar day they checked in
create table if not exists public.daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  check_in_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, check_in_date)
);

create index if not exists idx_daily_check_ins_user_date
  on public.daily_check_ins(user_id, check_in_date desc);

-- Streak counters live on the users row (avoids recomputing from full history on every read)
alter table public.users
  add column if not exists current_streak int not null default 0,
  add column if not exists longest_streak int not null default 0,
  add column if not exists last_check_in_date date;
```

**Why counters on `users` instead of derived from `daily_check_ins` every read**: Dashboard reads
streak on every home-screen load (REQ-10); deriving max-consecutive-run from a growing history table
on every page load is unnecessary write-once/read-many cost. The `record_check_in()` RPC updates both
the append-only history row (audit trail, future analytics, matches `chat_messages`-style
event-log precedent) and the denormalized counters atomically in one transaction.

## 4. RPC Contract

```sql
create or replace function record_check_in()
  returns table (
    current_streak int,
    longest_streak int,
    check_in_date date
  )
  language plpgsql security definer as $$
declare
  requesting_user_id uuid := auth.uid();
  today date := current_date;
  prev_date date;
  new_streak int;
  new_longest int;
begin
  if requesting_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.users
    where id = requesting_user_id and active_cohort_id is not null
  ) then
    raise exception 'No active cohort';
  end if;

  select last_check_in_date into prev_date
  from public.users where id = requesting_user_id;

  if prev_date = today then
    raise exception 'Already checked in today';
  end if;

  if prev_date = today - 1 then
    new_streak := (select current_streak from public.users where id = requesting_user_id) + 1;
  else
    new_streak := 1;
  end if;

  select greatest(longest_streak, new_streak) into new_longest
  from public.users where id = requesting_user_id;

  insert into public.daily_check_ins (user_id, check_in_date)
  values (requesting_user_id, today);

  update public.users
  set current_streak = new_streak,
      longest_streak = new_longest,
      last_check_in_date = today
  where id = requesting_user_id;

  return query select new_streak, new_longest, today;
end;
$$;
```

**Client call**: `supabase.rpc('record_check_in')`. On the unique-constraint / raised-exception path
(`Already checked in today`), the client treats it as REQ-3's already-completed state, not a hard
error — same UX either way (button disabled), but the *source of truth* for "already checked in
today" is `users.last_check_in_date = current_date`, readable via a normal `select`, so the client
can determine button state on page load without invoking the RPC (RPC is mutation-only, called on
submit).

**Status read** (page load, REQ-1/REQ-11): plain `select current_streak, longest_streak,
last_check_in_date from users where id = auth.uid()` — already covered by the existing
"users can read own row" RLS policy, no new read RPC needed.

## 5. RLS

```sql
alter table public.daily_check_ins enable row level security;

create policy "users can read own check-ins"
  on public.daily_check_ins for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert/update/delete policy for authenticated role: all writes go through
-- record_check_in() (security definer), mirroring join_cohort's pattern.
grant select on table public.daily_check_ins to authenticated;
```

The three new `users` columns are covered by the existing "users can update own row" policy for
reads/writes made through the RPC (security definer bypasses RLS internally); direct client writes to
`current_streak`/`longest_streak`/`last_check_in_date` should be blocked — add a `check` constraint or
a `before update` trigger only if a hostile-client threat model is in scope (recommend trigger; see
Task list).

## 6. Component Design

```tsx
// src/app/components/nix/DailyCheckInCard.tsx
interface DailyCheckInCardProps {
  currentStreak: number;
  longestStreak: number;
  alreadyCheckedInToday: boolean;
  onCheckIn: () => Promise<void>; // parent owns the supabase.rpc call + error toast
}
```

- Uses existing `Card` (variant `"default"`, matching the chat-teaser card precedent at
  `Dashboard.tsx:142-150`) — **not** the source's `glass-card`/`rounded-3xl` Tailwind classes, which
  don't exist in NixIt. Map visual intent onto existing tokens: `Card variant="glass"` is the closest
  equivalent if a frosted look is wanted.
- 7-cell day-progress row from the source UI is dropped in v1 (no reward-per-day concept without an
  economy) — replaced with a single streak counter + flame-style icon and a "come back tomorrow"
  state, consistent with `REQ-10`.
- No `motion`/`framer-motion` — use CSS transitions via existing `--motion-*` tokens if present in
  `styles.css`, or a plain opacity/scale CSS transition class, avoiding a new dependency for one
  component.
- Confirmation feedback (REQ-9): reuse the existing `Toast` component (`src/app/components/ui/Toast.tsx`)
  already used elsewhere — no new modal component needed for v1 (source's full-screen reward modal is
  tied to the economy/epic-badge concept deferred in §1).

## 7. Error Handling Matrix

| Error | Trigger | Client handling |
|---|---|---|
| `Not authenticated` | No session / expired token | Redirect to `/login`, same as existing `getUser()` guard pattern |
| `No active cohort` | `active_cohort_id is null` | Hide/disable check-in card entirely (don't show error state — REQ-8) |
| `Already checked in today` | Duplicate RPC call (race, double-tap) | Treat as success-equivalent; refresh streak display from `users` row, no error toast |
| Network/timeout | Connectivity loss | Revert optimistic UI, show retry-capable error toast, do not update local streak state (no client-trusted fallback, per Decision Record) |
| RLS denial on read | Malformed session state | Same handling as other pages' `getUser()` failure path |

## 8. Unit Testing Strategy

`tests/unit/daily-checkin.test.ts` (mirrors `chat-messages.test.ts`), testing pure helpers extracted
into `src/app/lib/dailyCheckIn.ts`:
- `isConsecutiveDay(prevDate, today)` → boundary cases: same day, +1 day, +2 days, null `prevDate`.
- `formatStreakLabel(streak)` / any display-string helpers.
- No streak-increment logic is duplicated client-side beyond what's needed for optimistic UI — the
  RPC is the single source of truth (REQ-6), so unit tests target *display* helpers, not a
  reimplementation of the SQL streak math.

## 9. E2E Testing Strategy

`tests/e2e/daily-checkin.spec.ts` (mirrors `signup-join-dashboard.spec.ts` conventions):
- Header comment referencing Issue #64.
- Service-role admin client seeds a test user with an active cohort and a known `last_check_in_date`
  / `current_streak` fixture.
- Scenarios: (1) fresh user, first check-in → streak becomes 1; (2) user with `last_check_in_date =
  yesterday` → check-in → streak increments; (3) user with `last_check_in_date = today` → check-in
  button already shows completed state, RPC call (if attempted) is rejected; (4) user with no active
  cohort → check-in card not rendered.
- `beforeAll`/`afterAll` cleanup deletes seeded rows from `daily_check_ins` and resets `users` columns.

## 10. Open Implementation Risk

Same-day double-submit race (two RPC calls interleaved before either commits `last_check_in_date`):
the `unique (user_id, check_in_date)` constraint on `daily_check_ins` is the actual race-safe guard
(DB-level), not the `prev_date = today` check in the RPC body, which has a narrow TOCTOU window.
Task list includes wrapping the insert in a way that surfaces the unique-violation as the same
`Already checked in today` error path, e.g. catching `unique_violation` (SQLSTATE `23505`) explicitly
rather than relying solely on the pre-check.
