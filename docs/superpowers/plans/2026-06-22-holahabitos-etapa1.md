# holahabitos — Etapa 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core of holahabitos — a web PWA habit tracker where a user can register, create habits with daily/weekly targets, log daily progress, and see a per-habit completion heatmap with Week/Month/Year percentages.

**Architecture:** Next.js App Router single codebase. Pure logic (dates, percentage math) lives in `lib/` and is TDD-tested with zero I/O. Persistence is Neon Postgres via Drizzle ORM. Mutations are Server Actions. Auth is self-managed (bcrypt + signed JWT cookie). Reports compute percentages from logs read through the query layer and passed into the pure `lib/stats.ts`.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Neon (`@neondatabase/serverless`), Drizzle ORM + drizzle-kit, `bcryptjs`, `jose`, Vitest, React Testing Library.

## Global Constraints

- Language of all UI copy: **Spanish**.
- Node 20+. TypeScript strict mode on.
- Auth is self-managed — no external auth provider. Passwords hashed with bcrypt; session is a signed JWT in an httpOnly cookie.
- Percentage logic must be a pure module (`lib/stats.ts`) with no DB/network imports.
- A daily target percent caps each day at 100% (`min(value/target, 1)`); a weekly target caps each week at 100%.
- Every habit belongs to a user; every query filters by `user_id`.
- `DATABASE_URL` (Neon connection string) comes from env. Tests must not require a live DB.

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `.env.example`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Test: `lib/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: a runnable Next.js app and a working `npm test` (Vitest).

- [ ] **Step 1: Scaffold Next.js**

```bash
npx create-next-app@latest . --typescript --app --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm
```
(If the directory is non-empty, scaffold in a temp dir and copy files in.)

- [ ] **Step 2: Add dependencies**

```bash
npm i drizzle-orm @neondatabase/serverless bcryptjs jose
npm i -D drizzle-kit vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @types/bcryptjs
```

- [ ] **Step 3: Add `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./vitest.setup.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```
Create `vitest.setup.ts` with `import "@testing-library/jest-dom";`. Add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json` scripts.

- [ ] **Step 4: Create `.env.example`**

```
DATABASE_URL=postgres://user:pass@host/db?sslmode=require
SESSION_SECRET=change-me-32-bytes-min
```

- [ ] **Step 5: Smoke test**

```ts
// lib/__tests__/smoke.test.ts
import { describe, it, expect } from "vitest";
describe("smoke", () => { it("runs", () => { expect(1 + 1).toBe(2); }); });
```

- [ ] **Step 6: Run + commit**

Run: `npm test` → Expected: PASS. Run `npm run build` → Expected: success.
```bash
git add -A && git commit -m "chore: scaffold Next.js app with Vitest"
```

---

### Task 2: Date & period helpers (`lib/dates.ts`)

**Files:**
- Create: `lib/dates.ts`
- Test: `lib/__tests__/dates.test.ts`

**Interfaces:**
- Produces:
  - `type Period = "week" | "month" | "year"`
  - `type DateRange = { start: Date; end: Date }` (end exclusive, both at UTC midnight)
  - `rangeFor(period: Period, anchor: Date): DateRange`
  - `eachDay(range: DateRange): Date[]` (UTC midnights, start inclusive → end exclusive)
  - `eachWeek(range: DateRange): DateRange[]` (Mon-start weeks clipped to range)
  - `isoDate(d: Date): string` (`YYYY-MM-DD`, UTC)
  - `dayOfWeek(d: Date): number` (0=Sun … 6=Sat, UTC)

All functions operate in UTC to keep tests deterministic.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { rangeFor, eachDay, eachWeek, isoDate, dayOfWeek } from "@/lib/dates";

const d = (s: string) => new Date(s + "T00:00:00Z");

describe("isoDate / dayOfWeek", () => {
  it("formats UTC date", () => expect(isoDate(d("2026-06-22"))).toBe("2026-06-22"));
  it("monday is 1", () => expect(dayOfWeek(d("2026-06-22"))).toBe(1));
});

