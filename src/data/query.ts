// A tiny query layer mirroring Metabase's "Filtrer" and "Résumer" steps: both
// reshape the dataset *before* it reaches the visualisation, exactly like a
// Metabase question's query stage.

import type { Column, Dataset } from "./types";
import { NULL_CHAR } from "./types";

export type FilterOp =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "between"
  | "contains"
  | "not-contains"
  | "starts-with"
  | "ends-with"
  | "empty"
  | "not-empty"
  // date operators
  | "today"
  | "yesterday"
  | "last-week"
  | "last-7"
  | "last-30"
  | "last-month"
  | "last-3-months"
  | "last-12-months"
  | "date-between"
  | "date-exclude";

export interface Filter {
  /** Column name. */
  column: string;
  operator: FilterOp;
  /** One value for most operators, two for "between", none for empty checks. */
  values: (string | number)[];
}

export type AggFn =
  | "count"
  | "sum"
  | "mean"
  | "median"
  | "distinct"
  | "cum-sum"
  | "cum-count"
  | "stddev"
  | "min"
  | "max";

export interface Aggregation {
  fn: AggFn;
  /** Required for every fn except "count". */
  column?: string;
}

export interface Summarize {
  aggregations: Aggregation[];
  /** "Regrouper par" dimensions, in order. */
  breakouts: string[];
  /**
   * Per-breakout bucketing, keyed by column name: a temporal unit for dates
   * ("par mois") or a binning strategy for numbers ("Regroupement en classes").
   * Metabase attaches this to the breakout itself; a side map keeps the
   * breakout list a plain array of names.
   */
  buckets?: Record<string, Bucket>;
}

/** Temporal unit or binning strategy applied to a "Regrouper par" column. */
export type Bucket =
  "day" | "week" | "month" | "quarter" | "year" | "auto" | "10" | "50" | "100" | "none";

const DATE_BUCKETS: { value: Bucket; label: string }[] = [
  { value: "day", label: "par jour" },
  { value: "week", label: "par semaine" },
  { value: "month", label: "par mois" },
  { value: "quarter", label: "par trimestre" },
  { value: "year", label: "par année" },
];

const NUM_BUCKETS: { value: Bucket; label: string }[] = [
  { value: "auto", label: "Regroupement en classes automatique" },
  { value: "10", label: "10 classes" },
  { value: "50", label: "50 classes" },
  { value: "100", label: "100 classes" },
  { value: "none", label: "Ne pas regrouper en classes" },
];

function isIdColumn(col: Column): boolean {
  return /(^|_)id($|_)|^_mb_row_id$/i.test(col.name);
}

/** The bucket options offered for a column — none for plain text. */
export function bucketsFor(col: Column | undefined): { value: Bucket; label: string }[] {
  const kind = kindOf(col);
  if (kind === "date") return DATE_BUCKETS;
  if (kind === "number") return NUM_BUCKETS;
  return [];
}

/** Metabase's defaults: months for dates, automatic bins for plain numbers. */
export function defaultBucketFor(col: Column | undefined): Bucket | undefined {
  if (!col) return undefined;
  const kind = kindOf(col);
  if (kind === "date") return "month";
  if (kind === "number") return isIdColumn(col) ? "none" : "auto";
  return undefined;
}

export function bucketLabel(col: Column | undefined, bucket: Bucket | undefined): string {
  return bucketsFor(col).find((b) => b.value === bucket)?.label ?? "";
}

/** Short suffix Metabase appends to a bucketed date column ("Date: Mois"). */
function bucketSuffix(bucket: Bucket): string {
  switch (bucket) {
    case "day":
      return "Jour";
    case "week":
      return "Semaine";
    case "month":
      return "Mois";
    case "quarter":
      return "Trimestre";
    case "year":
      return "Année";
    default:
      return "";
  }
}

export const AGG_FN_LABEL: Record<AggFn, string> = {
  count: "Nombre",
  sum: "Somme",
  mean: "Moyenne",
  median: "Médiane",
  distinct: "Nombre de valeurs distinctes",
  "cum-sum": "Somme cumulée",
  "cum-count": "Décompte cumulatif des lignes",
  stddev: "Écart-type",
  min: "Minimum",
  max: "Maximum",
};

