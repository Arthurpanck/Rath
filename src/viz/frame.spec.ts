// buildFrame is the pipeline every chart goes through: it groups rows by the
// dimension, aggregates each group, optionally splits one measure into a series
// per breakout value, and applies the sort. Metabase does the same work in its
// cartesian model (dataset.ts + series.ts), pinned there by its own specs.
//
// Everything downstream — the option builders, the legend, the colours — reads
// the frame, so a defect here shows up as a subtly wrong chart rather than an
// error. These tests cover the grouping, the six aggregations, the four sorts
// and the breakout.

import { describe, expect, it } from "vitest";

import type { Dataset } from "../data/types";
import { buildFrame } from "./frame";
import { defaultSettings, type VizSettings } from "./settings";

const dataset: Dataset = {
  cols: [
    { name: "region", display_name: "Région", base_type: "string", index: 0 },
    { name: "canal", display_name: "Canal", base_type: "string", index: 1 },
    { name: "ventes", display_name: "Ventes", base_type: "number", index: 2 },
  ],
  rows: [
    ["Lyon", "web", 10],
    ["Lyon", "magasin", 30],
    ["Paris", "web", 5],
    ["Paris", "magasin", 5],
    ["Nice", "web", 100],
  ],
};

const settings = (patch: Partial<VizSettings> = {}): VizSettings => ({
  ...defaultSettings(dataset),
  dimension: "region",
  metrics: ["ventes"],
  ...patch,
});

const values = (d: Dataset, s: VizSettings) => buildFrame(d, s).series[0].values;
/** Last element — the project targets ES2020, which has no Array.prototype.at. */
const last = <T>(xs: T[]): T => xs[xs.length - 1];

describe("buildFrame grouping", () => {
  it("collapses rows sharing a dimension value into one category", () => {
    const frame = buildFrame(dataset, settings());
    expect(frame.categories).toEqual(["Lyon", "Paris", "Nice"]);
    expect(frame.series[0].values).toEqual([40, 10, 100]);
  });

  it("keeps the categories in first-seen order by default", () => {
    expect(buildFrame(dataset, settings({ sort: "none" })).categories).toEqual([
      "Lyon",
      "Paris",
      "Nice",
    ]);
  });

  it("names the series after the measure's display name", () => {
    const frame = buildFrame(dataset, settings());
    expect(frame.series[0]).toMatchObject({ key: "ventes", name: "Ventes" });
  });

  it("reports that it is not a breakout when the series come from measures", () => {
    expect(buildFrame(dataset, settings()).breakout).toBe(false);
  });

  it("has no timestamps for a non-date dimension", () => {
    expect(buildFrame(dataset, settings()).timestamps).toBeNull();
  });
});

describe("buildFrame aggregation", () => {
  it.each([
    ["sum", [40, 10, 100]],
    ["mean", [20, 5, 100]],
    ["count", [2, 2, 1]],
    ["min", [10, 5, 100]],
    ["max", [30, 5, 100]],
    ["distinct", [2, 1, 1]],
  ] as const)("aggregates with %s", (aggregation, expected) => {
    expect(values(dataset, settings({ aggregation }))).toEqual(expected);
  });

  // KNOWN DEFECT, pinned deliberately rather than left undefined.
  //
  // aggregate() keeps a value when `!isNaN(Number(v))`, and Number(null) is 0,
  // not NaN — so a blank cell is aggregated as a real zero. For "sum" that is
  // harmless, but "mean" is dragged towards zero and "min" returns 0 for a
  // column that has no zero in it. Metabase drops nulls before aggregating.
  //
  // Fixing this changes rendered charts, so it is a deliberate decision rather
  // than a refactor. These tests state today's behaviour so that change shows
  // up as an intended, reviewable diff instead of a silent one.
  describe("blank cells", () => {
    const withBlank: Dataset = { ...dataset, rows: [...dataset.rows, ["Brest", "web", null]] };

    it("treats a blank as zero rather than as missing", () => {
      expect(last(values(withBlank, settings()))).toBe(0);
    });

    it("lets a blank drag the mean down", () => {
      const blanked: Dataset = {
        ...dataset,
        rows: [
          ["Lyon", "web", 10],
          ["Lyon", "web", null],
        ],
      };
      expect(values(blanked, settings({ aggregation: "mean" }))).toEqual([5]);
    });

    it("lets a blank become the minimum", () => {
      const blanked: Dataset = {
        ...dataset,
        rows: [
          ["Lyon", "web", 10],
          ["Lyon", "web", null],
        ],
      };
      expect(values(blanked, settings({ aggregation: "min" }))).toEqual([0]);
    });

    it("counts rows rather than numbers, so blanks still count", () => {
      expect(last(values(withBlank, settings({ aggregation: "count" })))).toBe(1);
    });
  });
});

