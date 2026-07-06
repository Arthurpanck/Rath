import type { EChartsOption, SeriesOption } from "echarts";
import type { Column, Dataset } from "../../data/types";
import { getMetrics } from "../../data/types";
import { formatDate, parseDate, pickGranularity } from "../../data/dates";
import type { VizSettings } from "../settings";
import { resolveShape } from "../settings";
import { AXIS_LABEL_STYLE, CHART_STYLE, FONT_FAMILY, MB_COLORS, seriesColor } from "./constants";

export type CartesianKind = "bar" | "line" | "area" | "combo" | "row" | "scatter" | "waterfall";

type Cell = string | number | null;

const nf = (v: number) => (v == null ? "" : Intl.NumberFormat("fr-FR").format(v));
const pctf = (v: number) => (v == null ? "" : `${Math.round(v)} %`);

function seriesColorFor(settings: VizSettings, col: Column, i: number): string {
  return settings.colors[col.name] ?? seriesColor(i);
}

function baseGrid() {
  return { left: 56, right: 24, top: 24, bottom: 48, containLabel: false };
}

function valueAxis(settings: VizSettings, name?: string, normalized = false) {
  const title = settings.yAxisTitle ?? name;
  return {
    type: "value" as const,
    name: title,
    max: normalized ? 100 : undefined,
    nameGap: CHART_STYLE.axisNameMargin + 24,
    nameLocation: "middle" as const,
    nameTextStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
    axisLabel: { ...AXIS_LABEL_STYLE, formatter: normalized ? pctf : nf, margin: CHART_STYLE.axisTicksMarginY },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: MB_COLORS.gridLine, type: "dashed" as const } },
  };
}

function categoryAxis(categories: Cell[], settings: VizSettings, name?: string) {
  return {
    type: "category" as const,
    name: settings.xAxisTitle ?? name,
    data: categories as (string | number)[],
    nameGap: CHART_STYLE.axisNameMargin + 22,
    nameLocation: "middle" as const,
    nameTextStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
    axisLabel: { ...AXIS_LABEL_STYLE, margin: CHART_STYLE.axisTicksMarginX },
    axisTick: { show: false, alignWithLabel: true },
    axisLine: { lineStyle: { color: MB_COLORS.borderStrong } },
  };
}

