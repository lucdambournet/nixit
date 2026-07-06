import React, { useId, useState } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  inputStyle?: React.CSSProperties;
}

export function Input({ label, error, hint, prefix, suffix, type = 'text', disabled, style, inputStyle, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const fallbackId = useId();
  const inputId = props.id ?? fallbackId;

  const borderColor = error
    ? 'var(--color-danger)'
    : focused ? 'var(--color-border-focus)' : 'var(--color-border)';

  const ring = error
    ? 'rgba(61,31,138,0.14)'
    : focused ? 'rgba(150,126,255,0.18)' : 'transparent';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', ...style }}>
      {label && (
        <label htmlFor={inputId} style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-semibold)',
          color: error ? 'var(--color-danger)' : 'var(--color-text)',
          letterSpacing: 'var(--tracking-wide)',
        }}>
          {label}
        </label>
      )}
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        background: disabled ? 'var(--neutral-50)' : 'white',
        boxShadow: `0 0 0 3px ${ring}`,
        transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
        overflow: 'hidden',
        opacity: disabled ? 0.65 : 1,
      }}>
        {prefix && (
          <span style={{ padding: '0 8px 0 14px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', flexShrink: 0 }}>
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
            color: 'var(--color-text)',
            background: 'transparent', border: 'none', outline: 'none',
            padding: 'var(--padding-input)',
            paddingLeft: prefix ? '4px' : undefined,
            paddingRight: suffix ? '4px' : undefined,
            width: '100%',
            ...inputStyle,
          }}
          {...props}
        />
        {suffix && (
          <span style={{ padding: '0 14px 0 8px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', flexShrink: 0 }}>
            {suffix}
          </span>
        )}
      </div>
      {(hint || error) && (
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
          color: error ? 'var(--color-danger)' : 'var(--color-text-muted)',
          lineHeight: 'var(--leading-snug)',
        }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}
