// Text measurement, used by the charts that decide what to draw from the space
// they actually have (Metabase measures text the same way, through their
// RenderingContext.measureText).

import { FONT_FAMILY } from "./constants";

let ctx: CanvasRenderingContext2D | null = null;

export function measureText(text: string, size: number, weight: number): number {
  if (typeof document === "undefined") return text.length * size * 0.6;
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * size * 0.6;
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
  return ctx.measureText(text).width;
}

/** Shorten to fit a pixel width, as ECharts' own truncation is unreliable. */
export function truncateToWidth(text: string, width: number, size: number, weight: number): string {
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
