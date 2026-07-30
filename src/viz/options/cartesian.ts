import type { EChartsOption, SeriesOption } from "echarts";
import type { Dataset } from "../../data/types";
import { getMetrics } from "../../data/types";
import { formatDate, pickGranularity } from "../../data/dates";
import type { VizSettings } from "../settings";
import { resolveShape } from "../settings";
import { formatCompact, formatSeriesValue, nf2 } from "../format";
import type { SeriesOpts } from "../settings";
import { buildFrame, type Cell, type Frame } from "../frame";
import { AXIS_LABEL_STYLE, CHART_STYLE, FONT_FAMILY, MB_COLORS, seriesColor } from "./constants";

export type CartesianKind = "bar" | "line" | "area" | "combo" | "row" | "scatter" | "waterfall";

const nf = (v: number) => nf2(v);
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
    splitNumber: settings.ySplitNumber ?? undefined,
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
    axisPointer: { type: "line", lineStyle: { color: MB_COLORS.border, width: 1 } },
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

function dataLabel(settings: VizSettings, normalized: boolean, position: "top" | "right" | "inside" = "top", opts?: SeriesOpts) {
  const show = settings.showValues || opts?.showValues;
  if (!show) return { show: false };
  const compact = settings.labelFormatting === "compact";
  return {
    show: true,
    position,
    color: MB_COLORS.textSecondary,
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: 700,
    formatter: (p: { value: unknown }) => {
      const v = Array.isArray(p.value) ? Number(p.value[1]) : Number(p.value);
      if (normalized) return pctf(v);
      // Per-series "Mise en forme" (popover) wins over the global setting.
      return opts?.fmt ? formatSeriesValue(v, opts.fmt, compact) : labelNum(settings, v);
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

  const BAR_WIDTH: Record<string, number> = { xs: 0.35, normal: 0.8, wide: 0.95, xl: 1 };
  const LINE_WIDTH: Record<string, number> = { S: 1.5, M: 2, L: 3.5 };
  const baseDisp = (i: number): "line" | "bar" | "area" => (kind === "combo" ? (i > 0 ? "line" : "bar") : isArea ? "area" : isLine ? "line" : "bar");
  const anyRight = frame.series.some((s) => settings.series[s.key]?.axis === "right");

  const series: SeriesOption[] = frame.series.map((s, i) => {
    const o = settings.series[s.key] ?? {};
    const disp = o.display ?? baseDisp(i);
    const asLine = disp === "line" || disp === "area";
    const asArea = disp === "area";
    const color = colorFor(settings, s.key, i);
    // "Remplacer les valeurs manquantes par": zéro | interpolé | aucun
    const missing = o.missing ?? "interpolate";
    const values = s.values.map((raw, ci) => {
      const filled = raw == null && missing === "zero" ? 0 : raw;
      if (filled == null) return isDate ? ([frame.timestamps![ci], null] as [number, null]) : null;
      const v = normalized ? (rowTotals[ci] ? (filled / rowTotals[ci]) * 100 : 0) : filled;
      return isDate ? ([frame.timestamps![ci], v] as [number, number]) : (v as number);
    });
    const areaOpacity = o.areaOpacity === "opaque" ? 0.9 : o.areaOpacity === "transparent" ? 0.12 : CHART_STYLE.opacity.area;
    const showSym = o.markers === "on" ? true : o.markers === "off" ? false : undefined;
    return {
      name: o.name ?? s.name,
      type: asLine ? "line" : "bar",
      yAxisIndex: o.axis === "right" ? 1 : 0,
      connectNulls: missing === "interpolate",
      data: values,
      stack: stacked && (!asLine || kind !== "combo") ? "stack" : undefined,
      itemStyle: { color, borderRadius: asLine ? 0 : [2, 2, 0, 0] },
      barMaxWidth: `${(BAR_WIDTH[o.barWidth ?? "normal"] ?? 0.8) * 100}%`,
      symbol: "circle",
      symbolSize: CHART_STYLE.symbolSize,
      showSymbol: showSym,
      smooth: o.lineShape === "curved" ? 0.35 : false,
      step: o.lineShape === "stepped" ? ("end" as const) : undefined,
      lineStyle: asLine ? { width: LINE_WIDTH[o.lineSize ?? "M"] ?? 2, color, type: o.lineDash ?? "solid" } : undefined,
      areaStyle: asArea ? { color, opacity: areaOpacity } : undefined,
      emphasis: {
        focus: "series" as const,
        itemStyle: asLine ? undefined : { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.18)", shadowOffsetY: 1 },
      },
      // Stacked segments label inside; otherwise above the mark.
      label: dataLabel(settings, normalized, stacked ? "inside" : "top", o),
      markLine: i === 0 ? goalMarkLine(settings) : undefined,
    } as SeriesOption;
  });

  // "Afficher les totaux d'empilement": an invisible bar carrying the stack sum
  // so ECharts can place one label above each stacked column.
  if (stacked && settings.showStackTotals && !normalized) {
    series.push({
      name: "Total",
      type: "bar",
      stack: "stack",
      data: rowTotals.map((_t, ci) => (isDate ? ([frame.timestamps![ci], 0] as [number, number]) : 0)),
      itemStyle: { color: "transparent" },
      emphasis: { itemStyle: { color: "transparent" } },
      silent: true,
      tooltip: { show: false },
      label: {
        show: true,
        position: "top",
        color: MB_COLORS.textSecondary,
        fontFamily: FONT_FAMILY,
        fontSize: 11,
        fontWeight: 700,
        formatter: (p: { dataIndex: number }) => labelNum(settings, rowTotals[p.dataIndex]),
      },
    } as SeriesOption);
  }

  // Trend lines (linear regression), global or per-series (Metabase show_trendline).
  if (!normalized) {
    const xs = isDate ? frame.timestamps! : frame.categories.map((_, i) => i);
    frame.series.forEach((s, i) => {
      const wantTrend = settings.showTrendline || settings.series[s.key]?.trendline;
      if (!wantTrend) return;
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
        yAxisIndex: settings.series[s.key]?.axis === "right" ? 1 : 0,
        data,
        symbol: "none",
        lineStyle: { color, width: 1.5, type: "dashed" },
        z: 5,
        silent: true,
        tooltip: { show: false },
      } as SeriesOption);
    });
  }

  const leftAxis = valueAxis(settings, frame.series.length === 1 ? frame.series[0].name : undefined, normalized);
  const yAxis = anyRight ? [leftAxis, { ...valueAxis(settings, undefined, normalized), position: "right" as const }] : leftAxis;

  return {
    grid: { ...baseGrid(), top: frame.series.length >= 2 && settings.showLegend ? 36 : 24 },
    tooltip: tooltipCfg(),
    legend: legendCfg(frame, settings),
    xAxis: isDate ? timeAxis(frame.timestamps!, settings, frame.dimension.display_name) : categoryAxis(frame.categories, settings, frame.dimension.display_name),
    yAxis,
    series,
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

function buildRow(frame: Frame, settings: VizSettings): EChartsOption {
  const stacked = settings.stacking !== "none";
  const series: SeriesOption[] = frame.series.map((s, i) => {
    const o = settings.series[s.key] ?? {};
    return {
      name: o.name ?? s.name,
      type: "bar",
      xAxisIndex: 0,
      data: s.values as (number | null)[],
      stack: stacked ? "stack" : undefined,
      itemStyle: { color: colorFor(settings, s.key, i), borderRadius: [0, 2, 2, 0] },
      barMaxWidth: `${CHART_STYLE.series.barWidth * 100}%`,
      emphasis: { focus: "series" as const, itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.18)" } },
      label: dataLabel(settings, false, stacked ? "inside" : "right", o),
    } as SeriesOption;
  });
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
  const bubble = settings.bubbleField ? dataset.cols.find((c) => c.name === settings.bubbleField) : undefined;

  // Bubble size scaled from the chosen metric into a 8–40px radius range.
  const bubbleVals = bubble ? dataset.rows.map((r) => Number(r[bubble.index])).filter((v) => !isNaN(v)) : [];
  const bMin = bubbleVals.length ? Math.min(...bubbleVals) : 0;
  const bMax = bubbleVals.length ? Math.max(...bubbleVals) : 1;
  const sizeFor = (v: number) => (bMax === bMin ? 16 : 8 + ((v - bMin) / (bMax - bMin)) * 32);

  const data = dataset.rows.map((r) => {
    const point: (number | null)[] = [Number(r[xMetric.index]), Number(r[yMetric.index])];
    if (bubble) point.push(Number(r[bubble.index]));
    return point;
  });

  return {
    grid: baseGrid(),
    tooltip: { ...tooltipCfg(), trigger: "item" },
    xAxis: { ...valueAxis(settings, xMetric?.display_name), type: "value" },
    yAxis: valueAxis(settings, yMetric?.display_name),
    series: [
      {
        type: "scatter",
        symbolSize: bubble ? ((val: number[]) => sizeFor(val[2])) : 10,
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

  // "Afficher la colonne de total": a final bar with the cumulative total.
  const categories = [...frame.categories];
  if (settings.showTotalColumn) {
    categories.push("Total");
    bases.push(0);
    positives.push(running >= 0 ? running : "-");
    negatives.push(running < 0 ? -running : "-");
  }

  const series: SeriesOption[] = [
    { type: "bar", stack: "wf", itemStyle: { color: "transparent" }, emphasis: { itemStyle: { color: "transparent" } }, data: bases, silent: true },
    { type: "bar", stack: "wf", name: "Augmentation", itemStyle: { color: settings.increaseColor, borderRadius: [2, 2, 0, 0] }, data: positives, label: dataLabel(settings, false) },
    { type: "bar", stack: "wf", name: "Diminution", itemStyle: { color: settings.decreaseColor, borderRadius: [2, 2, 0, 0] }, data: negatives, label: dataLabel(settings, false) },
  ];

  return {
    grid: baseGrid(),
    tooltip: tooltipCfg(),
    xAxis: categoryAxis(categories, settings, frame.dimension.display_name),
    yAxis: valueAxis(settings),
    series,
    textStyle: { fontFamily: FONT_FAMILY },
  };
}
