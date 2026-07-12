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
