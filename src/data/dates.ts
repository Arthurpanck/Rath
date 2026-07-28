// Date parsing + interval-aware formatting for the time axis, so date columns
// render as a real temporal axis (like Metabase) instead of plain categories.

export function parseDate(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.getTime();
  const s = String(value).trim();
  // Normalise "2021/03" or "2021-03" to a parseable form.
  const t = Date.parse(s.replace(/\//g, "-"));
  return isNaN(t) ? null : t;
}

export type DateGranularity = "year" | "month" | "day" | "hour";

/** Pick a sensible tick granularity from the spanned range. */
export function pickGranularity(timestamps: number[]): DateGranularity {
  const valid = timestamps.filter((t) => t != null);
  if (valid.length < 2) return "day";
  const span = Math.max(...valid) - Math.min(...valid);
  const DAY = 86_400_000;
  if (span > 730 * DAY) return "year";
  if (span > 60 * DAY) return "month";
  if (span > 2 * DAY) return "day";
  return "hour";
}

const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function formatDate(ts: number, g: DateGranularity): string {
  const d = new Date(ts);
  switch (g) {
    case "year":
      return String(d.getFullYear());
    case "month":
      return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
    case "hour":
      return `${String(d.getHours()).padStart(2, "0")}:00`;
    default:
      return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
  }
}
