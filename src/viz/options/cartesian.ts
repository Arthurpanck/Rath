import type { EChartsOption, SeriesOption } from "echarts";
import type { Dataset } from "../../data/types";
import { getMetrics } from "../../data/types";
import { formatDate, pickGranularity } from "../../data/dates";
import type { VizSettings } from "../settings";
import { resolveShape } from "../settings";
import { formatCompact } from "../format";
import { buildFrame, type Cell, type Frame } from "../frame";
import { AXIS_LABEL_STYLE, CHART_STYLE, FONT_FAMILY, MB_COLORS, seriesColor } from "./constants";

export type CartesianKind = "bar" | "line" | "area" | "combo" | "row" | "scatter" | "waterfall";

const nf = (v: number) => (v == null ? "" : Intl.NumberFormat("fr-FR").format(v));
const pctf = (v: number) => (v == null ? "" : `${Math.round(v)} %`);

const colorFor = (settings: VizSettings, key: string, i: number): string => settings.colors[key] ?? seriesColor(i);
// Data-label number formatting per "Mise en forme automatique" (Auto/Compact/Complet).
const labelNum = (settings: VizSettings, v: number) => (settings.labelFormatting === "compact" ? formatCompact(v) : nf(v));

function baseGrid() {
  return { left: 56, right: 24, top: 24, bottom: 48, containLabel: false };
}

function valueAxis(settings: VizSettings, name?: string, normalized = false) {
  const isLog = settings.yScale === "log" && !normalized;
  const customRange = !normalized && !settings.yAutoRange;
  return {
    type: isLog ? ("log" as const) : ("value" as const),
    name: settings.yShowTitle ? settings.yAxisTitle ?? name : undefined,
    max: normalized ? 100 : customRange ? settings.yMax ?? undefined : undefined,
    min: customRange ? settings.yMin ?? undefined : undefined,
    // "Ne pas commencer à zéro" → let ECharts fit the data range.
    scale: settings.unpinFromZero && !normalized && !customRange,
    nameGap: CHART_STYLE.axisNameMargin + 24,
    nameLocation: "middle" as const,
    nameTextStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
    axisLabel: { ...AXIS_LABEL_STYLE, show: settings.yAxisEnabled, formatter: normalized ? pctf : nf, margin: CHART_STYLE.axisTicksMarginY },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: MB_COLORS.gridLine, type: "dashed" as const } },
  };
}

