# CraveCrushers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user in the middle of a nicotine craving reach one of three quick, calming mini-games (Box Breathing, Craving Countdown, Ping-Pong vs AI) in one tap from the Dashboard or nav, and log each play session.

**Architecture:** New `src/app/pages/crave/` directory holds a `CraveCrushers` picker screen, a `useCravingSession` hook, and three game components under `games/`. Pure game logic (timing, physics, tally math) lives in `src/app/lib/` as standalone functions, mirroring the existing `dailyCheckIn.ts` / `presence.ts` / `useIsActive.ts` pattern of "pure function + thin component/hook wrapper" so logic is unit-testable without mocking Supabase or React. `Dashboard.tsx` gains one new `Page` value (`'crave'`), one nav item, and one SOS button — no other structural change.

**Tech Stack:** React 18 + TypeScript (strict), Vite, Supabase (Postgres + RLS), Vitest (unit), Playwright (e2e). No new dependencies.

## Global Constraints

- Follow `docs/superpowers/specs/2026-07-10-crave-crushers-design.md` — this plan implements that spec exactly; MVP scope only (no Orb Crush, no Memory/Match, no multiplayer, no outcome tracking, no audio).
- Styling: inline `style={{...}}` objects using the existing CSS custom properties (`var(--font-display)`, `var(--color-text)`, etc.) — no Tailwind, no CSS modules. Match the visual idiom already used in `Dashboard.tsx` / `DailyCheckInCard.tsx`.
- TypeScript strict mode is on (`tsconfig.json`) — no `any`, no unused imports.
- Unit tests: pure logic only, no Supabase mocking (repo has no mocking convention for the Supabase client — see `presence.test.ts` / `activity.test.ts`). Anything that needs Supabase gets its side-effecting call injected as a parameter so it's testable without a real client.
- Test commands: `npm run test` (runs `vitest run tests/unit`), `npm run build` (runs `tsc && vite build`), `npx playwright test tests/e2e/<file>.spec.ts` for a single e2e file (requires `.env` with `VITE_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` and the dev server, same as `daily-checkin.spec.ts`).
- Commit after every task (frequent, small commits — see step-by-step below).
- The `craving_sessions` table (Task 1) must be applied to the connected Supabase project's schema before the e2e test in Task 11 will pass end-to-end. It is not applied automatically by any build step — apply it the same way `chat_messages` / `daily_check_ins` were applied (Supabase MCP `apply_migration`, or the SQL editor, running the new blocks from `supabase/schema.sql` and `supabase/rls_policies.sql`).

---

## File Structure

```
src/app/lib/
  boxBreathing.ts          # pure: breathing phase/cycle timing
  cravingCountdown.ts      # pure: countdown remaining-seconds + tap tally
  pingPongAI.ts            # pure: ball/paddle physics + AI paddle lag

src/app/pages/crave/
  useCravingSession.ts     # pure duration calc + logCravingSession + hook
  CraveCrushers.tsx        # picker screen, 3 cards, mounts selected game
  games/
    BoxBreathing.tsx
    CravingCountdown.tsx
    PingPongAI.tsx

src/app/pages/Dashboard.tsx # modified: 'crave' page, nav item, SOS button

supabase/schema.sql         # modified: craving_sessions table
supabase/rls_policies.sql   # modified: craving_sessions RLS

tests/unit/box-breathing.test.ts
tests/unit/craving-countdown.test.ts
tests/unit/ping-pong-ai.test.ts
tests/unit/craving-session.test.ts
tests/e2e/crave-crushers.spec.ts
```

---

### Task 1: Data model — `craving_sessions` table + RLS

**Files:**
- Modify: `supabase/schema.sql` (append at end of file)
- Modify: `supabase/rls_policies.sql` (append at end of file)

**Interfaces:**
- Produces: table `craving_sessions(id uuid, user_id uuid, game_type text, started_at timestamptz, duration_seconds int, created_at timestamptz)` — consumed by Task 5's `logCravingSession`.

- [ ] **Step 1: Append the table + index to `supabase/schema.sql`**

```sql

-- Craving sessions: one row per CraveCrushers play session (personal stat, no cohort scoping)
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

- [ ] **Step 2: Append RLS policies to `supabase/rls_policies.sql`**

```sql

-- ── craving_sessions: personal only, no cohort scoping ─────────
grant select, insert on table public.craving_sessions to authenticated;
grant select, insert, update, delete on table public.craving_sessions to service_role;

alter table public.craving_sessions enable row level security;

drop policy if exists "users can read own craving sessions" on public.craving_sessions;
create policy "users can read own craving sessions"
  on public.craving_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users can log own craving sessions" on public.craving_sessions;
create policy "users can log own craving sessions"
  on public.craving_sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
```

- [ ] **Step 3: Review against the `chat_messages` table conventions**

Diff the new blocks against the existing `chat_messages` table/policies in the same two files — confirm matching style: `if not exists`, `check` constraints inline, `drop policy if exists` before every `create policy`, grants precede RLS enable. No automated test for this step (schema files aren't type-checked); this review is the verification.

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql supabase/rls_policies.sql
git commit -m "feat: add craving_sessions table and RLS policies (#65)"
```

---

### Task 2: Box Breathing pure logic

