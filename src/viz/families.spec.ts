// The chart families and the capability matrix they drive.
//
// settingsCapabilities decides which controls the settings panel offers for a
// given chart. It used to be fifteen hand-written literals; it is now composed
// from viz/families. Nothing about that is enforced by the type system — every
// family is a VizId[], so a wrong member type-checks fine and simply makes a
// control appear, or vanish, for the wrong chart.
//
// The matrix below is the one the hand-written version produced, so it pins the
// refactor: any future change to a family shows up here as an explicit diff.

import { describe, expect, it } from "vitest";

import {
  AGGREGATION_VIZ,
  AXIS_VIZ,
  CARTESIAN_LIKE_VIZ,
  CARTESIAN_VIZ,
  DIMENSION_VIZ,
  LEGEND_VIZ,
  SORTABLE_VIZ,
  TREND_LINE_VIZ,
} from "./families";
import { settingsCapabilities } from "./options";
import { VISUALIZATIONS, type VizId } from "./registry";

const ALL: VizId[] = VISUALIZATIONS.map((v) => v.id);

/** For each capability, the exact set of charts that should offer it. */
const EXPECTED: Record<string, VizId[]> = {
  dimension: ["bar", "line", "area", "combo", "row", "pie", "waterfall"],
  multiMetric: ["bar", "line", "area", "combo", "row", "scatter", "boxplot"],
  breakout: ["bar", "line", "area", "combo", "row"],
  aggregation: ["bar", "line", "area", "combo", "row", "pie", "waterfall", "pivot"],
  sort: ["bar", "line", "area", "combo", "row", "pie"],
  stacking: ["bar", "area", "row"],
  values: ["bar", "line", "area", "combo", "row", "waterfall"],
  legend: ["bar", "line", "area", "combo", "row", "pie"],
  colors: ["bar", "line", "area", "combo", "row", "progress"],
  axisTitles: ["bar", "line", "area", "combo", "row", "waterfall", "scatter"],
  axisToggles: ["bar", "line", "area", "combo", "row", "waterfall", "scatter"],
  goal: ["bar", "line", "area", "combo", "gauge", "progress"],
  trendline: ["bar", "line", "area", "combo"],
  yScale: ["bar", "line", "area", "combo", "row", "scatter"],
  yRange: ["bar", "line", "area", "combo", "row", "scatter", "waterfall"],
  pie: ["pie"],
  sankeyFields: ["sankey"],
  pivotFields: ["pivot"],
  mapFields: ["map"],
};

describe("settingsCapabilities", () => {
  it.each(Object.keys(EXPECTED))("offers %s to exactly the right charts", (capability) => {
    const actual = ALL.filter(
      (id) => settingsCapabilities(id)[capability as keyof ReturnType<typeof settingsCapabilities>],
    );
    expect([...actual].sort()).toEqual([...EXPECTED[capability]].sort());
  });

  it("offers a measure to every chart but the three that read their values elsewhere", () => {
    const without = ALL.filter((id) => !settingsCapabilities(id).metrics);
    expect([...without].sort()).toEqual(["map", "object", "sankey"]);
  });

  it("answers for every registered visualisation", () => {
    for (const id of ALL) {
      expect(Object.keys(settingsCapabilities(id))).toHaveLength(20);
    }
  });
});

describe("families", () => {
  it("only contains ids that are actually registered", () => {
    const families = {
      CARTESIAN_VIZ,
      CARTESIAN_LIKE_VIZ,
      TREND_LINE_VIZ,
      DIMENSION_VIZ,
      AGGREGATION_VIZ,
      SORTABLE_VIZ,
      LEGEND_VIZ,
      AXIS_VIZ,
    };
    for (const [name, ids] of Object.entries(families)) {
      for (const id of ids) {
        expect(ALL, `${name} contains an unregistered id: ${id}`).toContain(id);
      }
    }
  });

  it("has no duplicate members", () => {
    for (const ids of [CARTESIAN_VIZ, CARTESIAN_LIKE_VIZ, DIMENSION_VIZ, AGGREGATION_VIZ]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("keeps the cartesian core inside every family built from it", () => {
    for (const wider of [
      CARTESIAN_LIKE_VIZ,
      DIMENSION_VIZ,
      AGGREGATION_VIZ,
      SORTABLE_VIZ,
      AXIS_VIZ,
    ]) {
      expect(wider).toEqual(expect.arrayContaining(CARTESIAN_VIZ));
    }
  });

  it("keeps the trend-line family a strict subset of the cartesian core", () => {
    expect(CARTESIAN_VIZ).toEqual(expect.arrayContaining(TREND_LINE_VIZ));
    expect(TREND_LINE_VIZ.length).toBeLessThan(CARTESIAN_VIZ.length);
    // The row chart is the exclusion: its value axis is horizontal.
    expect(TREND_LINE_VIZ).not.toContain("row");
  });
});
