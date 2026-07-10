# CraveCrushers Design

Date: 2026-07-10
Issue: #65

## Overview

CraveCrushers is a set of quick, in-app mini-games/exercises a user can reach for the moment a nicotine craving hits. The goal is distraction and physiological calming during the ~90 seconds to few minutes a craving peaks, not entertainment for its own sake.

Reference: [vape-zero](https://github.com/RaphaelThineyUE/vape-zero) already ships a "Crave Crusher" orb-tap arcade game and an "Emergency Breathing Shield" box-breathing modal. This spec ports the breathing exercise, drops the orb-tap arcade, and adds two new games (Craving Countdown, Ping-Pong vs AI) better suited to NixIt's calmer, cohort-support tone.

## Goal

Let a user in the middle of a craving:

- reach a distraction/calming tool in one tap from the Dashboard,
- also browse and replay the same tools anytime from the main nav,
- play one of three mini-games/exercises,
- have that session counted toward a personal "cravings crushed" stat.

## Scope

### Included in MVP

- New `Crave` item in `SideNav`, alongside Home/Chat/Dates/Profile
- New SOS button on the Dashboard Home screen ("Feeling a craving?") — same destination as the nav item
- `CraveCrushers` picker screen with three game cards:
  - **Box Breathing** — guided 4-4-4 (In/Hold/Out) breathing, ported from vape-zero, no audio
  - **Craving Countdown** — fixed 90s timer with a tappable stress-ball/balloon release mechanic
  - **Ping-Pong vs AI** — canvas single-player pong, player vs. a lagging AI paddle
- Session logging: one row per game session (`craving_sessions` table), written when the user exits the game, best-effort/non-blocking
- Unit tests for each game's pure logic, e2e coverage of the picker → game → exit flow

### Deferred (backlog)

- Orb Crush arcade game (dropped from MVP in favor of Ping-Pong vs AI)
- Memory/Match game
- Multiplayer games (playing against other cohort members)
- Session outcome tracking (e.g. "did this help?"), streaks/badges tied to CraveCrushers usage
- Audio/sound effects in Box Breathing

## Architecture

NixIt's `Dashboard.tsx` does not use nested routes — it switches between `home | chat | dates | profile` via local state rendered inside one `<Route path="/dashboard">`. CraveCrushers follows the same pattern with a new `'crave'` page value, but its implementation lives in new files rather than growing the already-615-line `Dashboard.tsx` further:

```
src/app/pages/crave/
  CraveCrushers.tsx        # picker screen: 3 game cards, mounts selected game
  useCravingSession.ts     # shared hook: tracks start time, writes craving_sessions row on exit
  games/
    BoxBreathing.tsx
    CravingCountdown.tsx
    PingPongAI.tsx
```

`Dashboard.tsx` changes are limited to:

- add `'crave'` to the `Page` union
- add a `Crave` entry to the `SideNav` `items` array
- add an SOS `Button` on `HomeScreen` that calls the same `onNavigate('crave')` handler as the nav item
- render `<CraveCrushers />` when `page === 'crave'`

Both entry points land on the same picker screen — no duplicated modal/game logic between the Dashboard shortcut and the nav page.

## Data Model

New table, following the existing `supabase/schema.sql` conventions (see `chat_messages` for the closest analog):

```sql
create table if not exists craving_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  game_type text not null check (game_type in ('box_breathing', 'craving_countdown', 'ping_pong_ai')),
  started_at timestamptz not null,
  duration_seconds int not null check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_craving_sessions_user_created
  on craving_sessions(user_id, created_at);
```

RLS (`supabase/rls_policies.sql` conventions):

```sql
alter table public.craving_sessions enable row level security;

create policy "users can read own craving sessions"
  on public.craving_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can log own craving sessions"
  on public.craving_sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
```

No cohort scoping — this is a personal stat, not shared with cohort members in this spec.

## Core User Flows

### 1. Enter from Dashboard SOS

User on Home taps "Feeling a craving?" → navigates to the CraveCrushers picker (`page = 'crave'`).

### 2. Enter from nav

User taps `Crave` in `SideNav` at any time → same picker screen.

### 3. Play a game

User taps one of the three game cards → that game mounts full-screen with a back/close control. `useCravingSession` records `started_at` on mount.

### 4. Exit a game

User taps back/close (or a game's natural end, e.g. Craving Countdown hitting 0) → `useCravingSession` computes `duration_seconds` and fires a best-effort insert into `craving_sessions`, then returns to the picker. A failed insert is swallowed (console warning only) — it never blocks navigation.

## Game Mechanics

### Box Breathing

4-4-4 cycle: In (4s) → Hold (4s) → Out (4s) → repeat. Animated circle expands during In, holds during Hold, contracts during Out. Phase label and elapsed cycle count shown. Free-running — no forced end, user exits whenever ready.

### Craving Countdown

Fixed 90-second countdown, framed as "urges peak and fade — this one ends in 90s." A tappable stress-ball/balloon graphic: each tap plays a small deflate/release animation and increments a tap tally. No score or combo multiplier — the point is release, not a dopamine chase. Auto-completes at 0:00 with a short affirming message, then returns to the picker (still logs the session).

### Ping-Pong vs AI

Canvas game. Player paddle controlled by drag (touch) or arrow keys (desktop); AI paddle follows the ball's y-position with a lag/error term so it's beatable, not perfect. Ball speeds up slightly on each paddle hit, bounces off top/bottom walls. Free-play — no win condition or score persistence in this spec; only session duration is logged.

## Error Handling

| Failure | Response |
| --- | --- |
| `craving_sessions` insert fails (network, RLS, etc.) | Swallow in `useCravingSession`'s try/catch, `console.warn`. Never blocks exit/navigation. |
| Canvas unsupported (very old browser) | Out of scope — no fallback; NixIt's existing browser support baseline applies. |

No other new failure surfaces: all three games are client-side state/canvas with no external calls besides the one fire-and-forget insert.

## Testing Strategy

**Unit (Vitest, `tests/unit/`):**
- Box Breathing: phase-cycle reducer (In → Hold → Out → In timing and transitions)
- Craving Countdown: tick-to-zero logic, tap tally increment
- Ping-Pong vs AI: ball/paddle collision math, AI paddle lag/follow logic
- `useCravingSession`: duration calculation, insert-failure is swallowed and doesn't throw

**E2E (Playwright, `tests/`):**
- SOS button on Home and `Crave` nav item both land on the CraveCrushers picker
- Each of the three game cards renders its game and exposes a working exit control
- Exiting a game (via back/close, and via natural completion for Craving Countdown) returns to the picker without hanging

Following this repo's Playwright conventions: role-based locators, `test.step()` grouping, no hard-coded waits.
