export type HabitType = "count" | "check" | "duration";
export type TargetPeriod = "day" | "week";

export interface Habit {
  id: string;
  type: HabitType;
  target: number;
  targetPeriod: TargetPeriod;
  activeDays: number[];
}

export interface LogEntry {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface HeatCell {
  date: string;
  ratio: number;
}
