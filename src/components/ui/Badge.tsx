import React from 'react';

type Variant = 'lavender' | 'purple' | 'neutral' | 'frosted' | 'success' | 'warning' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
  dot?: boolean;
}

const VARIANTS: Record<Variant, { bg: string; color: string; border?: string }> = {
  lavender: { bg: 'var(--lavender-100)',        color: 'var(--lavender-600)' },
  purple:   { bg: 'var(--purple-100)',           color: 'var(--purple-600)' },
  neutral:  { bg: 'var(--neutral-100)',          color: 'var(--neutral-600)' },
  frosted:  { bg: 'var(--glass-bg-strong)',       color: 'var(--glass-accent)', border: '1px solid var(--glass-border)' },
  success:  { bg: 'var(--lavender-100)',         color: 'var(--lavender-600)' },
  warning:  { bg: 'var(--neutral-100)',          color: 'var(--neutral-600)' },
  danger:   { bg: 'var(--purple-100)',           color: 'var(--purple-600)' },
};

const SIZES: Record<Size, { fontSize: string; padding: string; dotPx: number }> = {
  sm: { fontSize: 'var(--text-xs)', padding: '2px 8px',  dotPx: 5 },
  md: { fontSize: 'var(--text-xs)', padding: '4px 10px', dotPx: 6 },
  lg: { fontSize: 'var(--text-sm)', padding: '5px 13px', dotPx: 7 },
};

export function Badge({ children, variant = 'lavender', size = 'md', dot, style, ...props }: BadgeProps) {
  const v = VARIANTS[variant] ?? VARIANTS.lavender;
  const s = SIZES[size] ?? SIZES.md;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: v.bg, color: v.color,
      borderRadius: 'var(--radius-xs)',
      border: v.border ?? 'none',
      fontFamily: 'var(--font-body)', fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-wide)',
      fontSize: s.fontSize, padding: s.padding, lineHeight: 1.4,
      ...style,
    }} {...props}>
      {dot && (
        <span style={{
          width: s.dotPx, height: s.dotPx,
          borderRadius: 'var(--radius-full)',
          background: v.color, flexShrink: 0, display: 'inline-block',
        }} />
      )}
      {children}
    </span>
  );
}
