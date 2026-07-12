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
