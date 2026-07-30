// The treemap, transferred from Metabase's own implementation
// (frontend/src/metabase/visualizations/echarts/graph/treemap): its style
// constants, its colour model, and — crucially — its two-pass labelling, where
// the chart is laid out first and each tile's label is then chosen from the
// space it actually got. That is what keeps a dense treemap readable instead of
// covering it in truncated text.

import type { EChartsOption } from "echarts";
import type * as echarts from "echarts";
import type { Dataset } from "../../data/types";
import type { VizSettings } from "../settings";
import { findColumn, resolveShape } from "../settings";
import { formatNumber } from "../format";
import { FONT_FAMILY, MB_COLORS, seriesColor } from "./constants";

// --- style.ts -------------------------------------------------------------
const GROUP_HEADER = { fontWeight: 700, fontSize: 12, height: 32, paddingX: 12, percentFontWeight: 400, valuePercentGap: 8 };
const LEAF_BLOCK = {
  name: { fontSize: 12, fontWeight: 700, height: 16 },
  value: { fontSize: 20, fontWeight: 700, height: 24 },
  percent: { fontSize: 12, fontWeight: 400, height: 16 },
  valueGap: 16,
  percentGap: 8,
};
const LABEL_PADDING = 12;
const GROUP_HEADER_BG_TINT = 0.4;
/** Tiles smaller than 25×25 get neither label nor children. */
const MIN_TILE_SIZE = 25 * 25;
const LEAF_LIGHTNESS_MIN = 0.3;
const LEAF_LIGHTNESS_MAX = 0.5;

// --- labels.ts ------------------------------------------------------------
const MIN_LABEL_TILE_WIDTH = 100;
const MIN_LABEL_TILE_HEIGHT = 40;
const MIN_FULL_LABEL_TILE_HEIGHT = 100;
const PARENT_MIN_HEADER_VISIBLE_CHARS = 3;
const PARENT_HEADER_VALUE_PERCENT_GAP = 8;

/** How much of a tile's label fits: everything, the name only, or nothing. */
type LabelDetail = "full" | "labelOnly" | "none";

