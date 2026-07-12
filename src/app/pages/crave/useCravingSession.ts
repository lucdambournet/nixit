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
