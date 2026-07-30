import type { Column, Dataset } from "../data/types";
import { getDimensions, getMetrics, isMetric } from "../data/types";

export type VizId =
  | "scalar"
  | "smartscalar"
  | "progress"
  | "gauge"
  | "table"
  | "line"
  | "area"
  | "bar"
  | "waterfall"
  | "combo"
  | "row"
  | "scatter"
  | "boxplot"
  | "pie"
  | "map"
  | "funnel"
  | "object"
  | "pivot"
  | "treemap"
  | "sankey";

export interface VizDef {
  id: VizId;
  /** French UI label, matching the Metabase FR locale. */
  name: string;
  /** Metabase iconName. */
  icon: string;
  /** Whether this viz can actually render (implemented with ECharts here). */
  implemented: boolean;
  /** Metabase-style "isSensible": can this render meaningfully for the shape? */
  isSensible: (d: Dataset) => boolean;
}

const hasDimAndMetric = (d: Dataset) => getDimensions(d).length > 0 && getMetrics(d).length > 0;
const isSingleValue = (d: Dataset) => d.rows.length === 1 && getMetrics(d).length >= 1;

export const VISUALIZATIONS: VizDef[] = [
  { id: "scalar", name: "Nombre", icon: "number", implemented: true, isSensible: (d) => getMetrics(d).length >= 1 },
  { id: "smartscalar", name: "Tendance", icon: "smartscalar", implemented: true, isSensible: (d) => d.rows.length > 1 && hasDimAndMetric(d) },
  { id: "progress", name: "Progression", icon: "progress", implemented: true, isSensible: isSingleValue },
  { id: "gauge", name: "Jauge", icon: "gauge", implemented: true, isSensible: isSingleValue },
  { id: "table", name: "Table", icon: "table", implemented: true, isSensible: () => true },
  { id: "line", name: "Courbe", icon: "line", implemented: true, isSensible: (d) => d.rows.length > 1 && hasDimAndMetric(d) },
  { id: "area", name: "Aire", icon: "area", implemented: true, isSensible: (d) => d.rows.length > 1 && hasDimAndMetric(d) },
  { id: "bar", name: "Barres", icon: "bar", implemented: true, isSensible: hasDimAndMetric },
  { id: "waterfall", name: "Cascade", icon: "waterfall", implemented: true, isSensible: (d) => hasDimAndMetric(d) && getMetrics(d).length === 1 },
  { id: "combo", name: "Combiné", icon: "lineandbar", implemented: true, isSensible: (d) => getMetrics(d).length >= 2 },
  { id: "row", name: "Barres horizontales", icon: "horizontal_bar", implemented: true, isSensible: hasDimAndMetric },
  { id: "scatter", name: "Nuage de points", icon: "bubble", implemented: true, isSensible: (d) => getMetrics(d).length >= 2 },
  { id: "boxplot", name: "Boîte à moustaches", icon: "boxplot", implemented: true, isSensible: (d) => getMetrics(d).length >= 1 },
  { id: "pie", name: "Camembert", icon: "pie", implemented: true, isSensible: (d) => hasDimAndMetric(d) && d.rows.length <= 20 },
  { id: "map", name: "Carte", icon: "pinmap", implemented: true, isSensible: (d) => hasGeoColumn(d.cols) && getMetrics(d).length >= 1 },
  { id: "funnel", name: "Entonnoir", icon: "funnel", implemented: true, isSensible: (d) => hasDimAndMetric(d) && getMetrics(d).length === 1 },
  { id: "object", name: "Visualisation détaillée", icon: "document", implemented: true, isSensible: (d) => d.rows.length === 1 },
  { id: "pivot", name: "Tableau croisé dynamique", icon: "pivot_table", implemented: true, isSensible: (d) => getDimensions(d).length >= 2 && getMetrics(d).length >= 1 },
  { id: "treemap", name: "Treemap", icon: "treemap", implemented: true, isSensible: (d) => getDimensions(d).length >= 1 && getMetrics(d).length >= 1 },
  { id: "sankey", name: "Sankey", icon: "sankey", implemented: true, isSensible: (d) => getDimensions(d).length >= 2 && getMetrics(d).length >= 1 },
];

export const VIZ_BY_ID: Record<VizId, VizDef> = Object.fromEntries(
  VISUALIZATIONS.map((v) => [v.id, v]),
) as Record<VizId, VizDef>;

// ------------------------------------------------------- recommendation ----
// Ported from metabase/visualizations/lib/viz-order.ts
const DEFAULT_VIZ_ORDER: VizId[] = [
  "table",
  "bar",
  "line",
  "pie",
  "scalar",
  "row",
  "area",
  "combo",
  "pivot",
  "smartscalar",
  "gauge",
  "progress",
  "funnel",
  "object",
  "map",
  "scatter",
  "waterfall",
  "boxplot",
  "treemap",
  "sankey",
];

