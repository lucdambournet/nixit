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
