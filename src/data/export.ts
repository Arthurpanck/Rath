import type * as echarts from "echarts";
import type { Dataset } from "./types";

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function exportPng(chart: echarts.ECharts, name: string) {
  const url = chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
  triggerDownload(url, `${name}.png`);
}

export function exportSvg(chart: echarts.ECharts, name: string) {
  // Works because ChartCanvas initialises ECharts with the SVG renderer.
  const url = chart.getDataURL({ type: "svg", backgroundColor: "#ffffff" });
  triggerDownload(url, `${name}.svg`);
}

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(dataset: Dataset, name: string) {
  const header = dataset.cols.map((c) => csvCell(c.display_name)).join(",");
  const body = dataset.rows.map((row) => dataset.cols.map((c) => csvCell(row[c.index])).join(",")).join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${name}.csv`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
