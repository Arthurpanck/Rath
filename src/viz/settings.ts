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
export type CurrencyPlacement = "header" | "cell";
export type SeparatorStyle = "comma-dot" | "space-comma" | "dot-comma" | "none-dot" | "apos-dot";
export type PieLabelDisplay = "auto" | "on" | "off";
export type PieValueFormat = "percent" | "value" | "both";
export type MapRegion = "communes" | "communes-arr" | "directions" | "ctm";
export type QuartileStyle = "box" | "line";
export type ConditionOp = ">" | ">=" | "<" | "<=" | "=" | "!=";

/** One "Couleurs conditionnelles" rule (Nombre / Table). */
export interface ColorRule {
  /** Column the rule tests; empty means "the displayed value". */
  column?: string;
  operator: ConditionOp;
  value: number;
  color: string;
  /** Table only: colour the whole row rather than the cell. */
  wholeRow?: boolean;
}

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
export type MissingValues = "interpolate" | "zero" | "none";
export type FillOpacity = "auto" | "opaque" | "transparent";
export type BarWidth = "xs" | "normal" | "wide" | "xl";

/** Per-series number formatting (popover "Mise en forme" tab). */
export interface SeriesFormat {
  decimals?: number | null;
  multiplyBy?: number | null;
  prefix?: string;
  suffix?: string;
}

// Per-series options edited from the "…" popover (Style / Mise en forme).
export interface SeriesOpts {
  name?: string;
  axis?: AxisPosition;
  display?: SeriesDisplay;
  lineShape?: LineShape;
  lineDash?: LineDash;
  lineSize?: LineSize;
  markers?: MarkerMode;
  missing?: MissingValues;
  areaOpacity?: FillOpacity;
  barWidth?: BarWidth;
  showValues?: boolean;
  trendline?: boolean;
  fmt?: SeriesFormat;
}

// Number-formatting options (Metabase "Mise en forme"), reusable across the
// scalar viz, gauge, progress and axis/value labels.
export interface NumberFormat {
  style: NumberStyle;
  currency: string; // ISO code, e.g. "EUR"
  currencyStyle: CurrencyStyle;
  currencyPlacement: CurrencyPlacement;
  separator: SeparatorStyle;
  decimals?: number | null;
  multiplyBy?: number | null;
  prefix?: string;
  suffix?: string;
}

export function defaultNumberFormat(): NumberFormat {
  return {
    style: "normal",
    currency: "EUR",
    currencyStyle: "symbol",
    currencyPlacement: "cell",
    separator: "space-comma",
    decimals: null,
    multiplyBy: null,
    prefix: "",
    suffix: "",
  };
}

/** One "Comparaisons" entry for the Tendance (smartscalar) viz. */
export type ComparisonType = "previous" | "first" | "average";

// User-editable visualization settings, mirroring the knobs in Metabase's
// settings sidebar (Données / Affichage / Axes and per-viz variants).
export interface VizSettings {
  /** X-axis / grouping column (by name). */
  dimension?: string;
  /** Y-axis series columns (by name), in display order. */
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
  /** Per-series options from the "…" popover, keyed by series key. */
  series: Record<string, SeriesOpts>;
  xAxisTitle?: string;
  yAxisTitle?: string;
  goalValue?: number | null;

  // --- Affichage (cartesian) ---
  showTrendline: boolean;
  stackSeries: boolean; // "Empiler les séries"
  showStackTotals: boolean; // "Afficher les totaux d'empilement"
  labelFormatting: LabelFormatting; // "Mise en forme automatique"

  // --- Axes (cartesian) ---
  xShowTitle: boolean;
  xShowLine: boolean;
  xScale: XScale;
  yShowTitle: boolean;
  yShowLine: boolean;
  yScale: YScale;
  yAutoRange: boolean;
  yMin?: number | null;
  yMax?: number | null;
  ySplitNumber?: number | null; // "Nombre de graduations"
  unpinFromZero: boolean;
  // legacy aliases kept in sync for existing builder code
  xAxisEnabled: boolean;
  yAxisEnabled: boolean;

  // --- pie ---
  pieShowTotal: boolean;
  pieShowPercent: PiePercent;
  pieDonut: boolean;
  pieLabelDisplay: PieLabelDisplay; // "Affichage des étiquettes"
  pieValueFormat: PieValueFormat; // "Format des valeurs"
  innerRing?: string; // "Anneau intérieur"
  outerRing?: string; // "Anneau extérieur"

  // --- number formatting (scalar / gauge / progress) ---
  numberFormat: NumberFormat;
  scalarField?: string; // "Champ à afficher"

  // --- gauge ---
  gaugeRanges?: GaugeRange[];

  // --- boxplot ---
  showOutliers: boolean; // "Afficher les valeurs extrêmes"
  quartileStyle: QuartileStyle; // "Style des quartiles"

