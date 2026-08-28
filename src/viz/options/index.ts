import type { EChartsOption } from "echarts";
import type { Dataset } from "../../data/types";
import type { VizId } from "../registry";
import type { VizSettings } from "../settings";
import {
  AGGREGATION_VIZ,
  AXIS_VIZ,
  CARTESIAN_VIZ,
  COLOR_VIZ,
  DATA_LABEL_VIZ,
  DIMENSION_VIZ,
  GOAL_VIZ,
  LEGEND_VIZ,
  MULTI_METRIC_VIZ,
  NO_METRIC_VIZ,
  SORTABLE_VIZ,
  STACKING_VIZ,
  TREND_LINE_VIZ,
  Y_RANGE_VIZ,
  Y_SCALE_VIZ,
} from "../families";
import { buildCartesianOption } from "./cartesian";
import { buildBoxplotOption, buildGaugeOption, buildPieOption, buildProgressOption } from "./other";
import { buildTreemapOption } from "./treemap";
import { buildMapOption, buildSankeyOption } from "./geo-sankey";

// Vizs rendered as React components (not ECharts).
export const REACT_VIZ: VizId[] = ["table", "object", "scalar", "smartscalar", "pivot"];

// Vizs not yet implemented in this module.
export const UNIMPLEMENTED: VizId[] = [];

export function isEChartsViz(id: VizId): boolean {
  return !REACT_VIZ.includes(id) && !UNIMPLEMENTED.includes(id);
}

/**
 * @param size the chart's pixel size. Charts that need to know how much room
 *   they have use it: the pie for its radii and fonts, the cartesian family to
 *   decide whether x labels fit horizontally, rotated, or not at all.
 */
export function buildEChartsOption(id: VizId, dataset: Dataset, settings: VizSettings, size?: { width: number; height: number }): EChartsOption {
  switch (id) {
    case "bar":
    case "line":
    case "area":
    case "combo":
    case "row":
    case "scatter":
    case "waterfall":
      return buildCartesianOption(id, dataset, settings, size);
    case "pie":
      return buildPieOption(dataset, settings, size && Math.min(size.width, size.height));
    case "gauge":
      return buildGaugeOption(dataset, settings);
    case "progress":
      return buildProgressOption(dataset, settings);
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
  return {
    dimension: DIMENSION_VIZ.includes(id),
    metrics: !NO_METRIC_VIZ.includes(id),
    multiMetric: MULTI_METRIC_VIZ.includes(id),
    breakout: CARTESIAN_VIZ.includes(id),
    aggregation: AGGREGATION_VIZ.includes(id),
    sort: SORTABLE_VIZ.includes(id),
    stacking: STACKING_VIZ.includes(id),
    values: DATA_LABEL_VIZ.includes(id),
    legend: LEGEND_VIZ.includes(id),
    colors: COLOR_VIZ.includes(id),
    axisTitles: AXIS_VIZ.includes(id),
    goal: GOAL_VIZ.includes(id),
    trendline: TREND_LINE_VIZ.includes(id),
    yScale: Y_SCALE_VIZ.includes(id),
    yRange: Y_RANGE_VIZ.includes(id),
    axisToggles: AXIS_VIZ.includes(id),
    pie: id === "pie",
    sankeyFields: id === "sankey",
    pivotFields: id === "pivot",
    mapFields: id === "map",
  };
}
