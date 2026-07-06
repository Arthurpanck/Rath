import type { Dataset } from "../data/types";
import { getDimensions, getMetrics } from "../data/types";

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
  | "sankey";

export interface VizDef {
  id: VizId;
  /** French UI label, matching the Metabase FR locale. */
  name: string;
  /** Metabase iconName. */
  icon: string;
  /** Whether this viz can actually render (implemented with ECharts here). */
  implemented: boolean;
  /** Metabase-style "isSensible": is this a good default for the data shape? */
  isSensible: (d: Dataset) => boolean;
}

const hasDimAndMetric = (d: Dataset) => getDimensions(d).length > 0 && getMetrics(d).length > 0;
const isSingleValue = (d: Dataset) => d.rows.length === 1 && getMetrics(d).length >= 1;

// Order mirrors metabase/visualizations/register.js
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
  { id: "map", name: "Carte", icon: "pinmap", implemented: false, isSensible: () => false },
  { id: "funnel", name: "Entonnoir", icon: "funnel", implemented: true, isSensible: (d) => hasDimAndMetric(d) && getMetrics(d).length === 1 },
  { id: "object", name: "Visualisation détaillée", icon: "document", implemented: true, isSensible: (d) => d.rows.length === 1 },
  { id: "pivot", name: "Tableau croisé dynamique", icon: "pivot_table", implemented: false, isSensible: () => false },
  { id: "sankey", name: "Sankey", icon: "sankey", implemented: false, isSensible: () => false },
];

export const VIZ_BY_ID: Record<VizId, VizDef> = Object.fromEntries(
  VISUALIZATIONS.map((v) => [v.id, v]),
) as Record<VizId, VizDef>;

/** Split visualizations into "sensible" (top) and the rest ("Autres graphiques"). */
export function splitVisualizations(dataset: Dataset): { sensible: VizDef[]; others: VizDef[] } {
  const sensible: VizDef[] = [];
  const others: VizDef[] = [];
  for (const viz of VISUALIZATIONS) {
    (viz.isSensible(dataset) ? sensible : others).push(viz);
  }
  return { sensible, others };
}
