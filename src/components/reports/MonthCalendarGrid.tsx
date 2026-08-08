import { addDays } from "date-fns";
import { weekStart, isoDate } from "@/lib/dates";
import { cn, formatCurrency } from "@/lib/utils";
import { hebrewDateLabel, hebrewHoliday } from "@/lib/hebrewCalendar";
import type { DailyBreakdown } from "@/lib/reports";

const WEEKDAY_LABELS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

export function MonthCalendarGrid({
  monthStart,
  breakdown,
}: {
  monthStart: Date;
  breakdown: DailyBreakdown[];
}) {
  const byDate = new Map(breakdown.map((d) => [d.date, d]));
  const currentMonth = monthStart.getMonth();
  const gridStart = weekStart(monthStart);
  const lastDayOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const gridEnd = addDays(weekStart(lastDayOfMonth), 7);
  const weeks: Date[][] = [];
  for (let cursor = gridStart; cursor < gridEnd; cursor = addDays(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
  }
  const todayKey = isoDate(new Date());

  return (
    <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface">
      <div className="grid grid-cols-7 bg-surface-soft/60 py-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[11px] font-semibold text-text-muted">
            {label}
          </div>
        ))}
      </div>
      <div className="space-y-1 p-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const key = isoDate(day);
              const isToday = key === todayKey;
              const inMonth = day.getMonth() === currentMonth;
              const d = byDate.get(key);
              const holiday = hebrewHoliday(day);
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[88px] rounded-lg border p-1",
                    holiday ? "border-gold/40 bg-gold-bg/50" : "border-border-soft/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-0.5">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold",
                        isToday
                          ? "gradient-primary text-accent-foreground"
                          : !inMonth
                            ? "text-text-muted/40"
                            : "text-text",
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {holiday ? (
                      <span className="text-[11px]" aria-hidden>
                        {holiday}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "truncate text-[9px] leading-none",
                      inMonth ? "text-text-muted" : "text-text-muted/40",
                    )}
                  >
                    {hebrewDateLabel(day)}
                  </p>
                  {d && d.income > 0 ? (
                    <p className="mt-1 truncate text-[11px] font-bold leading-tight text-accent-strong">
                      {formatCurrency(d.income)}
                    </p>
                  ) : null}
                  {d && (d.nailsCount > 0 || d.facialsCount > 0) ? (
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {d.nailsCount > 0 ? (
                        <span className="truncate rounded bg-nails px-1 py-[1px] text-[9px] font-medium text-white">
                          💅 {d.nailsCount}
                        </span>
                      ) : null}
                      {d.facialsCount > 0 ? (
                        <span className="truncate rounded bg-facials px-1 py-[1px] text-[9px] font-medium text-white">
                          ✨ {d.facialsCount}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