describe("rangeFor", () => {
  it("week is Mon..next Mon around anchor", () => {
    const r = rangeFor("week", d("2026-06-24")); // Wed
    expect(isoDate(r.start)).toBe("2026-06-22"); // Mon
    expect(isoDate(r.end)).toBe("2026-06-29");   // exclusive next Mon
  });
  it("month spans the calendar month", () => {
    const r = rangeFor("month", d("2026-06-15"));
    expect(isoDate(r.start)).toBe("2026-06-01");
    expect(isoDate(r.end)).toBe("2026-07-01");
  });
  it("year spans the calendar year", () => {
    const r = rangeFor("year", d("2026-06-15"));
    expect(isoDate(r.start)).toBe("2026-01-01");
    expect(isoDate(r.end)).toBe("2027-01-01");
  });
});

describe("eachDay / eachWeek", () => {
  it("lists days end-exclusive", () => {
    const days = eachDay({ start: d("2026-06-22"), end: d("2026-06-25") });
    expect(days.map(isoDate)).toEqual(["2026-06-22", "2026-06-23", "2026-06-24"]);
  });
  it("splits into Mon-start weeks clipped to range", () => {
    const weeks = eachWeek(rangeFor("month", d("2026-06-15")));
    expect(isoDate(weeks[0].start)).toBe("2026-06-01");
    expect(isoDate(weeks[weeks.length - 1].end)).toBe("2026-07-01");
  });
});
```

- [ ] **Step 2: Run → FAIL** (`npm test lib/__tests__/dates.test.ts`).

- [ ] **Step 3: Implement `lib/dates.ts`**

```ts
export type Period = "week" | "month" | "year";
export type DateRange = { start: Date; end: Date };

