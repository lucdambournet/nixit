import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatStreakLabel } from '../../lib/dailyCheckIn';

interface DailyCheckInCardProps {
  currentStreak: number;
  longestStreak: number;
  alreadyCheckedInToday: boolean;
  isCheckingIn?: boolean;
  onCheckIn: () => void;
  style?: React.CSSProperties;
}

export function DailyCheckInCard({
  currentStreak,
  longestStreak,
  alreadyCheckedInToday,
  isCheckingIn = false,
  onCheckIn,
  style,
}: DailyCheckInCardProps) {
  return (
    <Card variant="default" padding="md" style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--color-text)' }}>
          Daily Check-In
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', letterSpacing: 'var(--tracking-wide)' }}>
          🔥 {formatStreakLabel(currentStreak)}
        </span>
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)', margin: '0 0 14px' }}>
        {longestStreak > currentStreak
          ? `Longest streak: ${formatStreakLabel(longestStreak)}. Check in today to keep building.`
          : 'Check in every day to keep your streak alive.'}
      </p>

      {alreadyCheckedInToday ? (
        <div
          style={{
            width: '100%', padding: '11px 18px',
            background: 'var(--color-success-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-success-border)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-primary)', fontWeight: 'var(--weight-semibold)' }}>
            ✓ Checked in for today — come back tomorrow
          </span>
        </div>
      ) : (
        <Button variant="primary" size="md" disabled={isCheckingIn} onClick={onCheckIn} style={{ width: '100%' }}>
          {isCheckingIn ? 'Checking in…' : "Check in for today"}
        </Button>
      )}
    </Card>
  );
}
