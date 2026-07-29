import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { Dataset } from "../data/types";
import type { VizId } from "../viz/registry";
import type { VizSettings } from "../viz/settings";
import { resolveShape } from "../viz/settings";
import { buildEChartsOption, isEChartsViz } from "../viz/options";
import { MB_COLORS } from "../viz/options/constants";
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
    const chart = echarts.init(ref.current, undefined, { renderer: "svg" });
    chartRef.current = chart;
    onChartReady?.(chart);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      onChartReady?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.clear();
    chart.setOption(buildEChartsOption(vizId, dataset, settings), true);
  }, [vizId, dataset, settings]);

  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
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

  if (vizId === "table") return <div style={wrap}><DataTable dataset={dataset} /></div>;
  if (vizId === "object") return <div style={wrap}><DataTable dataset={dataset} detail /></div>;
  if (vizId === "pivot") return <div style={wrap}><PivotTableView dataset={dataset} settings={settings} /></div>;
  if (vizId === "scalar") {
    const m = resolveShape(dataset, settings).metrics[0];
    return <div style={wrap}><ScalarView dataset={dataset} settings={settings} column={m} /></div>;
  }
  if (vizId === "smartscalar") return <div style={wrap}><TrendView dataset={dataset} settings={settings} /></div>;
  if (!isEChartsViz(vizId)) return <div style={wrap}><UnimplementedView vizId={vizId} /></div>;

  return <EChart vizId={vizId} dataset={dataset} settings={settings} onChartReady={onChartReady} />;
}
