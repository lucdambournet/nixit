export type ResolvedStatus = 'online' | 'away' | 'offline' | 'dnd';

/**
 * dnd is a manual override and always wins. Otherwise: not present -> offline;
 * present -> online or away depending on the tracked activity flag.
 */
export function resolveStatus(userId: string, dnd: boolean, presence: Map<string, boolean>): ResolvedStatus {
  if (dnd) return 'dnd';
  if (!presence.has(userId)) return 'offline';
  return presence.get(userId) ? 'online' : 'away';
}

/**
 * Stable sort placing anyone with a resolved status other than 'offline'
 * (online, away, dnd) ahead of offline members, preserving relative order within each group.
 */
export function sortByActivity<T>(items: T[], statusOf: (item: T) => ResolvedStatus): T[] {
  return items
    .map((item, index) => ({ item, index, offline: statusOf(item) === 'offline' }))
    .sort((a, b) => Number(a.offline) - Number(b.offline) || a.index - b.index)
    .map(({ item }) => item);
}
