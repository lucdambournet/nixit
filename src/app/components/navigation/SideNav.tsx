import React from 'react';

interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface SideNavProps {
  items: NavItem[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  logo?: React.ReactNode;
  userAvatar?: React.ReactNode;
  userName?: string;
  onUserClick?: () => void;
  userActive?: boolean;
  onSignOut?: () => void;
  style?: React.CSSProperties;
}

export function SideNav({ items, activeId, onNavigate, collapsed = false, onToggle, logo, userAvatar, userName, onUserClick, userActive, onSignOut, style }: SideNavProps) {
  return (
    <nav style={{
      display: 'flex', flexDirection: 'column',
      width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
      minHeight: '100vh',
      background: 'white',
      borderRight: '1px solid var(--color-border-subtle)',
      padding: `20px ${collapsed ? '12px' : '14px'}`,
      gap: '2px',
      transition: 'width var(--transition-base)',
      overflow: 'hidden',
      flexShrink: 0,
      ...style,
    }}>
      {/* Logo + collapse toggle */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        marginBottom: 'var(--space-5)',
        paddingBottom: 'var(--space-4)',
        borderBottom: '1px solid var(--color-border-subtle)',
        minHeight: 40, gap: 8,
      }}>
        {logo && <div style={{ overflow: 'hidden', flexShrink: collapsed ? 0 : 1 }}>{logo}</div>}
        <button onClick={onToggle} aria-label={collapsed ? 'Expand menu' : 'Collapse menu'} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-muted)',
          padding: '5px', borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: '18px',
          transition: 'color var(--transition-fast)',
        }}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Nav items */}
      {items.map(item => {
        const active = activeId === item.id;
        return (
          <button key={item.id} onClick={() => onNavigate?.(item.id)} style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 'var(--space-3)',
            padding: collapsed ? '11px 0' : '10px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 'var(--radius-lg)', border: 'none',
            cursor: 'pointer',
            background: active ? 'var(--lavender-50)' : 'transparent',
            color: active ? 'var(--lavender-600)' : 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
            fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-medium)',
            fontSize: 'var(--text-base)',
            transition: 'all var(--transition-fast)',
            width: '100%', whiteSpace: 'nowrap', textAlign: 'left',
          }}>
            {item.icon && (
              <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </span>
            )}
            {!collapsed && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
            {!collapsed && item.badge != null && (
              <span style={{
                background: 'var(--lavender-100)', color: 'var(--lavender-600)',
                fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)',
                padding: '1px 7px', borderRadius: 'var(--radius-full)',
                flexShrink: 0, fontFamily: 'var(--font-body)',
              }}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}

      {/* User footer */}
      {(userAvatar || userName) && (
        <div style={{
          marginTop: 'auto', paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--color-border-subtle)',
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 'var(--space-2)',
          justifyContent: collapsed ? 'center' : 'flex-start',
          overflow: 'hidden',
        }}>
          <button
            onClick={onUserClick}
            title={onUserClick ? 'View profile' : undefined}
            disabled={!onUserClick}
            style={{
              flex: 1, minWidth: 0,
              display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : 'var(--space-3)',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: userActive ? 'var(--lavender-50)' : 'transparent',
              border: 'none', borderRadius: 'var(--radius-lg)',
              cursor: onUserClick ? 'pointer' : 'default',
              padding: collapsed ? '6px 0' : '6px 8px',
              transition: 'background var(--transition-fast)',
              textAlign: 'left',
            }}
          >
            {userAvatar}
            {!collapsed && userName && (
              <span style={{
                fontFamily: 'var(--font-body)', fontWeight: 'var(--weight-medium)',
                fontSize: 'var(--text-sm)',
                color: userActive ? 'var(--lavender-600)' : 'var(--color-text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1,
              }}>
                {userName}
              </span>
            )}
          </button>
          {!collapsed && onSignOut && (
            <button onClick={onSignOut} title="Sign out" style={{
              background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
              color: 'var(--color-text-muted)', padding: '4px', borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color var(--transition-fast)',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
