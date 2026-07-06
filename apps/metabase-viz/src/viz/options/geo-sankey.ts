import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import type { Column, Dataset } from "../../data/types";
import { getDimensions, getMetrics } from "../../data/types";
import type { VizSettings } from "../settings";
import { findColumn } from "../settings";
import worldJson from "../../data/world.json";
import { ACCENT_COLORS, FONT_FAMILY, MB_COLORS, seriesColor } from "./constants";

const nf = (v: number) => Intl.NumberFormat("fr-FR").format(v);

function twoDimensions(dataset: Dataset): [Column | undefined, Column | undefined] {
  const dims = getDimensions(dataset);
  return [dims[0], dims[1] ?? dims[0]];
}

// ---------------------------------------------------------------- Sankey ----

export function buildSankeyOption(dataset: Dataset, settings: VizSettings): EChartsOption {
  const [autoSrc, autoTgt] = twoDimensions(dataset);
  const source = findColumn(dataset, settings.sourceField) ?? autoSrc;
  const target = findColumn(dataset, settings.targetField) ?? (settings.breakout ? findColumn(dataset, settings.breakout) : undefined) ?? autoTgt;
  const metric = findColumn(dataset, settings.metrics?.[0]) ?? getMetrics(dataset)[0];

  if (!source || !target || source.index === target.index) {
    return emptyMessage("Le Sankey nécessite deux colonnes de catégories distinctes (source et cible).");
  }

  // Aggregate flows by (source → target).
  const linkMap = new Map<string, { s: string; t: string; v: number }>();
  const nodeSet = new Set<string>();
  for (const r of dataset.rows) {
    const s = String(r[source.index]);
    const t = String(r[target.index]);
    const v = metric ? Number(r[metric.index]) || 0 : 1;
    // Prefix to avoid node-name collisions between source & target levels.
    const sk = `▸ ${s}`;
    const tk = `${t} ◂`;
    nodeSet.add(sk);
    nodeSet.add(tk);
    const key = `${sk}__${tk}`;
    const ex = linkMap.get(key);
    if (ex) ex.v += v;
    else linkMap.set(key, { s: sk, t: tk, v });
  }

  const nodes = [...nodeSet].map((name, i) => ({ name, itemStyle: { color: seriesColor(i) } }));
  const links = [...linkMap.values()].map((l) => ({ source: l.s, target: l.t, value: l.v }));

  return {
    tooltip: {
      trigger: "item",
      backgroundColor: MB_COLORS.white,
      borderColor: MB_COLORS.border,
      textStyle: { color: MB_COLORS.textPrimary, fontFamily: FONT_FAMILY, fontSize: 12 },
      formatter: (p: any) => (p.dataType === "edge" ? `${p.data.source.replace("▸ ", "")} → ${p.data.target.replace(" ◂", "")}: ${nf(p.data.value)}` : p.name.replace(/▸ | ◂/g, "")),
    },
    series: [
      {
        type: "sankey",
        left: 16,
        right: 120,
        top: 16,
        bottom: 16,
        emphasis: { focus: "adjacency" },
        nodeGap: 10,
        nodeWidth: 14,
        label: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 12, formatter: (p: any) => String(p.name).replace(/▸ | ◂/g, "") },
        lineStyle: { color: "gradient", opacity: 0.35, curveness: 0.5 },
        data: nodes,
        links,
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

// ------------------------------------------------------------------- Map ----

let mapRegistered = false;
function ensureWorld() {
  if (!mapRegistered) {
    echarts.registerMap("world", worldJson as any);
    mapRegistered = true;
  }
}

// Build an ISO-A2 → country NAME lookup from the bundled GeoJSON.
const ISO_TO_NAME: Record<string, string> = {};
for (const f of (worldJson as any).features) {
  const iso = f.properties?.ISO_A2;
  const name = f.properties?.NAME;
  if (iso && name) ISO_TO_NAME[String(iso).toUpperCase()] = name;
}

function toCountryName(value: unknown): string {
  const s = String(value ?? "").trim();
  if (s.length === 2 && ISO_TO_NAME[s.toUpperCase()]) return ISO_TO_NAME[s.toUpperCase()];
  return s;
}

export function buildMapOption(dataset: Dataset, settings: VizSettings): EChartsOption {
  ensureWorld();
  const dims = getDimensions(dataset);
  const location = findColumn(dataset, settings.locationField) ?? dims[0];
  const metric = findColumn(dataset, settings.metrics?.[0]) ?? getMetrics(dataset)[0];

  if (!location) {
    return emptyMessage("La carte nécessite une colonne de localisation (nom de pays ou code ISO à 2 lettres).");
  }

  // Aggregate metric by country.
  const byCountry = new Map<string, number>();
  for (const r of dataset.rows) {
    const name = toCountryName(r[location.index]);
    const v = metric ? Number(r[metric.index]) || 0 : 1;
    byCountry.set(name, (byCountry.get(name) ?? 0) + v);
  }
  const data = [...byCountry.entries()].map(([name, value]) => ({ name, value }));
  const max = Math.max(1, ...data.map((d) => d.value));

  return {
    tooltip: {
      trigger: "item",
      backgroundColor: MB_COLORS.white,
      borderColor: MB_COLORS.border,
      textStyle: { color: MB_COLORS.textPrimary, fontFamily: FONT_FAMILY, fontSize: 12 },
      formatter: (p: any) => `${p.name}: ${p.value != null && !isNaN(p.value) ? nf(p.value) : "—"}`,
    },
    visualMap: {
      left: 16,
      bottom: 16,
      min: 0,
      max,
      calculable: true,
      inRange: { color: ["#E9F3FC", "#A6CDF3", MB_COLORS.brand, "#2F6BA1"] },
      textStyle: { color: MB_COLORS.textSecondary, fontFamily: FONT_FAMILY, fontSize: 11 },
    },
    series: [
      {
        type: "map",
        map: "world",
        nameProperty: "NAME",
        roam: true,
        emphasis: { label: { show: false }, itemStyle: { areaColor: ACCENT_COLORS[4] } },
        itemStyle: { areaColor: MB_COLORS.bgLight, borderColor: MB_COLORS.border },
        data,
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

function emptyMessage(text: string): EChartsOption {
  return {
    graphic: [
      {
        type: "text",
        left: "center",
        top: "middle",
        style: { text, fontSize: 14, fill: MB_COLORS.textTertiary, fontFamily: FONT_FAMILY, width: 360, overflow: "break", lineHeight: 20 },
      },
    ],
  };
}
