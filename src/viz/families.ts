// Chart families — the named groups that decide which settings, controls and
// rendering paths apply to a visualisation.
//
// These lists used to be written out by hand at each call site, fifteen times
// across four files, and they had already drifted: the settings panel treated
// "cartesian" as five ids while the canvas treated it as eight. Every family
// now has exactly one definition, and the ones that build on another compose
// it rather than restating its members.

import type { VizId } from "./registry";

/**
 * The axis-and-series core: charts that share the whole cartesian settings
 * surface (stacking, breakout, series list, goal line, axis titles).
 */
export const CARTESIAN_VIZ: VizId[] = ["bar", "line", "area", "combo", "row"];

/** Cartesian charts that can carry a trend line — every one but the row chart,
 *  whose value axis is horizontal. */
export const TREND_LINE_VIZ: VizId[] = ["bar", "line", "area", "combo"];

/**
 * Everything drawn on an x/y grid, including the charts that build their own
 * dataset. Wider than CARTESIAN_VIZ: these need a rebuild on resize because
 * their layout is measured from the space available, but they do not share the
 * full cartesian settings surface.
 */
export const CARTESIAN_LIKE_VIZ: VizId[] = [...CARTESIAN_VIZ, "scatter", "waterfall", "boxplot"];

/** Charts driven by one dimension plus a measure. */
export const DIMENSION_VIZ: VizId[] = [...CARTESIAN_VIZ, "pie", "waterfall"];

/** Charts whose rows get grouped and aggregated before rendering. */
export const AGGREGATION_VIZ: VizId[] = [...DIMENSION_VIZ, "pivot"];

/** Charts whose categories can be reordered by dimension or by value. */
export const SORTABLE_VIZ: VizId[] = [...CARTESIAN_VIZ, "pie"];

/**
 * Charts with a categorical legend. Identical to SORTABLE_VIZ today; kept as
 * its own name so the two can diverge later without a silent behaviour change.
 */
export const LEGEND_VIZ: VizId[] = SORTABLE_VIZ;

/** Charts that can plot more than one measure at once. */
export const MULTI_METRIC_VIZ: VizId[] = [...CARTESIAN_VIZ, "scatter", "boxplot"];

/** Charts that stack their series. */
export const STACKING_VIZ: VizId[] = ["bar", "area", "row"];

/** Charts offering a per-series colour picker. */
export const COLOR_VIZ: VizId[] = [...CARTESIAN_VIZ, "progress"];

/** Charts that accept a goal / target value. */
export const GOAL_VIZ: VizId[] = [...TREND_LINE_VIZ, "gauge", "progress"];

/** Charts with editable axis titles and axis show/hide toggles. */
export const AXIS_VIZ: VizId[] = [...CARTESIAN_VIZ, "waterfall", "scatter"];

/** Charts with a value axis that can be log-scaled. */
export const Y_SCALE_VIZ: VizId[] = [...CARTESIAN_VIZ, "scatter"];

/** Charts with a settable value-axis range. */
export const Y_RANGE_VIZ: VizId[] = [...CARTESIAN_VIZ, "scatter", "waterfall"];

/** Charts that can print the value on each mark. */
export const DATA_LABEL_VIZ: VizId[] = [...CARTESIAN_VIZ, "waterfall"];

/** Charts whose series rows open the per-series "…" style popover. */
export const SERIES_POPOVER_VIZ: VizId[] = CARTESIAN_VIZ;

/** Charts that take no measure column: they read their values from elsewhere
 *  (a single row, explicit source/target fields, a location field). */
export const NO_METRIC_VIZ: VizId[] = ["object", "sankey", "map"];
