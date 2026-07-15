import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { BoxBreathing } from './games/BoxBreathing';
import { CravingCountdown } from './games/CravingCountdown';
import { PingPongAI } from './games/PingPongAI';
import type { GameType } from './useCravingSession';

interface CraveCrushersProps {
  userId: string;
}

const GAMES: { id: GameType; title: string; description: string }[] = [
  { id: 'box_breathing', title: 'Box Breathing', description: 'A guided 4-4-4 breathing cycle to calm your body while the craving passes.' },
  { id: 'craving_countdown', title: 'Craving Countdown', description: 'A 90-second timer — cravings peak and fade. Tap to release tension while you wait it out.' },
  { id: 'ping_pong_ai', title: 'Ping-Pong vs AI', description: 'A quick, distracting game of pong against a beatable AI opponent.' },
];

export function CraveCrushers({ userId }: CraveCrushersProps) {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);

  if (activeGame === 'box_breathing') {
    return <BoxBreathing userId={userId} onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'craving_countdown') {
    return <CravingCountdown userId={userId} onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'ping_pong_ai') {
    return <PingPongAI userId={userId} onExit={() => setActiveGame(null)} />;
  }

  return (
    <div style={{ padding: '32px clamp(16px, 6vw, 40px) 64px', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--color-text)', margin: '0 0 8px', letterSpacing: 'var(--tracking-tight)' }}>
          Crave Crushers
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', margin: 0 }}>
          Pick one — a minute or two of distraction is often enough for a craving to pass.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {GAMES.map(game => (
          <button
            key={game.id}
            aria-label={`Play ${game.title}`}
            onClick={() => setActiveGame(game.id)}
            style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
          >
            <Card variant="default" padding="md">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--color-text)', marginBottom: 6 }}>
                {game.title}
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', margin: 0 }}>
                {game.description}
              </p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
