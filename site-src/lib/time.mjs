// Dates and times in the league's own zone (America/New_York), the way the
// app keys every slate (lib/time/et) and the desk prints tips.

const NY = "America/New_York";

/** "2026-10-03" — the ET calendar date of an instant. */
export const etDate = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: NY, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** An ET date `days` away. */
export const shift = (iso, days) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const at = (iso) => new Date(iso + "T12:00:00Z");
/** "Saturday, October 3, 2026" */
export const longDate = (iso) => at(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
/** "Sat, Oct 3" */
export const dayLabel = (iso) => at(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
/** "Oct 3" */
export const shortDate = (iso) => at(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
/** "Oct 3, 2026" */
export const mediumDate = (iso) => at(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
/** "Saturday" */
export const weekday = (iso) => at(iso).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

/** "7:30 PM ET" (an instant on the ET clock), "" when unknown. */
export function timeET(utc) {
  if (!utc) return "";
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: NY }) + " ET";
}

/** "7:30 ET" — the short tip for cards. */
export const tipShort = (utc) => timeET(utc).replace(/ (AM|PM) ET$/, " ET");

/** ISO 8601 with the ET offset, for JSON-LD ("2026-10-03T19:00:00-04:00"). */
export function isoET(utc) {
  const d = new Date(utc);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: NY, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(d).map((p) => [p.type, p.value]));
  const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const off = Math.round((local - d.getTime()) / 60000);
  const sign = off < 0 ? "-" : "+";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0"), mm = String(Math.abs(off) % 60).padStart(2, "0");
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${sign}${hh}:${mm}`;
}

/** "2025-26" for any date from July 2025 to June 2026 (lib/ledger/view seasonOf). */
export function seasonOf(date) {
  const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7));
  const start = m >= 7 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** One to ten in words, then digits ("Five games"). */
export function countWord(n, cap = true) {
  const w = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n];
  if (w === undefined) return String(n);
  return cap ? w[0].toUpperCase() + w.slice(1) : w;
}
