import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { listHabits, logsForRange } from "@/db/queries";
import { isoDate, dayOfWeek, rangeFor, eachDay } from "@/lib/dates";
import { HabitRow } from "./habit-row";

const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"];

function parseAnchor(date?: string): Date {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return new Date(date + "T00:00:00Z");
  return new Date(isoDate(new Date()) + "T00:00:00Z");
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const userId = await requireUserId();
  const { date } = await searchParams;
  const anchor = parseAnchor(date);
  const selectedIso = isoDate(anchor);
  const weekday = dayOfWeek(anchor);

  const week = eachDay(rangeFor("week", anchor));
  const habits = (await listHabits(userId)).filter((h) => h.activeDays.includes(weekday));

  const nextIso = isoDate(new Date(anchor.getTime() + 86_400_000));
  const logs = await logsForRange(userId, selectedIso, nextIso);
  const valueByHabit = new Map(logs.map((l) => [l.habitId, l.value]));

  return (
    <section className="page">
      <h1>Hoy</h1>

      <div className="week-strip">
        {week.map((d) => {
          const di = isoDate(d);
          return (
            <Link
              key={di}
              href={`/today?date=${di}`}
              className={`week-day ${di === selectedIso ? "active" : ""}`}
            >
              <span className="wd-label">{DAY_LABELS[dayOfWeek(d)]}</span>
              <span className="wd-num">{d.getUTCDate()}</span>
            </Link>
          );
        })}
      </div>

      <ul className="today-list">
        {habits.length === 0 && (
          <li className="empty">No hay hábitos para este día.</li>
        )}
        {habits.map((h) => (
          <li key={h.id} className="today-item">
            <div className="today-name">{h.name}</div>
            <HabitRow
              habitId={h.id}
              date={selectedIso}
              type={h.type}
              target={Number(h.target)}
              unit={h.unit}
              color={h.color}
              value={valueByHabit.get(h.id) ?? 0}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
