import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'purple';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
}

const glass = (color: string, border: string): React.CSSProperties => ({
  background: 'rgba(255,255,255,0.86)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  color,
  border: `1.5px solid ${border}`,
  boxShadow: '0 2px 12px rgba(122,98,245,0.10)',
});

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary:   glass('var(--lavender-600)', 'rgba(150,126,255,0.32)'),
  secondary: { ...glass('var(--color-text-secondary)', 'rgba(0,0,0,0.09)'), boxShadow: 'var(--shadow-xs)' },
  ghost:     { background: 'transparent', color: 'var(--lavender-500)', border: 'none', boxShadow: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none' },
  danger:    glass('var(--purple-600)', 'rgba(61,31,138,0.22)'),
  outline:   { background: 'transparent', color: 'var(--lavender-600)', border: '1.5px solid var(--lavender-300)', boxShadow: 'none' },
  purple:    glass('var(--purple-600)', 'rgba(61,31,138,0.28)'),
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
