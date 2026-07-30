import type { ReactNode } from "react";

// Metabase-style glyphs, one per visualization `iconName`. 20x20 viewBox,
// currentColor so they invert to white when the option is selected.
const S = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none" as const };
const stroke = { stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const fill = { fill: "currentColor" };

// A real cog/gear (Feather "settings"), used for the settings affordances —
// replaces the earlier circle-with-rays that read as a sun.
export function Cog({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// Chevron that points right when closed and rotates to point down when open.
export function Chevron({ open, size = 16 }: { open: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
      <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS: Record<string, ReactNode> = {
  // Treemap
  treemap: (
    <svg {...S}><rect x="2.5" y="3.5" width="8" height="7" {...stroke} /><rect x="11.5" y="3.5" width="6" height="4" {...stroke} /><rect x="11.5" y="8.5" width="6" height="8" {...stroke} /><rect x="2.5" y="11.5" width="8" height="5" {...stroke} /></svg>
  ),
  // Table
  table: (
    <svg {...S}><rect x="2.5" y="3.5" width="15" height="13" rx="1.5" {...stroke} /><path d="M2.5 8H17.5M2.5 12H17.5M7.5 3.5V16.5M12.5 3.5V16.5" {...stroke} /></svg>
  ),
  // Detail view (document)
  document: (
    <svg {...S}><path d="M5 2.5h6l4 4v11H5z" {...stroke} /><path d="M11 2.5V6.5H15M7.5 10H12.5M7.5 13H12.5" {...stroke} /></svg>
  ),
  // Map (pin)
  pinmap: (
    <svg {...S}><path d="M10 17.5C13 14 15.5 11.4 15.5 8.5a5.5 5.5 0 10-11 0c0 2.9 2.5 5.5 5.5 9z" {...stroke} /><circle cx="10" cy="8.3" r="2" {...stroke} /></svg>
  ),
  // Scatter (bubble)
  bubble: (
    <svg {...S}><circle cx="6" cy="12.5" r="2.4" {...fill} /><circle cx="12.5" cy="7" r="3.2" {...fill} /><circle cx="14.5" cy="14" r="1.8" {...fill} /></svg>
  ),
  // Bar
  bar: (
    <svg {...S}><rect x="3" y="9" width="3.2" height="8" rx="0.5" {...fill} /><rect x="8.4" y="4" width="3.2" height="13" rx="0.5" {...fill} /><rect x="13.8" y="11" width="3.2" height="6" rx="0.5" {...fill} /></svg>
  ),
  // Line
  line: (
    <svg {...S}><path d="M3 14L7.5 8.5L11 11.5L17 4.5" {...stroke} /></svg>
  ),
  // Pie
  pie: (
    <svg {...S}><path d="M10 10V2.5a7.5 7.5 0 107.5 7.5z" {...fill} /><path d="M10 10L10 2.5A7.5 7.5 0 0117.5 10z" fill="currentColor" opacity="0.5" /></svg>
  ),
  // Row (horizontal bar)
  horizontal_bar: (
    <svg {...S}><rect x="3" y="3.5" width="9" height="3.2" rx="0.5" {...fill} /><rect x="3" y="8.4" width="14" height="3.2" rx="0.5" {...fill} /><rect x="3" y="13.3" width="6" height="3.2" rx="0.5" {...fill} /></svg>
  ),
  // Area
  area: (
    <svg {...S}><path d="M3 15L7.5 9L11 12L17 5.5V16H3z" fill="currentColor" opacity="0.85" /><path d="M3 15L7.5 9L11 12L17 5.5" {...stroke} /></svg>
  ),
  // Combo (line + bar)
  lineandbar: (
    <svg {...S}><rect x="3" y="10" width="3" height="7" rx="0.5" {...fill} /><rect x="8.5" y="7" width="3" height="10" rx="0.5" {...fill} /><rect x="14" y="12" width="3" height="5" rx="0.5" {...fill} /><path d="M3 8L9 4L17 7" {...stroke} /></svg>
  ),
  // Boxplot
  boxplot: (
    <svg {...S}><path d="M6 3V17M14 3V17" {...stroke} /><rect x="6" y="7" width="8" height="6" rx="1" {...stroke} /><path d="M6 10H14M2.5 10H6M14 10H17.5" {...stroke} /></svg>
  ),
  // Sankey
  sankey: (
    <svg {...S}><rect x="2.5" y="4" width="2.5" height="12" rx="0.5" {...fill} /><rect x="15" y="3" width="2.5" height="6" rx="0.5" {...fill} /><rect x="15" y="11" width="2.5" height="6" rx="0.5" {...fill} /><path d="M5 7C10 7 10 6 15 6M5 12C10 12 10 14 15 14" stroke="currentColor" strokeWidth="2.5" opacity="0.45" fill="none" /></svg>
  ),
  // Number (scalar)
  number: (
    <svg {...S}><rect x="2.5" y="4.5" width="15" height="11" rx="1.5" {...stroke} /><path d="M7.5 8.5L9 7.5V13M11 8.2a1.6 1.6 0 113 0.9c-.6 1-3 2.4-3 2.9h3" {...stroke} /></svg>
  ),
  // Pivot table
  pivot_table: (
    <svg {...S}><rect x="2.5" y="3.5" width="15" height="13" rx="1.5" {...stroke} /><path d="M2.5 7.5H17.5M7 7.5V16.5" {...stroke} /><path d="M7 3.5V7.5H2.5" {...fill} opacity="0.25" /></svg>
  ),
  // Trend (smartscalar)
  smartscalar: (
    <svg {...S}><path d="M3 13L8 8L11 11L17 5" {...stroke} /><path d="M12.5 5H17V9.5" {...stroke} /></svg>
  ),
  // Gauge
  gauge: (
    <svg {...S}><path d="M3 15a7 7 0 0114 0" {...stroke} /><path d="M10 15L13.5 9.5" {...stroke} /><circle cx="10" cy="15" r="1.4" {...fill} /></svg>
  ),
  // Progress
  progress: (
    <svg {...S}><rect x="2.5" y="8" width="15" height="4" rx="2" {...stroke} /><rect x="2.5" y="8" width="9" height="4" rx="2" {...fill} /></svg>
  ),
  // Waterfall
  waterfall: (
    <svg {...S}><rect x="2.5" y="4" width="2.6" height="4" rx="0.4" {...fill} /><rect x="6.2" y="8" width="2.6" height="4" rx="0.4" {...fill} /><rect x="9.9" y="6" width="2.6" height="4" rx="0.4" {...fill} /><rect x="13.6" y="10" width="2.6" height="4" rx="0.4" {...fill} /></svg>
  ),
  unknown: (
    <svg {...S}><circle cx="10" cy="10" r="7" {...stroke} /><path d="M8 8a2 2 0 113 1.7c-.6.4-1 .8-1 1.6M10 14h.01" {...stroke} /></svg>
  ),
};

export function VizIcon({ name, size = 20 }: { name: string; size?: number }) {
  const glyph = ICONS[name] ?? ICONS.unknown;
  return (
    <span style={{ display: "inline-flex", width: size, height: size }} aria-hidden>
      {glyph}
    </span>
  );
}
