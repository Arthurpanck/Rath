import type { EChartsOption } from "echarts";
import type { Dataset } from "../../data/types";
import type { VizId } from "../registry";
import type { VizSettings } from "../settings";
import { buildCartesianOption } from "./cartesian";
import { buildBoxplotOption, buildFunnelOption, buildGaugeOption, buildPieOption, buildProgressOption } from "./other";

// Vizs rendered as React components (not ECharts).
export const REACT_VIZ: VizId[] = ["table", "object", "scalar", "smartscalar"];

// Vizs not yet implemented in this module.
export const UNIMPLEMENTED: VizId[] = ["map", "pivot", "sankey"];

export function isEChartsViz(id: VizId): boolean {
  return !REACT_VIZ.includes(id) && !UNIMPLEMENTED.includes(id);
}

export function buildEChartsOption(id: VizId, dataset: Dataset, settings: VizSettings): EChartsOption {
  switch (id) {
    case "bar":
    case "line":
    case "area":
    case "combo":
    case "row":
    case "scatter":
    case "waterfall":
      return buildCartesianOption(id, dataset, settings);
    case "pie":
      return buildPieOption(dataset, settings);
    case "gauge":
      return buildGaugeOption(dataset, settings);
    case "progress":
      return buildProgressOption(dataset, settings);
    case "funnel":
      return buildFunnelOption(dataset, settings);
    case "boxplot":
      return buildBoxplotOption(dataset, settings);
    default:
      return {};
  }
}

/** Which settings controls are relevant for a given viz (drives the settings panel). */
export function settingsCapabilities(id: VizId): {
  dimension: boolean;
  metrics: boolean;
  multiMetric: boolean;
  stacking: boolean;
  values: boolean;
  legend: boolean;
  colors: boolean;
  axisTitles: boolean;
  goal: boolean;
} {
  const cartesian = ["bar", "line", "area", "combo", "row"].includes(id);
  return {
    dimension: ["bar", "line", "area", "combo", "row", "pie", "funnel", "waterfall"].includes(id),
    metrics: !["object"].includes(id),
    multiMetric: ["bar", "line", "area", "combo", "row", "scatter", "boxplot"].includes(id),
    stacking: ["bar", "area", "row"].includes(id),
    values: cartesian,
    legend: ["bar", "line", "area", "combo", "row", "pie", "funnel"].includes(id),
    colors: ["bar", "line", "area", "combo", "row", "progress"].includes(id),
    axisTitles: cartesian || id === "waterfall" || id === "scatter",
    goal: ["bar", "line", "area", "combo", "gauge", "progress"].includes(id),
  };
}
