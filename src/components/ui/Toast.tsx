import React from 'react';

type ToastType = 'default' | 'success' | 'warning' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible?: boolean;
  onClose?: () => void;
  action?: { label: string; onClick: () => void };
  style?: React.CSSProperties;
}

const TYPES: Record<ToastType, { bg: string; border: string; iconBg: string; icon: string; blur?: boolean }> = {
  default: { bg: 'rgba(255,255,255,0.90)', border: 'rgba(150,126,255,0.22)', iconBg: 'var(--lavender-400)', icon: '✦', blur: true },
  success: { bg: 'var(--lavender-50)',     border: 'var(--lavender-200)',    iconBg: 'var(--lavender-500)', icon: '✓' },
  warning: { bg: 'var(--neutral-50)',      border: 'var(--neutral-200)',     iconBg: 'var(--neutral-500)',  icon: '!' },
  error:   { bg: 'var(--purple-50)',       border: 'var(--purple-100)',      iconBg: 'var(--purple-600)',   icon: '✕' },
};

export function Toast({ message, type = 'default', visible = true, onClose, action, style }: ToastProps) {
  if (!visible) return null;
  const t = TYPES[type] ?? TYPES.default;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: 'var(--radius-lg)',
      padding: '13px 16px',
      boxShadow: 'var(--shadow-lg)',
      maxWidth: 380,
      backdropFilter: t.blur ? 'blur(16px)' : 'none',
      WebkitBackdropFilter: t.blur ? 'blur(16px)' : 'none',
      ...style,
    }}>
      <span style={{
        width: 26, height: 26,
        borderRadius: 'var(--radius-full)',
        background: t.iconBg, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 'var(--weight-bold)',
        fontFamily: 'var(--font-body)', flexShrink: 0,
      }}>
        {t.icon}
      </span>
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
        color: 'var(--color-text)', flex: 1,
        lineHeight: 'var(--leading-snug)',
      }}>
        {message}
      </span>
      {action && (
        <button onClick={action.onClick} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-semibold)', color: 'var(--lavender-600)',
          flexShrink: 0, padding: '4px 6px',
        }}>
          {action.label}
        </button>
      )}
      {onClose && (
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-muted)',
          fontSize: '18px', lineHeight: 1,
          padding: '2px 4px', flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}>×</button>
      )}
    </div>
  );
}
