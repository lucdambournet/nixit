import React from 'react';

type Variant = 'default' | 'elevated' | 'flat' | 'lavender' | 'purple' | 'glass';
type Padding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  padding?: Padding;
}

const VARIANTS: Record<Variant, React.CSSProperties> = {
  default:  { background: 'var(--surface-card)',    boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border-subtle)' },
  elevated: { background: 'var(--surface-card)',    boxShadow: 'var(--shadow-md), var(--glow-frosted)', border: '1px solid var(--color-border-subtle)' },
  flat:     { background: 'var(--surface-sunken)',  boxShadow: 'none',             border: '1px solid var(--color-border)' },
  lavender: { background: 'var(--tint-lavender)',   boxShadow: 'none',             border: '1px solid var(--tint-lavender-border)', backgroundImage: 'radial-gradient(circle, var(--dot-lavender) 1px, transparent 1px)', backgroundSize: '18px 18px' },
  purple:   { background: 'var(--tint-purple)',     boxShadow: 'none',             border: '1px solid var(--tint-purple-border)',   backgroundImage: 'radial-gradient(circle, var(--dot-purple) 1px, transparent 1px)',   backgroundSize: '18px 18px' },
  glass:    {
    background: 'var(--glass-bg)',
    boxShadow: 'var(--shadow-md), var(--glow-frosted)',
    border: '1px solid var(--glass-border)',
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
