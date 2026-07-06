import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'purple' | 'solid';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
}

const glass = (color: string, border: string): React.CSSProperties => ({
  background: 'var(--glass-bg-strong)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  color,
  border: `1.5px solid ${border}`,
  boxShadow: 'var(--glow-frosted)',
});

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary:   glass('var(--glass-accent)', 'rgba(150,126,255,0.32)'),
  secondary: { ...glass('var(--glass-muted)', 'var(--color-border)'), boxShadow: 'var(--shadow-xs)' },
  ghost:     { background: 'transparent', color: 'var(--color-primary)', border: 'none', boxShadow: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none' },
  danger:    glass('var(--glass-accent-deep)', 'rgba(150,126,255,0.28)'),
  outline:   { background: 'transparent', color: 'var(--color-primary)', border: '1.5px solid var(--color-primary-border)', boxShadow: 'none' },
  purple:    glass('var(--glass-accent-deep)', 'rgba(150,126,255,0.30)'),
  // Solid purple → lavender gradient with a luminous glow — for hero CTAs
  solid: {
    background: 'linear-gradient(135deg, var(--purple-500) 0%, var(--lavender-500) 100%)',
    color: '#fff',
    border: 'none',
    boxShadow: 'var(--glow-purple-solid)',
    textShadow: '0 1px 2px rgba(45,21,96,0.35)',
  },
};

const SIZES: Record<Size, React.CSSProperties> = {
  sm: { fontSize: 'var(--text-sm)',  padding: 'var(--padding-btn-sm)' },
  md: { fontSize: 'var(--text-base)', padding: 'var(--padding-btn-md)' },
  lg: { fontSize: 'var(--text-md)',  padding: 'var(--padding-btn-lg)' },
};

export function Button({ children, variant = 'primary', size = 'md', disabled, onClick, icon, style, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: '6px',
    fontFamily: 'var(--font-body)', fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-wide)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all var(--transition-base)',
    whiteSpace: 'nowrap', lineHeight: 1,
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...SIZES[size], ...VARIANTS[variant], ...style }}
      {...props}
    >
      {icon && <span style={{ fontSize: '1.1em', lineHeight: 1, display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  );
}
