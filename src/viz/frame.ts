import type { Column, Dataset } from "../data/types";
import { parseDate } from "../data/dates";
import type { Aggregation, SortOrder, VizSettings } from "./settings";
import { findColumn, resolveShape } from "./settings";

export type Cell = string | number | null;

export interface FrameSeries {
  key: string;
  name: string;
  values: (number | null)[];
}

export interface Frame {
  dimension: Column;
  categories: Cell[];
  /** Parallel to categories when the dimension is a date, else null. */
  timestamps: number[] | null;
  series: FrameSeries[];
  /** True when series come from a breakout (single metric split), else from metrics. */
  breakout: boolean;
}

function aggregate(values: unknown[], agg: Aggregation): number | null {
  if (agg === "count") return values.length;
  if (agg === "distinct") return new Set(values.map((v) => String(v))).size;
  const nums = values.map((v) => Number(v)).filter((v) => !isNaN(v));
  if (nums.length === 0) return null;
  switch (agg) {
    case "sum":
      return nums.reduce((s, v) => s + v, 0);
    case "mean":
      return nums.reduce((s, v) => s + v, 0) / nums.length;
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
    default:
      return nums.reduce((s, v) => s + v, 0);
  }
}

function uniqueInOrder(values: Cell[]): Cell[] {
  const seen = new Set<string>();
  const out: Cell[] = [];
  for (const v of values) {
    const k = String(v);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  }
  return out;
}

function sortCategories(
  categories: Cell[],
  timestamps: number[] | null,
  firstSeriesValues: (number | null)[],
  sort: SortOrder,
): number[] {
  // Returns the index permutation to apply to categories + all series.
  const idx = categories.map((_, i) => i);
  const numericCat = categories.every((c) => c != null && !isNaN(Number(c)));
  const cmpDim = (a: number, b: number) => {
    if (timestamps) return timestamps[a] - timestamps[b];
    if (numericCat) return Number(categories[a]) - Number(categories[b]);
    return String(categories[a]).localeCompare(String(categories[b]), "fr");
  };
  const cmpVal = (a: number, b: number) =>
    (firstSeriesValues[a] ?? 0) - (firstSeriesValues[b] ?? 0);
  switch (sort) {
    case "dim-asc":
      return idx.sort(cmpDim);
    case "dim-desc":
      return idx.sort((a, b) => cmpDim(b, a));
    case "value-asc":
      return idx.sort(cmpVal);
    case "value-desc":
      return idx.sort((a, b) => cmpVal(b, a));
    default:
      return idx;
  }
}

export function buildFrame(dataset: Dataset, settings: VizSettings): Frame {
  const { dimension, metrics } = resolveShape(dataset, settings);
  const breakoutCol = settings.breakout ? findColumn(dataset, settings.breakout) : undefined;
  const useBreakout = !!breakoutCol && breakoutCol.index !== dimension.index && metrics.length > 0;
  const agg = settings.aggregation;

  const dimValues = dataset.rows.map((r) => r[dimension.index] as Cell);
  const categories = uniqueInOrder(dimValues);
  const catIndexByKey = new Map(categories.map((c, i) => [String(c), i]));

  // Group row indices by category.
  const rowsByCat: number[][] = categories.map(() => []);
  dataset.rows.forEach((r, ri) => {
    const ci = catIndexByKey.get(String(r[dimension.index]));
    if (ci != null) rowsByCat[ci].push(ri);
  });

  let series: FrameSeries[];

  if (useBreakout) {
    const metric = metrics[0];
    const breakoutValues = uniqueInOrder(dataset.rows.map((r) => r[breakoutCol.index] as Cell));
    series = breakoutValues.map((bv) => {
      const key = String(bv);
      const values = categories.map((_, ci) => {
        const rows = rowsByCat[ci].filter(
          (ri) => String(dataset.rows[ri][breakoutCol.index]) === key,
        );
        if (rows.length === 0) return null;
        return aggregate(
          rows.map((ri) => dataset.rows[ri][metric.index]),
          agg,
        );
      });
      return { key, name: key, values };
    });
  } else {
    series = metrics.map((m) => ({
      key: m.name,
      name: m.display_name,
      values: categories.map((_, ci) => {
        const rows = rowsByCat[ci];
        if (rows.length === 0) return null;
        return aggregate(
          rows.map((ri) => dataset.rows[ri][m.index]),
          agg,
        );
      }),
    }));
  }

  const isDate = dimension.base_type === "date";
  let timestamps = isDate ? categories.map((c) => parseDate(c) ?? 0) : null;

  // Apply sort permutation.
  const firstVals = series[0]?.values ?? [];
  const perm = sortCategories(categories, timestamps, firstVals, settings.sort);
  const permutedCats = perm.map((i) => categories[i]);
  const permutedTs = timestamps ? perm.map((i) => timestamps![i]) : null;
  series = series.map((s) => ({ ...s, values: perm.map((i) => s.values[i]) }));
  timestamps = permutedTs;

  return { dimension, categories: permutedCats, timestamps, series, breakout: useBreakout };
}
