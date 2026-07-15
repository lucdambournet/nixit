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

export function useCravingSession(userId: string, gameType: GameType): { endSession: () => void; startedAtMs: number } {
  const startedAtMsRef = useRef(Date.now());
  const startedAtIsoRef = useRef(new Date().toISOString());
  const hasEndedRef = useRef(false);
  const pendingEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    startedAtMsRef.current = Date.now();
    startedAtIsoRef.current = new Date().toISOString();
    hasEndedRef.current = false;
  }, [gameType]);

  const endSession = () => {
    if (pendingEndTimerRef.current) {
      clearTimeout(pendingEndTimerRef.current);
      pendingEndTimerRef.current = null;
    }
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    const duration = computeDurationSeconds(startedAtMsRef.current, Date.now());
    void logCravingSession(
      async row => supabase.from('craving_sessions').insert(row),
      { user_id: userId, game_type: gameType, started_at: startedAtIsoRef.current, duration_seconds: duration }
    );
  };

  // Covers every exit path, not just an explicit Back/Done tap — e.g.
  // navigating away via the sidenav unmounts the game without otherwise
  // calling endSession(). The cleanup defers the actual log by a tick and
  // the next mount cancels it, so React 18 StrictMode's dev-only
  // mount→unmount→mount dry run (which would otherwise fire this cleanup
  // too) doesn't write a spurious near-zero-duration session row.
  useEffect(() => {
    if (pendingEndTimerRef.current) {
      clearTimeout(pendingEndTimerRef.current);
      pendingEndTimerRef.current = null;
    }
    return () => {
      pendingEndTimerRef.current = setTimeout(endSession, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType]);

  return { endSession, startedAtMs: startedAtMsRef.current };
}
