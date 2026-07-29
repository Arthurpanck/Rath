// Design tokens copied from Metabase source (frontend/src/metabase/ui/colors +
// visualizations/echarts/cartesian/constants/style.ts) so the output matches
// Metabase visually — with zero runtime dependency on Metabase.

// Brand blue = hsla(208, 72%, 60%) ≈ #509EE3 (Metabase's classic brand color).
export const MB_COLORS = {
  brand: "#509EE3",
  textPrimary: "#4C5773",
  textSecondary: "#696E7B",
  textTertiary: "#949AAB",
  border: "#EEECEC",
  borderStrong: "#C7CBD3",
  bgLight: "#F9FBFC",
  white: "#FFFFFF",
  gridLine: "#EDF2F5",
  // Table (matches Metabase's data grid)
  tableHeaderBg: "#F9FBFC",
  tableHeaderText: "#7C8797",
  tableRowHover: "#F4FAFE",
  tableRowBorder: "#F0F0F0",
  tableIdBg: "#EEF6FD",
};

// Canonical Metabase chart series palette (accent0..accent7).
export const ACCENT_COLORS = [
  "#509EE3", // accent0 — blue (brand)
  "#88BF4D", // accent1 — green
  "#A989C5", // accent2 — purple
  "#EF8C8C", // accent3 — salmon
  "#F9D45C", // accent4 — yellow
  "#F2A86F", // accent5 — orange
  "#98D9D9", // accent6 — teal
  "#7172AD", // accent7 — indigo
];

export const seriesColor = (index: number): string => ACCENT_COLORS[index % ACCENT_COLORS.length];

// From visualizations/echarts/cartesian/constants/style.ts
export const CHART_STYLE = {
  series: { barWidth: 0.8 },
  axisTicksMarginX: 5,
  axisTicksMarginY: 10,
  seriesLabels: { weight: 700, size: 13, offset: 4 },
  axisName: { weight: 400 },
  axisNameMargin: 12,
  padding: { x: 8, y: 12 },
  symbolSize: 6,
  opacity: { area: 0.3, scatter: 0.8 },
};

export const FONT_FAMILY =
  '"Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const AXIS_LABEL_STYLE = {
  color: MB_COLORS.textSecondary,
  fontFamily: FONT_FAMILY,
  fontSize: 12,
};
