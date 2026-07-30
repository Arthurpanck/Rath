import type { EChartsOption } from "echarts";
import type { Dataset } from "../../data/types";
import type { VizId } from "../registry";
import type { VizSettings } from "../settings";
import { buildCartesianOption } from "./cartesian";
import { buildBoxplotOption, buildFunnelOption, buildGaugeOption, buildPieOption, buildProgressOption } from "./other";
import { buildTreemapOption } from "./treemap";
import { buildMapOption, buildSankeyOption } from "./geo-sankey";

// Vizs rendered as React components (not ECharts).
export const REACT_VIZ: VizId[] = ["table", "object", "scalar", "smartscalar", "pivot"];

// Vizs not yet implemented in this module.
export const UNIMPLEMENTED: VizId[] = [];

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
    case "sankey":
      return buildSankeyOption(dataset, settings);
    case "map":
      return buildMapOption(dataset, settings);
    case "treemap":
      return buildTreemapOption(dataset, settings);
    default:
      return {};
  }
}

export interface Capabilities {
  dimension: boolean;
  metrics: boolean;
  multiMetric: boolean;
  breakout: boolean;
  aggregation: boolean;
  sort: boolean;
  stacking: boolean;
  values: boolean;
  legend: boolean;
  colors: boolean;
  axisTitles: boolean;
  goal: boolean;
  trendline: boolean;
  yScale: boolean;
  yRange: boolean;
  axisToggles: boolean;
  pie: boolean;
  sankeyFields: boolean;
  pivotFields: boolean;
  mapFields: boolean;
}

/** Which settings controls are relevant for a given viz (drives the settings panel). */
export function settingsCapabilities(id: VizId): Capabilities {
  const cartesian = ["bar", "line", "area", "combo", "row"].includes(id);
  return {
    dimension: ["bar", "line", "area", "combo", "row", "pie", "funnel", "waterfall"].includes(id),
    metrics: !["object", "sankey", "map"].includes(id),
    multiMetric: ["bar", "line", "area", "combo", "row", "scatter", "boxplot"].includes(id),
    breakout: cartesian,
    aggregation: [...["bar", "line", "area", "combo", "row", "pie", "funnel", "waterfall"], "pivot"].includes(id),
    sort: ["bar", "line", "area", "combo", "row", "pie", "funnel"].includes(id),
    stacking: ["bar", "area", "row"].includes(id),
    values: cartesian || id === "waterfall",
    legend: ["bar", "line", "area", "combo", "row", "pie", "funnel"].includes(id),
    colors: ["bar", "line", "area", "combo", "row", "progress"].includes(id),
    axisTitles: cartesian || id === "waterfall" || id === "scatter",
    goal: ["bar", "line", "area", "combo", "gauge", "progress"].includes(id),
    trendline: ["bar", "line", "area", "combo"].includes(id),
    yScale: cartesian || id === "scatter",
    yRange: cartesian || id === "scatter" || id === "waterfall",
    axisToggles: cartesian || id === "waterfall" || id === "scatter",
    pie: id === "pie",
    sankeyFields: id === "sankey",
    pivotFields: id === "pivot",
    mapFields: id === "map",
  };
}
