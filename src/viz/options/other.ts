import type { EChartsOption } from "echarts";
import type { Dataset } from "../../data/types";
import type { VizSettings } from "../settings";
import { resolveShape } from "../settings";
import { buildFrame } from "../frame";
import { formatNumber, nf2 } from "../format";
import { ACCENT_COLORS, FONT_FAMILY, MB_COLORS, seriesColor } from "./constants";

const nf = (v: number) => nf2(v);

function categoryValuePairs(dataset: Dataset, settings: VizSettings): { name: string; value: number }[] {
  const frame = buildFrame(dataset, settings);
  const first = frame.series[0];
  return frame.categories.map((c, i) => ({
    name: String(c),
    value: Number(first?.values[i]) || 0,
  }));
}

export function buildPieOption(dataset: Dataset, settings: VizSettings): EChartsOption {
  const data = categoryValuePairs(dataset, settings);
  const total = data.reduce((s, d) => s + d.value, 0);
  const donut = settings.pieDonut;
  const showCenterTotal = settings.pieShowTotal && donut;
  const percentOnChart = settings.pieShowPercent === "chart" || settings.pieShowPercent === "both";
  const percentInLegend = settings.pieShowPercent === "legend" || settings.pieShowPercent === "both";
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);

  const sliceLabel = percentOnChart
    ? {
        show: true,
        position: "outside" as const,
        color: MB_COLORS.textSecondary,
        fontFamily: FONT_FAMILY,
        fontSize: 11,
        formatter: (p: any) => `${p.percent}%`,
      }
    : showCenterTotal
      ? {
          show: true,
          position: "center" as const,
          formatter: () => `{v|${nf(total)}}\n{l|TOTAL}`,
          rich: {
            v: { fontSize: 22, fontWeight: 700, color: MB_COLORS.textPrimary, fontFamily: FONT_FAMILY },
            l: { fontSize: 11, color: MB_COLORS.textTertiary, fontFamily: FONT_FAMILY, padding: [4, 0, 0, 0] },
          },
        }
      : { show: false };

  return {
    tooltip: {
      trigger: "item",
      backgroundColor: MB_COLORS.white,
      borderColor: MB_COLORS.border,
      textStyle: { color: MB_COLORS.textPrimary, fontFamily: FONT_FAMILY, fontSize: 12 },
      formatter: (p: any) => `${p.name}: ${nf(p.value)} (${p.percent}%)`,
      extraCssText: "box-shadow: 0 2px 10px rgba(0,0,0,0.12); border-radius: 6px;",
    },
    legend: settings.showLegend
      ? {
          orient: "vertical",
          right: 8,
          top: "middle",
          icon: "circle",
          itemWidth: 10,
          itemHeight: 10,
          textStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
          formatter: percentInLegend
            ? (name: string) => {
                const d = data.find((x) => x.name === name);
                return d ? `${name}  ${pct(d.value)}%` : name;
              }
            : undefined,
        }
      : { show: false },
    series: [
      {
        type: "pie",
        radius: donut ? ["55%", "78%"] : ["0%", "78%"],
        center: [settings.showLegend ? "38%" : "50%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: MB_COLORS.white, borderWidth: 2 },
        label: sliceLabel,
        labelLine: { show: percentOnChart },
        emphasis: { label: { show: true } },
        data: data.map((d, i) => ({ ...d, itemStyle: { color: seriesColor(i) } })),
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

export function buildGaugeOption(dataset: Dataset, settings: VizSettings): EChartsOption {
  const metric = resolveShape(dataset, settings).metrics[0];
  const value = Number(dataset.rows[0]?.[metric?.index]) || 0;
  const ranges = settings.gaugeRanges && settings.gaugeRanges.length > 0 ? settings.gaugeRanges : null;

  const min = ranges ? ranges[0].min : 0;
  const max = ranges
    ? ranges[ranges.length - 1].max
    : settings.goalValue && settings.goalValue > 0
      ? settings.goalValue
      : Math.max(value * 1.5, 100);

  // Colored segments from ranges, or a single progress arc.
  const axisLineColor: [number, string][] = ranges
    ? ranges.map((r) => [(r.max - min) / (max - min || 1), r.color] as [number, string])
    : [[1, MB_COLORS.border]];
  const fmt = (v: number) => formatNumber(v, settings.numberFormat);

  return {
    series: [
      {
        type: "gauge",
        startAngle: 200,
        endAngle: -20,
        min,
        max,
        progress: { show: !ranges, width: 18, itemStyle: { color: MB_COLORS.brand } },
        axisLine: { lineStyle: { width: 18, color: axisLineColor } },
        axisTick: { show: false },
        splitLine: { length: 10, lineStyle: { color: MB_COLORS.borderStrong } },
        axisLabel: { color: MB_COLORS.textTertiary, fontSize: 10, distance: 14, formatter: (v: number) => fmt(Math.round(v)) },
        pointer: ranges ? { show: true, width: 5, itemStyle: { color: MB_COLORS.textSecondary } } : { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, ranges ? "35%" : "10%"],
          fontSize: 30,
          fontWeight: 700,
          fontFamily: FONT_FAMILY,
          color: MB_COLORS.textPrimary,
          formatter: (v: number) => fmt(v),
        },
        data: [{ value }],
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

export function buildProgressOption(dataset: Dataset, settings: VizSettings): EChartsOption {
  const metric = resolveShape(dataset, settings).metrics[0];
  const value = Number(dataset.rows[0]?.[metric?.index]) || 0;
  const goal = settings.goalValue && settings.goalValue > 0 ? settings.goalValue : value === 0 ? 100 : value * 1.25;
  const pct = Math.min(value / goal, 1);
  const color = settings.colors[metric?.name] ?? MB_COLORS.brand;
  return {
    grid: { left: 24, right: 24, top: "40%", bottom: "40%" },
    xAxis: { type: "value", max: goal, show: false },
    yAxis: { type: "category", data: [""], show: false },
    tooltip: { show: false },
    series: [
      { type: "bar", stack: "p", barWidth: 26, data: [value], itemStyle: { color, borderRadius: [13, 0, 0, 13] as [number, number, number, number] }, silent: true },
      { type: "bar", stack: "p", barWidth: 26, data: [Math.max(goal - value, 0)], itemStyle: { color: MB_COLORS.border, borderRadius: [0, 13, 13, 0] as [number, number, number, number] }, silent: true },
    ],
    graphic: [
      {
        type: "text",
        left: "center",
        top: "20%",
        style: { text: `${formatNumber(value, settings.numberFormat)} / ${formatNumber(goal, settings.numberFormat)}  (${Math.round(pct * 100)}%)`, fontSize: 16, fontWeight: 700, fill: MB_COLORS.textPrimary, fontFamily: FONT_FAMILY },
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

export function buildFunnelOption(dataset: Dataset, settings: VizSettings): EChartsOption {
  const data = categoryValuePairs(dataset, settings).map((d, i) => ({
    name: d.name,
    value: d.value,
    itemStyle: { color: seriesColor(i) },
  }));
  return {
    tooltip: {
      trigger: "item",
      backgroundColor: MB_COLORS.white,
      borderColor: MB_COLORS.border,
      textStyle: { color: MB_COLORS.textPrimary, fontFamily: FONT_FAMILY, fontSize: 12 },
      formatter: (p: any) => `${p.name}: ${nf(p.value)}`,
    },
    legend: settings.showLegend
      ? { bottom: 0, icon: "circle", itemWidth: 10, itemHeight: 10, textStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 } }
      : { show: false },
    series: [
      {
        type: "funnel",
        left: "10%",
        right: "10%",
        top: 20,
        bottom: 40,
        sort: "descending",
        gap: 2,
        label: { show: true, position: "inside", color: "#fff", fontFamily: FONT_FAMILY, formatter: (p: any) => nf(p.value) },
        labelLine: { show: false },
        itemStyle: { borderColor: MB_COLORS.white, borderWidth: 1 },
        data,
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

export function buildBoxplotOption(dataset: Dataset, settings: VizSettings): EChartsOption {
  const metrics = resolveShape(dataset, settings).metrics;
  const boxes = metrics.map((m) => {
    const vals = dataset.rows.map((r) => Number(r[m.index])).filter((v) => !isNaN(v)).sort((a, b) => a - b);
    const q = (p: number) => {
      if (vals.length === 0) return 0;
      const idx = (vals.length - 1) * p;
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      return vals[lo] + (vals[hi] - vals[lo]) * (idx - lo);
    };
    return [q(0), q(0.25), q(0.5), q(0.75), q(1)];
  });
  return {
    grid: { left: 56, right: 24, top: 24, bottom: 44 },
    tooltip: { trigger: "item" },
    xAxis: {
      type: "category",
      data: metrics.map((m) => m.display_name),
      axisLabel: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: MB_COLORS.borderStrong } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12, formatter: nf },
      splitLine: { lineStyle: { color: MB_COLORS.gridLine, type: "dashed" } },
    },
    series: [
      {
        type: "boxplot",
        data: boxes,
        itemStyle: { color: ACCENT_COLORS[0] + "33", borderColor: MB_COLORS.brand, borderWidth: 1.5 },
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}
