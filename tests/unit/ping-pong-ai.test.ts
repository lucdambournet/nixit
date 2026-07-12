import { describe, expect, it } from 'vitest';
import { isPaddleHit, reflectOffPaddle, stepAiPaddle, stepBallWallBounce } from '../../src/app/lib/pingPongAI';

describe('stepBallWallBounce', () => {
  it('bounces off the top wall, flipping vy to positive', () => {
    expect(stepBallWallBounce(-5, -3, 300)).toEqual({ y: 0, vy: 3 });
  });

  it('bounces off the bottom wall, flipping vy to negative', () => {
    expect(stepBallWallBounce(305, 3, 300)).toEqual({ y: 300, vy: -3 });
  });

  it('leaves y/vy unchanged mid-court', () => {
    expect(stepBallWallBounce(150, 3, 300)).toEqual({ y: 150, vy: 3 });
  });
});

describe('reflectOffPaddle', () => {
  it('flips and speeds up a positive vx', () => {
    expect(reflectOffPaddle(5)).toBeCloseTo(-5.25);
  });

  it('flips and speeds up a negative vx', () => {
    expect(reflectOffPaddle(-5)).toBeCloseTo(5.25);
  });
});

describe('stepAiPaddle', () => {
  it('does not move when already aligned with the ball', () => {
    expect(stepAiPaddle(100, 100, 4)).toBe(100);
  });

  it('snaps to the ball when within followSpeed', () => {
    expect(stepAiPaddle(100, 102, 4)).toBe(102);
  });

  it('moves toward the ball by followSpeed when far below', () => {
    expect(stepAiPaddle(100, 150, 4)).toBe(104);
  });

  it('moves toward the ball by followSpeed when far above', () => {
    expect(stepAiPaddle(100, 50, 4)).toBe(96);
  });
});

describe('isPaddleHit', () => {
  it('is true at the paddle center', () => {
    expect(isPaddleHit(100, 100, 60)).toBe(true);
  });

  it('is true at the paddle edge (inclusive)', () => {
    expect(isPaddleHit(130, 100, 60)).toBe(true);
  });

  it('is false just past the paddle edge', () => {
    expect(isPaddleHit(131, 100, 60)).toBe(false);
  });

  it('is false well outside the paddle', () => {
    expect(isPaddleHit(65, 100, 60)).toBe(false);
  });
});
