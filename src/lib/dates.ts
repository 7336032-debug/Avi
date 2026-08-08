import { startOfWeek, endOfWeek, addWeeks, format } from "date-fns";

// Israeli week: Sunday -> Saturday.
export function weekStart(date: Date) {
  return startOfWeek(date, { weekStartsOn: 0 });
}

export function weekEnd(date: Date) {
  return endOfWeek(date, { weekStartsOn: 0 });
}

export function nextWeekStart(date: Date) {
  return addWeeks(weekStart(date), 1);
}

export function isoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}
