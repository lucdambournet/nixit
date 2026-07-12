import { describe, expect, it } from 'vitest';
import { computeBreathState } from '../../src/app/lib/boxBreathing';

describe('computeBreathState', () => {
  it('starts in the "in" phase at elapsed 0', () => {
    expect(computeBreathState(0)).toEqual({ phase: 'in', phaseElapsedMs: 0, cycleCount: 0 });
  });

  it('stays in "in" just before the 4s mark', () => {
    expect(computeBreathState(3999)).toEqual({ phase: 'in', phaseElapsedMs: 3999, cycleCount: 0 });
  });

  it('moves to "hold" exactly at 4s', () => {
    expect(computeBreathState(4000)).toEqual({ phase: 'hold', phaseElapsedMs: 0, cycleCount: 0 });
  });

  it('moves to "out" exactly at 8s', () => {
    expect(computeBreathState(8000)).toEqual({ phase: 'out', phaseElapsedMs: 0, cycleCount: 0 });
  });

  it('wraps back to "in" and increments cycleCount at 12s', () => {
    expect(computeBreathState(12000)).toEqual({ phase: 'in', phaseElapsedMs: 0, cycleCount: 1 });
  });

  it('tracks phaseElapsedMs correctly mid-second-cycle', () => {
    expect(computeBreathState(13500)).toEqual({ phase: 'in', phaseElapsedMs: 1500, cycleCount: 1 });
  });

  it('clamps negative elapsed to the start of "in"', () => {
    expect(computeBreathState(-50)).toEqual({ phase: 'in', phaseElapsedMs: 0, cycleCount: 0 });
  });
});