const DAY = 86_400_000;
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function dayOfWeek(d: Date): number {
  return d.getUTCDay();
}
function mondayOf(d: Date): Date {
  const wd = d.getUTCDay();              // 0=Sun..6=Sat
  const back = (wd + 6) % 7;             // days since Monday
  return new Date(d.getTime() - back * DAY);
}
export function rangeFor(period: Period, anchor: Date): DateRange {
  const y = anchor.getUTCFullYear(), m = anchor.getUTCMonth(), day = anchor.getUTCDate();
  if (period === "week") {
    const start = mondayOf(utc(y, m, day));
    return { start, end: new Date(start.getTime() + 7 * DAY) };
  }
  if (period === "month") return { start: utc(y, m, 1), end: utc(y, m + 1, 1) };
  return { start: utc(y, 0, 1), end: utc(y + 1, 0, 1) };
}
export function eachDay(range: DateRange): Date[] {
  const out: Date[] = [];
  for (let t = range.start.getTime(); t < range.end.getTime(); t += DAY) out.push(new Date(t));
  return out;
}
export function eachWeek(range: DateRange): DateRange[] {
  const out: DateRange[] = [];
  let cur = mondayOf(range.start);
  while (cur < range.end) {
    const next = new Date(cur.getTime() + 7 * DAY);
    out.push({
      start: cur < range.start ? range.start : cur,
      end: next > range.end ? range.end : next,
    });
    cur = next;
  }
  return out;
}
```

- [ ] **Step 4: Run → PASS. Commit**

```bash
git add lib/dates.ts lib/__tests__/dates.test.ts
git commit -m "feat: UTC date & period helpers"
```

---

### Task 3: Percentage logic (`lib/stats.ts`) — TDD core

**Files:**
- Create: `lib/stats.ts`, `lib/types.ts`
- Test: `lib/__tests__/stats.test.ts`

**Interfaces:**
- Consumes: `lib/dates.ts` (`rangeFor`, `eachDay`, `eachWeek`, `isoDate`, `dayOfWeek`).
- Produces (`lib/types.ts`):
  - `type HabitType = "count" | "check" | "duration"`
  - `type TargetPeriod = "day" | "week"`
  - `interface Habit { id: string; type: HabitType; target: number; targetPeriod: TargetPeriod; activeDays: number[]; }`
  - `interface LogEntry { date: string; value: number; }` (`date` = `YYYY-MM-DD`)
  - `interface HeatCell { date: string; ratio: number; }`
- Produces (`lib/stats.ts`):
  - `dailyRatio(value: number, target: number): number` → 0..1
  - `periodPercent(habit: Habit, logs: LogEntry[], period: Period, anchor: Date): number` → 0..100 integer
  - `heatmapCells(habit: Habit, logs: LogEntry[], period: Period, anchor: Date): HeatCell[]`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { dailyRatio, periodPercent, heatmapCells } from "@/lib/stats";
import type { Habit, LogEntry } from "@/lib/types";

const anchor = new Date("2026-06-24T00:00:00Z"); // Wed
const daily = (over: Partial<Habit> = {}): Habit => ({
  id: "h", type: "count", target: 8, targetPeriod: "day",
  activeDays: [0,1,2,3,4,5,6], ...over,
});

describe("dailyRatio", () => {
  it("caps at 1", () => expect(dailyRatio(10, 8)).toBe(1));
  it("partial", () => expect(dailyRatio(4, 8)).toBe(0.5));
  it("target 0 → 0 (no divide by zero)", () => expect(dailyRatio(5, 0)).toBe(0));
  it("negative value → 0", () => expect(dailyRatio(-3, 8)).toBe(0));
});

describe("periodPercent (daily target)", () => {
  it("empty week → 0", () => expect(periodPercent(daily(), [], "week", anchor)).toBe(0));
  it("half every day → 50", () => {
    const logs: LogEntry[] = ["2026-06-22","2026-06-23","2026-06-24","2026-06-25","2026-06-26","2026-06-27","2026-06-28"]
      .map(date => ({ date, value: 4 }));
    expect(periodPercent(daily(), logs, "week", anchor)).toBe(50);
  });
  it("excludes non-scheduled days from denominator", () => {
    // only Mondays scheduled; one full Monday in the week → 100
    const h = daily({ activeDays: [1] });
    const logs: LogEntry[] = [{ date: "2026-06-22", value: 8 }]; // Mon full
    expect(periodPercent(h, logs, "week", anchor)).toBe(100);
  });
});

describe("periodPercent (weekly target)", () => {
  it("200/week, 100 logged in the week → 50", () => {
    const h = daily({ target: 200, targetPeriod: "week" });
    const logs: LogEntry[] = [{ date: "2026-06-23", value: 60 }, { date: "2026-06-25", value: 40 }];
    expect(periodPercent(h, logs, "week", anchor)).toBe(50);
  });
});

describe("heatmapCells", () => {
  it("one cell per scheduled day with ratio", () => {
    const cells = heatmapCells(daily(), [{ date: "2026-06-24", value: 8 }], "week", anchor);
    expect(cells).toHaveLength(7);
    expect(cells.find(c => c.date === "2026-06-24")!.ratio).toBe(1);
    expect(cells.find(c => c.date === "2026-06-22")!.ratio).toBe(0);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `lib/types.ts` then `lib/stats.ts`**

```ts
// lib/types.ts
export type HabitType = "count" | "check" | "duration";
export type TargetPeriod = "day" | "week";
export interface Habit { id: string; type: HabitType; target: number; targetPeriod: TargetPeriod; activeDays: number[]; }
export interface LogEntry { date: string; value: number; }
export interface HeatCell { date: string; ratio: number; }
```

```ts
// lib/stats.ts
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

