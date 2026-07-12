export const COURT_HEIGHT = 300;
export const PADDLE_HEIGHT = 60;
export const BALL_SPEED_UP_FACTOR = 1.05;
export const AI_FOLLOW_SPEED = 4;

/** Reflects the ball off the top/bottom walls; no-op when still mid-court. */
export function stepBallWallBounce(y: number, vy: number, courtHeight: number = COURT_HEIGHT): { y: number; vy: number } {
  if (y <= 0) return { y: 0, vy: Math.abs(vy) };
  if (y >= courtHeight) return { y: courtHeight, vy: -Math.abs(vy) };
  return { y, vy };
}

/** Flips horizontal direction and speeds the ball up slightly on every paddle hit. */
export function reflectOffPaddle(vx: number): number {
  return -vx * BALL_SPEED_UP_FACTOR;
}

/** AI paddle follows the ball's y but is capped at followSpeed per tick — laggy, so beatable. */
export function stepAiPaddle(aiPaddleY: number, ballY: number, followSpeed: number = AI_FOLLOW_SPEED): number {
  const diff = ballY - aiPaddleY;
  if (Math.abs(diff) <= followSpeed) return ballY;
  return aiPaddleY + Math.sign(diff) * followSpeed;
}

export function isPaddleHit(ballY: number, paddleY: number, paddleHeight: number = PADDLE_HEIGHT): boolean {
  return ballY >= paddleY - paddleHeight / 2 && ballY <= paddleY + paddleHeight / 2;
}