// ------------------------------------------------------------- colours ----

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((c(r) << 16) | (c(g) << 8) | c(b)).toString(16).padStart(6, "0")}`;
}

/** The group header background: the group colour mixed towards white. */
function mixWithWhite(hex: string, keep: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex(rgb.map((c) => c * keep + 255 * (1 - keep)) as [number, number, number]);
}

/** Set a colour's HSL lightness, as Metabase does for the leaves of a group. */
function withLightness(hex: string, lightness: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const q = lightness < 0.5 ? lightness * (1 + s) : lightness + s - lightness * s;
  const p = 2 * lightness - q;
  const channel = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return toHex([channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255]);
}

/** White on dark tiles, Metabase's ink on light ones. */
function textColorFor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#fff";
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? MB_COLORS.textPrimary : "#fff";
}

// ECharts' rich-text template treats {, } and | as syntax.
const sanitizeRich = (text: string) => text.replace(/[{}|]/g, "");

// --------------------------------------------------------- measurement ----

let measureCtx: CanvasRenderingContext2D | null = null;
function measureText(text: string, size: number, weight: number): number {
  if (typeof document === "undefined") return text.length * size * 0.6;
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * size * 0.6;
  measureCtx.font = `${weight} ${size}px ${FONT_FAMILY}`;
  return measureCtx.measureText(text).width;
}

/** Shorten to fit a pixel width, as ECharts' own truncation is unreliable. */
function truncateToWidth(text: string, width: number, size: number, weight: number): string {
  if (width <= 0) return "";
  if (measureText(text, size, weight) <= width) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measureText(`${text.slice(0, mid)}…`, size, weight) <= width) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? `${text.slice(0, lo)}…` : "";
}

/** One node as the chart actually laid it out. */
interface LayoutNode {
  id: string;
  width: number;
  height: number;
  isLeaf: boolean;
}

/** The laid-out tiles, read off the ECharts instance after it has rendered. */
function getLayoutNodes(chart: echarts.ECharts): LayoutNode[] {
  // getModel() is private in ECharts' public types, but the laid-out tree with
  // per-node pixel rectangles only exists there.
  const model = (chart as any).getModel?.();
  const root = model?.getSeriesByIndex?.(0)?.getRawData?.()?.tree?.root;
  if (!root) return [];
  const nodes: LayoutNode[] = [];
  root.eachNode((node: any) => {
    const layout = node.getLayout?.();
    if (!layout?.width || !layout?.height) return;
    nodes.push({
      id: node.getId(),
      width: layout.width,
      height: layout.height,
      isLeaf: node.children == null || node.children.length === 0,
    });
  });
  return nodes;
}

// -------------------------------------------------------------- builder ----

/** Everything a node needs to have its label rebuilt after measurement. */
interface NodePayload {
  name: string;
  valueLabel: string;
  percentLabel: string;
  color: string;
}

function richLeaf(color: string) {
  return {
    name: { color, fontFamily: FONT_FAMILY, fontSize: LEAF_BLOCK.name.fontSize, fontWeight: LEAF_BLOCK.name.fontWeight, height: LEAF_BLOCK.name.height, verticalAlign: "middle" as const },
    value: { color, fontFamily: FONT_FAMILY, fontSize: LEAF_BLOCK.value.fontSize, fontWeight: LEAF_BLOCK.value.fontWeight, height: LEAF_BLOCK.value.height, padding: [LEAF_BLOCK.valueGap, 0, 0, 0], verticalAlign: "middle" as const },
    pct: { color, fontFamily: FONT_FAMILY, fontSize: LEAF_BLOCK.percent.fontSize, fontWeight: LEAF_BLOCK.percent.fontWeight, height: LEAF_BLOCK.percent.height, lineHeight: LEAF_BLOCK.percent.height, padding: [LEAF_BLOCK.percentGap, 0, 0, 0], verticalAlign: "middle" as const },
  };
}

function richHeader(nameColumnWidth: number) {
  return {
    name: { fontFamily: FONT_FAMILY, color: MB_COLORS.textPrimary, fontSize: GROUP_HEADER.fontSize, fontWeight: GROUP_HEADER.fontWeight, width: nameColumnWidth, overflow: "truncate" as const, align: "left" as const },
    value: { fontFamily: FONT_FAMILY, color: MB_COLORS.textPrimary, fontSize: GROUP_HEADER.fontSize, fontWeight: GROUP_HEADER.fontWeight, padding: [0, 0, 0, PARENT_HEADER_VALUE_PERCENT_GAP] },
    pct: { fontFamily: FONT_FAMILY, color: MB_COLORS.textSecondary, fontSize: GROUP_HEADER.fontSize, fontWeight: GROUP_HEADER.percentFontWeight, padding: [0, 0, 0, GROUP_HEADER.valuePercentGap] },
  };
}

export function buildTreemapOption(dataset: Dataset, settings: VizSettings): EChartsOption {
  const { dimension, metrics } = resolveShape(dataset, settings);
  const metric = metrics[0];
  // "Grouping" is the dimension, "Sub-grouping" the optional second level.
  const subgroup = findColumn(dataset, settings.breakout);
  if (!dimension || !metric) return {};

  const hidden = new Set(settings.hiddenValues ?? []);
  type Node = { name: string; value: number; children?: Node[] };
  const roots = new Map<string, Node>();
  for (const r of dataset.rows) {
    const top = String(r[dimension.index] ?? "");
    const v = Number(r[metric.index]) || 0;
    if (!roots.has(top)) roots.set(top, { name: top, value: 0, children: subgroup ? [] : undefined });
    const node = roots.get(top)!;
    node.value += v;
    if (subgroup) {
      const leaf = String(r[subgroup.index] ?? "");
      const found = node.children!.find((c) => c.name === leaf);
      if (found) found.value += v;
      else node.children!.push({ name: leaf, value: v });
    }
  }

  // Groups are ordered by size and coloured over the whole list, so hiding one
  // leaves the others' colours untouched.
  const visible = [...roots.values()]
    .sort((a, b) => b.value - a.value)
    .map((n, i) => ({ node: n, color: settings.colors[n.name] ?? seriesColor(i) }))
    .filter(({ node }) => !hidden.has(node.name));

  const total = visible.reduce((s, { node }) => s + node.value, 0);
  const fmt = (v: number) => formatNumber(v, settings.numberFormat);
  const pctOfTotal = (v: number) => (total ? `${((v / total) * 100).toFixed(2)}%` : "");
  const showPercent = settings.treemapShowPercent;

  const data = visible.map(({ node: n, color }, rootIndex) => {
    const tint = mixWithWhite(color, GROUP_HEADER_BG_TINT);
    const displayName = settings.series[n.name]?.name ?? n.name;
    const payload = (name: string, value: number, fill: string): NodePayload => ({
      name,
      valueLabel: settings.treemapShowLeafValues || !subgroup ? fmt(value) : "",
      percentLabel: showPercent ? pctOfTotal(value) : "",
      color: fill,
    });

    // Labels start hidden and are switched on by the measurement pass, so text
    // never appears in a tile that cannot hold it.
    const leafOf = (id: string, name: string, value: number, fill: string) => ({
      id,
      name,
      value,
      itemStyle: { color: fill },
      label: { show: false },
      mbPayload: payload(name, value, fill),
    });

    if (!n.children || n.children.length === 0) {
      return leafOf(String(rootIndex), displayName, n.value, color);
    }

    // Leaves are the group's colour re-lightened between 30% and 50% by size.
    const values = n.children.map((c) => c.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const children = n.children
      .sort((a, b) => b.value - a.value)
      .map((c, leafIndex) => {
        const norm = max === min ? 0.5 : (c.value - min) / (max - min);
        const fill = withLightness(color, LEAF_LIGHTNESS_MIN + norm * (LEAF_LIGHTNESS_MAX - LEAF_LIGHTNESS_MIN));
        return leafOf(`${rootIndex}-${leafIndex}`, c.name, c.value, fill);
      });

    return {
      id: String(rootIndex),
      name: displayName,
      value: n.value,
      itemStyle: { color, borderColor: tint },
      // Until measured, the header shows the tinted bar and the plain name.
      upperLabel: { backgroundColor: tint },
      mbPayload: {
        name: displayName,
        valueLabel: settings.treemapShowParentValues ? fmt(n.value) : "",
        percentLabel: showPercent ? pctOfTotal(n.value) : "",
        color: tint,
      } satisfies NodePayload,
      children,
    };
  });

  return {
    // Metabase heads the chart with the grand total of what is displayed.
    title: {
      left: 2,
      top: 0,
      text: `{l|Total}  {v|${fmt(total)}}`,
      textStyle: {
        rich: {
          l: { fontSize: 12, color: MB_COLORS.textTertiary, fontFamily: FONT_FAMILY },
          v: { fontSize: 14, fontWeight: 700, color: MB_COLORS.textPrimary, fontFamily: FONT_FAMILY },
        },
      },
    },
    tooltip: {
      backgroundColor: MB_COLORS.white,
      borderColor: MB_COLORS.border,
      textStyle: { color: MB_COLORS.textPrimary, fontFamily: FONT_FAMILY, fontSize: 12 },
      formatter: (p: any) => `${p.name}: ${fmt(p.value)}${showPercent ? ` (${pctOfTotal(p.value)})` : ""}`,
    },
    series: [
      {
        type: "treemap",
        top: 28,
        left: 0,
        right: 0,
        bottom: 0,
        roam: false,
        // Zooming into a group is driven from ChartCanvas so it can also show
        // the way back.
        nodeClick: false,
        breadcrumb: { show: false },
        emphasis: { disabled: true },
        leafDepth: 2,
        visibleMin: MIN_TILE_SIZE,
        childrenVisibleMin: MIN_TILE_SIZE,
        label: {
          show: false,
          position: [LABEL_PADDING, LABEL_PADDING],
          fontFamily: FONT_FAMILY,
          fontSize: LEAF_BLOCK.name.fontSize,
          fontWeight: LEAF_BLOCK.name.fontWeight,
          overflow: "truncate",
          lineOverflow: "truncate",
        },
        upperLabel: { show: false },
        levels: [
          { itemStyle: { borderWidth: 0, gapWidth: 2, borderColor: "transparent" }, upperLabel: { show: false } },
          {
            itemStyle: { borderWidth: 0, gapWidth: 1 },
            label: { show: false },
            upperLabel: {
              show: !!subgroup && settings.treemapShowParentLabels,
              color: MB_COLORS.textPrimary,
              height: GROUP_HEADER.height,
              lineHeight: GROUP_HEADER.height,
              fontFamily: FONT_FAMILY,
              fontSize: GROUP_HEADER.fontSize,
              fontWeight: GROUP_HEADER.fontWeight,
              padding: [0, GROUP_HEADER.paddingX],
              overflow: "truncate",
            },
          },
        ],
        data,
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

/**
 * Zoom into one group: its children become the tiles, their share is restated
 * against the group, and the breadcrumb replaces the total. Rebuilding the
 * option beats ECharts' `treemapRootToNode`, which the relabelling pass would
 * immediately undo.
 */
export function drillTreemapOption(option: EChartsOption, groupId: string): EChartsOption | null {
  const series: any = (option as any).series?.[0];
  const group = series?.data?.find((n: any) => n.id === groupId);
  if (!group?.children?.length) return null;
  const parentValue = Number(group.value) || 0;

  const children = group.children.map((c: any, i: number) => ({
    ...c,
    id: String(i),
    label: { show: false },
    mbPayload: {
      ...c.mbPayload,
      percentLabel: c.mbPayload?.percentLabel && parentValue
        ? `${((Number(c.value) / parentValue) * 100).toFixed(2)}%`
        : c.mbPayload?.percentLabel,
    },
  }));

  return {
    ...option,
    title: { show: false },
    series: [{ ...series, data: children }], // top stays clear for the breadcrumb
  } as EChartsOption;
}

// ------------------------------------------------------- labelling pass ----

/**
 * Decide each tile's label from the space it was actually given, then apply it.
 * Returns a signature of the decisions so the caller can skip re-rendering when
 * nothing changed — without that guard, re-rendering would loop forever.
 */
export function applyTreemapLabels(chart: echarts.ECharts, option: EChartsOption): string | null {
  const nodes = getLayoutNodes(chart);
  if (nodes.length === 0) return null;
  const layout = new Map(nodes.map((n) => [n.id, n]));

  const series: any = (option as any).series?.[0];
  const data: any[] = series?.data ?? [];
  if (data.length === 0) return null;

  const parts: string[] = [];

  const decorateLeaf = (node: any) => {
    const p: NodePayload | undefined = node.mbPayload;
    const rect = layout.get(node.id);
    if (!p || !rect) {
      node.label = { show: false };
      return;
    }
    const innerWidth = Math.max(0, rect.width - LABEL_PADDING * 2);
    const fitsLabel = rect.width >= MIN_LABEL_TILE_WIDTH && rect.height >= MIN_LABEL_TILE_HEIGHT;
    const valueWidth = p.valueLabel
      ? measureText(p.valueLabel, LEAF_BLOCK.value.fontSize, LEAF_BLOCK.value.fontWeight)
      : 0;
    const fitsFull = fitsLabel && rect.height >= MIN_FULL_LABEL_TILE_HEIGHT && innerWidth >= valueWidth;
    const detail: LabelDetail = fitsFull ? "full" : fitsLabel ? "labelOnly" : "none";
    parts.push(`${node.id}:${detail}:${Math.round(innerWidth)}`);

    if (detail === "none") {
      node.label = { show: false };
      return;
    }
    const color = textColorFor(p.color);
    const name = truncateToWidth(p.name, innerWidth, LEAF_BLOCK.name.fontSize, LEAF_BLOCK.name.fontWeight);
    const text =
      detail === "full"
        ? [`{name|${sanitizeRich(name)}}`, p.valueLabel && `{value|${sanitizeRich(p.valueLabel)}}`, p.percentLabel && `{pct|${sanitizeRich(p.percentLabel)}}`]
            .filter(Boolean)
            .join("\n")
        : `{name|${sanitizeRich(name)}}`;
    node.label = {
      show: true,
      width: innerWidth,
      // "truncate", not "break": breaking re-wraps the text and swallows the
      // newlines between the name, the value and the percentage.
      overflow: "truncate",
      color,
      rich: richLeaf(color),
      formatter: text,
    };
  };

  for (const node of data) {
    if (!node.children) {
      decorateLeaf(node);
      continue;
    }
    node.children.forEach(decorateLeaf);

    // Group header: the name gets a fixed column so the value and its share sit
    // flush right, and it is dropped entirely when even three characters of the
    // name would not fit.
    const p: NodePayload | undefined = node.mbPayload;
    const rect = layout.get(node.id);
    if (!p || !rect) continue;
    const available = rect.width - GROUP_HEADER.paddingX * 2;
    const measureHeader = (t: string, w: number) => measureText(t, GROUP_HEADER.fontSize, w);
    const showText = measureHeader(p.name.slice(0, PARENT_MIN_HEADER_VISIBLE_CHARS), GROUP_HEADER.fontWeight) <= available;
    const cluster = p.valueLabel
      ? measureHeader(p.valueLabel, GROUP_HEADER.fontWeight) + GROUP_HEADER.valuePercentGap + measureHeader(p.percentLabel, GROUP_HEADER.percentFontWeight)
      : Infinity;
    const fullName = measureHeader(p.name, GROUP_HEADER.fontWeight);
    const showValuePercent = showText && fullName + PARENT_HEADER_VALUE_PERCENT_GAP + cluster <= available;
    parts.push(`${node.id}:${showText ? (showValuePercent ? "hdr-full" : "hdr-name") : "hdr-none"}:${Math.round(available)}`);

    if (showValuePercent) {
      const nameColumnWidth = available - PARENT_HEADER_VALUE_PERCENT_GAP - cluster;
      node.upperLabel = {
        backgroundColor: p.color,
        rich: richHeader(nameColumnWidth),
        formatter: `{name|${sanitizeRich(p.name)}}{value|${sanitizeRich(p.valueLabel)}}{pct|${sanitizeRich(p.percentLabel)}}`,
      };
    } else {
      node.upperLabel = { backgroundColor: p.color, color: showText ? undefined : "transparent", formatter: sanitizeRich(p.name) };
    }
  }

  return parts.join("|");
}