function timeAxis(timestamps: number[], settings: VizSettings, name?: string) {
  const g = pickGranularity(timestamps);
  return {
    type: "time" as const,
    name: settings.xAxisTitle ?? name,
    nameGap: CHART_STYLE.axisNameMargin + 22,
    nameLocation: "middle" as const,
    nameTextStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
    axisLabel: { ...AXIS_LABEL_STYLE, margin: CHART_STYLE.axisTicksMarginX, formatter: (v: number) => formatDate(v, g) },
    axisTick: { show: false },
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

function legendCfg(metrics: Column[], settings: VizSettings): EChartsOption["legend"] {
  if (!settings.showLegend || metrics.length < 2) return { show: false };
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

function dataLabel(settings: VizSettings, normalized: boolean) {
  if (!settings.showValues) return { show: false };
  return {
    show: true,
    position: "top" as const,
    color: MB_COLORS.textSecondary,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: 700,
    formatter: (p: { value: unknown }) => {
      const v = Array.isArray(p.value) ? Number(p.value[1]) : Number(p.value);
      return normalized ? pctf(v) : nf(v);
    },
  };
}

function goalMarkLine(settings: VizSettings) {
  if (settings.goalValue == null) return undefined;
  return {
    silent: true,
    symbol: "none" as const,
    lineStyle: { color: MB_COLORS.textTertiary, type: "dashed" as const, width: 1.5 },
    label: { formatter: `Objectif : ${nf(settings.goalValue)}`, color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, position: "insideEndTop" as const },
    data: [{ yAxis: settings.goalValue }],
  };
}

export function buildCartesianOption(kind: CartesianKind, dataset: Dataset, settings: VizSettings): EChartsOption {
  const { dimension, metrics } = resolveShape(dataset, settings);

  if (kind === "scatter") return buildScatter(dataset, settings);
  if (kind === "waterfall") return buildWaterfall(dataset, settings);
  if (kind === "row") return buildRow(dataset, settings, dimension, metrics);

  const isArea = kind === "area";
  const isLine = kind === "line" || isArea;
  const isDate = dimension.base_type === "date";
  const normalized = settings.stacking === "normalized" && !isLine ? true : settings.stacking === "normalized";
  const stacked = settings.stacking !== "none";

  const timestamps = isDate ? dataset.rows.map((r) => parseDate(r[dimension.index]) ?? 0) : [];
  const categories = dataset.rows.map((r) => r[dimension.index] as Cell);

  // Per-row totals for normalized stacking.
  const rowTotals = dataset.rows.map((r) => metrics.reduce((s, m) => s + (Number(r[m.index]) || 0), 0));

  const goal = goalMarkLine(settings);

  const series: SeriesOption[] = metrics.map((m, i) => {
    const asLine = kind === "combo" ? i > 0 : isLine;
    const color = seriesColorFor(settings, m, i);
    const values = dataset.rows.map((r, ri) => {
      let v = Number(r[m.index]);
      if (isNaN(v)) return null;
      if (normalized) v = rowTotals[ri] ? (v / rowTotals[ri]) * 100 : 0;
      return isDate ? ([timestamps[ri], v] as [number, number]) : (v as number);
    });
    return {
      name: m.display_name,
      type: asLine ? "line" : "bar",
      data: values,
      stack: stacked && !asLine ? "stack" : stacked && asLine && kind !== "combo" ? "stack" : undefined,
      itemStyle: { color, borderRadius: asLine ? 0 : [2, 2, 0, 0] },
      barMaxWidth: `${CHART_STYLE.series.barWidth * 100}%`,
      symbol: "circle",
      symbolSize: CHART_STYLE.symbolSize,
      lineStyle: asLine ? { width: 2, color } : undefined,
      areaStyle: isArea ? { color, opacity: CHART_STYLE.opacity.area } : undefined,
      label: dataLabel(settings, normalized),
      markLine: i === 0 ? goal : undefined,
    } as SeriesOption;
  });

  return {
    grid: { ...baseGrid(), top: metrics.length >= 2 && settings.showLegend ? 36 : 24 },
    tooltip: tooltipCfg(),
    legend: legendCfg(metrics, settings),
    xAxis: isDate ? timeAxis(timestamps, settings, dimension.display_name) : categoryAxis(categories, settings, dimension.display_name),
    yAxis: valueAxis(settings, metrics.length === 1 ? metrics[0].display_name : undefined, normalized),
    series,
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

function buildRow(dataset: Dataset, settings: VizSettings, dimension: Column, metrics: Column[]): EChartsOption {
  const categories = dataset.rows.map((r) => r[dimension.index] as Cell);
  const stacked = settings.stacking !== "none";
  const series: SeriesOption[] = metrics.map((m, i) => ({
    name: m.display_name,
    type: "bar",
    data: dataset.rows.map((r) => r[m.index] as Cell),
    stack: stacked ? "stack" : undefined,
    itemStyle: { color: seriesColorFor(settings, m, i), borderRadius: [0, 2, 2, 0] },
    barMaxWidth: `${CHART_STYLE.series.barWidth * 100}%`,
    label: settings.showValues ? { show: true, position: "right", color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: 700, formatter: (p: { value: unknown }) => nf(Number(p.value)) } : { show: false },
  }));
  return {
    grid: { ...baseGrid(), left: 120 },
    tooltip: tooltipCfg(),
    legend: legendCfg(metrics, settings),
    yAxis: { ...categoryAxis(categories, settings), inverse: true },
    xAxis: valueAxis(settings),
    series,
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

function buildScatter(dataset: Dataset, settings: VizSettings): EChartsOption {
  const resolved = resolveShape(dataset, settings).metrics;
  const all = resolved.length >= 2 ? resolved : getMetrics(dataset);
  const xMetric = all[0];
  const yMetric = all[1] ?? all[0];
  const data = dataset.rows.map((r) => [r[xMetric.index], r[yMetric.index]] as [Cell, Cell]);
  return {
    grid: baseGrid(),
    tooltip: { ...tooltipCfg(), trigger: "item" },
    xAxis: { ...valueAxis(settings, xMetric?.display_name), type: "value" },
    yAxis: valueAxis(settings, yMetric?.display_name),
    series: [
      {
        type: "scatter",
        symbolSize: 10,
        data: data as (number | null)[][],
        itemStyle: { color: seriesColorFor(settings, xMetric, 0), opacity: CHART_STYLE.opacity.scatter },
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

function buildWaterfall(dataset: Dataset, settings: VizSettings): EChartsOption {
  const { dimension, metrics } = resolveShape(dataset, settings);
  const metric = metrics[0] ?? getMetrics(dataset)[0];
  const categories = dataset.rows.map((r) => r[dimension.index] as Cell);
  const values = dataset.rows.map((r) => Number(r[metric.index]) || 0);

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
    xAxis: categoryAxis(categories, settings, metric.display_name),
    yAxis: valueAxis(settings),
    series,
    textStyle: { fontFamily: FONT_FAMILY },
  };
}
