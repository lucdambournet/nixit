import { describe, expect, it } from 'vitest';
import { resolveStatus, sortByActivity, type ResolvedStatus } from '../../src/app/lib/presence';

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

describe('sortByActivity', () => {
  const item = (id: string, status: ResolvedStatus) => ({ id, status });

  it('moves offline members to the end while preserving relative order within each group', () => {
    const items = [
      item('a', 'offline'),
      item('b', 'online'),
      item('c', 'offline'),
      item('d', 'away'),
      item('e', 'dnd'),
    ];

    const sorted = sortByActivity(items, i => i.status);

    expect(sorted.map(i => i.id)).toEqual(['b', 'd', 'e', 'a', 'c']);
  });

  it('leaves an all-active list unchanged', () => {
    const items = [item('a', 'online'), item('b', 'away'), item('c', 'dnd')];

    expect(sortByActivity(items, i => i.status).map(i => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const items = [item('a', 'offline'), item('b', 'online')];
    const original = [...items];

    sortByActivity(items, i => i.status);

    expect(items).toEqual(original);
  });
});
