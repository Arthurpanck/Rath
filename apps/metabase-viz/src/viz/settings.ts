import type { Column, Dataset } from "../data/types";
import { analyzeShape } from "../data/types";

export type Stacking = "none" | "stacked" | "normalized";

// User-editable visualization settings, mirroring the knobs in Metabase's
// settings sidebar (Data + Display).
export interface VizSettings {
  /** X-axis / grouping column (by name). */
  dimension?: string;
  /** Y-axis series columns (by name). */
  metrics?: string[];
  stacking: Stacking;
  showValues: boolean;
  showLegend: boolean;
  /** Per-series color override, keyed by column name. */
  colors: Record<string, string>;
  xAxisTitle?: string;
  yAxisTitle?: string;
  goalValue?: number | null;
}

export function defaultSettings(dataset: Dataset): VizSettings {
  const { dimension, metrics } = analyzeShape(dataset);
  return {
    dimension: dimension?.name,
    metrics: metrics.map((m) => m.name),
    stacking: "none",
    showValues: false,
    showLegend: true,
    colors: {},
    goalValue: null,
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
