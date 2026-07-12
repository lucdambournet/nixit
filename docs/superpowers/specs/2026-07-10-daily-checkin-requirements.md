# DailyCheckIn — Requirements

**Issue**: #64 — "Create plan and spec to implement DailyCheckin"
**Source reference**: `RaphaelThineyUE/vape-zero` → `src/components/DailyCheckIn.tsx`, wired in `src/App.tsx`
**Status**: Draft for review
**Confidence Score**: 78% (Medium) — see Design doc Decision Record on scope

## 1. Problem Statement

NixIt's MVP design doc (`docs/superpowers/specs/2026-06-23-nixit-mvp-design.md`) explicitly deferred
"gamification or streak rewards beyond the cohort timer." The reference app `vape-zero` ships a
`DailyCheckIn` component: a 7-day cycling check-in card with a streak counter and a
credits/XP/level reward economy. It is 100% client-side — `useState` + `localStorage`, no backend,
no auth, no persistence across devices, and rewards spend into an in-memory "Z-Credits" shop economy
that NixIt does not have.

NixIt is a Supabase-backed, multi-device, cohort-based cessation app with server-enforced mutations
(`join_cohort` RPC). Porting `DailyCheckIn` as-is would reintroduce a client-trusted, single-device,
economy-dependent feature that doesn't fit NixIt's architecture or its already-deferred scope
decision. This spec defines what a NixIt-native version of daily check-in should be.

## 2. Source Feature Inventory (what vape-zero actually does)

- 7-day reward cycle (`REWARDS` array), one check-in per calendar day (`lastCheckIn` date-string gate).
- Streak increments if the gap since last check-in is ≤ 1 day; resets to 1 otherwise.
- On claim: awards credits, optional "money saved" bonus, XP (with a level-up threshold at 100 XP),
  and on day 7 an "epic" item badge; day counter wraps back to day 1 after day 7.
- All state in two `localStorage` keys (`vapezero_checked_days`, `vapezero_last_check_in`); no
  server round-trip, no user identity — a single browser profile has one shared check-in state.
- UI: a card with a 7-cell day-progress row, an active "claim" button, and a reward modal on claim.

## 3. Requirements (EARS Notation)

### 3.1 Core check-in

- **REQ-1 (Event-driven)**: WHEN an authenticated user with an active cohort opens the Dashboard home
  screen AND has not yet checked in for the current calendar day (in their local timezone), THE SYSTEM
  SHALL display an available "Daily Check-In" action.
- **REQ-2 (Event-driven)**: WHEN the user submits a check-in, THE SYSTEM SHALL record one check-in row
  server-side for that user for the current calendar date, reject a second check-in for the same date,
  and return the updated streak count.
- **REQ-3 (State-driven)**: WHILE the user has already checked in for the current calendar date, THE
  SYSTEM SHALL render the check-in action as completed/disabled and SHALL NOT allow a duplicate claim
  (server-enforced, not just UI-disabled).
- **REQ-4 (Ubiquitous)**: THE SYSTEM SHALL compute and persist a `current_streak` count that increments
  by 1 when the previous check-in was on the calendar day immediately before today, and resets to 1
  otherwise (including on first-ever check-in).
- **REQ-5 (Ubiquitous)**: THE SYSTEM SHALL persist a `longest_streak` count that is the maximum
  `current_streak` ever achieved by that user.

### 3.2 Streak integrity (server-authoritative)

- **REQ-6 (Unwanted behavior)**: IF a client attempts to submit a check-in for a date other than the
  server's current date (clock tampering, replay), THEN THE SYSTEM SHALL ignore the client-supplied
  date and use the server's `now()` exclusively.
- **REQ-7 (Unwanted behavior)**: IF a client attempts to submit a check-in on behalf of another user,
  THEN THE SYSTEM SHALL reject the request (mutation scoped to `auth.uid()`, mirroring `join_cohort`).
- **REQ-8 (Unwanted behavior)**: IF the user has no active cohort (`users.active_cohort_id is null`),
  THEN THE SYSTEM SHALL reject the check-in with a clear error rather than silently recording it.

### 3.3 UI / feedback