// Least-squares linear regression over (x, y), ignoring null y.
function linearFit(xs: number[], ys: (number | null)[]): { slope: number; intercept: number } | null {
  const pts = xs.map((x, i) => [x, ys[i]] as [number, number | null]).filter((p) => p[1] != null) as [number, number][];
  const n = pts.length;
  if (n < 2) return null;
  const sx = pts.reduce((s, p) => s + p[0], 0);
  const sy = pts.reduce((s, p) => s + p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0);
  const sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

function categoryAxis(categories: Cell[], settings: VizSettings, name?: string) {
  return {
    type: "category" as const,
    name: settings.xShowTitle ? settings.xAxisTitle ?? name : undefined,
    data: categories as (string | number)[],
    nameGap: CHART_STYLE.axisNameMargin + 22,
    nameLocation: "middle" as const,
    nameTextStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
    axisLabel: { ...AXIS_LABEL_STYLE, show: settings.xAxisEnabled, margin: CHART_STYLE.axisTicksMarginX },
    axisTick: { show: false, alignWithLabel: true },
    axisLine: { lineStyle: { color: MB_COLORS.borderStrong } },
  };
}

function timeAxis(timestamps: number[], settings: VizSettings, name?: string) {
  const g = pickGranularity(timestamps);
  return {
    type: "time" as const,
    name: settings.xShowTitle ? settings.xAxisTitle ?? name : undefined,
    nameGap: CHART_STYLE.axisNameMargin + 22,
    nameLocation: "middle" as const,
    nameTextStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
    axisLabel: { ...AXIS_LABEL_STYLE, show: settings.xAxisEnabled, margin: CHART_STYLE.axisTicksMarginX, formatter: (v: number) => formatDate(v, g) },
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

function legendCfg(frame: Frame, settings: VizSettings): EChartsOption["legend"] {
  if (!settings.showLegend || frame.series.length < 2) return { show: false };
  return {
    show: true,
    top: 0,
    icon: "circle",
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
    data: frame.series.map((s) => s.name),
  };
}

function dataLabel(settings: VizSettings, normalized: boolean, position: "top" | "right" = "top") {
  if (!settings.showValues) return { show: false };
  return {
    show: true,
    position,
    color: MB_COLORS.textSecondary,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: 700,
    formatter: (p: { value: unknown }) => {
      const v = Array.isArray(p.value) ? Number(p.value[1]) : Number(p.value);
      return normalized ? pctf(v) : labelNum(settings, v);
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
  if (kind === "scatter") return buildScatter(dataset, settings);

  const frame = buildFrame(dataset, settings);

  if (kind === "row") return buildRow(frame, settings);
  if (kind === "waterfall") return buildWaterfall(frame, settings);

  const isArea = kind === "area";
  const isLine = kind === "line" || isArea;
  const isDate = frame.timestamps != null;
  const normalized = settings.stacking === "normalized";
  const stacked = settings.stacking !== "none";

  const rowTotals = frame.categories.map((_, ci) => frame.series.reduce((s, se) => s + (se.values[ci] ?? 0), 0));

  const series: SeriesOption[] = frame.series.map((s, i) => {
    const asLine = kind === "combo" ? i > 0 : isLine;
    const color = colorFor(settings, s.key, i);
    const values = s.values.map((raw, ci) => {
      if (raw == null) return isDate ? ([frame.timestamps![ci], null] as [number, null]) : null;
      const v = normalized ? (rowTotals[ci] ? (raw / rowTotals[ci]) * 100 : 0) : raw;
      return isDate ? ([frame.timestamps![ci], v] as [number, number]) : (v as number);
    });
    return {
      name: s.name,
      type: asLine ? "line" : "bar",
      data: values,
      stack: stacked && (!asLine || kind !== "combo") ? "stack" : undefined,
      itemStyle: { color, borderRadius: asLine ? 0 : [2, 2, 0, 0] },
      barMaxWidth: `${CHART_STYLE.series.barWidth * 100}%`,
      symbol: "circle",
      symbolSize: CHART_STYLE.symbolSize,
      lineStyle: asLine ? { width: 2, color } : undefined,
      areaStyle: isArea ? { color, opacity: CHART_STYLE.opacity.area } : undefined,
      label: dataLabel(settings, normalized),
      markLine: i === 0 ? goalMarkLine(settings) : undefined,
    } as SeriesOption;
  });

  // Trend lines (linear regression) per series — like Metabase's show_trendline.
  if (settings.showTrendline && !normalized) {
    const xs = isDate ? frame.timestamps! : frame.categories.map((_, i) => i);
    frame.series.forEach((s, i) => {
      const fit = linearFit(xs, s.values);
      if (!fit) return;
      const color = colorFor(settings, s.key, i);
      const data = xs.map((x, ci) => {
        const y = fit.slope * x + fit.intercept;
        return isDate ? ([frame.timestamps![ci], y] as [number, number]) : (y as number);
      });
      series.push({
        name: `Tendance · ${s.name}`,
        type: "line",
        data,
        symbol: "none",
        lineStyle: { color, width: 1.5, type: "dashed" },
        z: 5,
        silent: true,
        tooltip: { show: false },
      } as SeriesOption);
    });
  }

  return {
    grid: { ...baseGrid(), top: frame.series.length >= 2 && settings.showLegend ? 36 : 24 },
    tooltip: tooltipCfg(),
    legend: legendCfg(frame, settings),
    xAxis: isDate ? timeAxis(frame.timestamps!, settings, frame.dimension.display_name) : categoryAxis(frame.categories, settings, frame.dimension.display_name),
    yAxis: valueAxis(settings, frame.series.length === 1 ? frame.series[0].name : undefined, normalized),
    series,
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

function buildRow(frame: Frame, settings: VizSettings): EChartsOption {
  const stacked = settings.stacking !== "none";
  const series: SeriesOption[] = frame.series.map((s, i) => ({
    name: s.name,
    type: "bar",
    data: s.values as (number | null)[],
    stack: stacked ? "stack" : undefined,
    itemStyle: { color: colorFor(settings, s.key, i), borderRadius: [0, 2, 2, 0] },
    barMaxWidth: `${CHART_STYLE.series.barWidth * 100}%`,
    label: dataLabel(settings, false, "right"),
  }));
  return {
    grid: { ...baseGrid(), left: 120 },
    tooltip: tooltipCfg(),
    legend: legendCfg(frame, settings),
    yAxis: { ...categoryAxis(frame.categories, settings), inverse: true },
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
        itemStyle: { color: colorFor(settings, xMetric?.name ?? "x", 0), opacity: CHART_STYLE.opacity.scatter },
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

function buildWaterfall(frame: Frame, settings: VizSettings): EChartsOption {
  const values = frame.series[0]?.values.map((v) => Number(v) || 0) ?? [];

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
    { type: "bar", stack: "wf", name: "Hausse", itemStyle: { color: "#88BF4D", borderRadius: [2, 2, 0, 0] }, data: positives, label: dataLabel(settings, false) },
    { type: "bar", stack: "wf", name: "Baisse", itemStyle: { color: "#EF8C8C", borderRadius: [2, 2, 0, 0] }, data: negatives, label: dataLabel(settings, false) },
  ];

  return {
    grid: baseGrid(),
    tooltip: tooltipCfg(),
    xAxis: categoryAxis(frame.categories, settings, frame.dimension.display_name),
    yAxis: valueAxis(settings),
    series,
    textStyle: { fontFamily: FONT_FAMILY },
  };
}
