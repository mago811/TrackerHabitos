import { describe, it, expect } from "vitest";
import { rangeFor, eachDay, eachWeek, isoDate, dayOfWeek } from "@/lib/dates";

const d = (s: string) => new Date(s + "T00:00:00Z");

describe("isoDate / dayOfWeek", () => {
  it("formats UTC date", () => expect(isoDate(d("2026-06-22"))).toBe("2026-06-22"));
  it("monday is 1", () => expect(dayOfWeek(d("2026-06-22"))).toBe(1));
  it("sunday is 0", () => expect(dayOfWeek(d("2026-06-21"))).toBe(0));
});

describe("rangeFor", () => {
  it("week is Mon..next Mon around anchor", () => {
    const r = rangeFor("week", d("2026-06-24")); // Wed
    expect(isoDate(r.start)).toBe("2026-06-22"); // Mon
    expect(isoDate(r.end)).toBe("2026-06-29"); // exclusive next Mon
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
  it("splits month into Mon-start weeks clipped to range", () => {
    const weeks = eachWeek(rangeFor("month", d("2026-06-15")));
    expect(isoDate(weeks[0].start)).toBe("2026-06-01");
    expect(isoDate(weeks[weeks.length - 1].end)).toBe("2026-07-01");
  });
});
