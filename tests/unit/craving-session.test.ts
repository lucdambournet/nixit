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
