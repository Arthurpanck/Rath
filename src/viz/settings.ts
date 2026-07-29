import type { Column, Dataset } from "../data/types";
import { analyzeShape } from "../data/types";

export type Stacking = "none" | "stacked" | "normalized";
export type Aggregation = "sum" | "mean" | "count" | "min" | "max" | "distinct";
export type SortOrder = "none" | "dim-asc" | "dim-desc" | "value-asc" | "value-desc";
export type YScale = "linear" | "log";
export type PiePercent = "off" | "legend" | "chart" | "both";

// User-editable visualization settings, mirroring the knobs in Metabase's
// settings sidebar (Data + Display).
export interface VizSettings {
  /** X-axis / grouping column (by name). */
  dimension?: string;
  /** Y-axis series columns (by name). */
  metrics?: string[];
  /** Optional 2nd dimension that splits a single metric into series. */
  breakout?: string;
  /** How repeated dimension values are combined. */
  aggregation: Aggregation;
  /** Category ordering. */
  sort: SortOrder;
  stacking: Stacking;
  showValues: boolean;
  showLegend: boolean;
  /** Per-series color override, keyed by series key (column or breakout value). */
  colors: Record<string, string>;
  xAxisTitle?: string;
  yAxisTitle?: string;
  goalValue?: number | null;

  // --- axes & display (cartesian), mirroring Metabase's Axes/Display tabs ---
  showTrendline: boolean;
  yScale: YScale;
  yAutoRange: boolean;
  yMin?: number | null;
  yMax?: number | null;
  xAxisEnabled: boolean;
  yAxisEnabled: boolean;
  unpinFromZero: boolean;

  // --- pie ---
  pieShowTotal: boolean;
  pieShowPercent: PiePercent;
  pieDonut: boolean;

  // --- viz-specific field pickers ---
  /** Sankey: source & target dimension columns. */
  sourceField?: string;
  targetField?: string;
  /** Pivot: row & column dimensions. */
  rowField?: string;
  colField?: string;
  /** Map: location column (country name or ISO-A2). */
  locationField?: string;
}

export function defaultSettings(dataset: Dataset): VizSettings {
  const { dimension, metrics } = analyzeShape(dataset);
  return {
    dimension: dimension?.name,
    metrics: metrics.map((m) => m.name),
    aggregation: "sum",
    sort: "none",
    stacking: "none",
    showValues: false,
    showLegend: true,
    colors: {},
    goalValue: null,
    showTrendline: false,
    yScale: "linear",
    yAutoRange: true,
    yMin: null,
    yMax: null,
    xAxisEnabled: true,
    yAxisEnabled: true,
    unpinFromZero: false,
    pieShowTotal: true,
    pieShowPercent: "off",
    pieDonut: true,
  };
}

export function findColumn(dataset: Dataset, name?: string): Column | undefined {
  return dataset.cols.find((c) => c.name === name);
}

/** Resolve the effective dimension + metrics from settings, falling back to auto-detection. */
export function resolveShape(dataset: Dataset, settings: VizSettings): { dimension: Column; metrics: Column[] } {
  const auto = analyzeShape(dataset);
  const dimension = findColumn(dataset, settings.dimension) ?? auto.dimension;
  const chosen = (settings.metrics ?? [])
    .map((n) => findColumn(dataset, n))
    .filter((c): c is Column => !!c && c.index !== dimension.index);
  const metrics = chosen.length > 0 ? chosen : auto.metrics.filter((m) => m.index !== dimension.index);
  return { dimension, metrics };
}
