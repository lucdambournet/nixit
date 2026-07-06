import React from 'react';

type CohortStatus = 'upcoming' | 'active' | 'full' | 'past';

interface NixDateCardProps {
  month: number;
  year: number;
  joined?: number;
  total?: number;
  status?: CohortStatus;
  isJoined?: boolean;
  onJoin?: () => void;
  description?: string;
  features?: string[];
  members?: string[];
  style?: React.CSSProperties;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_MAP: Record<CohortStatus, {
  grad: string; accent: string; light: string; border: string; label: string; canJoin: boolean;
}> = {
  upcoming: { grad: 'linear-gradient(135deg,var(--lavender-50) 0%,var(--lavender-100) 100%)', accent: 'var(--lavender-600)', light: 'var(--lavender-50)', border: 'var(--lavender-200)', label: 'Upcoming',   canJoin: true  },
  active:   { grad: 'linear-gradient(135deg,var(--lavender-100) 0%,var(--lavender-200) 100%)', accent: 'var(--lavender-500)', light: 'var(--lavender-50)', border: 'var(--lavender-200)', label: 'Active Now', canJoin: true  },
  full:     { grad: 'linear-gradient(135deg,var(--purple-50) 0%,var(--purple-100) 100%)',      accent: 'var(--purple-600)',   light: 'var(--purple-50)',    border: 'var(--purple-100)',   label: 'Full',       canJoin: false },
  past:     { grad: 'linear-gradient(135deg,var(--neutral-50) 0%,var(--neutral-100) 100%)',    accent: 'var(--neutral-500)', light: 'var(--neutral-50)',   border: 'var(--neutral-200)', label: 'Past',       canJoin: false },
};

const BG_COLORS = ['var(--lavender-400)','var(--purple-400)','var(--lavender-300)','var(--purple-500)','var(--lavender-500)'];

function MemberDot({ name, index }: { name: string; index: number }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%',
      background: BG_COLORS[name.charCodeAt(0) % BG_COLORS.length],
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontFamily: 'var(--font-body)', fontWeight: 600,
      border: '2px solid var(--surface-card)', flexShrink: 0,
      marginLeft: index > 0 ? -8 : 0,
      position: 'relative', zIndex: 10 - index,
    }}>
      {name[0].toUpperCase()}
    </div>
  );
}

export function NixDateCard({ month, year, joined = 0, total = 25, status = 'upcoming', isJoined = false, onJoin, description, features, members, style }: NixDateCardProps) {
  const monthName = MONTHS[month - 1] ?? '';
  const abbr      = monthName.slice(0, 3).toUpperCase();
  const startDate = new Date(year, month - 1, 1);
  const dayName   = DAYS[startDate.getDay()];
  const pct       = Math.min(100, Math.round((joined / total) * 100));
  const spotsLeft = total - joined;
  const sc        = STATUS_MAP[status] ?? STATUS_MAP.upcoming;

  return (
    <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--color-border-subtle)', overflow: 'hidden', ...style }}>
      {/* Header band */}
      <div style={{ background: sc.grad, padding: '18px 22px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ background: 'rgba(255,255,255,0.78)', color: sc.accent, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 'var(--radius-xs)', padding: '3px 9px', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', fontFamily: 'var(--font-body)', letterSpacing: 'var(--tracking-wide)' }}>
            {sc.label}
          </span>
          <span style={{ color: sc.accent, fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', opacity: 0.75 }}>
            {dayName} · {abbr} 1, {year}
          </span>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-extrabold)', fontSize: 'var(--text-2xl)', color: sc.accent, lineHeight: 1 }}>
            {monthName} {year}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: sc.accent, opacity: 0.65, marginTop: 4 }}>
            Nix Date Cohort · 30 days
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {description && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)', margin: 0 }}>
            {description}
          </p>
        )}

        {features && features.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: sc.accent, flexShrink: 0, opacity: 0.6 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{f}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-muted)', letterSpacing: 'var(--tracking-wider)' }}>SPOTS FILLED</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: sc.accent }}>{joined}/{total}</span>
          </div>
          <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: sc.accent, borderRadius: 'var(--radius-full)', transition: 'width 0.6s var(--ease-out)' }} />
          </div>
          {spotsLeft > 0 && status !== 'past' && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} remaining
            </span>
          )}
        </div>

        {/* Member stack */}
        {members && members.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex' }}>
              {members.slice(0, 5).map((m, i) => <MemberDot key={m} name={m} index={i} />)}
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {joined} member{joined !== 1 ? 's' : ''} joined
            </span>
          </div>
        )}

        {/* CTA */}
        {isJoined ? (
          <div style={{ padding: '11px 18px', background: 'var(--color-success-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'var(--weight-semibold)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}>✓ You're in this cohort</span>
          </div>
        ) : sc.canJoin ? (
          <button onClick={onJoin} style={{
            width: '100%', padding: '12px 20px',
            background: 'var(--glass-bg-strong)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            color: 'var(--glass-accent)', border: '1.5px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
            fontWeight: 'var(--weight-semibold)', cursor: 'pointer',
            boxShadow: 'var(--glow-frosted)',
            transition: 'all var(--transition-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            Join this cohort →
          </button>
        ) : (
          <div style={{ padding: '11px 18px', background: sc.light, borderRadius: 'var(--radius-md)', border: `1px solid ${sc.border}`, textAlign: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: sc.accent, fontWeight: 'var(--weight-medium)' }}>
              {status === 'full' ? 'Cohort full — join the waitlist for the next date' : 'This cohort has closed'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
