import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import type { Dataset } from "../data/types";
import type { VizId } from "../viz/registry";
import type { VizSettings } from "../viz/settings";
import { resolveShape } from "../viz/settings";
import { buildEChartsOption, isEChartsViz } from "../viz/options";
import { ensureRegion } from "../viz/options/geo-sankey";
import { applyTreemapLabels, drillTreemapOption } from "../viz/options/treemap";
import { MB_COLORS } from "../viz/options/constants";

// Charts whose option depends on the container size and must be rebuilt on resize.
const CARTESIAN_VIZ = ["bar", "line", "area", "combo", "row", "scatter", "waterfall", "boxplot"];
import { ScalarView, TrendView } from "./ScalarViews";
import { DataTable } from "./DataTable";
import { PivotTableView } from "./PivotTableView";
import { UnimplementedView } from "./UnimplementedView";

function EChart({
  vizId,
  dataset,
  settings,
  onChartReady,
}: {
  vizId: VizId;
  dataset: Dataset;
  settings: VizSettings;
  onChartReady?: (chart: echarts.ECharts | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Canvas renderer: required for getDataURL("png") to produce a real image.
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    onChartReady?.(chart);
    const ro = new ResizeObserver(() => {
      chart.resize();
      // The pie derives its radii and fonts from the container, so a resize has
      // to rebuild the option, not just re-layout it.
      rebuildRef.current?.();
    });
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      onChartReady?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map layers are lazy-loaded; bump this once a layer is registered so the
  // option is rebuilt with the geo data available.
  const [geoTick, setGeoTick] = useState(0);
  useEffect(() => {
    if (vizId === "map") ensureRegion(settings.mapRegion, () => setGeoTick((t) => t + 1));
  }, [vizId, settings.mapRegion]);

  // The treemap is laid out first and labelled second: once ECharts has placed
  // the tiles we measure them and decide, per tile, how much of the label fits.
  const optionRef = useRef<any>(null);
  const rebuildRef = useRef<(() => void) | null>(null);
  const labelSigRef = useRef<string | null>(null);
  const [drilledGroup, setDrilledGroup] = useState<string | null>(null);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.clear();
    const option = buildEChartsOption(vizId, dataset, settings, { width: chart.getWidth(), height: chart.getHeight() });
    optionRef.current = option;
    labelSigRef.current = null;
    setDrilledGroup(null);
    chart.setOption(option, true);

    rebuildRef.current =
      vizId === "pie" || CARTESIAN_VIZ.includes(vizId)
        ? () => {
            const next = buildEChartsOption(vizId, dataset, settings, { width: chart.getWidth(), height: chart.getHeight() });
            optionRef.current = next;
            chart.setOption(next, true);
          }
        : null;

    if (vizId !== "treemap") return;

    const relabel = () => {
      const sig = applyTreemapLabels(chart, optionRef.current);
      if (sig == null || sig === labelSigRef.current) return;
      labelSigRef.current = sig;
      chart.setOption(optionRef.current);
    };
    const onClick = (params: any) => {
      const node = params?.data;
      if (!node?.children || !node.id) return;
      const drilled = drillTreemapOption(option, node.id);
      if (!drilled) return;
      optionRef.current = drilled;
      labelSigRef.current = null;
      setDrilledGroup(node.name ?? null);
      chart.setOption(drilled, true);
    };
    chart.on("finished", relabel);
    chart.on("click", onClick);
    return () => {
      chart.off("finished", relabel);
      chart.off("click", onClick);
    };
  }, [vizId, dataset, settings, geoTick]);

  const resetDrill = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const option = buildEChartsOption(vizId, dataset, settings, { width: chart.getWidth(), height: chart.getHeight() });
    optionRef.current = option;
    labelSigRef.current = null;
    setDrilledGroup(null);
    chart.setOption(option, true);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={ref} style={{ width: "100%", height: "100%" }} />
      {drilledGroup && (
        <button
          onClick={resetDrill}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            color: MB_COLORS.brand,
            padding: 0,
            zIndex: 2,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Tout
          <span style={{ color: MB_COLORS.textTertiary, fontWeight: 400 }}>/ {drilledGroup}</span>
        </button>
      )}
    </div>
  );
}

export function ChartCanvas({
  vizId,
  dataset,
  settings,
  onChartReady,
}: {
  vizId: VizId;
  dataset: Dataset;
  settings: VizSettings;
  onChartReady?: (chart: echarts.ECharts | null) => void;
}) {
  const wrap = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: MB_COLORS.textPrimary,
  } as const;

  if (vizId === "table") return <div style={wrap}><DataTable dataset={dataset} settings={settings} /></div>;
  if (vizId === "object") return <div style={wrap}><DataTable dataset={dataset} detail settings={settings} /></div>;
  if (vizId === "pivot") return <div style={wrap}><PivotTableView dataset={dataset} settings={settings} /></div>;
  if (vizId === "scalar") {
    const m = resolveShape(dataset, settings).metrics[0];
    return <div style={wrap}><ScalarView dataset={dataset} settings={settings} column={m} /></div>;
  }
  if (vizId === "smartscalar") return <div style={wrap}><TrendView dataset={dataset} settings={settings} /></div>;
  if (!isEChartsViz(vizId)) return <div style={wrap}><UnimplementedView vizId={vizId} /></div>;

  return <EChart vizId={vizId} dataset={dataset} settings={settings} onChartReady={onChartReady} />;
}