/** The "Fonctions de base" menu, in Metabase's order. */
export const AGG_MENU: { fn: AggFn; label: string; needsColumn: boolean }[] = [
  { fn: "count", label: "Nombre de lignes", needsColumn: false },
  { fn: "sum", label: "Somme de …", needsColumn: true },
  { fn: "mean", label: "Moyenne de …", needsColumn: true },
  { fn: "median", label: "Médiane de …", needsColumn: true },
  { fn: "distinct", label: "Nombre de valeurs distinctes de …", needsColumn: true },
  { fn: "cum-sum", label: "Somme cumulée de …", needsColumn: true },
  { fn: "cum-count", label: "Décompte cumulatif des lignes", needsColumn: false },
  { fn: "stddev", label: "Écart-type de …", needsColumn: true },
  { fn: "min", label: "Minimum de …", needsColumn: true },
  { fn: "max", label: "Maximum de …", needsColumn: true },
];

export type FilterKind = "number" | "text" | "date";
export interface OperatorDef {
  value: FilterOp;
  label: string;
  /** How many free-text values the operator needs. */
  arity: 0 | 1 | 2;
  kinds: FilterKind[];
}

// Operator catalogue, per Metabase's per-type filter menus.
export const OPERATORS: OperatorDef[] = [
  // numeric / id
  { value: "=", label: "Égal à", arity: 1, kinds: ["number"] },
  { value: "!=", label: "Différent de", arity: 1, kinds: ["number"] },
  { value: ">", label: "Supérieur à", arity: 1, kinds: ["number"] },
  { value: "<", label: "Inférieur à", arity: 1, kinds: ["number"] },
  { value: "between", label: "Entre", arity: 2, kinds: ["number"] },
  { value: ">=", label: "Supérieur ou égal à", arity: 1, kinds: ["number"] },
  { value: "<=", label: "Inférieur ou égal à", arity: 1, kinds: ["number"] },
  // text
  { value: "=", label: "Est", arity: 1, kinds: ["text"] },
  { value: "!=", label: "N'est pas", arity: 1, kinds: ["text"] },
  { value: "contains", label: "Contient", arity: 1, kinds: ["text"] },
  { value: "not-contains", label: "Ne contient pas", arity: 1, kinds: ["text"] },
  { value: "starts-with", label: "Commence par", arity: 1, kinds: ["text"] },
  { value: "ends-with", label: "Se termine par", arity: 1, kinds: ["text"] },
  // dates
  { value: "today", label: "Aujourd'hui", arity: 0, kinds: ["date"] },
  { value: "yesterday", label: "Hier", arity: 0, kinds: ["date"] },
  { value: "last-week", label: "Semaine précédente", arity: 0, kinds: ["date"] },
  { value: "last-7", label: "7 derniers jours", arity: 0, kinds: ["date"] },
  { value: "last-30", label: "30 derniers jours", arity: 0, kinds: ["date"] },
  { value: "last-month", label: "Mois précédent", arity: 0, kinds: ["date"] },
  { value: "last-3-months", label: "3 derniers mois", arity: 0, kinds: ["date"] },
  { value: "last-12-months", label: "12 derniers mois", arity: 0, kinds: ["date"] },
  { value: "date-between", label: "Plage de dates fixe…", arity: 2, kinds: ["date"] },
  { value: "date-exclude", label: "Exclure…", arity: 1, kinds: ["date"] },
  // shared
  { value: "empty", label: "Est vide", arity: 0, kinds: ["number", "text", "date"] },
  { value: "not-empty", label: "Non vide", arity: 0, kinds: ["number", "text", "date"] },
];

export function kindOf(col: Column | undefined): FilterKind {
  if (!col) return "text";
  if (col.base_type === "number") return "number";
  if (col.base_type === "date") return "date";
  return "text";
}

