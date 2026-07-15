import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { computeRemainingSeconds, incrementTapTally, isCountdownComplete } from '../../../lib/cravingCountdown';
import { useCravingSession } from '../useCravingSession';

interface CravingCountdownProps {
  userId: string;
  onExit: () => void;
}

export function CravingCountdown({ userId, onExit }: CravingCountdownProps) {
  const { endSession, startedAtMs } = useCravingSession(userId, 'craving_countdown');
  const [now, setNow] = useState(() => Date.now());
  const [tally, setTally] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const remaining = computeRemainingSeconds(now - startedAtMs);
  const complete = isCountdownComplete(remaining);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const handleExit = () => {
    endSession();
    onExit();
  };

  useEffect(() => {
    if (!complete) return;
    // Auto-return to the picker (logging the session) shortly after the
    // countdown hits 0:00, instead of waiting indefinitely for a manual tap.
    const timer = setTimeout(handleExit, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  return (
    <div style={{ padding: '32px clamp(16px, 6vw, 40px) 64px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      <div style={{ width: '100%' }}>
        <Button variant="ghost" size="sm" onClick={handleExit}>← Back to Crave Crushers</Button>
      </div>

      {complete ? (
        <>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--color-text)', textAlign: 'center' }}>
            That craving passed. Nice work.
          </p>
          <Button variant="solid" size="md" onClick={handleExit}>Done</Button>
        </>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-3xl)', color: 'var(--color-text)' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <button
            aria-label="Release tension"
            onClick={() => setTally(incrementTapTally)}
            style={{
              all: 'unset', cursor: 'pointer', width: 160, height: 160, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--purple-400) 0%, var(--lavender-400) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              fontFamily: 'var(--font-body)', color: 'white', fontWeight: 600,
            }}
          >
            Tap to release
          </button>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Taps: {tally}
          </p>
        </>
      )}
    </div>
  );
}