  // --- scatter ---
  scatterShowLabels: boolean; // label each point with its dimension

  // --- waterfall ---
  showTotalColumn: boolean; // "Afficher la colonne de total"
  increaseColor: string; // "Augmentation"
  decreaseColor: string; // "Diminution"

  // --- treemap ---
  /** Grouping values the user removed from the chart (the "×" on each row). */
  hiddenValues: string[];
  treemapShowLeafLabels: boolean;
  /** Share of the total, next to every value — shown by default in Metabase. */
  treemapShowPercent: boolean;
  treemapShowLeafValues: boolean;
  treemapShowParentLabels: boolean;
  treemapShowParentValues: boolean;

  // --- conditional colours (scalar / table) ---
  colorRules: ColorRule[];

  // --- tooltip ---
  tooltipColumns: string[]; // "Colonnes d'infobulle supplémentaires"

  // --- smartscalar ---
  comparisons: ComparisonType[];

  // --- viz-specific field pickers ---
  sourceField?: string;
  targetField?: string;
  rowField?: string;
  colField?: string;
  locationField?: string;
  mapRegion: MapRegion; // "Carte par région"
  bubbleField?: string;
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
    showStackTotals: false,
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
    ySplitNumber: null,
    unpinFromZero: false,
    xAxisEnabled: true,
    yAxisEnabled: true,
    pieShowTotal: true,
    pieShowPercent: "off",
    pieDonut: true,
    pieLabelDisplay: "auto",
    pieValueFormat: "percent",
    numberFormat: defaultNumberFormat(),
    gaugeRanges: undefined,
    showTotalColumn: true,
    increaseColor: "#88BF4D",
    decreaseColor: "#EF8C8C",
    showOutliers: true,
    quartileStyle: "box",
    scatterShowLabels: false,
    hiddenValues: [],
    treemapShowLeafLabels: true,
    treemapShowPercent: true,
    treemapShowLeafValues: true,
    treemapShowParentLabels: true,
    treemapShowParentValues: true,
    colorRules: [],
    tooltipColumns: [],
    comparisons: ["previous"],
    mapRegion: "communes",
  };
}

/**
 * Settings for a freshly-run query: point the chart at exactly what the user
 * just summarised — breakouts become the dimension, aggregations the series —
 * so an auto-picked chart never shows an unrelated column.
 */
export function settingsForQuery(
  dataset: Dataset,
  query: { aggregations: { fn: string; column?: string }[]; breakouts: string[] } | null,
): VizSettings {
  const base = defaultSettings(dataset);
  if (!query || query.aggregations.length === 0) return base;

  // applySummarize lays the dataset out as [ ...breakouts, ...aggregations ].
  const breakoutCols = dataset.cols.slice(0, query.breakouts.length);
  const aggCols = dataset.cols.slice(query.breakouts.length);
  if (aggCols.length === 0) return base;

  const dimension = breakoutCols[0];
  const metrics = aggCols.map((c) => c.name);
  return {
    ...base,
    dimension: dimension?.name ?? base.dimension,
    metrics,
    // Single-value vizs read these explicitly.
    scalarField: aggCols[0].name,
    // Map / pivot field pickers follow the same query shape. The Sankey is
    // left empty on purpose: guessing its columns is what makes it unreadable.
    locationField: breakoutCols[0]?.name ?? base.locationField,
    rowField: breakoutCols[0]?.name ?? base.rowField,
    colField: breakoutCols[1]?.name ?? base.colField,
    breakout: breakoutCols[1]?.name,
  };
}

export function findColumn(dataset: Dataset, name?: string): Column | undefined {
  return dataset.cols.find((c) => c.name === name);
}

/** Resolve the effective dimension + metrics from settings, falling back to auto-detection. */
export function resolveShape(
  dataset: Dataset,
  settings: VizSettings,
): { dimension: Column; metrics: Column[] } {
  const auto = analyzeShape(dataset);
  const dimension = findColumn(dataset, settings.dimension) ?? auto.dimension;
  const chosen = (settings.metrics ?? [])
    .map((n) => findColumn(dataset, n))
    .filter((c): c is Column => !!c && c.index !== dimension.index);
  const metrics =
    chosen.length > 0 ? chosen : auto.metrics.filter((m) => m.index !== dimension.index);
  return { dimension, metrics };
}

/** Aggregate a whole column with the chosen aggregation (single-value vizs). */
export function aggregateColumn(
  dataset: Dataset,
  col: Column | undefined,
  agg: Aggregation,
): number {
  if (!col) return 0;
  const raw = dataset.rows.map((r) => r[col.index]);
  if (agg === "count") return raw.length;
  if (agg === "distinct") return new Set(raw.map((v) => String(v))).size;
  const nums = raw.map((v) => Number(v)).filter((v) => !isNaN(v));
  if (nums.length === 0) return 0;
  switch (agg) {
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
