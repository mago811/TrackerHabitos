import { eachDay, eachWeek, isoDate, dayOfWeek, rangeFor, type Period } from "@/lib/dates";
import type { Habit, LogEntry, HeatCell } from "@/lib/types";

export function dailyRatio(value: number, target: number): number {
  if (target <= 0 || value <= 0) return 0;
  return Math.min(value / target, 1);
}

function logMap(logs: LogEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of logs) m.set(l.date, (m.get(l.date) ?? 0) + l.value);
  return m;
}

function scheduled(habit: Habit, d: Date): boolean {
  return habit.activeDays.includes(dayOfWeek(d));
}

export function periodPercent(
  habit: Habit,
  logs: LogEntry[],
  period: Period,
  anchor: Date,
): number {
  const range = rangeFor(period, anchor);
  const m = logMap(logs);
  let sum = 0;
  let n = 0;

  if (habit.targetPeriod === "day") {
    for (const day of eachDay(range)) {
      if (!scheduled(habit, day)) continue;
      sum += dailyRatio(m.get(isoDate(day)) ?? 0, habit.target);
      n++;
    }
  } else {
    for (const wk of eachWeek(range)) {
      let weekSum = 0;
      for (const day of eachDay(wk)) weekSum += m.get(isoDate(day)) ?? 0;
      sum += dailyRatio(weekSum, habit.target);
      n++;
    }
  }

  return n === 0 ? 0 : Math.round((sum / n) * 100);
}

export function heatmapCells(
  habit: Habit,
  logs: LogEntry[],
  period: Period,
  anchor: Date,
): HeatCell[] {
  const range = rangeFor(period, anchor);
  const m = logMap(logs);
  return eachDay(range)
    .filter((day) => scheduled(habit, day))
    .map((day) => ({
      date: isoDate(day),
      ratio: dailyRatio(m.get(isoDate(day)) ?? 0, habit.target),
    }));
}
