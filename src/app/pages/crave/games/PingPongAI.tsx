import { useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { AI_FOLLOW_SPEED, COURT_HEIGHT, PADDLE_HEIGHT, isPaddleHit, reflectOffPaddle, stepAiPaddle, stepBallWallBounce } from '../../../lib/pingPongAI';
import { useCravingSession } from '../useCravingSession';

interface PingPongAIProps {
  userId: string;
  onExit: () => void;
}

const COURT_WIDTH = 480;
const PLAYER_X = 16;
const AI_X = COURT_WIDTH - 16;

export function PingPongAI({ userId, onExit }: PingPongAIProps) {
  const { endSession } = useCravingSession(userId, 'ping_pong_ai');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerYRef = useRef(COURT_HEIGHT / 2);
  const stateRef = useRef({ ballX: COURT_WIDTH / 2, ballY: COURT_HEIGHT / 2, ballVX: 3, ballVY: 2, aiY: COURT_HEIGHT / 2 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') playerYRef.current = Math.max(PADDLE_HEIGHT / 2, playerYRef.current - 20);
      if (e.key === 'ArrowDown') playerYRef.current = Math.min(COURT_HEIGHT - PADDLE_HEIGHT / 2, playerYRef.current + 20);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let frame: number;

    const tick = () => {
      const s = stateRef.current;
      const bounced = stepBallWallBounce(s.ballY + s.ballVY, s.ballVY, COURT_HEIGHT);
      s.ballY = bounced.y;
      s.ballVY = bounced.vy;
      s.ballX += s.ballVX;
      s.aiY = stepAiPaddle(s.aiY, s.ballY, AI_FOLLOW_SPEED);

      if (s.ballX <= PLAYER_X && s.ballVX < 0 && isPaddleHit(s.ballY, playerYRef.current)) {
        s.ballVX = reflectOffPaddle(s.ballVX);
      } else if (s.ballX >= AI_X && s.ballVX > 0 && isPaddleHit(s.ballY, s.aiY)) {
        s.ballVX = reflectOffPaddle(s.ballVX);
      } else if (s.ballX < 0 || s.ballX > COURT_WIDTH) {
        s.ballX = COURT_WIDTH / 2;
        s.ballY = COURT_HEIGHT / 2;
        s.ballVX = s.ballVX > 0 ? -3 : 3;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#2d1560';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(PLAYER_X - 4, playerYRef.current - PADDLE_HEIGHT / 2, 8, PADDLE_HEIGHT);
        ctx.fillRect(AI_X - 4, s.aiY - PADDLE_HEIGHT / 2, 8, PADDLE_HEIGHT);
        ctx.beginPath();
        ctx.arc(s.ballX, s.ballY, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleExit = () => {
    endSession();
    onExit();
  };

  return (
    <div style={{ padding: '32px 40px 64px', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ width: '100%' }}>
        <Button variant="ghost" size="sm" onClick={handleExit}>← Back to Crave Crushers</Button>
      </div>

      <canvas
        ref={canvasRef}
        width={COURT_WIDTH}
        height={COURT_HEIGHT}
        onPointerMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          playerYRef.current = Math.min(COURT_HEIGHT - PADDLE_HEIGHT / 2, Math.max(PADDLE_HEIGHT / 2, e.clientY - rect.top));
        }}
        style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', touchAction: 'none', maxWidth: '100%' }}
      />

      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
        Arrow keys or drag to move your paddle.
      </p>
    </div>
  );
}
