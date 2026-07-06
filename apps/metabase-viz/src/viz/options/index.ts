import type { EChartsOption } from "echarts";
import type { Dataset } from "../../data/types";
import type { VizId } from "../registry";
import { buildCartesianOption } from "./cartesian";
import { buildBoxplotOption, buildFunnelOption, buildGaugeOption, buildPieOption, buildProgressOption } from "./other";

// Vizs rendered as React components (not ECharts).
export const REACT_VIZ: VizId[] = ["table", "object", "scalar", "smartscalar"];

// Vizs not yet implemented in this module.
export const UNIMPLEMENTED: VizId[] = ["map", "pivot", "sankey"];

export function isEChartsViz(id: VizId): boolean {
  return !REACT_VIZ.includes(id) && !UNIMPLEMENTED.includes(id);
}

export function buildEChartsOption(id: VizId, dataset: Dataset): EChartsOption {
  switch (id) {
    case "bar":
    case "line":
    case "area":
    case "combo":
    case "row":
    case "scatter":
    case "waterfall":
      return buildCartesianOption(id, dataset);
    case "pie":
      return buildPieOption(dataset);
    case "gauge":
      return buildGaugeOption(dataset);
    case "progress":
      return buildProgressOption(dataset);
    case "funnel":
      return buildFunnelOption(dataset);
    case "boxplot":
      return buildBoxplotOption(dataset);
    default:
      return {};
  }
}
