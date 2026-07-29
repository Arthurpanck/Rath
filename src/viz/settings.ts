import type { Column, Dataset } from "../data/types";
import { analyzeShape } from "../data/types";

export type Stacking = "none" | "stacked" | "normalized";
export type Aggregation = "sum" | "mean" | "count" | "min" | "max" | "distinct";
export type SortOrder = "none" | "dim-asc" | "dim-desc" | "value-asc" | "value-desc";
export type YScale = "linear" | "log";
export type PiePercent = "off" | "legend" | "chart" | "both";
export type LabelFormatting = "auto" | "compact" | "full";
export type XScale = "auto" | "ordinal" | "linear" | "timeseries";
export type NumberStyle = "normal" | "percent" | "scientific" | "currency";
export type CurrencyStyle = "symbol" | "code" | "name";

export interface GaugeRange {
  color: string;
  label: string;
  min: number;
  max: number;
}

export type SeriesDisplay = "line" | "bar" | "area";
export type AxisPosition = "auto" | "left" | "right";
export type LineShape = "straight" | "curved" | "stepped";
export type LineDash = "solid" | "dashed" | "dotted";
export type LineSize = "S" | "M" | "L";
export type MarkerMode = "auto" | "on" | "off";
export type FillOpacity = "auto" | "opaque" | "transparent";
export type BarWidth = "xs" | "normal" | "wide" | "xl";

// Per-series options edited from the "…" series-settings panel (differs per chart).
export interface SeriesOpts {
  name?: string;
  axis?: AxisPosition;
  display?: SeriesDisplay;
  lineShape?: LineShape;
  lineDash?: LineDash;
  lineSize?: LineSize;
  markers?: MarkerMode;
  areaOpacity?: FillOpacity;
  barWidth?: BarWidth;
  showValues?: boolean;
  trendline?: boolean;
}

// Number-formatting options (Metabase "Mise en forme"), reusable across the
// scalar viz, gauge, progress and axis/value labels.
export interface NumberFormat {
  style: NumberStyle;
  currency: string; // ISO code, e.g. "EUR"
  currencyStyle: CurrencyStyle;
  decimals?: number | null;
  multiplyBy?: number | null;
  prefix?: string;
  suffix?: string;
}

export function defaultNumberFormat(): NumberFormat {
  return { style: "normal", currency: "EUR", currencyStyle: "symbol", decimals: null, multiplyBy: null, prefix: "", suffix: "" };
}

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
  /** Per-series options from the "…" panel, keyed by series key. */
  series: Record<string, SeriesOpts>;
  xAxisTitle?: string;
  yAxisTitle?: string;
  goalValue?: number | null;

  // --- Affichage (cartesian) ---
  showTrendline: boolean;
  stackSeries: boolean; // "Empiler les séries" companion to stacking
  labelFormatting: LabelFormatting; // "Mise en forme automatique" Auto/Compact/Complet

  // --- Axes (cartesian) ---
  xShowTitle: boolean; // "Afficher le libellé" (X)
  xShowLine: boolean; // "Afficher les lignes et les graduations" (X)
  xScale: XScale; // "Échelle" (X)
  yShowTitle: boolean;
  yShowLine: boolean; // maps to yAxisEnabled visual
  yScale: YScale;
  yAutoRange: boolean;
  yMin?: number | null;
  yMax?: number | null;
  unpinFromZero: boolean; // "Détacher de zéro"
  // legacy aliases kept in sync for existing builder code
  xAxisEnabled: boolean;
  yAxisEnabled: boolean;

  // --- pie ---
  pieShowTotal: boolean;
  pieShowPercent: PiePercent;
  pieDonut: boolean;

  // --- number formatting (scalar / gauge / progress) ---
  numberFormat: NumberFormat;
  scalarField?: string; // "Champ à afficher"

  // --- gauge ---
  gaugeRanges?: GaugeRange[];

  // --- funnel ---
  stepField?: string; // "Colonne avec les étapes"
  // --- waterfall ---
  showTotalColumn?: boolean; // "Afficher la colonne de total"

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
    series: {},
    goalValue: null,
    showTrendline: false,
    stackSeries: false,
    labelFormatting: "auto",
    xShowTitle: true,
    xShowLine: true,
    xScale: "auto",
    yShowTitle: true,
    yShowLine: true,
    yScale: "linear",
    yAutoRange: true,
    yMin: null,
    yMax: null,
    unpinFromZero: false,
    xAxisEnabled: true,
    yAxisEnabled: true,
    pieShowTotal: true,
    pieShowPercent: "off",
    pieDonut: true,
    numberFormat: defaultNumberFormat(),
    gaugeRanges: undefined,
    showTotalColumn: true,
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