**Files:**
- Create: `src/app/lib/boxBreathing.ts`
- Test: `tests/unit/box-breathing.test.ts`

**Interfaces:**
- Produces: `BreathPhase = 'in' | 'hold' | 'out'`, `computeBreathState(elapsedMs: number): { phase: BreathPhase; phaseElapsedMs: number; cycleCount: number }` — consumed by Task 6's `BoxBreathing.tsx`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { computeBreathState } from '../../src/app/lib/boxBreathing';

describe('computeBreathState', () => {
  it('starts in the "in" phase at elapsed 0', () => {
    expect(computeBreathState(0)).toEqual({ phase: 'in', phaseElapsedMs: 0, cycleCount: 0 });
  });

  it('stays in "in" just before the 4s mark', () => {
    expect(computeBreathState(3999)).toEqual({ phase: 'in', phaseElapsedMs: 3999, cycleCount: 0 });
  });

  it('moves to "hold" exactly at 4s', () => {
    expect(computeBreathState(4000)).toEqual({ phase: 'hold', phaseElapsedMs: 0, cycleCount: 0 });
  });

  it('moves to "out" exactly at 8s', () => {
    expect(computeBreathState(8000)).toEqual({ phase: 'out', phaseElapsedMs: 0, cycleCount: 0 });
  });

  it('wraps back to "in" and increments cycleCount at 12s', () => {
    expect(computeBreathState(12000)).toEqual({ phase: 'in', phaseElapsedMs: 0, cycleCount: 1 });
  });

  it('tracks phaseElapsedMs correctly mid-second-cycle', () => {
    expect(computeBreathState(13500)).toEqual({ phase: 'in', phaseElapsedMs: 1500, cycleCount: 1 });
  });

  it('clamps negative elapsed to the start of "in"', () => {
    expect(computeBreathState(-50)).toEqual({ phase: 'in', phaseElapsedMs: 0, cycleCount: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/box-breathing.test.ts`
Expected: FAIL — `Cannot find module '../../src/app/lib/boxBreathing'`

- [ ] **Step 3: Write the implementation**

```typescript
export type BreathPhase = 'in' | 'hold' | 'out';

export interface BreathState {
  phase: BreathPhase;
  phaseElapsedMs: number;
  cycleCount: number;
}

const PHASE_DURATION_MS = 4000;
const PHASE_ORDER: readonly BreathPhase[] = ['in', 'hold', 'out'];

/** Free-running 4-4-4 box breathing cycle, driven entirely by elapsed time since the exercise started. */
export function computeBreathState(elapsedMs: number): BreathState {
  const cycleMs = PHASE_DURATION_MS * PHASE_ORDER.length;
  const clampedElapsed = Math.max(0, elapsedMs);
  const cycleCount = Math.floor(clampedElapsed / cycleMs);
  const withinCycleMs = clampedElapsed % cycleMs;
  const phaseIndex = Math.floor(withinCycleMs / PHASE_DURATION_MS);
  const phaseElapsedMs = withinCycleMs % PHASE_DURATION_MS;

  return { phase: PHASE_ORDER[phaseIndex], phaseElapsedMs, cycleCount };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/box-breathing.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/boxBreathing.ts tests/unit/box-breathing.test.ts
git commit -m "feat: add Box Breathing phase-cycle logic (#65)"
```

---

### Task 3: Craving Countdown pure logic

**Files:**
- Create: `src/app/lib/cravingCountdown.ts`
- Test: `tests/unit/craving-countdown.test.ts`

**Interfaces:**
- Produces: `COUNTDOWN_DURATION_S = 90`, `computeRemainingSeconds(elapsedMs: number): number`, `isCountdownComplete(remainingSeconds: number): boolean`, `incrementTapTally(tally: number): number` — consumed by Task 7's `CravingCountdown.tsx`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { computeRemainingSeconds, incrementTapTally, isCountdownComplete } from '../../src/app/lib/cravingCountdown';

describe('computeRemainingSeconds', () => {
  it('starts at 90 seconds when elapsed is 0', () => {
    expect(computeRemainingSeconds(0)).toBe(90);
  });

  it('counts down by whole seconds', () => {
    expect(computeRemainingSeconds(1000)).toBe(89);
  });

  it('reaches 0 exactly at 90 seconds', () => {
    expect(computeRemainingSeconds(90000)).toBe(0);
  });

  it('clamps to 0 rather than going negative past 90 seconds', () => {
    expect(computeRemainingSeconds(120000)).toBe(0);
  });
});

describe('isCountdownComplete', () => {
  it('is true at exactly 0 remaining seconds', () => {
    expect(isCountdownComplete(0)).toBe(true);
  });

  it('is false with 1 or more remaining seconds', () => {
    expect(isCountdownComplete(1)).toBe(false);
  });
});

describe('incrementTapTally', () => {
  it('increments from 0', () => {
    expect(incrementTapTally(0)).toBe(1);
  });

  it('increments from a positive tally', () => {
    expect(incrementTapTally(5)).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/craving-countdown.test.ts`
Expected: FAIL — `Cannot find module '../../src/app/lib/cravingCountdown'`

- [ ] **Step 3: Write the implementation**

```typescript
export const COUNTDOWN_DURATION_S = 90;

/** Whole seconds remaining in the fixed 90s countdown, clamped to [0, 90]. */
export function computeRemainingSeconds(elapsedMs: number): number {
  const elapsedSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  return Math.max(0, COUNTDOWN_DURATION_S - elapsedSeconds);
}

export function isCountdownComplete(remainingSeconds: number): boolean {
  return remainingSeconds <= 0;
}

export function incrementTapTally(tally: number): number {
  return tally + 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/craving-countdown.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/cravingCountdown.ts tests/unit/craving-countdown.test.ts
git commit -m "feat: add Craving Countdown timer/tally logic (#65)"
```

---

### Task 4: Ping-Pong vs AI pure logic

**Files:**
- Create: `src/app/lib/pingPongAI.ts`
- Test: `tests/unit/ping-pong-ai.test.ts`

**Interfaces:**
- Produces: `COURT_HEIGHT = 300`, `PADDLE_HEIGHT = 60`, `AI_FOLLOW_SPEED = 4`, `stepBallWallBounce(y, vy, courtHeight?): { y: number; vy: number }`, `reflectOffPaddle(vx: number): number`, `stepAiPaddle(aiPaddleY, ballY, followSpeed?): number`, `isPaddleHit(ballY, paddleY, paddleHeight?): boolean` — consumed by Task 8's `PingPongAI.tsx`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { isPaddleHit, reflectOffPaddle, stepAiPaddle, stepBallWallBounce } from '../../src/app/lib/pingPongAI';

describe('stepBallWallBounce', () => {
  it('bounces off the top wall, flipping vy to positive', () => {
    expect(stepBallWallBounce(-5, -3, 300)).toEqual({ y: 0, vy: 3 });
  });

  it('bounces off the bottom wall, flipping vy to negative', () => {
    expect(stepBallWallBounce(305, 3, 300)).toEqual({ y: 300, vy: -3 });
  });

  it('leaves y/vy unchanged mid-court', () => {
    expect(stepBallWallBounce(150, 3, 300)).toEqual({ y: 150, vy: 3 });
  });
});

describe('reflectOffPaddle', () => {
  it('flips and speeds up a positive vx', () => {
    expect(reflectOffPaddle(5)).toBeCloseTo(-5.25);
  });

  it('flips and speeds up a negative vx', () => {
    expect(reflectOffPaddle(-5)).toBeCloseTo(5.25);
  });
});

describe('stepAiPaddle', () => {
  it('does not move when already aligned with the ball', () => {
    expect(stepAiPaddle(100, 100, 4)).toBe(100);
  });

  it('snaps to the ball when within followSpeed', () => {
    expect(stepAiPaddle(100, 102, 4)).toBe(102);
  });

  it('moves toward the ball by followSpeed when far below', () => {
    expect(stepAiPaddle(100, 150, 4)).toBe(104);
  });

  it('moves toward the ball by followSpeed when far above', () => {
    expect(stepAiPaddle(100, 50, 4)).toBe(96);
  });
});

describe('isPaddleHit', () => {
  it('is true at the paddle center', () => {
    expect(isPaddleHit(100, 100, 60)).toBe(true);
  });

  it('is true at the paddle edge (inclusive)', () => {
    expect(isPaddleHit(130, 100, 60)).toBe(true);
  });

  it('is false just past the paddle edge', () => {
    expect(isPaddleHit(131, 100, 60)).toBe(false);
  });

  it('is false well outside the paddle', () => {
    expect(isPaddleHit(65, 100, 60)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ping-pong-ai.test.ts`
Expected: FAIL — `Cannot find module '../../src/app/lib/pingPongAI'`

- [ ] **Step 3: Write the implementation**

```typescript
export const COURT_HEIGHT = 300;
export const PADDLE_HEIGHT = 60;
export const BALL_SPEED_UP_FACTOR = 1.05;
export const AI_FOLLOW_SPEED = 4;

/** Reflects the ball off the top/bottom walls; no-op when still mid-court. */
export function stepBallWallBounce(y: number, vy: number, courtHeight: number = COURT_HEIGHT): { y: number; vy: number } {
  if (y <= 0) return { y: 0, vy: Math.abs(vy) };
  if (y >= courtHeight) return { y: courtHeight, vy: -Math.abs(vy) };
  return { y, vy };
}

/** Flips horizontal direction and speeds the ball up slightly on every paddle hit. */
export function reflectOffPaddle(vx: number): number {
  return -vx * BALL_SPEED_UP_FACTOR;
}

/** AI paddle follows the ball's y but is capped at followSpeed per tick — laggy, so beatable. */
export function stepAiPaddle(aiPaddleY: number, ballY: number, followSpeed: number = AI_FOLLOW_SPEED): number {
  const diff = ballY - aiPaddleY;
  if (Math.abs(diff) <= followSpeed) return ballY;
  return aiPaddleY + Math.sign(diff) * followSpeed;
}

export function isPaddleHit(ballY: number, paddleY: number, paddleHeight: number = PADDLE_HEIGHT): boolean {
  return ballY >= paddleY - paddleHeight / 2 && ballY <= paddleY + paddleHeight / 2;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ping-pong-ai.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/pingPongAI.ts tests/unit/ping-pong-ai.test.ts
git commit -m "feat: add Ping-Pong vs AI physics/lag logic (#65)"
```

---

### Task 5: `useCravingSession` hook

**Files:**
- Create: `src/app/pages/crave/useCravingSession.ts`
- Test: `tests/unit/craving-session.test.ts`

**Interfaces:**
- Consumes: `supabase` from `../../lib/supabase` (existing client, same import used by `Dashboard.tsx`).
- Produces: `GameType = 'box_breathing' | 'craving_countdown' | 'ping_pong_ai'`, `computeDurationSeconds(startedAtMs: number, endedAtMs: number): number`, `logCravingSession(insert, row): Promise<void>`, `useCravingSession(userId: string, gameType: GameType): { endSession: () => void }` — consumed by Tasks 6/7/8's game components.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { computeDurationSeconds, logCravingSession } from '../../src/app/pages/crave/useCravingSession';

describe('computeDurationSeconds', () => {
  it('is 0 when start and end are the same instant', () => {
    expect(computeDurationSeconds(1000, 1000)).toBe(0);
  });

  it('rounds to the nearest whole second', () => {
    expect(computeDurationSeconds(1000, 4000)).toBe(3);
    expect(computeDurationSeconds(0, 2600)).toBe(3);
  });

  it('never goes negative even if endedAt is before startedAt', () => {
    expect(computeDurationSeconds(5000, 1000)).toBe(0);
  });
});

describe('logCravingSession', () => {
  const row = { user_id: 'user-1', game_type: 'box_breathing' as const, started_at: '2026-07-10T00:00:00.000Z', duration_seconds: 42 };

  it('resolves without throwing when the insert succeeds', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    await expect(logCravingSession(insert, row)).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalledWith(row);
  });

  it('swallows an error returned by insert and warns instead of throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const insert = vi.fn().mockResolvedValue({ error: { message: 'RLS violation' } });

    await expect(logCravingSession(insert, row)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('Failed to log craving session:', 'RLS violation');

    warn.mockRestore();
  });

  it('swallows a thrown network error and warns instead of throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const insert = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(logCravingSession(insert, row)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('Failed to log craving session:', expect.any(Error));

    warn.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/craving-session.test.ts`
Expected: FAIL — `Cannot find module '../../src/app/pages/crave/useCravingSession'`

- [ ] **Step 3: Write the implementation**

```typescript
import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export type GameType = 'box_breathing' | 'craving_countdown' | 'ping_pong_ai';

export interface CravingSessionRow {
  user_id: string;
  game_type: GameType;
  started_at: string;
  duration_seconds: number;
}

/** Whole seconds between two Date.now()-style millisecond timestamps, never negative. */
export function computeDurationSeconds(startedAtMs: number, endedAtMs: number): number {
  return Math.max(0, Math.round((endedAtMs - startedAtMs) / 1000));
}

/** Best-effort session log: the insert function is injected so failures (RLS, network) never block navigation. */
export async function logCravingSession(
  insert: (row: CravingSessionRow) => Promise<{ error: { message: string } | null }>,
  row: CravingSessionRow
): Promise<void> {
  try {
    const { error } = await insert(row);
    if (error) {
      console.warn('Failed to log craving session:', error.message);
    }
  } catch (err) {
    console.warn('Failed to log craving session:', err);
  }
}

export function useCravingSession(userId: string, gameType: GameType): { endSession: () => void } {
  const startedAtMsRef = useRef(Date.now());
  const startedAtIsoRef = useRef(new Date().toISOString());

  useEffect(() => {
    startedAtMsRef.current = Date.now();
    startedAtIsoRef.current = new Date().toISOString();
  }, [gameType]);

  const endSession = () => {
    const duration = computeDurationSeconds(startedAtMsRef.current, Date.now());
    void logCravingSession(
      row => supabase.from('craving_sessions').insert(row),
      { user_id: userId, game_type: gameType, started_at: startedAtIsoRef.current, duration_seconds: duration }
    );
  };

  return { endSession };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/craving-session.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/pages/crave/useCravingSession.ts tests/unit/craving-session.test.ts
git commit -m "feat: add useCravingSession hook for best-effort session logging (#65)"
```

---

### Task 6: Box Breathing game component

**Files:**
- Create: `src/app/pages/crave/games/BoxBreathing.tsx`

**Interfaces:**
- Consumes: `computeBreathState` from `../../../lib/boxBreathing` (Task 2), `useCravingSession` from `../useCravingSession` (Task 5), `Button` from `../../../components/ui/Button`.
- Produces: `BoxBreathing({ userId: string; onExit: () => void })` — consumed by Task 9's `CraveCrushers.tsx`.

No unit test for this component — it's a thin timer/render wrapper around the already-tested `computeBreathState`; correctness of the mounted UI is covered by the e2e test in Task 11 (matches the existing convention: `DailyCheckInCard.tsx` has no dedicated unit test either).

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { computeBreathState, type BreathPhase } from '../../../lib/boxBreathing';
import { useCravingSession } from '../useCravingSession';

interface BoxBreathingProps {
  userId: string;
  onExit: () => void;
}

const PHASE_LABEL: Record<BreathPhase, string> = { in: 'Breathe in', hold: 'Hold', out: 'Breathe out' };
const PHASE_SIZE: Record<BreathPhase, number> = { in: 220, hold: 220, out: 140 };

export function BoxBreathing({ userId, onExit }: BoxBreathingProps) {
  const { endSession } = useCravingSession(userId, 'box_breathing');
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  const { phase, cycleCount } = computeBreathState(now - startedAt);

  const handleExit = () => {
    endSession();
    onExit();
  };

  return (
    <div style={{ padding: '32px 40px 64px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      <div style={{ width: '100%' }}>
        <Button variant="ghost" size="sm" onClick={handleExit}>← Back to Crave Crushers</Button>
      </div>

      <div
        style={{
          width: PHASE_SIZE[phase],
          height: PHASE_SIZE[phase],
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--purple-400) 0%, var(--lavender-400) 100%)',
          transition: 'width 4s linear, height 4s linear',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'white' }}>
          {PHASE_LABEL[phase]}
        </span>
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
        Cycles completed: {cycleCount}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/pages/crave/games/BoxBreathing.tsx
git commit -m "feat: add Box Breathing game screen (#65)"
```

---

### Task 7: Craving Countdown game component

**Files:**
- Create: `src/app/pages/crave/games/CravingCountdown.tsx`

**Interfaces:**
- Consumes: `computeRemainingSeconds`, `incrementTapTally`, `isCountdownComplete` from `../../../lib/cravingCountdown` (Task 3), `useCravingSession` from `../useCravingSession` (Task 5), `Button` from `../../../components/ui/Button`.
- Produces: `CravingCountdown({ userId: string; onExit: () => void })` — consumed by Task 9's `CraveCrushers.tsx`.

No unit test for this component (same rationale as Task 6) — covered by e2e in Task 11.

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { computeRemainingSeconds, incrementTapTally, isCountdownComplete } from '../../../lib/cravingCountdown';
import { useCravingSession } from '../useCravingSession';

interface CravingCountdownProps {
  userId: string;
  onExit: () => void;
}

export function CravingCountdown({ userId, onExit }: CravingCountdownProps) {
  const { endSession } = useCravingSession(userId, 'craving_countdown');
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [tally, setTally] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const remaining = computeRemainingSeconds(now - startedAt);
  const complete = isCountdownComplete(remaining);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const handleExit = () => {
    endSession();
    onExit();
  };

  return (
    <div style={{ padding: '32px 40px 64px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      <div style={{ width: '100%' }}>
        <Button variant="ghost" size="sm" onClick={handleExit}>← Back to Crave Crushers</Button>
      </div>

      {complete ? (
        <>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--color-text)', textAlign: 'center' }}>
            That craving passed. Nice work.
          </p>
          <Button variant="solid" size="md" onClick={handleExit}>Done</Button>
        </>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-3xl)', color: 'var(--color-text)' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <button
            aria-label="Release tension"
            onClick={() => setTally(incrementTapTally)}
            style={{
              all: 'unset', cursor: 'pointer', width: 160, height: 160, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--purple-400) 0%, var(--lavender-400) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              fontFamily: 'var(--font-body)', color: 'white', fontWeight: 600,
            }}
          >
            Tap to release
          </button>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Taps: {tally}
          </p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/pages/crave/games/CravingCountdown.tsx
git commit -m "feat: add Craving Countdown game screen (#65)"
```

---

### Task 8: Ping-Pong vs AI game component

**Files:**
- Create: `src/app/pages/crave/games/PingPongAI.tsx`

**Interfaces:**
- Consumes: `COURT_HEIGHT`, `PADDLE_HEIGHT`, `AI_FOLLOW_SPEED`, `stepBallWallBounce`, `reflectOffPaddle`, `stepAiPaddle`, `isPaddleHit` from `../../../lib/pingPongAI` (Task 4), `useCravingSession` from `../useCravingSession` (Task 5), `Button` from `../../../components/ui/Button`.
- Produces: `PingPongAI({ userId: string; onExit: () => void })` — consumed by Task 9's `CraveCrushers.tsx`.

No unit test for this component — it's a canvas render loop wrapper around already-tested physics functions; covered by e2e in Task 11 (canvas presence + exit control).

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { AI_FOLLOW_SPEED, COURT_HEIGHT, PADDLE_HEIGHT, isPaddleHit, reflectOffPaddle, stepAiPaddle, stepBallWallBounce } from '../../../lib/pingPongAI';
import { useCravingSession } from '../useCravingSession';

interface PingPongAIProps {
  userId: string;
  onExit: () => void;
}

const COURT_WIDTH = 480;
const PLAYER_X = 16;
const AI_X = COURT_WIDTH - 16;

export function PingPongAI({ userId, onExit }: PingPongAIProps) {
  const { endSession } = useCravingSession(userId, 'ping_pong_ai');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerYRef = useRef(COURT_HEIGHT / 2);
  const stateRef = useRef({ ballX: COURT_WIDTH / 2, ballY: COURT_HEIGHT / 2, ballVX: 3, ballVY: 2, aiY: COURT_HEIGHT / 2 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') playerYRef.current = Math.max(PADDLE_HEIGHT / 2, playerYRef.current - 20);
      if (e.key === 'ArrowDown') playerYRef.current = Math.min(COURT_HEIGHT - PADDLE_HEIGHT / 2, playerYRef.current + 20);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let frame: number;

    const tick = () => {
      const s = stateRef.current;
      const bounced = stepBallWallBounce(s.ballY + s.ballVY, s.ballVY, COURT_HEIGHT);
      s.ballY = bounced.y;
      s.ballVY = bounced.vy;
      s.ballX += s.ballVX;
      s.aiY = stepAiPaddle(s.aiY, s.ballY, AI_FOLLOW_SPEED);

      if (s.ballX <= PLAYER_X && s.ballVX < 0 && isPaddleHit(s.ballY, playerYRef.current)) {
        s.ballVX = reflectOffPaddle(s.ballVX);
      } else if (s.ballX >= AI_X && s.ballVX > 0 && isPaddleHit(s.ballY, s.aiY)) {
        s.ballVX = reflectOffPaddle(s.ballVX);
      } else if (s.ballX < 0 || s.ballX > COURT_WIDTH) {
        s.ballX = COURT_WIDTH / 2;
        s.ballY = COURT_HEIGHT / 2;
        s.ballVX = s.ballVX > 0 ? -3 : 3;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#2d1560';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(PLAYER_X - 4, playerYRef.current - PADDLE_HEIGHT / 2, 8, PADDLE_HEIGHT);
        ctx.fillRect(AI_X - 4, s.aiY - PADDLE_HEIGHT / 2, 8, PADDLE_HEIGHT);
        ctx.beginPath();
        ctx.arc(s.ballX, s.ballY, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleExit = () => {
    endSession();
    onExit();
  };

  return (
    <div style={{ padding: '32px 40px 64px', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ width: '100%' }}>
        <Button variant="ghost" size="sm" onClick={handleExit}>← Back to Crave Crushers</Button>
      </div>

      <canvas
        ref={canvasRef}
        width={COURT_WIDTH}
        height={COURT_HEIGHT}
        onPointerMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          playerYRef.current = Math.min(COURT_HEIGHT - PADDLE_HEIGHT / 2, Math.max(PADDLE_HEIGHT / 2, e.clientY - rect.top));
        }}
        style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', touchAction: 'none', maxWidth: '100%' }}
      />

      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
        Arrow keys or drag to move your paddle.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/pages/crave/games/PingPongAI.tsx
git commit -m "feat: add Ping-Pong vs AI game screen (#65)"
```

---

### Task 9: CraveCrushers picker screen

**Files:**
- Create: `src/app/pages/crave/CraveCrushers.tsx`

**Interfaces:**
- Consumes: `GameType` from `./useCravingSession` (Task 5), `BoxBreathing` (Task 6), `CravingCountdown` (Task 7), `PingPongAI` (Task 8), `Card` from `../../components/ui/Card`.
- Produces: `CraveCrushers({ userId: string })` — consumed by Task 10's `Dashboard.tsx`.

- [ ] **Step 1: Write the component**

```tsx
import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { BoxBreathing } from './games/BoxBreathing';
import { CravingCountdown } from './games/CravingCountdown';
import { PingPongAI } from './games/PingPongAI';
import type { GameType } from './useCravingSession';

interface CraveCrushersProps {
  userId: string;
}

const GAMES: { id: GameType; title: string; description: string }[] = [
  { id: 'box_breathing', title: 'Box Breathing', description: 'A guided 4-4-4 breathing cycle to calm your body while the craving passes.' },
  { id: 'craving_countdown', title: 'Craving Countdown', description: 'A 90-second timer — cravings peak and fade. Tap to release tension while you wait it out.' },
  { id: 'ping_pong_ai', title: 'Ping-Pong vs AI', description: 'A quick, distracting game of pong against a beatable AI opponent.' },
];

export function CraveCrushers({ userId }: CraveCrushersProps) {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);

  if (activeGame === 'box_breathing') {
    return <BoxBreathing userId={userId} onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'craving_countdown') {
    return <CravingCountdown userId={userId} onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'ping_pong_ai') {
    return <PingPongAI userId={userId} onExit={() => setActiveGame(null)} />;
  }

  return (
    <div style={{ padding: '32px 40px 64px', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--color-text)', margin: '0 0 8px', letterSpacing: 'var(--tracking-tight)' }}>
          Crave Crushers
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', margin: 0 }}>
          Pick one — a minute or two of distraction is often enough for a craving to pass.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {GAMES.map(game => (
          <button
            key={game.id}
            aria-label={`Play ${game.title}`}
            onClick={() => setActiveGame(game.id)}
            style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
          >
            <Card variant="default" padding="md">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--color-text)', marginBottom: 6 }}>
                {game.title}
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', margin: 0 }}>
                {game.description}
              </p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/pages/crave/CraveCrushers.tsx
git commit -m "feat: add CraveCrushers picker screen (#65)"
```

---

### Task 10: Wire into Dashboard (nav item + SOS button + page render)

**Files:**
- Modify: `src/app/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `CraveCrushers` from `./crave/CraveCrushers` (Task 9).

No standalone unit test for this task — it is pure wiring inside an already-tested render tree. Correctness is verified by `npm run build` (type-checking the new `Page` union member and props) and by the e2e test in Task 11.

- [ ] **Step 1: Add the `CraveCrushers` import**

In `src/app/pages/Dashboard.tsx`, add this import alongside the existing page/component imports (after the `ProfileScreen` import, line 18):

```typescript
import { CraveCrushers } from './crave/CraveCrushers';
```

- [ ] **Step 2: Add a Crave icon**

Add this icon after `UserIcon` (after line 58, before the `/* ── Types ── */` comment):

```typescript
const CraveIcon = ({ n = 18 }) => (
  <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...S}>
    <path d="M12 21c-4.5 0-7-2.5-7-6 0-3 2-4.5 2-7.5C7 5 9 3 9 3s1 3 3 3 3-3 3-3 2 2 2 4.5c0 3 2 4.5 2 7.5 0 3.5-2.5 6-7 6z" />
  </svg>
);
```

- [ ] **Step 3: Add `'crave'` to the `Page` union**

Change line 61 from:

```typescript
type Page = 'home' | 'chat' | 'dates' | 'profile';
```

to:

```typescript
type Page = 'home' | 'chat' | 'dates' | 'profile' | 'crave';
```

- [ ] **Step 4: Add `onGoToCrave` to `HomeScreen`'s props and an SOS card**

Change the `HomeScreen` function signature (line 78) from:

```typescript
function HomeScreen({ user, cohort, members, presence, onGoToChat, onTapOut, onCheckInSuccess }: { user: UserData; cohort: CohortData; members: Member[]; presence: Map<string, boolean>; onGoToChat: () => void; onTapOut: () => void; onCheckInSuccess: (patch: Pick<UserData, 'current_streak' | 'longest_streak' | 'last_check_in_date'>) => void }) {
```

to:

```typescript
function HomeScreen({ user, cohort, members, presence, onGoToChat, onGoToCrave, onTapOut, onCheckInSuccess }: { user: UserData; cohort: CohortData; members: Member[]; presence: Map<string, boolean>; onGoToChat: () => void; onGoToCrave: () => void; onTapOut: () => void; onCheckInSuccess: (patch: Pick<UserData, 'current_streak' | 'longest_streak' | 'last_check_in_date'>) => void }) {
```

Then insert this SOS card right after the "Daily Check-In" block and before the "Cohort members" block (i.e. immediately after the `<DailyCheckInCard ... />` closing tag around line 158):

```tsx
      {/* Crave SOS */}
      <Card variant="purple" padding="md" style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>
          Craving hitting hard right now?
        </p>
        <Button variant="purple" size="md" onClick={onGoToCrave}>Feeling a craving?</Button>
      </Card>
```

- [ ] **Step 5: Add the nav item**

Change the `NAV` array (lines 612-617) from:

```typescript
  const NAV = [
    { id: 'home',    label: 'Home',      icon: <HomeIcon /> },
    { id: 'chat',    label: 'Chat',      icon: <ChatIcon /> },
    { id: 'dates',   label: 'Nix Dates', icon: <CalIcon /> },
    { id: 'profile', label: 'Profile',   icon: <UserIcon /> },
  ];
```

to:

```typescript
  const NAV = [
    { id: 'home',    label: 'Home',      icon: <HomeIcon /> },
    { id: 'chat',    label: 'Chat',      icon: <ChatIcon /> },
    { id: 'crave',   label: 'Crave',     icon: <CraveIcon /> },
    { id: 'dates',   label: 'Nix Dates', icon: <CalIcon /> },
    { id: 'profile', label: 'Profile',   icon: <UserIcon /> },
  ];
```

- [ ] **Step 6: Pass `onGoToCrave` to `HomeScreen` and render `CraveCrushers`**

Change the `HomeScreen` call (around line 682) from:

```tsx
        {page === 'home' && (
          <HomeScreen
            user={userData}
            cohort={cohort}
            members={members}
            presence={presence}
            onGoToChat={() => setPage('chat')}
            onTapOut={async () => {
```

to:

```tsx
        {page === 'home' && (
          <HomeScreen
            user={userData}
            cohort={cohort}
            members={members}
            presence={presence}
            onGoToChat={() => setPage('chat')}
            onGoToCrave={() => setPage('crave')}
            onTapOut={async () => {
```

Then add a new render branch right after the `page === 'profile'` block closes (after line 717, before the `</main>` closing tag on line 718):

```tsx
        {page === 'crave' && (
          <CraveCrushers userId={userData.id} />
        )}
```

- [ ] **Step 7: Verify it builds**

Run: `npm run build`
Expected: `✓ built in <time>` with no TypeScript errors

- [ ] **Step 8: Commit**

```bash
git add src/app/pages/Dashboard.tsx
git commit -m "feat: wire CraveCrushers into Dashboard nav and Home SOS button (#65)"
```

---

### Task 11: End-to-end coverage

**Files:**
- Create: `tests/e2e/crave-crushers.spec.ts`

**Interfaces:**
- Consumes: the full rendered app (dev server on `http://localhost:5174`), the `craving_sessions` table from Task 1 (best-effort — test does not assert on rows, only on UI navigation).

- [ ] **Step 1: Write the e2e test**

```typescript
/**
 * E2E: CraveCrushers mini-games (Issue #65)
 * Covers both entry points (Home SOS button, nav item) landing on the
 * picker, and each game rendering plus exiting back to the picker.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const admin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const E2E_EMAIL = 'e2e_crave@nixit.dev';
const E2E_PASSWORD = 'testpass123';
const E2E_USERNAME = 'e2e_crave_user';

async function getAvailableCohortId() {
  const { data, error } = await admin
    .from('cohorts')
    .select('id')
    .eq('status', 'upcoming')
    .order('start_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Missing available cohort for E2E setup: ${error?.message ?? 'no rows returned'}`);
  }

  return data.id;
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(E2E_EMAIL);
  await page.getByLabel('Password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

test.beforeAll(async () => {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users.find(u => u.email === E2E_EMAIL);
  if (existing) {
    await admin.from('craving_sessions').delete().eq('user_id', existing.id);
    await admin.from('cohort_members').delete().eq('user_id', existing.id);
    await admin.from('users').delete().eq('id', existing.id);
    await admin.auth.admin.deleteUser(existing.id);
  }

  const { data } = await admin.auth.admin.createUser({
    email: E2E_EMAIL, password: E2E_PASSWORD, email_confirm: true,
  });
  const cohortId = await getAvailableCohortId();
  await admin.from('users').upsert({
    id: data.user!.id,
    email: E2E_EMAIL,
    username: E2E_USERNAME,
    active_cohort_id: cohortId,
  }, { onConflict: 'id' });
  await admin.from('cohort_members').insert({ user_id: data.user!.id, cohort_id: cohortId });
});

test.afterAll(async () => {
  const { data: { users } } = await admin.auth.admin.listUsers();
  const u = users.find(u => u.email === E2E_EMAIL);
  if (u) {
    await admin.from('craving_sessions').delete().eq('user_id', u.id);
    await admin.from('cohort_members').delete().eq('user_id', u.id);
    await admin.from('users').delete().eq('id', u.id);
    await admin.auth.admin.deleteUser(u.id);
  }
});

test.describe('Crave Crushers', () => {
  test('SOS button on Home navigates to the Crave Crushers picker', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Feeling a craving?' }).click();
    await expect(page.getByRole('heading', { name: 'Crave Crushers' })).toBeVisible();
  });

  test('Crave nav item navigates to the same picker', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Crave' }).click();
    await expect(page.getByRole('heading', { name: 'Crave Crushers' })).toBeVisible();
  });

  test('Box Breathing renders and exits back to the picker', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Crave' }).click();
    await page.getByRole('button', { name: 'Play Box Breathing' }).click();
    await expect(page.getByText('Breathe in')).toBeVisible();

    await page.getByRole('button', { name: 'Back to Crave Crushers' }).click();
    await expect(page.getByRole('heading', { name: 'Crave Crushers' })).toBeVisible();
  });

  test('Craving Countdown renders, tracks taps, and exits back to the picker', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Crave' }).click();
    await page.getByRole('button', { name: 'Play Craving Countdown' }).click();
    await expect(page.getByText('Taps: 0')).toBeVisible();

    await page.getByRole('button', { name: 'Release tension' }).click();
    await expect(page.getByText('Taps: 1')).toBeVisible();

    await page.getByRole('button', { name: 'Back to Crave Crushers' }).click();
    await expect(page.getByRole('heading', { name: 'Crave Crushers' })).toBeVisible();
  });

  test('Ping-Pong vs AI renders a canvas and exits back to the picker', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Crave' }).click();
    await page.getByRole('button', { name: 'Play Ping-Pong vs AI' }).click();
    await expect(page.locator('canvas')).toBeVisible();

    await page.getByRole('button', { name: 'Back to Crave Crushers' }).click();
    await expect(page.getByRole('heading', { name: 'Crave Crushers' })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the e2e test**

Run: `npx playwright test tests/e2e/crave-crushers.spec.ts --project=chromium`
Expected: 5 passed. If it fails on login/redirect, confirm `.env` has valid `VITE_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` and that Task 1's SQL has been applied to that project (an unapplied `craving_sessions` table does not block navigation, but a missing `cohorts` row with `status = 'upcoming'` will fail `getAvailableCohortId`).

- [ ] **Step 3: Run the full unit suite and build once more**

Run: `npm run test && npm run build`
Expected: all unit test files pass, build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/crave-crushers.spec.ts
git commit -m "test: add e2e coverage for CraveCrushers picker and games (#65)"
```

---

## Self-Review Notes

- **Spec coverage:** Every "Included in MVP" bullet has a task — nav item (Task 10), SOS button (Task 10), picker with 3 cards (Task 9), Box Breathing (Tasks 2, 6), Craving Countdown (Tasks 3, 7), Ping-Pong vs AI (Tasks 4, 8), session logging (Tasks 1, 5), unit + e2e coverage (Tasks 2-5, 11).
- **Deviation from spec's testing strategy wording:** the spec says e2e should cover "natural completion for Craving Countdown" — a real 90s wait is impractical for CI, so Task 11 covers the tap-tally interaction and manual exit instead; the zero-reaching completion logic itself is fully covered by `isCountdownComplete` unit tests in Task 3. Flag if the team wants a slow/skipped e2e test added later for the literal auto-complete UI path.
- **Type consistency check:** `GameType` is defined once in `useCravingSession.ts` (Task 5) and imported everywhere else (Tasks 6-9) rather than redeclared. `endSession()` has the same zero-arg signature in every game component. `onExit: () => void` prop name is consistent across `BoxBreathing`, `CravingCountdown`, `PingPongAI`, and `CraveCrushers`.
