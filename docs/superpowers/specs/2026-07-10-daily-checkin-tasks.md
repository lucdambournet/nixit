# DailyCheckIn — Implementation Plan

**Issue**: #64 · companion to `2026-07-10-daily-checkin-requirements.md` and `-design.md`
**Note**: This issue is scoped as spec-only ("Create plan and spec"). These tasks are for a
follow-up implementation issue/PR — not executed as part of #64 itself.

## Task 1 — Schema migration
**Files**: `supabase/schema.sql` (append), or new `supabase/migrations/<timestamp>_daily_check_ins.sql`
if the project adopts numbered migrations before this lands.
**Outcome**: `daily_check_ins` table + `users` columns (`current_streak`, `longest_streak`,
`last_check_in_date`) + indexes, per Design §3.
**Dependencies**: none.
**Validation**: run against local/staging Supabase, confirm `\d daily_check_ins` and `\d users` show
expected columns.

## Task 2 — `record_check_in()` RPC + unique-violation handling
**Files**: `supabase/schema.sql`
**Outcome**: Function per Design §4, with explicit `exception when unique_violation` handling for the
TOCTOU race noted in Design §10 (catch and re-raise as `'Already checked in today'` for a consistent
client error message).
**Dependencies**: Task 1.
**Validation**: manual SQL Editor test — call twice same day, second call raises the expected message;
call after simulating `last_check_in_date = yesterday`, streak increments; after 2+ day gap, resets to 1.

## Task 3 — RLS policies
**Files**: `supabase/rls_policies.sql`
**Outcome**: Policies per Design §5 (`daily_check_ins` select-own-only, no direct insert/update/delete
grant to `authenticated`). Add a `before update` trigger on `users` blocking direct client writes to
the three new columns if a client attempts to bypass the RPC (defense in depth — flagged as optional
in Design §5, recommend including it).
**Dependencies**: Task 1.
**Validation**: as `authenticated` role, attempt direct `insert into daily_check_ins` and direct
`update users set current_streak = 999` — both must fail; `select` on own rows succeeds, on another
user's `daily_check_ins` rows returns zero rows.

## Task 4 — Pure streak-math helpers
**Files**: `src/app/lib/dailyCheckIn.ts` (new), `tests/unit/daily-checkin.test.ts` (new)
**Outcome**: `isConsecutiveDay`, `formatStreakLabel`, and any "time until next check-in" display
helpers per Design §8, fully unit-tested.
**Dependencies**: none (can start in parallel with Tasks 1-3).
**Validation**: `npm run test` (vitest) green; boundary cases covered (same-day, +1, +2, null prev).

## Task 5 — `DailyCheckInCard` component
**Files**: `src/app/components/nix/DailyCheckInCard.tsx` (new)
**Outcome**: Component per Design §6 — props-driven, no direct Supabase calls inside the component
(parent owns data fetching/mutation, matching how `CohortTimer`/`NixDateCard` are likely wired — verify
against actual prop patterns in those files during implementation). Uses `Card` + `Toast`, no new
dependency.
**Dependencies**: Task 4 (for display helpers).
**Validation**: Storybook-less manual render via `/dashboard` in dev server; visually confirm
available / already-checked-in / no-active-cohort (hidden) states.

## Task 6 — Dashboard integration
**Files**: `src/app/pages/Dashboard.tsx`
**Outcome**: `HomeScreen` fetches `current_streak`, `longest_streak`, `last_check_in_date` alongside
its existing `getUser()` call, computes `alreadyCheckedInToday` client-side from
`last_check_in_date === todayISODate`, renders `DailyCheckInCard` between the stats grid and the
cohort-members card (per Requirements Open Question Q3 default), wires `onCheckIn` to
`supabase.rpc('record_check_in')` with optimistic-UI + error toast per Design §7.
**Dependencies**: Tasks 2, 3, 5.
**Validation**: manual click-through in dev server; confirm streak updates without full page reload.

## Task 7 — E2E tests
**Files**: `tests/e2e/daily-checkin.spec.ts` (new)
**Outcome**: Scenarios per Design §9 (fresh check-in, consecutive-day increment, same-day duplicate
blocked, no-active-cohort hidden state), following `signup-join-dashboard.spec.ts` conventions
(service-role seeding, `beforeAll`/`afterAll` cleanup).
**Dependencies**: Task 6.
**Validation**: `npx playwright test --project=chromium tests/e2e/daily-checkin.spec.ts` green.

## Task 8 — Docs/changelog
**Files**: any project changelog if one exists (none found at repo root — skip unless one is added
before this ships); update `docs/superpowers/specs/2026-06-23-nixit-mvp-design.md` to move "streak
tracking" from Deferred to Shipped, per the update-docs-on-code-change convention (keep docs in sync
with the feature that just landed).
**Dependencies**: Task 7 passing.
**Validation**: doc reviewed alongside PR.

## Sequencing Summary

```
Task 1 (schema) ─▶ Task 2 (RPC) ─▶ Task 6 (integration) ─▶ Task 7 (e2e) ─▶ Task 8 (docs)
             └────▶ Task 3 (RLS) ──────────┘
Task 4 (pure helpers) ─▶ Task 5 (component) ──────────────▶ Task 6
```

Tasks 1-4 are parallelizable (no shared files). Task 6 is the integration point and blocks on 2, 3, 5.
