import type { EChartsOption } from "echarts";
import type { Dataset } from "../../data/types";
import { NULL_CHAR } from "../../data/types";
import type { VizSettings } from "../settings";
import { aggregateColumn, findColumn, resolveShape } from "../settings";
import { buildFrame } from "../frame";
import { formatNumber, nf2 } from "../format";
import { ACCENT_COLORS, FONT_FAMILY, MB_COLORS, seriesColor } from "./constants";
import { measureText, truncateToWidth } from "./text";

const nf = (v: number) => nf2(v);

// Pie geometry, transferred from Metabase's echarts/pie/constants.ts: radii,
// border width, slice font size and the centre total are all derived from the
// space the chart actually has, instead of being fixed.
const PIE = {
  maxSideLength: 550,
  paddingSide: 12,
  innerRadiusRatio: 3 / 5,
  twoRingInnerRadiusRatio: 2 / 5,
  borderProportion: 360, // a 1° gap between slices
  maxFontSize: 20,
  minFontSize: 14,
  multiRingFontSize: 12,
  total: { valueFontSize: 22, valueFontSizeSm: 17, labelFontSize: 14, fontWeight: 700 },
};

function categoryValuePairs(dataset: Dataset, settings: VizSettings): { name: string; value: number }[] {
  const frame = buildFrame(dataset, settings);
  const first = frame.series[0];
  return frame.categories.map((c, i) => ({
    name: String(c),
    value: Number(first?.values[i]) || 0,
  }));
}

/** The measurements a pie derives from the space it was given. */
export interface PieGeometry {
  /** The square the pie is drawn in, once side padding is taken off. */
  innerSide: number;
  outerRadius: number;
  /** Zero unless the pie is a donut. */
  innerRadius: number;
  sliceBorderWidth: number;
  sliceFontSize: number;
}

/**
 * Pie sizing, transferred from Metabase's getRadiusOption / getBorderWidth and
 * their slice font-size rule: nothing here is a fixed pixel value, every
 * measurement scales with the room the chart actually has.
 *
 * Pure, so the ratios taken from Metabase's pie/constants.ts can be tested
 * without an ECharts instance.
 */
export function pieGeometry(sideLength: number | undefined, numRings: number, donut: boolean): PieGeometry {
  const innerSide = Math.min((sideLength ?? PIE.maxSideLength) - PIE.paddingSide * 2, PIE.maxSideLength);
  const outerRadius = Math.max(innerSide / 2, 1);
  const innerRadius = donut
    ? outerRadius * (numRings === 2 ? PIE.twoRingInnerRadiusRatio : PIE.innerRadiusRatio)
    : 0;
  const sliceBorderWidth = numRings === 1 ? (Math.PI * innerSide) / PIE.borderProportion : 1;
  const sliceFontSize =
    numRings > 1
      ? PIE.multiRingFontSize
      : Math.max(PIE.maxFontSize * (innerSide / PIE.maxSideLength), PIE.minFontSize);
  return { innerSide, outerRadius, innerRadius, sliceBorderWidth, sliceFontSize };
}