- **REQ-9 (Event-driven)**: WHEN a check-in succeeds, THE SYSTEM SHALL show immediate confirmation
  (toast and/or modal) including the new streak count.
- **REQ-10 (Ubiquitous)**: THE SYSTEM SHALL display the current streak count on the Dashboard home
  screen at all times (not only inside the check-in card), consistent with NixIt's existing
  cohort-timer-first visual hierarchy.
- **REQ-11 (State-driven)**: WHILE streak data is loading, THE SYSTEM SHALL show a neutral/loading
  state rather than a false "not checked in" flash.

### 3.4 Out of scope for v1 (see Design doc §Decision Record)

- **REQ-12 (Optional / deferred)**: WHERE a future phase introduces a rewards economy (credits, XP,
  levels, spendable items), THE SYSTEM SHALL treat it as an additive layer on top of the
  `daily_check_ins`/streak data model defined here, not a v1 requirement.

## 4. Edge Case Matrix

| # | Scenario | Expected behavior |
|---|---|---|
| 1 | User checks in twice same day (double-click / two tabs) | Second request rejected server-side (unique constraint on `(user_id, check_in_date)`); UI shows already-checked-in state |
| 2 | User checks in every day, no gaps | `current_streak` increments daily; `longest_streak` tracks max |
| 3 | User misses exactly one day | Next check-in resets `current_streak` to 1; `longest_streak` unaffected |
| 4 | User's local clock is wrong / crosses timezone mid-trip | Streak date math uses server `now()`/`current_date`, not client-supplied date, so no exploit; day boundary may feel off by a few hours to the user — acceptable, document as known limitation |
| 5 | User has no `active_cohort_id` (between cohorts) | Check-in rejected with explicit error; Dashboard does not show the action for users with no active cohort |
| 6 | User checks in right at midnight boundary | Determined by DB `current_date` at insert time — atomic, no race beyond normal DB serialization |
| 7 | Network failure after user taps "check in" but before response | Client shows optimistic-pending state, reconciles on response; on error, reverts UI and surfaces retry — no local-only fallback (avoids the source app's client-trust bug) |
| 8 | User leaves cohort / cohort ends mid-streak | Streak is user-scoped, not cohort-scoped, so it survives cohort transitions unless product decides otherwise (flagged as an open question below) |
| 9 | New user, first-ever check-in | `current_streak` = 1, `longest_streak` = 1, no prior row required (no upsert-vs-insert ambiguity — always insert) |
| 10 | Row-level security: user A queries user B's check-in history | Denied — RLS scoped to `auth.uid() = user_id`, mirroring `users` table policy |

## 5. Open Questions (for product/user before Phase 2 build)

1. Is streak identity per-user (survives across cohorts) or per-cohort-enrollment (resets on
   `leave_cohort`)? This spec defaults to **per-user** (simpler, matches "habit tracking" framing) but
   flags it as a decision the user should confirm.
2. Does v1 need any reward beyond streak count itself (e.g., a small non-monetary badge at 7/30/100
   days), or is streak visibility alone sufficient for v1? Design doc proposes a minimal milestone
   badge with no economy, deferring credits/XP/levels entirely.
3. Should check-in also live on `SideNav` as a top-level destination, or stay embedded as a Dashboard
   home-screen card? This spec defaults to a home-screen `Card`, matching REQ-10 and the existing
   `HomeScreen` layout precedent (chat teaser card).

## 6. Dependencies & Constraints

- Requires an authenticated Supabase session and an existing `public.users` row (established at
  signup) — same precondition as `join_cohort`.
- Requires a new `daily_check_ins` table + RLS policies + a `record_check_in()` `security definer`
  RPC (no client-side streak math, per REQ-6/REQ-7).
- No new client dependency needed — NixIt has no `framer-motion`/`motion` package; the source app's
  animated modal (`motion/react`) is not required and should not be added for this feature (see
  Design doc for the CSS-transition alternative using existing tokens).
- Must follow existing patterns: inline `supabase.auth.getUser()` (no `useAuth` hook exists yet — not
  introducing one is a deliberate non-goal per the Explore findings), `Card` component variants,
  `tests/e2e/*.spec.ts` + `tests/unit/*.test.ts` conventions.
