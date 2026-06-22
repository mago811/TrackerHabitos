import { and, eq, gte, lt } from "drizzle-orm";
import { db, habits, habitLogs, type HabitRow } from "@/db";

export type HabitInput = {
  name: string;
  type: "count" | "check" | "duration";
  unit: string | null;
  target: number;
  targetPeriod: "day" | "week";
  color: string;
  icon: string | null;
  activeDays: number[];
  sortOrder?: number;
};

export function listHabits(userId: string): Promise<HabitRow[]> {
  return db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.archived, false)))
    .orderBy(habits.sortOrder);
}

export async function createHabit(userId: string, i: HabitInput): Promise<HabitRow> {
  const [row] = await db
    .insert(habits)
    .values({ ...i, userId, target: String(i.target) })
    .returning();
  return row;
}

export async function updateHabit(userId: string, id: string, i: HabitInput): Promise<void> {
  await db
    .update(habits)
    .set({ ...i, target: String(i.target) })
    .where(and(eq(habits.id, id), eq(habits.userId, userId)));
}

export async function archiveHabit(userId: string, id: string): Promise<void> {
  await db
    .update(habits)
    .set({ archived: true })
    .where(and(eq(habits.id, id), eq(habits.userId, userId)));
}

export async function upsertLog(
  userId: string,
  habitId: string,
  date: string,
  value: number,
): Promise<void> {
  await db
    .insert(habitLogs)
    .values({ userId, habitId, date, value: String(value) })
    .onConflictDoUpdate({
      target: [habitLogs.habitId, habitLogs.date],
      set: { value: String(value), updatedAt: new Date() },
    });
}

export async function logsForRange(userId: string, startIso: string, endIso: string) {
  const rows = await db
    .select({ habitId: habitLogs.habitId, date: habitLogs.date, value: habitLogs.value })
    .from(habitLogs)
    .where(
      and(
        eq(habitLogs.userId, userId),
        gte(habitLogs.date, startIso),
        lt(habitLogs.date, endIso),
      ),
    );
  return rows.map((r) => ({ habitId: r.habitId, date: r.date, value: Number(r.value) }));
}
