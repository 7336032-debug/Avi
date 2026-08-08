// "Work-day streak" — consecutive days (including today) with at least one
// treatment logged. Inspired by tochnit-hachlama's streak.js, simplified:
// no shields, just counts back from today until a gap is found.

import { isoDate } from "@/lib/dates";

export function computeWorkDayStreak(performedAtDates: string[]): number {
  if (performedAtDates.length === 0) return 0;

  const loggedDays = new Set(performedAtDates.map((d) => isoDate(new Date(d))));

  let count = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // If nothing was logged today yet, the streak still counts back from
  // yesterday — logging today only extends it, it doesn't reset to zero.
  if (!loggedDays.has(isoDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  const safetyLimit = 3650;
  for (let i = 0; i < safetyLimit; i++) {
    const key = isoDate(cursor);
    if (!loggedDays.has(key)) break;
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}
