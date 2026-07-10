import { useEffect, useRef, useState } from 'react';
import { Avatar, type Status } from './Avatar';

const STATUS_LABEL: Record<Status, string> = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
  dnd: 'Do Not Disturb',
};

interface StatusPopoverProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md';
  status: Status;
  dnd: boolean;
  onToggleDnd: (next: boolean) => void;
}

export function StatusPopover({ src, name, size = 'sm', status, dnd, onToggleDnd }: StatusPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }} onClick={e => e.stopPropagation()}>
      <Avatar src={src} name={name} size={size} status={status} onStatusClick={() => setOpen(o => !o)} />
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 20,
          background: 'var(--surface-card)', border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', padding: 12, width: 208,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
            paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--color-border-subtle)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--status-${status})`, flexShrink: 0 }} />
            {STATUS_LABEL[status]}{status !== 'dnd' ? ' — detected automatically' : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                Do Not Disturb
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Only thing you control here
              </div>
            </div>
            <button
              type="button" role="switch" aria-checked={dnd}
              onClick={() => onToggleDnd(!dnd)}
              style={{
                width: 38, height: 22, flexShrink: 0, padding: 0, border: 'none', cursor: 'pointer',
                borderRadius: 'var(--radius-full)',
                background: dnd ? 'var(--status-dnd)' : 'var(--neutral-300)',
                position: 'relative',
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: dnd ? 18 : 2,
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                boxShadow: 'var(--shadow-xs)', transition: 'left 140ms ease',
              }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
