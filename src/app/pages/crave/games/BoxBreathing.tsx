import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { computeBreathState, type BreathPhase } from '../../../lib/boxBreathing';
import { useCravingSession } from '../useCravingSession';

interface BoxBreathingProps {
  userId: string;
  onExit: () => void;
}

const PHASE_LABEL: Record<BreathPhase, string> = { in: 'Breathe in', hold: 'Hold', out: 'Breathe out' };
const PHASE_SIZE: Record<BreathPhase, number> = { in: 220, hold: 220, out: 140 };

export function BoxBreathing({ userId, onExit }: BoxBreathingProps) {
  const { endSession } = useCravingSession(userId, 'box_breathing');
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  const { phase, cycleCount } = computeBreathState(now - startedAt);

  const handleExit = () => {
    endSession();
    onExit();
  };

  return (
    <div style={{ padding: '32px 40px 64px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      <div style={{ width: '100%' }}>
        <Button variant="ghost" size="sm" onClick={handleExit}>← Back to Crave Crushers</Button>
      </div>

      <div
        style={{
          width: PHASE_SIZE[phase],
          height: PHASE_SIZE[phase],
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--purple-400) 0%, var(--lavender-400) 100%)',
          transition: 'width 4s linear, height 4s linear',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'white' }}>
          {PHASE_LABEL[phase]}
        </span>
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
        Cycles completed: {cycleCount}
      </p>
    </div>
  );
}
