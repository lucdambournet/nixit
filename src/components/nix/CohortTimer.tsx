import React, { useEffect, useState } from 'react';

interface TimerState {
  days: number;
  hours: number;
  mins: number;
  secs: number;
}

function calc(startDate: string): TimerState {
  const diff = Math.max(0, Date.now() - new Date(startDate).getTime());
  return {
    days:  Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins:  Math.floor((diff % 3600000) / 60000),
    secs:  Math.floor((diff % 60000) / 1000),
  };
}

interface CohortTimerProps {
  startDate: string;
  label?: string;
  style?: React.CSSProperties;
}

export function CohortTimer({ startDate, label = 'Nicotine-free for', style }: CohortTimerProps) {
  const [t, setT] = useState<TimerState>(() => calc(startDate));

  useEffect(() => {
    const id = setInterval(() => setT(calc(startDate)), 1000);
    return () => clearInterval(id);
  }, [startDate]);

  const units = [
    { value: t.days,  lbl: 'days' },
    { value: t.hours, lbl: 'hrs' },
    { value: t.mins,  lbl: 'min' },
    { value: t.secs,  lbl: 'sec' },
  ];

  return (
    <div style={{ textAlign: 'center', ...style }}>
      {label && (
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-semibold)',
          color: 'var(--color-text-muted)',
          letterSpacing: 'var(--tracking-widest)',
          textTransform: 'uppercase',
          marginBottom: 'var(--space-3)',
        }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
        {units.map(({ value, lbl }, i) => (
          <React.Fragment key={lbl}>
            {i > 0 && (
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)',
                color: 'var(--neutral-300)', fontWeight: 'var(--weight-bold)',
                marginBottom: 18, lineHeight: 1, padding: '0 1px',
              }}>:</span>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)',
                fontWeight: 'var(--weight-extrabold)',
                color: 'var(--color-primary)',
                lineHeight: 1, letterSpacing: 'var(--tracking-tight)',
              }}>
                {String(value).padStart(2, '0')}
              </span>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase', letterSpacing: 'var(--tracking-widest)',
                marginTop: 'var(--space-1)',
              }}>
                {lbl}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