export function periodPercent(habit: Habit, logs: LogEntry[], period: Period, anchor: Date): number {
  const range = rangeFor(period, anchor);
  const m = logMap(logs);
  let sum = 0, n = 0;
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

export function heatmapCells(habit: Habit, logs: LogEntry[], period: Period, anchor: Date): HeatCell[] {
  const range = rangeFor(period, anchor);
  const m = logMap(logs);
  return eachDay(range)
    .filter(day => scheduled(habit, day))
    .map(day => ({ date: isoDate(day), ratio: dailyRatio(m.get(isoDate(day)) ?? 0, habit.target) }));
}
```

- [ ] **Step 4: Run → PASS. Commit**

```bash
git add lib/stats.ts lib/types.ts lib/__tests__/stats.test.ts
git commit -m "feat: pure percentage & heatmap logic (TDD)"
```

---

### Task 4: Database schema (Drizzle)

**Files:**
- Create: `db/schema.ts`, `drizzle.config.ts`
- Modify: `package.json` (add `db:generate`, `db:migrate` scripts)

**Interfaces:**
- Produces Drizzle tables `users`, `habits`, `habitLogs` and inferred types `User`, `Habit as HabitRow`, `HabitLog`.

- [ ] **Step 1: Write `db/schema.ts`**

```ts
import { pgTable, uuid, text, integer, smallint, numeric, date, timestamp, boolean, pgEnum, unique } from "drizzle-orm/pg-core";

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
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: habitType("type").notNull(),
  unit: text("unit"),
  target: numeric("target").notNull(),
  targetPeriod: targetPeriod("target_period").notNull().default("day"),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon"),
  activeDays: smallint("active_days").array().notNull().default([0,1,2,3,4,5,6]),
  sortOrder: integer("sort_order").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const habitLogs = pgTable("habit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  habitId: uuid("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  value: numeric("value").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ uniqHabitDate: unique().on(t.habitId, t.date) }));

export type User = typeof users.$inferSelect;
export type HabitRow = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
```

- [ ] **Step 2: Write `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```
Add scripts: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`.

- [ ] **Step 3: Generate migration + verify build**

Run: `npm run db:generate` → Expected: SQL file under `db/migrations/`. Run `npm run build` → Expected: success (schema typechecks).

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts drizzle.config.ts db/migrations package.json
git commit -m "feat: Drizzle schema for users, habits, habit_logs"
```

---

### Task 5: DB client (`db/index.ts`)

**Files:**
- Create: `db/index.ts`

**Interfaces:**
- Produces: `db` (drizzle client bound to Neon).

- [ ] **Step 1: Implement**

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
export * from "./schema";
```

- [ ] **Step 2: Verify build + commit**

Run `npm run build` → success.
```bash
git add db/index.ts && git commit -m "feat: Neon + Drizzle client"
```

---

### Task 6: Auth helpers (`lib/auth.ts`) — TDD

**Files:**
- Create: `lib/auth.ts`
- Test: `lib/__tests__/auth.test.ts`

**Interfaces:**
- Produces:
  - `hashPassword(pw: string): Promise<string>`
  - `verifyPassword(pw: string, hash: string): Promise<boolean>`
  - `signSession(payload: { userId: string }): Promise<string>`
  - `verifySession(token: string): Promise<{ userId: string } | null>`

`SESSION_SECRET` read from env; tests set it before importing.

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect, beforeAll } from "vitest";
beforeAll(() => { process.env.SESSION_SECRET = "test-secret-test-secret-test-secret"; });