const MAX_RECOMMENDED = 12;

// Loose geo detection: a text column whose name looks like a place, matching
// Metabase's isCountry/isState/lat-long checks in spirit.
const GEO_NAME = /(pays|country|state|region|région|commune|ville|city|département|departement|insee|territoire|ctm|zone)/i;
function hasGeoColumn(cols: Column[]): boolean {
  return cols.some((c) => c.base_type === "string" && GEO_NAME.test(c.name + " " + c.display_name));
}
function hasLatLong(cols: Column[]): boolean {
  const n = cols.map((c) => (c.name + " " + c.display_name).toLowerCase());
  return n.some((s) => /lat/.test(s)) && n.some((s) => /(lon|lng)/.test(s));
}

/**
 * Port of Metabase's getRecommendedVisualizations: picks the display types that
 * genuinely suit the data shape, in priority order.
 */
function getRecommendedVisualizations(dataset: Dataset, sensible: VizId[]): VizId[] {
  const { cols, rows } = dataset;
  const metricCount = cols.filter(isMetric).length;
  const dims = getDimensions(dataset);
  const dimensionCount = dims.length;
  const hasGeo = hasLatLong(cols) || hasGeoColumn(cols);
  const nonLatLongDimensionCount = dims.filter((c) => !/lat|lon|lng/i.test(c.name)).length;
  const hasDateDimension = dims.some((c) => c.base_type === "date");

  if (rows.length === 1 && cols.length === 1 && metricCount === 1) return ["scalar", "gauge", "progress"];
  if (rows.length === 1 && cols.length === 1 && metricCount === 0) return ["table", "object", "scalar"];
  if (rows.length === 1 && cols.length > 1 && (metricCount === 0 || dimensionCount === 0)) return ["table", "object"];
  if (cols.length <= 1) return ["table"];
  if (metricCount === 0) return ["table", "pivot"];

  const recommended: VizId[] = [];
  if (hasGeo) recommended.push("map");

  if (hasDateDimension) {
    recommended.push("line", "area", "bar", "combo", "smartscalar", "row", "waterfall", "scatter", "pie", "table", "pivot");
  } else if (nonLatLongDimensionCount > 0) {
    recommended.push("bar", "row", "pie", "line", "area", "combo", "waterfall", "scatter", "table", "pivot");
  } else if (hasGeo) {
    recommended.push("table", "pivot", "scatter");
  }

  // The sankey check is robust, so recommend it whenever it is sensible.
  if (sensible.includes("sankey")) recommended.push("sankey");
  // Treemap works best with two-level grouping.
  if (sensible.includes("treemap") && nonLatLongDimensionCount >= 2) recommended.push("treemap");

  return recommended;
}

export interface SensibilityGroups {
  recommended: VizDef[];
  sensible: VizDef[];
  nonsensible: VizDef[];
}

/** Port of Metabase's groupVisualizationsBySensibility. */
export function groupVisualizationsBySensibility(dataset: Dataset): SensibilityGroups {
  const sensibleIds: VizId[] = [];
  const nonsensibleIds: VizId[] = [];
  for (const id of DEFAULT_VIZ_ORDER) {
    (VIZ_BY_ID[id].isSensible(dataset) ? sensibleIds : nonsensibleIds).push(id);
  }

  const recommended = [...new Set(getRecommendedVisualizations(dataset, sensibleIds))].filter((id) => sensibleIds.includes(id));
  const rest = sensibleIds.filter((id) => !recommended.includes(id));

  // Metabase caps the recommended group and pushes the overflow down.
  while (recommended.length > MAX_RECOMMENDED) rest.unshift(recommended.pop()!);

  const byId = (id: VizId) => VIZ_BY_ID[id];
  return { recommended: recommended.map(byId), sensible: rest.map(byId), nonsensible: nonsensibleIds.map(byId) };
}

/** Split for the picker: recommended on top, everything else under "Autres graphiques". */
export function splitVisualizations(dataset: Dataset): { sensible: VizDef[]; others: VizDef[] } {
  const { recommended, sensible, nonsensible } = groupVisualizationsBySensibility(dataset);
  return { sensible: recommended, others: [...sensible, ...nonsensible] };
}

/** The display Metabase would open with for this data. */
export function defaultVizFor(dataset: Dataset): VizId {
  const { recommended } = groupVisualizationsBySensibility(dataset);
  return recommended.find((v) => v.id !== "table")?.id ?? "table";
}