export function operatorsFor(col: Column | undefined): OperatorDef[] {
  const kind = kindOf(col);
  return OPERATORS.filter((o) => o.kinds.includes(kind));
}

export function defaultOperatorFor(col: Column | undefined): FilterOp {
  const kind = kindOf(col);
  if (kind === "number") return "between";
  if (kind === "date") return "last-30";
  return "=";
}

export function operatorLabel(op: FilterOp, col: Column | undefined): string {
  const kind = kindOf(col);
  return (
    OPERATORS.find((o) => o.value === op && o.kinds.includes(kind))?.label ??
    OPERATORS.find((o) => o.value === op)?.label ??
    op
  );
}

/** Distinct values of a text column, for the checkbox picker. */
export function distinctValues(dataset: Dataset, colName: string, limit = 500): string[] {
  const col = dataset.cols.find((c) => c.name === colName);
  if (!col) return [];
  const set = new Set<string>();
  for (const r of dataset.rows) {
    const v = r[col.index];
    if (v != null && v !== "") set.add(String(v));
    if (set.size >= limit) break;
  }
  return [...set].sort((a, b) => a.localeCompare(b, "fr"));
}

export function describeFilter(dataset: Dataset, f: Filter): string {
  const col = dataset.cols.find((c) => c.name === f.column);
  const name = col?.display_name ?? f.column;
  const label = operatorLabel(f.operator, col);
  const arity = OPERATORS.find((o) => o.value === f.operator)?.arity ?? 1;
  if (arity === 0) return `${name} · ${label.toLowerCase()}`;
  if (f.operator === "between" || f.operator === "date-between")
    return `${name} ${f.values[0]} – ${f.values[1]}`;
  // Multi-value text selections read as "Espèce est 2 sélections".
  if (f.values.length > 1) return `${name} ${label.toLowerCase()} ${f.values.length} valeurs`;
  return `${name} ${symbolFor(f.operator, col)} ${f.values[0]}`;
}

function symbolFor(op: FilterOp, col?: Column): string {
  switch (op) {
    case "=":
      return kindOf(col) === "number" ? "=" : "est";
    case "!=":
      return kindOf(col) === "number" ? "≠" : "n'est pas";
    case ">":
      return ">";
    case "<":
      return "<";
    case ">=":
      return "≥";
    case "<=":
      return "≤";
    case "contains":
      return "contient";
    default:
      return op;
  }
}

export function describeAggregation(dataset: Dataset, a: Aggregation): string {
  if (a.fn === "count") return AGG_FN_LABEL.count;
  const col = dataset.cols.find((c) => c.name === a.column);
  return `${AGG_FN_LABEL[a.fn]} de ${col?.display_name ?? a.column ?? "?"}`;
}

// ------------------------------------------------------------------ apply ----

/** Start of day, n days ago. */
function dayStart(offsetDays = 0): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d.getTime();
}

/** Resolve a relative date operator into an inclusive [from, to) window. */
function dateWindow(op: FilterOp, values: (string | number)[]): [number, number] | null {
  const now = Date.now();
  const day = 86_400_000;
  switch (op) {
    case "today":
      return [dayStart(0), dayStart(0) + day];
    case "yesterday":
      return [dayStart(1), dayStart(0)];
    case "last-week":
      return [dayStart(7), dayStart(0) + day];
    case "last-7":
      return [dayStart(7), now + day];
    case "last-30":
      return [dayStart(30), now + day];
    case "last-month": {
      const d = new Date();
      const from = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
      const to = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      return [from, to];
    }
    case "last-3-months":
      return [dayStart(90), now + day];
    case "last-12-months":
      return [dayStart(365), now + day];
    case "date-between": {
      const a = Date.parse(String(values[0]));
      const b = Date.parse(String(values[1]));
      if (isNaN(a) || isNaN(b)) return null;
      return [Math.min(a, b), Math.max(a, b) + day];
    }
    default:
      return null;
  }
}

