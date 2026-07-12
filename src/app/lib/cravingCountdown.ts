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
