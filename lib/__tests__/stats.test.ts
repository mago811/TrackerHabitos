import { describe, it, expect } from "vitest";
import { dailyRatio, periodPercent, heatmapCells } from "@/lib/stats";
import type { Habit, LogEntry } from "@/lib/types";

const anchor = new Date("2026-06-24T00:00:00Z"); // Wed
const daily = (over: Partial<Habit> = {}): Habit => ({
  id: "h",
  type: "count",
  target: 8,
  targetPeriod: "day",
  activeDays: [0, 1, 2, 3, 4, 5, 6],
  ...over,
});

describe("dailyRatio", () => {
  it("caps at 1", () => expect(dailyRatio(10, 8)).toBe(1));
  it("partial", () => expect(dailyRatio(4, 8)).toBe(0.5));
  it("target 0 -> 0 (no divide by zero)", () => expect(dailyRatio(5, 0)).toBe(0));
  it("negative value -> 0", () => expect(dailyRatio(-3, 8)).toBe(0));
});

describe("periodPercent (daily target)", () => {
  it("empty week -> 0", () => expect(periodPercent(daily(), [], "week", anchor)).toBe(0));
  it("half every day -> 50", () => {
    const logs: LogEntry[] = [
      "2026-06-22", "2026-06-23", "2026-06-24", "2026-06-25",
      "2026-06-26", "2026-06-27", "2026-06-28",
    ].map((date) => ({ date, value: 4 }));
    expect(periodPercent(daily(), logs, "week", anchor)).toBe(50);
  });
  it("excludes non-scheduled days from denominator", () => {
    const h = daily({ activeDays: [1] }); // only Mondays
    const logs: LogEntry[] = [{ date: "2026-06-22", value: 8 }]; // Mon full
    expect(periodPercent(h, logs, "week", anchor)).toBe(100);
  });
});

describe("periodPercent (weekly target)", () => {
  it("200/week, 100 logged -> 50", () => {
    const h = daily({ target: 200, targetPeriod: "week" });
    const logs: LogEntry[] = [
      { date: "2026-06-23", value: 60 },
      { date: "2026-06-25", value: 40 },
    ];
    expect(periodPercent(h, logs, "week", anchor)).toBe(50);
  });
});

describe("heatmapCells", () => {
  it("one cell per scheduled day with ratio", () => {
    const cells = heatmapCells(daily(), [{ date: "2026-06-24", value: 8 }], "week", anchor);
    expect(cells).toHaveLength(7);
    expect(cells.find((c) => c.date === "2026-06-24")!.ratio).toBe(1);
    expect(cells.find((c) => c.date === "2026-06-22")!.ratio).toBe(0);
  });
});
