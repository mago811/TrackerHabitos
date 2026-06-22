export type Period = "week" | "month" | "year";
export type DateRange = { start: Date; end: Date };

const DAY = 86_400_000;
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dayOfWeek(d: Date): number {
  return d.getUTCDay(); // 0=Sun .. 6=Sat
}

function mondayOf(d: Date): Date {
  const back = (d.getUTCDay() + 6) % 7; // days since Monday
  return new Date(d.getTime() - back * DAY);
}

export function rangeFor(period: Period, anchor: Date): DateRange {
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const day = anchor.getUTCDate();
  if (period === "week") {
    const start = mondayOf(utc(y, m, day));
    return { start, end: new Date(start.getTime() + 7 * DAY) };
  }
  if (period === "month") return { start: utc(y, m, 1), end: utc(y, m + 1, 1) };
  return { start: utc(y, 0, 1), end: utc(y + 1, 0, 1) };
}

export function eachDay(range: DateRange): Date[] {
  const out: Date[] = [];
  for (let t = range.start.getTime(); t < range.end.getTime(); t += DAY) {
    out.push(new Date(t));
  }
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
