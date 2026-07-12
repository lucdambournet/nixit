import React from 'react';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type Status = 'online' | 'away' | 'offline' | 'dnd';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: Size;
  status?: Status;
  onStatusClick?: (e: React.MouseEvent) => void;
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
  online:  'var(--status-online)',
  away:    'var(--status-away)',
  offline: 'var(--status-offline)',
  dnd:     'var(--status-dnd)',
};

export function Avatar({ src, name, size = 'md', status, onStatusClick, style }: AvatarProps) {
  const px = SIZE_PX[size] ?? SIZE_PX.md;
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const bg = name ? BG_COLORS[name.charCodeAt(0) % BG_COLORS.length] : BG_COLORS[0];
  const dotSize = Math.max(8, Math.round(px * 0.26));

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
        <span
          role={onStatusClick ? 'button' : undefined}
          tabIndex={onStatusClick ? 0 : undefined}
          aria-label={onStatusClick ? 'Open status menu' : `${name ?? 'User'} status: ${status}`}
          data-status={status}
          onClick={onStatusClick ? (e: React.MouseEvent) => { e.stopPropagation(); onStatusClick(e); } : undefined}
          onKeyDown={onStatusClick ? (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onStatusClick(e as unknown as React.MouseEvent);
            }
          } : undefined}
          style={{
            position: 'absolute',
            bottom: px > 36 ? 2 : 1, right: px > 36 ? 2 : 1,
            width: dotSize, height: dotSize,
            borderRadius: 'var(--radius-full)',
            background: STATUS_COLORS[status] ?? STATUS_COLORS.offline,
            border: '2px solid var(--surface-card)',
            display: 'block',
            cursor: onStatusClick ? 'pointer' : undefined,
          }}
        />
      )}
    </div>
  );
}
