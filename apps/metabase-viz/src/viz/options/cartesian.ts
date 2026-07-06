import type { EChartsOption, SeriesOption } from "echarts";
import type { Column, Dataset } from "../../data/types";
import { analyzeShape, getMetrics } from "../../data/types";
import { AXIS_LABEL_STYLE, CHART_STYLE, FONT_FAMILY, MB_COLORS, seriesColor } from "./constants";

export type CartesianKind = "bar" | "line" | "area" | "combo" | "row" | "scatter" | "waterfall";

type Cell = string | number | null;

interface Shape {
  dimension: Column;
  metrics: Column[];
  categories: Cell[];
}

function shapeData(dataset: Dataset): Shape {
  const { dimension, metrics } = analyzeShape(dataset);
  const categories = dataset.rows.map((r) => r[dimension.index] as Cell);
  return { dimension, metrics, categories };
}

const cells = (dataset: Dataset, col: Column): Cell[] => dataset.rows.map((r) => r[col.index] as Cell);

const numberFormatter = (v: number) => (v == null ? "" : Intl.NumberFormat("fr-FR").format(v));

function baseGrid() {
  return { left: 56, right: 24, top: 24, bottom: 44, containLabel: false };
}

function valueAxis(name?: string) {
  return {
    type: "value" as const,
    name,
    nameGap: CHART_STYLE.axisNameMargin + 24,
    nameLocation: "middle" as const,
    nameTextStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
    axisLabel: { ...AXIS_LABEL_STYLE, formatter: numberFormatter, margin: CHART_STYLE.axisTicksMarginY },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: MB_COLORS.gridLine, type: "dashed" as const } },
  };
}

function categoryAxis(categories: Cell[], name?: string) {
  return {
    type: "category" as const,
    name,
    data: categories as (string | number)[],
    nameGap: CHART_STYLE.axisNameMargin + 20,
    nameLocation: "middle" as const,
    nameTextStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
    axisLabel: { ...AXIS_LABEL_STYLE, margin: CHART_STYLE.axisTicksMarginX },
    axisTick: { show: false, alignWithLabel: true },
    axisLine: { lineStyle: { color: MB_COLORS.borderStrong } },
  };
}

function tooltipCfg(): EChartsOption["tooltip"] {
  return {
    trigger: "axis",
    axisPointer: { type: "shadow", shadowStyle: { color: "rgba(80,158,227,0.08)" } },
    backgroundColor: MB_COLORS.white,
    borderColor: MB_COLORS.border,
    borderWidth: 1,
    textStyle: { color: MB_COLORS.textPrimary, fontFamily: FONT_FAMILY, fontSize: 12 },
    extraCssText: "box-shadow: 0 2px 10px rgba(0,0,0,0.12); border-radius: 6px;",
  };
}

function legendCfg(metrics: Column[]): EChartsOption["legend"] {
  if (metrics.length < 2) return { show: false };
  return {
    show: true,
    top: 0,
    icon: "circle",
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
    data: metrics.map((m) => m.display_name),
  };
}

export function buildCartesianOption(kind: CartesianKind, dataset: Dataset): EChartsOption {
  const { dimension, metrics, categories } = shapeData(dataset);

  if (kind === "scatter") return buildScatter(dataset);
  if (kind === "waterfall") return buildWaterfall(dataset, categories);
  if (kind === "row") return buildRow(dataset, categories, metrics);

  const isArea = kind === "area";
  const isLine = kind === "line" || isArea;

  const series: SeriesOption[] = metrics.map((m, i) => {
    // For combo: first metric = bar, rest = line (Metabase's combo default).
    const asLine = kind === "combo" ? i > 0 : isLine;
    const color = seriesColor(i);
    return {
      name: m.display_name,
      type: asLine ? "line" : "bar",
      data: cells(dataset, m),
      itemStyle: { color, borderRadius: asLine ? 0 : [2, 2, 0, 0] },
      barMaxWidth: `${CHART_STYLE.series.barWidth * 100}%`,
      symbol: "circle",
      symbolSize: CHART_STYLE.symbolSize,
      lineStyle: asLine ? { width: 2, color } : undefined,
      areaStyle: isArea ? { color, opacity: CHART_STYLE.opacity.area } : undefined,
    } as SeriesOption;
  });

  return {
    grid: { ...baseGrid(), top: metrics.length >= 2 ? 36 : 24 },
    tooltip: tooltipCfg(),
    legend: legendCfg(metrics),
    xAxis: categoryAxis(categories, dimension.display_name),
    yAxis: valueAxis(metrics.length === 1 ? metrics[0].display_name : undefined),
    series,
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

function buildRow(dataset: Dataset, categories: Cell[], metrics: Column[]): EChartsOption {
  const series: SeriesOption[] = metrics.map((m, i) => ({
    name: m.display_name,
    type: "bar",
    data: cells(dataset, m),
    itemStyle: { color: seriesColor(i), borderRadius: [0, 2, 2, 0] },
    barMaxWidth: `${CHART_STYLE.series.barWidth * 100}%`,
  }));
  return {
    grid: { ...baseGrid(), left: 120 },
    tooltip: tooltipCfg(),
    legend: legendCfg(metrics),
    yAxis: { ...categoryAxis(categories), inverse: true },
    xAxis: valueAxis(),
    series,
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

function buildScatter(dataset: Dataset): EChartsOption {
  const metrics = analyzeShape(dataset).metrics;
  const all = metrics.length >= 2 ? metrics : getMetrics(dataset);
  const xMetric = all[0];
  const yMetric = all[1] ?? all[0];
  const data = dataset.rows.map((r) => [r[xMetric.index], r[yMetric.index]] as [Cell, Cell]);
  return {
    grid: baseGrid(),
    tooltip: { ...tooltipCfg(), trigger: "item" },
    xAxis: { ...valueAxis(xMetric?.display_name), type: "value" },
    yAxis: valueAxis(yMetric?.display_name),
    series: [
      {
        type: "scatter",
        symbolSize: 10,
        data: data as (number | null)[][],
        itemStyle: { color: seriesColor(0), opacity: CHART_STYLE.opacity.scatter },
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

function buildWaterfall(dataset: Dataset, categories: Cell[]): EChartsOption {
  const metric = analyzeShape(dataset).metrics[0] ?? getMetrics(dataset)[0];
  const values = dataset.rows.map((r) => Number(r[metric.index]) || 0);

  // Stacked-bar waterfall: an invisible "base" bar lifts each visible bar.
  const bases: number[] = [];
  const positives: (number | "-")[] = [];
  const negatives: (number | "-")[] = [];
  let running = 0;
  for (const v of values) {
    if (v >= 0) {
      bases.push(running);
      positives.push(v);
      negatives.push("-");
    } else {
      bases.push(running + v);
      positives.push("-");
      negatives.push(-v);
    }
    running += v;
  }

  const series: SeriesOption[] = [
    { type: "bar", stack: "wf", itemStyle: { color: "transparent" }, emphasis: { itemStyle: { color: "transparent" } }, data: bases, silent: true },
    { type: "bar", stack: "wf", name: "Hausse", itemStyle: { color: "#88BF4D", borderRadius: [2, 2, 0, 0] }, data: positives },
    { type: "bar", stack: "wf", name: "Baisse", itemStyle: { color: "#EF8C8C", borderRadius: [2, 2, 0, 0] }, data: negatives },
  ];

  return {
    grid: baseGrid(),
    tooltip: tooltipCfg(),
    xAxis: categoryAxis(categories, metric.display_name),
    yAxis: valueAxis(),
    series,
    textStyle: { fontFamily: FONT_FAMILY },
  };
}
