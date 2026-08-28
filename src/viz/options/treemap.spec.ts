// The treemap's two-pass labelling, transferred from Metabase's
// echarts/graph/treemap/model/labels.ts along with its thresholds. The chart is
// laid out first, then each tile is asked what it can legibly show. Get a
// threshold wrong and nothing breaks loudly — the treemap just turns into a
// wall of clipped text, or silently blank tiles.
//
// Upstream pins this with labels.unit.spec.ts. These are the counterparts.
//
// Text is measured through viz/options/text.ts, which outside a browser falls
// back to `length * size * 0.6`: a leaf value at 20px is 12px per character, a
// group header at 12px is 7.2px per character.

import { describe, expect, it } from "vitest";

import { groupHeaderDetail, leafLabelDetail } from "./treemap";

describe("leafLabelDetail", () => {
  it("shows name, value and share when the tile is big enough", () => {
    // Over 100x100, and 176px of inner width for a 4-character value (48px).
    expect(leafLabelDetail({ width: 200, height: 150 }, "1234")).toEqual({
      detail: "full",
      innerWidth: 176,
    });
  });

  it("drops to the name alone when the tile is too short", () => {
    // Wide enough and over the 40px minimum, but under the 100px a full block
    // of name + value + share needs.
    expect(leafLabelDetail({ width: 200, height: 60 }, "1234").detail).toBe("labelOnly");
  });

  it("drops to the name alone when the value would not fit across", () => {
    // 120px wide leaves 96px inside; a 10-character value wants 120px.
    expect(leafLabelDetail({ width: 120, height: 200 }, "1234567890").detail).toBe("labelOnly");
  });

  it("shows nothing on a tile below the minimum width", () => {
    expect(leafLabelDetail({ width: 99, height: 200 }, "1")).toEqual({
      detail: "none",
      innerWidth: 75,
    });
  });

  it("shows nothing on a tile below the minimum height", () => {
    expect(leafLabelDetail({ width: 300, height: 39 }, "1").detail).toBe("none");
  });

  it("accepts the boundary tile exactly at the minimums", () => {
    expect(leafLabelDetail({ width: 100, height: 40 }, "1").detail).toBe("labelOnly");
    expect(leafLabelDetail({ width: 100, height: 100 }, "1").detail).toBe("full");
  });

  it("never reports a negative inner width", () => {
    expect(leafLabelDetail({ width: 4, height: 4 }, "1").innerWidth).toBe(0);
  });

  it("goes full detail when there is no value to fit", () => {
    expect(leafLabelDetail({ width: 100, height: 100 }, undefined).detail).toBe("full");
  });
});

describe("groupHeaderDetail", () => {
  it("shows the name with its value and share when the header is wide", () => {
    const out = groupHeaderDetail({ width: 600, height: 32 }, "Rhône", "1 200", "48 %");
    expect(out.showText).toBe(true);
    expect(out.showValuePercent).toBe(true);
    // The name column is what is left once the value/share cluster is placed.
    expect(out.nameColumnWidth).toBeGreaterThan(0);
    expect(out.nameColumnWidth).toBeLessThan(out.available);
  });

  it("keeps the name but drops the value once they no longer both fit", () => {
    const out = groupHeaderDetail({ width: 130, height: 32 }, "Département du Rhône", "1 200", "48 %");
    expect(out.showText).toBe(true);
    expect(out.showValuePercent).toBe(false);
  });

  it("drops the header entirely when three characters would not fit", () => {
    // 40px wide leaves 16px inside; three characters want 21.6px.
    const out = groupHeaderDetail({ width: 40, height: 32 }, "Rhône", "1 200", "48 %");
    expect(out.showText).toBe(false);
    expect(out.showValuePercent).toBe(false);
  });

  it("never shows the value when the header text itself is hidden", () => {
    const out = groupHeaderDetail({ width: 30, height: 32 }, "Rhône", "1", "1 %");
    expect(out.showText).toBe(false);
    expect(out.showValuePercent).toBe(false);
  });

  it("cannot place a value/share cluster when there is no value", () => {
    const out = groupHeaderDetail({ width: 600, height: 32 }, "Rhône", undefined, undefined);
    expect(out.showText).toBe(true);
    expect(out.showValuePercent).toBe(false);
  });

  it("keeps a header whose first three characters just fit", () => {
    // 52px wide leaves 28px inside. Three characters want 21.6px and fit; a
    // stricter minimum of five would want 36px and would drop the header.
    expect(groupHeaderDetail({ width: 52, height: 32 }, "Rhône-Alpes").showText).toBe(true);
  });

  it("takes the horizontal padding off both sides", () => {
    expect(groupHeaderDetail({ width: 200, height: 32 }, "a").available).toBe(176);
  });
});
