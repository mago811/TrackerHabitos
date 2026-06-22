import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  numeric,
  date,
  timestamp,
  boolean,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

export const habitType = pgEnum("habit_type", ["count", "check", "duration"]);
export const targetPeriod = pgEnum("target_period", ["day", "week"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const habits = pgTable("habits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: habitType("type").notNull(),
  unit: text("unit"),
  target: numeric("target").notNull(),
  targetPeriod: targetPeriod("target_period").notNull().default("day"),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon"),
  activeDays: smallint("active_days")
    .array()
    .notNull()
    .default([0, 1, 2, 3, 4, 5, 6]),
  sortOrder: integer("sort_order").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const habitLogs = pgTable(
  "habit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    value: numeric("value").notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("habit_logs_habit_date_unique").on(t.habitId, t.date)],
);

export type User = typeof users.$inferSelect;
export type HabitRow = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
