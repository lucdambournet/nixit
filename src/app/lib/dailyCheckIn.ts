export type CheckInStatus = {
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string | null;
};

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayISODate(): string {
  return toISODate(new Date());
}

/** Whether `prevDate` (YYYY-MM-DD) is the calendar day immediately before `today` (YYYY-MM-DD). */
export function isConsecutiveDay(prevDate: string | null, today: string): boolean {
  if (!prevDate) return false;

  const prev = new Date(`${prevDate}T00:00:00Z`);
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  return toISODate(prev) === toISODate(yesterday);
}

export function hasCheckedInToday(status: Pick<CheckInStatus, 'lastCheckInDate'>, today: string = todayISODate()): boolean {
  return status.lastCheckInDate === today;
}

export function formatStreakLabel(streak: number): string {
  if (streak <= 0) return 'No streak yet';
  return `${streak} day${streak === 1 ? '' : 's'}`;
}