export function buildPieOption(dataset: Dataset, settings: VizSettings, sideLength?: number): EChartsOption {
  // "Anneau intérieur", when set, drives the main ring's grouping.
  const effective = settings.innerRing ? { ...settings, dimension: settings.innerRing } : settings;
  const data = categoryValuePairs(dataset, effective);
  const total = data.reduce((s, d) => s + d.value, 0);
  const donut = settings.pieDonut;
  const showCenterTotal = settings.pieShowTotal && donut;
  const percentOnChart = settings.pieShowPercent === "chart" || settings.pieShowPercent === "both";
  const percentInLegend = settings.pieShowPercent === "legend" || settings.pieShowPercent === "both";
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);

  const numRings = settings.outerRing ? 2 : 1;
  const { outerRadius, innerRadius, sliceBorderWidth, sliceFontSize } = pieGeometry(
    sideLength,
    numRings,
    donut,
  );

  // The centre total drops to a smaller size, then loses its label, then
  // disappears, as the hole gets too narrow for the text.
  const totalFont = { size: PIE.total.valueFontSize, weight: PIE.total.fontWeight };
  const totalValueText = truncateToWidth(nf(total), innerRadius * 2, totalFont.size, totalFont.weight);
  const totalFits = innerRadius * 2 >= Math.max(
    measureText(totalValueText, totalFont.size, totalFont.weight),
    measureText("TOTAL", totalFont.size, totalFont.weight),
  );
  const totalValueFontSize = totalFits ? PIE.total.valueFontSize : PIE.total.valueFontSizeSm;

  // "Format des valeurs" + "Affichage des étiquettes"
  const valueText = (p: any) => {
    switch (settings.pieValueFormat) {
      case "value":
        return nf(p.value);
      case "both":
        return `${nf(p.value)} (${p.percent}%)`;
      default:
        return `${p.percent}%`;
    }
  };
  const labelsForced = settings.pieLabelDisplay === "on";
  const labelsHidden = settings.pieLabelDisplay === "off";

  const sliceLabel = labelsHidden
    ? { show: false }
    : labelsForced || percentOnChart
    ? {
        show: true,
        position: "outside" as const,
        color: MB_COLORS.textSecondary,
        fontFamily: FONT_FAMILY,
        fontSize: sliceFontSize,
        formatter: (p: any) => (labelsForced ? `${p.name} · ${valueText(p)}` : valueText(p)),
      }
    : showCenterTotal && totalValueText
      ? {
          show: true,
          position: "center" as const,
          formatter: () => (totalFits ? `{v|${totalValueText}}\n{l|TOTAL}` : `{v|${totalValueText}}`),
          rich: {
            v: { fontSize: totalValueFontSize, fontWeight: PIE.total.fontWeight, color: MB_COLORS.textPrimary, fontFamily: FONT_FAMILY },
            l: { fontSize: PIE.total.labelFontSize, fontWeight: PIE.total.fontWeight, color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, padding: [4, 0, 0, 0] },
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
        radius: [innerRadius, outerRadius],
        center: [settings.showLegend ? "38%" : "50%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: MB_COLORS.white, borderWidth: sliceBorderWidth },
        label: sliceLabel,
        labelLine: { show: !labelsHidden && (labelsForced || percentOnChart) },
        emphasis: { label: { show: !labelsHidden } },
        data: data.map((d, i) => ({ ...d, itemStyle: { color: settings.colors[d.name] ?? seriesColor(i) } })),
      },
      // "Anneau extérieur": a second ring breaking each slice down further.
      ...(outerRingSeries(dataset, settings, outerRadius) ?? []),
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

/** Builds the optional outer ring (2nd dimension) as a nested pie series. */
function outerRingSeries(dataset: Dataset, settings: VizSettings, outerRadius: number): any[] | null {
  const outer = findColumn(dataset, settings.outerRing);
  const inner = findColumn(dataset, settings.innerRing) ?? findColumn(dataset, settings.dimension);
  const metric = resolveShape(dataset, settings).metrics[0];
  if (!outer || !inner || !metric || outer.index === inner.index) return null;

  // Aggregate metric per (inner, outer) pair, ordered by inner group.
  const byPair = new Map<string, number>();
  for (const r of dataset.rows) {
    const key = `${String(r[inner.index])}${NULL_CHAR}${String(r[outer.index])}`;
    byPair.set(key, (byPair.get(key) ?? 0) + (Number(r[metric.index]) || 0));
  }
  const innerOrder = [...new Set(dataset.rows.map((r) => String(r[inner.index])))];
  const slices = [...byPair.entries()]
    .map(([key, value]) => {
      const [innerVal, outerVal] = key.split(NULL_CHAR);
      return { innerVal, name: outerVal, value };
    })
    .sort((a, b) => innerOrder.indexOf(a.innerVal) - innerOrder.indexOf(b.innerVal));

  return [
    {
      type: "pie",
      radius: [outerRadius * 1.02, outerRadius * 1.18],
      center: [settings.showLegend ? "38%" : "50%", "50%"],
      label: { show: false },
      labelLine: { show: false },
      itemStyle: { borderColor: MB_COLORS.white, borderWidth: 1 },
      data: slices.map((s, i) => ({ name: s.name, value: s.value, itemStyle: { color: seriesColor(i + 1), opacity: 0.75 } })),
    },
  ];
}

export function buildGaugeOption(dataset: Dataset, settings: VizSettings): EChartsOption {
  const metric = resolveShape(dataset, settings).metrics[0];
  const value = aggregateColumn(dataset, metric, settings.aggregation);
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
  const value = aggregateColumn(dataset, metric, settings.aggregation);
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

export function buildBoxplotOption(dataset: Dataset, settings: VizSettings): EChartsOption {
  const metrics = resolveShape(dataset, settings).metrics;
  const q = (vals: number[], p: number) => {
    if (vals.length === 0) return 0;
    const idx = (vals.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return vals[lo] + (vals[hi] - vals[lo]) * (idx - lo);
  };

  const boxes: number[][] = [];
  const outliers: [number, number][] = [];
  metrics.forEach((m, i) => {
    const vals = dataset.rows.map((r) => Number(r[m.index])).filter((v) => !isNaN(v)).sort((a, b) => a - b);
    const q1 = q(vals, 0.25);
    const q3 = q(vals, 0.75);
    const iqr = q3 - q1;
    // With outliers shown, whiskers stop at 1.5·IQR (Tukey) and the rest are dots.
    const lo = settings.showOutliers ? Math.max(q(vals, 0), q1 - 1.5 * iqr) : q(vals, 0);
    const hi = settings.showOutliers ? Math.min(q(vals, 1), q3 + 1.5 * iqr) : q(vals, 1);
    boxes.push([lo, q1, q(vals, 0.5), q3, hi]);
    if (settings.showOutliers) for (const v of vals) if (v < lo || v > hi) outliers.push([i, v]);
  });

  const isLineStyle = settings.quartileStyle === "line";
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
        // "Style des quartiles": filled box vs. outline only.
        itemStyle: { color: isLineStyle ? "transparent" : ACCENT_COLORS[0] + "33", borderColor: MB_COLORS.brand, borderWidth: 1.5 },
        emphasis: { itemStyle: { borderWidth: 2.5 } },
      },
      ...(outliers.length
        ? [
            {
              type: "scatter" as const,
              name: "Valeurs extrêmes",
              data: outliers,
              symbolSize: 6,
              itemStyle: { color: MB_COLORS.textTertiary, opacity: 0.7 },
            },
          ]
        : []),
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

// ---------------------------------------------------------------- Treemap ----

