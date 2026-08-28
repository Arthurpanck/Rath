// The small SVG glyphs used by the per-series style popover: display type,
// line shape and line dash. Drawn here rather than imported from viz/icons
// because they are miniature previews of a setting's effect, not chart-type
// icons.

const ic = {
  stroke: "currentColor",
  strokeWidth: 1.7,
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconLine = () => (
  <svg width="18" height="14" viewBox="0 0 20 14">
    <path d="M2 11L7 5l4 3 7-7" {...ic} />
  </svg>
);
export const IconArea = () => (
  <svg width="18" height="14" viewBox="0 0 20 14">
    <path d="M2 11L7 5l4 3 7-7v10H2z" fill="currentColor" opacity="0.35" />
    <path d="M2 11L7 5l4 3 7-7" {...ic} />
  </svg>
);
export const IconBar = () => (
  <svg width="18" height="14" viewBox="0 0 20 14">
    <rect x="2" y="7" width="4" height="6" fill="currentColor" />
    <rect x="8" y="3" width="4" height="10" fill="currentColor" />
    <rect x="14" y="9" width="4" height="4" fill="currentColor" />
  </svg>
);
export const IconStraight = () => (
  <svg width="18" height="14" viewBox="0 0 20 14">
    <path d="M2 11l6-6 4 3 6-5" {...ic} />
  </svg>
);
export const IconCurved = () => (
  <svg width="18" height="14" viewBox="0 0 20 14">
    <path d="M2 11c4 0 4-8 8-8s4 6 8 6" {...ic} />
  </svg>
);
export const IconStepped = () => (
  <svg width="18" height="14" viewBox="0 0 20 14">
    <path d="M2 11h4V7h4V4h4v4h2" {...ic} />
  </svg>
);
export const IconSolid = () => (
  <svg width="18" height="14" viewBox="0 0 20 14">
    <path d="M2 7h16" {...ic} />
  </svg>
);
export const IconDashed = () => (
  <svg width="18" height="14" viewBox="0 0 20 14">
    <path d="M2 7h4M8 7h4M16 7h2" {...ic} />
  </svg>
);
export const IconDotted = () => (
  <svg width="18" height="14" viewBox="0 0 20 14">
    <path d="M3 7h1M7 7h1M11 7h1M15 7h1" {...ic} strokeWidth={2.4} />
  </svg>
);
