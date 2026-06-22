import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { listHabits, logsForRange } from "@/db/queries";
import { rangeFor, isoDate, type Period } from "@/lib/dates";
import { periodPercent, heatmapCells } from "@/lib/stats";
import type { LogEntry } from "@/lib/types";
import { Heatmap } from "./heatmap";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "year", label: "Año" },
];

function parseAnchor(date?: string): Date {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return new Date(date + "T00:00:00Z");
  return new Date(isoDate(new Date()) + "T00:00:00Z");
}

function shiftAnchor(period: Period, anchor: Date, dir: -1 | 1): string {
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const d = anchor.getUTCDate();
  if (period === "week") return isoDate(new Date(anchor.getTime() + dir * 7 * 86_400_000));
  if (period === "month") return isoDate(new Date(Date.UTC(y, m + dir, Math.min(d, 28))));
  return isoDate(new Date(Date.UTC(y + dir, m, Math.min(d, 28))));
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; anchor?: string }>;
}) {
  const userId = await requireUserId();
  const sp = await searchParams;
  const period: Period = (["week", "month", "year"] as const).includes(sp.period as Period)
    ? (sp.period as Period)
    : "week";
  const anchor = parseAnchor(sp.anchor);

  const range = rangeFor(period, anchor);
  const habits = await listHabits(userId);
  const logs = await logsForRange(userId, isoDate(range.start), isoDate(range.end));

  const byHabit = new Map<string, LogEntry[]>();
  for (const l of logs) {
    const arr = byHabit.get(l.habitId) ?? [];
    arr.push({ date: l.date, value: l.value });
    byHabit.set(l.habitId, arr);
  }

  const cards = habits.map((h) => {
    const habit = {
      id: h.id,
      type: h.type,
      target: Number(h.target),
      targetPeriod: h.targetPeriod,
      activeDays: h.activeDays,
    };
    const hlogs = byHabit.get(h.id) ?? [];
    return {
      h,
      percent: periodPercent(habit, hlogs, period, anchor),
      cells: heatmapCells(habit, hlogs, period, anchor),
    };
  });

  const anchorIso = isoDate(anchor);
  const prev = shiftAnchor(period, anchor, -1);
  const next = shiftAnchor(period, anchor, 1);

  return (
    <section className="page">
      <h1>Reportes</h1>

      <div className="period-toggle">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/reports?period=${p.key}&anchor=${anchorIso}`}
            className={`pill ${p.key === period ? "active" : ""}`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="period-nav">
        <Link href={`/reports?period=${period}&anchor=${prev}`} className="nav-btn">
          ‹
        </Link>
        <span className="period-range">
          {isoDate(range.start)} → {isoDate(new Date(range.end.getTime() - 86_400_000))}
        </span>
        <Link href={`/reports?period=${period}&anchor=${next}`} className="nav-btn">
          ›
        </Link>
      </div>

      {cards.length === 0 && <p className="empty">Creá hábitos para ver tus reportes.</p>}

      <div className="report-cards">
        {cards.map(({ h, percent, cells }) => (
          <article key={h.id} className="report-card">
            <header>
              <span className="rc-dot" style={{ backgroundColor: h.color }} />
              <strong>{h.name}</strong>
              <span className="rc-pct">{percent}%</span>
            </header>
            <Heatmap cells={cells} color={h.color} />
          </article>
        ))}
      </div>
    </section>
  );
}
