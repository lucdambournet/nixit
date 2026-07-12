import { describe, expect, it } from 'vitest';
import { computeActive } from '../../src/app/hooks/useIsActive';

describe('computeActive', () => {
  const idleMs = 5 * 60_000;

  it('is active when the tab is visible and input was recent', () => {
    expect(computeActive(false, 1_000, 1_000, idleMs)).toBe(true);
  });

  it('is inactive when the tab is hidden, even with recent input', () => {
    expect(computeActive(true, 1_000, 1_000, idleMs)).toBe(false);
  });

  it('is inactive once the idle threshold has fully elapsed', () => {
    expect(computeActive(false, 0, idleMs, idleMs)).toBe(false);
  });

  it('is active just under the idle threshold', () => {
    expect(computeActive(false, 0, idleMs - 1, idleMs)).toBe(true);
  });
});
