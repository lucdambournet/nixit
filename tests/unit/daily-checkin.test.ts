import { describe, expect, it } from 'vitest';
import { formatStreakLabel, hasCheckedInToday, isConsecutiveDay } from '../../src/app/lib/dailyCheckIn';

describe('isConsecutiveDay', () => {
  it('is true when prevDate is exactly one calendar day before today', () => {
    expect(isConsecutiveDay('2026-07-09', '2026-07-10')).toBe(true);
  });

  it('is false when prevDate is today (already checked in)', () => {
    expect(isConsecutiveDay('2026-07-10', '2026-07-10')).toBe(false);
  });

  it('is false when prevDate is two or more days before today', () => {
    expect(isConsecutiveDay('2026-07-08', '2026-07-10')).toBe(false);
  });

  it('is false when prevDate is null (first-ever check-in)', () => {
    expect(isConsecutiveDay(null, '2026-07-10')).toBe(false);
  });

  it('handles month boundaries correctly', () => {
    expect(isConsecutiveDay('2026-06-30', '2026-07-01')).toBe(true);
  });
});

describe('hasCheckedInToday', () => {
  it('is true when lastCheckInDate equals today', () => {
    expect(hasCheckedInToday({ lastCheckInDate: '2026-07-10' }, '2026-07-10')).toBe(true);
  });

  it('is false when lastCheckInDate is a prior day', () => {
    expect(hasCheckedInToday({ lastCheckInDate: '2026-07-09' }, '2026-07-10')).toBe(false);
  });

  it('is false when lastCheckInDate is null', () => {
    expect(hasCheckedInToday({ lastCheckInDate: null }, '2026-07-10')).toBe(false);
  });
});

describe('formatStreakLabel', () => {
  it('singularizes a streak of 1', () => {
    expect(formatStreakLabel(1)).toBe('1 day');
  });

  it('pluralizes a streak greater than 1', () => {
    expect(formatStreakLabel(5)).toBe('5 days');
  });

  it('shows a neutral label for zero', () => {
    expect(formatStreakLabel(0)).toBe('No streak yet');
  });
});