describe("buildFrame sorting", () => {
  it("sorts by dimension ascending", () => {
    expect(buildFrame(dataset, settings({ sort: "dim-asc" })).categories).toEqual([
      "Lyon",
      "Nice",
      "Paris",
    ]);
  });

  it("sorts by dimension descending", () => {
    expect(buildFrame(dataset, settings({ sort: "dim-desc" })).categories).toEqual([
      "Paris",
      "Nice",
      "Lyon",
    ]);
  });

  it("sorts by value ascending", () => {
    const frame = buildFrame(dataset, settings({ sort: "value-asc" }));
    expect(frame.categories).toEqual(["Paris", "Lyon", "Nice"]);
    expect(frame.series[0].values).toEqual([10, 40, 100]);
  });

  it("sorts by value descending", () => {
    const frame = buildFrame(dataset, settings({ sort: "value-desc" }));
    expect(frame.categories).toEqual(["Nice", "Lyon", "Paris"]);
    expect(frame.series[0].values).toEqual([100, 40, 10]);
  });

  it("keeps every series aligned with the reordered categories", () => {
    const twoMetrics: Dataset = {
      cols: [
        ...dataset.cols,
        { name: "marge", display_name: "Marge", base_type: "number", index: 3 },
      ],
      rows: [
        ["Lyon", "web", 10, 1],
        ["Paris", "web", 5, 2],
        ["Nice", "web", 100, 3],
      ],
    };
    const frame = buildFrame(
      twoMetrics,
      settings({ metrics: ["ventes", "marge"], sort: "value-desc" }),
    );
    expect(frame.categories).toEqual(["Nice", "Lyon", "Paris"]);
    // The second series must follow the same permutation, not its own order.
    expect(frame.series[1].values).toEqual([3, 1, 2]);
  });

  it("sorts numeric dimensions numerically, not as strings", () => {
    const numeric: Dataset = {
      cols: [
        { name: "annee", display_name: "Année", base_type: "number", index: 0 },
        { name: "n", display_name: "N", base_type: "number", index: 1 },
      ],
      rows: [
        [2021, 1],
        [9, 2],
        [100, 3],
      ],
    };
    const s = {
      ...defaultSettings(numeric),
      dimension: "annee",
      metrics: ["n"],
      sort: "dim-asc" as const,
    };
    expect(buildFrame(numeric, s).categories).toEqual([9, 100, 2021]);
  });
});

describe("buildFrame breakout", () => {
  it("splits the measure into one series per breakout value", () => {
    const frame = buildFrame(dataset, settings({ breakout: "canal" }));
    expect(frame.breakout).toBe(true);
    expect(frame.series.map((s) => s.name)).toEqual(["web", "magasin"]);
    expect(frame.categories).toEqual(["Lyon", "Paris", "Nice"]);
  });

  it("leaves a gap where a category has no row for that breakout value", () => {
    const frame = buildFrame(dataset, settings({ breakout: "canal" }));
    const magasin = frame.series.find((s) => s.name === "magasin")!;
    // Nice only sells on the web.
    expect(magasin.values).toEqual([30, 5, null]);
  });

  it("ignores a breakout on the dimension itself", () => {
    const frame = buildFrame(dataset, settings({ breakout: "region" }));
    expect(frame.breakout).toBe(false);
    expect(frame.series).toHaveLength(1);
  });
});
