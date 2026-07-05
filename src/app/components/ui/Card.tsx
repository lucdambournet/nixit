import React from 'react';

type Variant = 'default' | 'elevated' | 'flat' | 'lavender' | 'purple' | 'glass';
type Padding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  padding?: Padding;
}

const VARIANTS: Record<Variant, React.CSSProperties> = {
  default:  { background: '#fff',                   boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border-subtle)' },
  elevated: { background: '#fff',                   boxShadow: 'var(--shadow-md)', border: 'none' },
  flat:     { background: 'var(--neutral-50)',      boxShadow: 'none',             border: '1px solid var(--color-border)' },
  lavender: { background: 'var(--lavender-50)',     boxShadow: 'none',             border: '1px solid var(--lavender-200)' },
  purple:   { background: 'var(--purple-50)',       boxShadow: 'none',             border: '1px solid var(--purple-100)' },
  glass:    {
    background: 'rgba(255,255,255,0.72)',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid rgba(255,255,255,0.85)',
    backdropFilter: 'var(--blur-md)',
    WebkitBackdropFilter: 'var(--blur-md)',
  },
};

const PADDINGS: Record<Padding, string> = {
  none: '0',
  sm:   'var(--padding-card-sm)',
  md:   'var(--padding-card-md)',
  lg:   'var(--padding-card-lg)',
};

export function Card({ children, variant = 'default', padding = 'md', style, ...props }: CardProps) {
  return (
    <div style={{
      borderRadius: 'var(--radius-xl)',
      padding: PADDINGS[padding] ?? PADDINGS.md,
      ...VARIANTS[variant],
      ...style,
    }} {...props}>
      {children}
    </div>
  );
}
