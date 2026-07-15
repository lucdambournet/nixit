import { describe, expect, it } from 'vitest';
import { matchesMobileBreakpoint, MOBILE_BREAKPOINT_PX } from '../../src/app/hooks/useIsMobile';

describe('matchesMobileBreakpoint', () => {
  it('is true for a typical phone width', () => {
    expect(matchesMobileBreakpoint(390)).toBe(true);
  });

  it('is false for a typical desktop width', () => {
    expect(matchesMobileBreakpoint(1280)).toBe(false);
  });

  it('is false exactly at the breakpoint', () => {
    expect(matchesMobileBreakpoint(MOBILE_BREAKPOINT_PX)).toBe(false);
  });

  it('is true one pixel below the breakpoint', () => {
    expect(matchesMobileBreakpoint(MOBILE_BREAKPOINT_PX - 1)).toBe(true);
  });

  it('respects a custom breakpoint', () => {
    expect(matchesMobileBreakpoint(500, 600)).toBe(true);
    expect(matchesMobileBreakpoint(700, 600)).toBe(false);
  });
});
