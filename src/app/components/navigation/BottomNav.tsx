import React from 'react';

interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface BottomNavProps {
  items: NavItem[];
  activeId?: string;
  onNavigate?: (id: string) => void;
}

/** Mobile counterpart to SideNav (#69): fixed bottom tab bar instead of a
 * left column, so narrow viewports get the full width back for content
 * (the cohort card / timer were getting cut off by the side rail). */
export function BottomNav({ items, activeId, onNavigate }: BottomNavProps) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
      display: 'flex', justifyContent: 'space-around', alignItems: 'stretch',
      background: 'var(--surface-card)',
      borderTop: '1px solid var(--color-border-subtle)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {items.map(item => {
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 2, padding: '8px 4px 6px', border: 'none', background: 'none', cursor: 'pointer',
              color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)', fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-medium)',
              position: 'relative', minHeight: 52,
            }}
          >
            {item.icon && (
              <span style={{ fontSize: '18px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </span>
            )}
            <span style={{ fontSize: 'var(--text-xs)', lineHeight: 1 }}>{item.label}</span>
            {item.badge != null && (
              <span style={{
                position: 'absolute', top: 2, right: '22%',
                background: 'var(--color-primary-surface)', color: 'var(--color-primary)',
                fontSize: 10, fontWeight: 'var(--weight-bold)', lineHeight: 1,
                padding: '1px 5px', borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-body)',
              }}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
