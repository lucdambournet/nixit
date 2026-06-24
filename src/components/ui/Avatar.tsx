import React from 'react';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type Status = 'online' | 'away' | 'busy' | 'offline';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: Size;
  status?: Status;
  style?: React.CSSProperties;
}

const SIZE_PX: Record<Size, number> = { xs: 24, sm: 32, md: 40, lg: 48, xl: 56, '2xl': 80 };

const BG_COLORS = [
  'var(--lavender-400)',
  'var(--purple-400)',
  'var(--lavender-300)',
  'var(--purple-500)',
  'var(--lavender-500)',
];

const STATUS_COLORS: Record<Status, string> = {
  online:  'var(--lavender-500)',
  away:    'var(--neutral-400)',
  busy:    'var(--purple-500)',
  offline: 'var(--neutral-300)',
};

export function Avatar({ src, name, size = 'md', status, style }: AvatarProps) {
  const px = SIZE_PX[size] ?? SIZE_PX.md;
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const bg = name ? BG_COLORS[name.charCodeAt(0) % BG_COLORS.length] : BG_COLORS[0];

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, ...style }}>
      {src ? (
        <img src={src} alt={name}
          style={{ width: px, height: px, borderRadius: 'var(--radius-full)', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: px, height: px,
          borderRadius: 'var(--radius-full)',
          background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--weight-bold)',
          color: 'white',
          fontSize: Math.round(px * 0.38),
          userSelect: 'none',
        }}>
          {initials}
        </div>
      )}
      {status && (
        <span style={{
          position: 'absolute',
          bottom: px > 36 ? 2 : 1, right: px > 36 ? 2 : 1,
          width: Math.max(8, Math.round(px * 0.26)),
          height: Math.max(8, Math.round(px * 0.26)),
          borderRadius: 'var(--radius-full)',
          background: STATUS_COLORS[status] ?? STATUS_COLORS.offline,
          border: '2px solid white',
          display: 'block',
        }} />
      )}
    </div>
  );
}