function matches(value: unknown, f: Filter, kind: FilterKind): boolean {
  const empty = value == null || value === "";
  if (f.operator === "empty") return empty;
  if (f.operator === "not-empty") return !empty;
  if (empty) return false;

  if (kind === "date") {
    const t = Date.parse(String(value).replace(/\//g, "-"));
    if (isNaN(t)) return false;
    if (f.operator === "date-exclude") return String(value) !== String(f.values[0]);
    const win = dateWindow(f.operator, f.values);
    return win ? t >= win[0] && t < win[1] : true;
  }

  if (kind === "number") {
    const v = Number(value);
    const a = Number(f.values[0]);
    const b = Number(f.values[1]);
    if (isNaN(v)) return false;
    switch (f.operator) {
      case "=":
        return f.values.some((x) => Number(x) === v);
      case "!=":
        return !f.values.some((x) => Number(x) === v);
      case ">":
        return v > a;
      case "<":
        return v < a;
      case ">=":
        return v >= a;
      case "<=":
        return v <= a;
      case "between":
        return v >= Math.min(a, b) && v <= Math.max(a, b);
      default:
        return true;
    }
  }

  const s = String(value).toLowerCase();
  const list = f.values.map((x) => String(x).toLowerCase());
  const a = list[0] ?? "";
  switch (f.operator) {
    case "=":
      return list.includes(s);
    case "!=":
      return !list.includes(s);
    case "contains":
      return list.some((x) => s.includes(x));
    case "not-contains":
      return !list.some((x) => s.includes(x));
    case "starts-with":
      return s.startsWith(a);
    case "ends-with":
      return s.endsWith(a);
    default:
      return true;
  }
}

function reduce(vals: unknown[], fn: AggFn): number {
  if (fn === "count" || fn === "cum-count") return vals.length;
  if (fn === "distinct") return new Set(vals.map((v) => String(v))).size;
  const nums = vals.map((v) => Number(v)).filter((v) => !isNaN(v));
  if (nums.length === 0) return 0;
  switch (fn) {
    case "mean":
      return nums.reduce((s, v) => s + v, 0) / nums.length;
    case "median": {
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    case "stddev": {
      const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
      return Math.sqrt(nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length);
    }
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
    default:
      // sum and cum-sum both start from the plain sum; cum-sum is accumulated
      // across groups in a second pass.
      return nums.reduce((s, v) => s + v, 0);
  }
}

/** Turn cum-sum / cum-count columns into running totals across groups. */
function accumulate(rows: unknown[][], aggs: Aggregation[], offset: number): void {
  aggs.forEach((a, i) => {
    if (a.fn !== "cum-sum" && a.fn !== "cum-count") return;
    let running = 0;
    for (const row of rows) {
      running += Number(row[offset + i]) || 0;
      row[offset + i] = running;
    }
  });
}

/** Row filtering ("Filtrer"). */
export function applyFilters(dataset: Dataset, filters: Filter[]): Dataset {
  if (filters.length === 0) return dataset;
  const active = filters
    .map((f) => ({ f, col: dataset.cols.find((c) => c.name === f.column) }))
    .filter((x): x is { f: Filter; col: Column } => !!x.col);
  if (active.length === 0) return dataset;

  const rows = dataset.rows.filter((row) =>
    active.every(({ f, col }) => matches(row[col.index], f, kindOf(col))),
  );
  return { cols: dataset.cols, rows };
}

/** Local yyyy-mm-dd, so bucketed dates stay sortable and parseable. */
function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Truncate a date value to the start of its bucket. */
function truncateDate(value: unknown, bucket: Bucket): unknown {
  const t = Date.parse(String(value).replace(/\//g, "-"));
  if (isNaN(t)) return value;
  const d = new Date(t);
  switch (bucket) {
    case "week":
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // ISO weeks start Monday
      break;
    case "month":
      d.setDate(1);
      break;
    case "quarter":
      d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
      break;
    case "year":
      d.setMonth(0, 1);
      break;
    default:
      break; // "day": the date itself
  }
  d.setHours(0, 0, 0, 0);
  return isoDay(d);
}

/** A "nice" bin width (1, 2 or 5 × a power of ten) for roughly `target` bins. */
function niceWidth(range: number, target: number): number {
  if (!(range > 0)) return 1;
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

/** Bin width for a numeric column, or null when it should not be binned. */
function binWidthFor(dataset: Dataset, col: Column, bucket: Bucket): number | null {
  if (bucket === "none") return null;
  let min = Infinity;
  let max = -Infinity;
  for (const r of dataset.rows) {
    const v = Number(r[col.index]);
    if (isNaN(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!isFinite(min) || !isFinite(max) || max === min) return null;
  const range = max - min;
  if (bucket === "auto") return niceWidth(range, 12);
  const count = Number(bucket);
  return count > 0 ? range / count : null;
}

/** Group-by + aggregate ("Résumer"), producing a new, narrower dataset. */
export function applySummarize(dataset: Dataset, s: Summarize | null): Dataset {
  if (!s || s.aggregations.length === 0) return dataset;

  const groupCols = s.breakouts
    .map((n) => dataset.cols.find((c) => c.name === n))
    .filter((c): c is Column => !!c);

  // Resolve each breakout's bucket into a value transform applied before grouping.
  const buckets = groupCols.map((c) => {
    const bucket = s.buckets?.[c.name];
    if (!bucket) return null;
    if (kindOf(c) === "date") return (v: unknown) => truncateDate(v, bucket);
    if (kindOf(c) === "number") {
      const w = binWidthFor(dataset, c, bucket);
      if (w == null) return null;
      return (v: unknown) => {
        const n = Number(v);
        return isNaN(n) ? v : Math.floor(n / w) * w;
      };
    }
    return null;
  });

  const cols: Column[] = [
    ...groupCols.map((c, i) => {
      const bucket = s.buckets?.[c.name];
      const suffix = bucket && kindOf(c) === "date" ? bucketSuffix(bucket) : "";
      return {
        ...c,
        index: i,
        display_name: suffix ? `${c.display_name}: ${suffix}` : c.display_name,
      };
    }),
    ...s.aggregations.map((a, i) => ({
      name: aggName(a),
      display_name: describeAggregation(dataset, a),
      base_type: "number" as const,
      index: groupCols.length + i,
    })),
  ];

  // No "Regrouper par": a single summary row.
  if (groupCols.length === 0) {
    const row = s.aggregations.map((a) => {
      const col = dataset.cols.find((c) => c.name === a.column);
      return reduce(col ? dataset.rows.map((r) => r[col.index]) : dataset.rows, a.fn);
    });
    return { cols, rows: [row] };
  }

  const groups = new Map<string, { key: unknown[]; rows: unknown[][] }>();
  for (const r of dataset.rows) {
    const key = groupCols.map((c, i) => {
      const bucket = buckets[i];
      return bucket ? bucket(r[c.index]) : r[c.index];
    });
    const id = key.map((k) => String(k)).join(NULL_CHAR);
    if (!groups.has(id)) groups.set(id, { key, rows: [] });
    groups.get(id)!.rows.push(r);
  }

  const rows = [...groups.values()].map(({ key, rows: groupRows }) => [
    ...key,
    ...s.aggregations.map((a) => {
      const col = dataset.cols.find((c) => c.name === a.column);
      return reduce(col ? groupRows.map((r) => r[col.index]) : groupRows, a.fn);
    }),
  ]);

  // Bucketed groups are ranges or periods: they only read correctly in order.
  if (buckets[0]) {
    const numeric = kindOf(groupCols[0]) === "number";
    rows.sort((a, b) =>
      numeric ? Number(a[0]) - Number(b[0]) : String(a[0]).localeCompare(String(b[0])),
    );
  }
  accumulate(rows, s.aggregations, groupCols.length);

  return { cols, rows };
}

function aggName(a: Aggregation): string {
  return a.fn === "count" ? "count" : `${a.fn}_${a.column}`;
}

/** Full pipeline: filter, then summarize. */
export function applyQuery(
  dataset: Dataset,
  filters: Filter[],
  summarize: Summarize | null,
): Dataset {
  return applySummarize(applyFilters(dataset, filters), summarize);
}
