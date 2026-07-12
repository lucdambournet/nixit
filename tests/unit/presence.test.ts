import { describe, expect, it } from 'vitest';
import { resolveStatus } from '../../src/app/lib/presence';

describe('resolveStatus', () => {
  it('returns dnd when dnd is on, even if present and active', () => {
    expect(resolveStatus('user-1', true, new Map([['user-1', true]]))).toBe('dnd');
  });

  it('returns dnd when dnd is on and the user is not present at all', () => {
    expect(resolveStatus('user-1', true, new Map())).toBe('dnd');
  });

  it('returns offline when the user is not present and dnd is off', () => {
    expect(resolveStatus('user-1', false, new Map())).toBe('offline');
  });

  it('returns online when present and active', () => {
    expect(resolveStatus('user-1', false, new Map([['user-1', true]]))).toBe('online');
  });

  it('returns away when present but inactive', () => {
    expect(resolveStatus('user-1', false, new Map([['user-1', false]]))).toBe('away');
  });
});
