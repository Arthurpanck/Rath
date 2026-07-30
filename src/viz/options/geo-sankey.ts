import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import type { Dataset } from "../../data/types";
import { getDimensions, getMetrics } from "../../data/types";
import type { Aggregation, MapRegion, VizSettings } from "../settings";
import { findColumn } from "../settings";
import { nf2 } from "../format";
import { ACCENT_COLORS, FONT_FAMILY, MB_COLORS, seriesColor } from "./constants";

const nf = (v: number) => nf2(v);

function reduceWith(vals: number[], agg: Aggregation): number {
  if (agg === "count") return vals.length;
  if (agg === "distinct") return new Set(vals).size;
  if (vals.length === 0) return 0;
  if (agg === "mean") return vals.reduce((s, v) => s + v, 0) / vals.length;
  if (agg === "min") return Math.min(...vals);
  if (agg === "max") return Math.max(...vals);
  return vals.reduce((s, v) => s + v, 0);
}

// ---------------------------------------------------------------- Sankey ----

export function buildSankeyOption(dataset: Dataset, settings: VizSettings): EChartsOption {
  // Nothing is guessed here: a Sankey built from arbitrary columns of a large
  // table produces thousands of nodes, which is both unreadable and slow. The
  // user picks source, destination and measure explicitly.
  const source = findColumn(dataset, settings.sourceField);
  const target = findColumn(dataset, settings.targetField);
  const metric = findColumn(dataset, settings.metrics?.[0]);

  if (!source || !target) {
    return emptyMessage("Choisissez une source et une destination dans les paramètres du graphique.");
  }
  if (source.index === target.index) {
    return emptyMessage("La source et la destination doivent être deux colonnes distinctes.");
  }

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

  // Guard against a combination that would freeze the browser.
  const MAX_NODES = 150;
  const MAX_LINKS = 600;
  if (nodeSet.size > MAX_NODES || linkMap.size > MAX_LINKS) {
    return emptyMessage(
      `Trop de valeurs distinctes pour un Sankey (${nodeSet.size} n\u0153uds, ${linkMap.size} liens). Filtrez ou résumez les données, ou choisissez des colonnes moins variées.`,
    );
  }

  const nodes = [...nodeSet].map((name, i) => ({ name, itemStyle: { color: seriesColor(i) } }));
  const links = [...linkMap.values()].map((l) => ({ source: l.s, target: l.t, value: l.v }));

  return {
    tooltip: {
      trigger: "item",
      backgroundColor: MB_COLORS.white,
      borderColor: MB_COLORS.border,
      textStyle: { color: MB_COLORS.textPrimary, fontFamily: FONT_FAMILY, fontSize: 12 },
      formatter: (p: any) =>
        p.dataType === "edge"
          ? `${p.data.source.replace("▸ ", "")} → ${p.data.target.replace(" ◂", "")}: ${nf(p.data.value)}`
          : String(p.name).replace(/▸ | ◂/g, ""),
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

/** The Grand Lyon WFS layers bundled with the app (see src/data/geo). */
export const MAP_REGIONS: { value: MapRegion; label: string; nameProp: string; codeProps: string[] }[] = [
  { value: "communes", label: "Communes de la Métropole de Lyon", nameProp: "nom", codeProps: ["insee", "trigramme"] },
  { value: "communes-arr", label: "Communes + arrondissements de Lyon", nameProp: "nom", codeProps: ["insee", "trigramme"] },
  { value: "directions", label: "Directions territoriales", nameProp: "nom", codeProps: [] },
  { value: "ctm", label: "Conférences territoriales (CTM)", nameProp: "nom", codeProps: ["code"] },
];

type GeoJson = { features: { properties: Record<string, unknown> }[] };
const loaded = new Map<MapRegion, GeoJson>();

/** Lazily import + register a layer with ECharts; returns null until ready. */
async function loadRegion(region: MapRegion): Promise<GeoJson> {
  const cached = loaded.get(region);
  if (cached) return cached;
  const mod =
    region === "communes"
      ? await import("../../data/geo/communes.json")
      : region === "communes-arr"
        ? await import("../../data/geo/communes-arrondissements.json")
        : region === "directions"
          ? await import("../../data/geo/directions.json")
          : await import("../../data/geo/ctm.json");
  const geo = (mod as { default: GeoJson }).default;
  echarts.registerMap(region, geo as never);
  loaded.set(region, geo);
  return geo;
}

/** Kick off loading so the chart can be rebuilt once the layer is available. */
export function ensureRegion(region: MapRegion, onReady: () => void): boolean {
  if (loaded.has(region)) return true;
  loadRegion(region).then(onReady).catch(() => undefined);
  return false;
}

export function buildMapOption(dataset: Dataset, settings: VizSettings): EChartsOption {
  const region = settings.mapRegion;
  const geo = loaded.get(region);
  if (!geo) return emptyMessage("Chargement du fond de carte…");

  const cfg = MAP_REGIONS.find((r) => r.value === region)!;
  const dims = getDimensions(dataset);
  const location = findColumn(dataset, settings.locationField) ?? dims[0];
  const metric = findColumn(dataset, settings.metrics?.[0]) ?? getMetrics(dataset)[0];

  if (!location) {
    return emptyMessage("La carte nécessite une colonne de localisation (nom de commune, code INSEE…).");
  }

  // Build a lookup from every known identifier (name, INSEE, code…) to the
  // layer's canonical feature name, so users can join on whichever they have.
  const toName = new Map<string, string>();
  for (const f of geo.features) {
    const name = String(f.properties[cfg.nameProp] ?? "");
    if (!name) continue;
    toName.set(norm(name), name);
    for (const p of cfg.codeProps) {
      const v = f.properties[p];
      if (v != null) toName.set(norm(String(v)), name);
    }
  }

  const buckets = new Map<string, number[]>();
  for (const r of dataset.rows) {
    const raw = String(r[location.index] ?? "");
    const name = toName.get(norm(raw)) ?? raw;
    const v = metric ? Number(r[metric.index]) : 1;
    if (!buckets.has(name)) buckets.set(name, []);
    buckets.get(name)!.push(isNaN(v) ? 0 : v);
  }
  const data = [...buckets.entries()].map(([name, vals]) => ({ name, value: reduceWith(vals, settings.aggregation) }));
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
        map: region,
        nameProperty: cfg.nameProp,
        roam: true,
        emphasis: { label: { show: true, fontFamily: FONT_FAMILY, fontSize: 11 }, itemStyle: { areaColor: ACCENT_COLORS[4] } },
        itemStyle: { areaColor: MB_COLORS.bgLight, borderColor: MB_COLORS.border },
        data,
      },
    ],
    textStyle: { fontFamily: FONT_FAMILY },
  };
}

/** Loose matching: case/accent/punctuation-insensitive. */
function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
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
