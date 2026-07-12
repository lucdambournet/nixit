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