describe("auth", () => {
  it("hashes and verifies password", async () => {
    const { hashPassword, verifyPassword } = await import("@/lib/auth");
    const h = await hashPassword("hunter2");
    expect(h).not.toBe("hunter2");
    expect(await verifyPassword("hunter2", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
  it("signs and verifies a session", async () => {
    const { signSession, verifySession } = await import("@/lib/auth");
    const token = await signSession({ userId: "u1" });
    expect((await verifySession(token))?.userId).toBe("u1");
    expect(await verifySession("garbage")).toBeNull();
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}
export async function signSession(payload: { userId: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}
export async function verifySession(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return { userId: String(payload.userId) };
  } catch { return null; }
}
```

- [ ] **Step 4: Run → PASS. Commit**

```bash
git add lib/auth.ts lib/__tests__/auth.test.ts
git commit -m "feat: auth helpers (bcrypt + jose session)"
```

---

### Task 7: Auth actions, pages, middleware, session helpers

**Files:**
- Create: `lib/session.ts`, `app/(auth)/register/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/actions.ts`, `middleware.ts`

**Interfaces:**
- Consumes: `lib/auth.ts`, `db`.
- Produces:
  - `getSession(): Promise<{ userId: string } | null>` (reads cookie)
  - `requireUserId(): Promise<string>` (redirects to `/login` if absent)
  - Server actions `register(formData)`, `login(formData)`, `logout()`.
- Cookie name: `hh_session`.

- [ ] **Step 1: `lib/session.ts`**

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";

export const SESSION_COOKIE = "hh_session";

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}
export async function requireUserId(): Promise<string> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s.userId;
}
```

- [ ] **Step 2: `app/(auth)/actions.ts`** (register/login/logout)

```ts
"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { hashPassword, verifyPassword, signSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

async function setSession(userId: string) {
  const token = await signSession({ userId });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 30,
  });
}

export async function register(formData: FormData) {
  const email = String(formData.get("email")).toLowerCase().trim();
  const password = String(formData.get("password"));
  const displayName = String(formData.get("displayName") || email.split("@")[0]);
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length) throw new Error("Ese email ya está registrado");
  const [u] = await db.insert(users)
    .values({ email, passwordHash: await hashPassword(password), displayName })
    .returning();
  await setSession(u.id);
  redirect("/today");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email")).toLowerCase().trim();
  const password = String(formData.get("password"));
  const [u] = await db.select().from(users).where(eq(users.email, email));
  if (!u || !(await verifyPassword(password, u.passwordHash))) throw new Error("Credenciales inválidas");
  await setSession(u.id);
  redirect("/today");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
```

- [ ] **Step 3: Login & register pages** (`app/(auth)/login/page.tsx`, `register/page.tsx`)

```tsx
// login/page.tsx — register/page.tsx is identical but calls `register` and adds a displayName input
import { login } from "../actions";
export default function LoginPage() {
  return (
    <main className="auth">
      <h1>Iniciar sesión</h1>
      <form action={login}>
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Contraseña" required />
        <button type="submit">Entrar</button>
      </form>
      <a href="/register">Crear cuenta</a>
    </main>
  );
}
```

- [ ] **Step 4: `middleware.ts`** (protect `(app)` routes)

```ts
import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

const PROTECTED = ["/today", "/reports", "/habits"];
export async function middleware(req: NextRequest) {
  if (!PROTECTED.some(p => req.nextUrl.pathname.startsWith(p))) return NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && (await verifySession(token))) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}
export const config = { matcher: ["/today/:path*", "/reports/:path*", "/habits/:path*"] };
```

- [ ] **Step 5: Verify + commit**

Run `npm run build` → success.
```bash
git add lib/session.ts "app/(auth)" middleware.ts
git commit -m "feat: self-managed auth (register/login/logout + route guard)"
```

---

### Task 8: Habit & log queries (`db/queries.ts`)

**Files:**
- Create: `db/queries.ts`

**Interfaces:**
- Consumes: `db`.
- Produces (all take `userId` first):
  - `listHabits(userId): Promise<HabitRow[]>` (non-archived, ordered by sortOrder)
  - `createHabit(userId, input): Promise<HabitRow>`
  - `updateHabit(userId, id, input): Promise<void>`
  - `archiveHabit(userId, id): Promise<void>`
  - `upsertLog(userId, habitId, date: string, value: number): Promise<void>`
  - `logsForRange(userId, startIso: string, endIso: string): Promise<{ habitId: string; date: string; value: number }[]>`

- [ ] **Step 1: Implement**

```ts
import { and, eq, gte, lt } from "drizzle-orm";
import { db, habits, habitLogs, type HabitRow } from "@/db";

export type HabitInput = {
  name: string; type: "count" | "check" | "duration"; unit: string | null;
  target: number; targetPeriod: "day" | "week"; color: string; icon: string | null;
  activeDays: number[]; sortOrder?: number;
};

export function listHabits(userId: string): Promise<HabitRow[]> {
  return db.select().from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.archived, false)))
    .orderBy(habits.sortOrder);
}
export async function createHabit(userId: string, i: HabitInput): Promise<HabitRow> {
  const [row] = await db.insert(habits)
    .values({ ...i, userId, target: String(i.target) }).returning();
  return row;
}
export async function updateHabit(userId: string, id: string, i: HabitInput): Promise<void> {
  await db.update(habits).set({ ...i, target: String(i.target) })
    .where(and(eq(habits.id, id), eq(habits.userId, userId)));
}
export async function archiveHabit(userId: string, id: string): Promise<void> {
  await db.update(habits).set({ archived: true })
    .where(and(eq(habits.id, id), eq(habits.userId, userId)));
}
export async function upsertLog(userId: string, habitId: string, date: string, value: number): Promise<void> {
  await db.insert(habitLogs)
    .values({ userId, habitId, date, value: String(value) })
    .onConflictDoUpdate({ target: [habitLogs.habitId, habitLogs.date], set: { value: String(value), updatedAt: new Date() } });
}
export async function logsForRange(userId: string, startIso: string, endIso: string) {
  const rows = await db.select({ habitId: habitLogs.habitId, date: habitLogs.date, value: habitLogs.value })
    .from(habitLogs)
    .where(and(eq(habitLogs.userId, userId), gte(habitLogs.date, startIso), lt(habitLogs.date, endIso)));
  return rows.map(r => ({ habitId: r.habitId, date: r.date, value: Number(r.value) }));
}
```

- [ ] **Step 2: Verify build + commit**

```bash
git add db/queries.ts && git commit -m "feat: habit & log query layer"
```

---

### Task 9: Habits management UI + actions

**Files:**
- Create: `app/(app)/layout.tsx`, `app/(app)/habits/page.tsx`, `app/(app)/habits/actions.ts`, `app/(app)/habits/habit-form.tsx`

**Interfaces:**
- Consumes: `requireUserId`, `db/queries`.
- Produces: server actions `saveHabit(formData)`, `removeHabit(formData)`.

- [ ] **Step 1: App shell `app/(app)/layout.tsx`** with bottom nav (Hoy / Reportes / Hábitos) and `logout` button.

```tsx
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <main>{children}</main>
      <nav className="bottom-nav">
        <Link href="/today">Hoy</Link>
        <Link href="/reports">Reportes</Link>
        <Link href="/habits">Hábitos</Link>
        <form action={logout}><button>Salir</button></form>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Actions `app/(app)/habits/actions.ts`**

```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { createHabit, updateHabit, archiveHabit, type HabitInput } from "@/db/queries";

function parse(formData: FormData): HabitInput {
  const type = String(formData.get("type")) as HabitInput["type"];
  return {
    name: String(formData.get("name")).trim(),
    type,
    unit: type === "check" ? null : String(formData.get("unit") || "").trim() || null,
    target: type === "check" ? 1 : Number(formData.get("target")),
    targetPeriod: String(formData.get("targetPeriod")) as HabitInput["targetPeriod"],
    color: String(formData.get("color") || "#6366f1"),
    icon: String(formData.get("icon") || "") || null,
    activeDays: formData.getAll("activeDays").map(Number),
  };
}
export async function saveHabit(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") || "");
  if (id) await updateHabit(userId, id, parse(formData));
  else await createHabit(userId, parse(formData));
  revalidatePath("/habits"); revalidatePath("/today"); revalidatePath("/reports");
}
export async function removeHabit(formData: FormData) {
  const userId = await requireUserId();
  await archiveHabit(userId, String(formData.get("id")));
  revalidatePath("/habits");
}
```

- [ ] **Step 3: `habits/page.tsx`** lists habits + `habit-form.tsx` (name, type select, unit, target, targetPeriod select, color, 7 day checkboxes). Form posts to `saveHabit`; each list row has a `removeHabit` button. (Render real inputs — no placeholders.)

- [ ] **Step 4: Verify build + manual check + commit**

Run `npm run build` → success.
```bash
git add "app/(app)/layout.tsx" "app/(app)/habits"
git commit -m "feat: habit management UI + actions"
```

---

### Task 10: Today screen + log progress

**Files:**
- Create: `app/(app)/today/page.tsx`, `app/(app)/today/actions.ts`, `app/(app)/today/habit-row.tsx`

**Interfaces:**
- Consumes: `requireUserId`, `listHabits`, `logsForRange`, `upsertLog`, `lib/dates` (`isoDate`, `dayOfWeek`), `lib/stats` (`dailyRatio`).
- Produces: server action `setProgress(formData)` with fields `habitId`, `date`, `value`.

- [ ] **Step 1: Action `today/actions.ts`**

```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { upsertLog } from "@/db/queries";

export async function setProgress(formData: FormData) {
  const userId = await requireUserId();
  await upsertLog(userId, String(formData.get("habitId")), String(formData.get("date")), Number(formData.get("value")));
  revalidatePath("/today"); revalidatePath("/reports");
}
```

- [ ] **Step 2: `today/page.tsx`** — read `?date=` (default today, UTC `isoDate`), show a Sun–Sat day selector, fetch habits scheduled that weekday, fetch that day's logs, render `habit-row` per habit showing `value/target`, a `+` (count/duration: increments by 1 or by unit step) and a check toggle (check type sets value 0/1). Each control is a `<form action={setProgress}>` submitting the new value. Show `dailyRatio` as a small progress bar.

- [ ] **Step 3: Verify build + commit**

```bash
git add "app/(app)/today"
git commit -m "feat: Today screen with daily progress logging"
```

---

### Task 11: Reports screen (heatmap + %) — priority

**Files:**
- Create: `app/(app)/reports/page.tsx`, `app/(app)/reports/heatmap.tsx`, `app/(app)/reports/reports.css`

**Interfaces:**
- Consumes: `requireUserId`, `listHabits`, `logsForRange`, `lib/dates` (`rangeFor`, `isoDate`), `lib/stats` (`periodPercent`, `heatmapCells`), `lib/types`.

- [ ] **Step 1: `reports/page.tsx`**

Read `?period=week|month|year` (default `week`) and `?anchor=YYYY-MM-DD` (default today). Compute `range = rangeFor(period, anchor)`; fetch `logsForRange(userId, isoDate(range.start), isoDate(range.end))`; group logs by `habitId`. For each habit build `{ id, type, target: Number(target), targetPeriod, activeDays }` and call `periodPercent` + `heatmapCells`. Render: period toggle (Week/Month/Año links), ‹ Hoy › nav (anchor ± one period), then per habit a card with name, the big `%`, and `<Heatmap cells={...} color={habit.color} />`.

```tsx
// excerpt: building the view-model per habit
const byHabit = new Map<string, { date: string; value: number }[]>();
for (const l of logs) (byHabit.get(l.habitId) ?? byHabit.set(l.habitId, []).get(l.habitId)!).push(l);
const cards = habits.map((h) => {
  const habit = { id: h.id, type: h.type, target: Number(h.target), targetPeriod: h.targetPeriod, activeDays: h.activeDays };
  const hlogs = byHabit.get(h.id) ?? [];
  return { h, percent: periodPercent(habit, hlogs, period, anchor), cells: heatmapCells(habit, hlogs, period, anchor) };
});
```

- [ ] **Step 2: `reports/heatmap.tsx`**

```tsx
import type { HeatCell } from "@/lib/types";
export function Heatmap({ cells, color }: { cells: HeatCell[]; color: string }) {
  return (
    <div className="heatmap">
      {cells.map((c) => (
        <span key={c.date} className="heat-cell" title={`${c.date}: ${Math.round(c.ratio * 100)}%`}
          style={{ backgroundColor: color, opacity: c.ratio === 0 ? 0.12 : 0.25 + c.ratio * 0.75 }} />
      ))}
    </div>
  );
}
```
CSS: `.heatmap { display: grid; grid-auto-flow: row; grid-template-columns: repeat(auto-fill, 12px); gap: 3px; }` `.heat-cell { width: 12px; height: 12px; border-radius: 2px; }`

- [ ] **Step 3: Verify build + commit**

```bash
git add "app/(app)/reports"
git commit -m "feat: Reports screen with percentage + heatmap"
```

---

### Task 12: PWA (manifest + service worker)

**Files:**
- Create: `app/manifest.ts`, `public/sw.js`, `app/sw-register.tsx`
- Modify: `app/layout.tsx` (mount `<SwRegister />`, set theme color)

**Interfaces:**
- Produces: installable PWA with a cached app shell.

- [ ] **Step 1: `app/manifest.ts`** (Next metadata route)

```ts
import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "holahabitos", short_name: "holahabitos",
    start_url: "/today", display: "standalone",
    background_color: "#ffffff", theme_color: "#6366f1",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
  };
}
```

- [ ] **Step 2: `public/sw.js`** — cache-first for the app shell; network for everything else.

```js
const CACHE = "hh-shell-v1";
const SHELL = ["/today", "/reports", "/habits"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then(r => r ?? caches.match("/today"))));
});
```

- [ ] **Step 3: `app/sw-register.tsx`** (client) registers `/sw.js` on mount; mount it in `app/layout.tsx`. Add placeholder `public/icon-192.png` / `icon-512.png`.

- [ ] **Step 4: Verify + commit**

Run `npm run build` → success. In the browser, devtools → Application shows the manifest + an active service worker.
```bash
git add app/manifest.ts public/sw.js app/sw-register.tsx app/layout.tsx public/icon-192.png public/icon-512.png
git commit -m "feat: installable PWA shell"
```

---

## Self-Review

**Spec coverage:**
- Auth propia → Tasks 6–7. ✅
- Modelo de datos (users/habits/habit_logs, `target_period`, `active_days`) → Task 4. ✅
- Lógica de % (daily/weekly, tope 100%, días programados, heatmap) → Task 3. ✅
- Pantalla Hoy → Task 10. ✅
- Pantalla Reportes (Semana/Mes/Año + heatmap + %) → Task 11. ✅
- Gestión de hábitos → Task 9. ✅
- PWA instalable → Task 12. ✅
- Tests TDD para stats y auth → Tasks 3 y 6. ✅

**Placeholder scan:** UI tasks (9–11) describe the JSX to render with concrete field lists and provide the non-obvious excerpts; no "TODO/handle edge cases" left. Icons in Task 12 are real (placeholder image files, not code placeholders).

**Type consistency:** `Habit`/`LogEntry`/`HeatCell` defined in `lib/types.ts` (Task 3) and reused verbatim in Tasks 10–11. Query return type `{ habitId, date, value:number }` (Task 8) matches the grouping in Task 11. `HabitInput` defined in Task 8 and reused in Task 9. Session cookie name `hh_session` consistent across Tasks 7 + middleware.

## Notes for execution
- A live Neon DB (`DATABASE_URL`) is needed from Task 5 onward to run the app; the pure-logic tests (Tasks 2, 3, 6) run without it.
- Provide `SESSION_SECRET` in `.env.local` before testing auth.
