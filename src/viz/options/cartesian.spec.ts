// The x-axis tick layout ported from Metabase's cartesian layout
// (areHorizontalXAxisTicksOverlapping + getAutoAxisEnabledSetting).
//
// This is borrowed logic with borrowed constants, so it is the code most likely
// to be broken silently by a refactor and least likely to be noticed: a wrong
// threshold does not throw, it just quietly drops every other label. Upstream
// pins it with layout/index.unit.spec.ts; these are the equivalent here.
//
// measureText falls back to a deterministic `length * size * 0.6` outside the
// browser, so a label of N characters is 7.2·N px wide at the 12px axis font.

import { describe, expect, it } from "vitest";

import { xTickLayout } from "./cartesian";

const CHAR_PX = 12 * 0.6; // one character at the axis font size
const label = (chars: number) => "x".repeat(chars);

describe("xTickLayout", () => {
  it("keeps labels horizontal when they have room", () => {
    expect(xTickLayout(["a", "b", "c"], { width: 800, height: 400 })).toEqual({
      show: true,
      rotate: 0,
      height: 12,
    });
  });

  it("stays horizontal when the chart size is unknown", () => {
    // No size means no measurement is possible; assume the labels fit rather
    // than hiding them.
    expect(xTickLayout([label(50), label(50)], undefined).rotate).toBe(0);
  });

  it("stays horizontal with no categories", () => {
    expect(xTickLayout([], { width: 400, height: 300 }).show).toBe(true);
  });

  it("rotates to 45° once neighbouring labels would collide", () => {
    // 20 categories across an 800px chart: 720px of plot area, 36px per slot.
    // Six-character labels are 43.2px wide, so they overlap.
    const cats = Array.from({ length: 20 }, () => label(6));
    const out = xTickLayout(cats, { width: 800, height: 400 });
    expect(out).toMatchObject({ show: true, rotate: 45 });
    // At 45° the label needs its width over root two of vertical room.
    expect(out.height).toBeCloseTo((6 * CHAR_PX) / Math.SQRT2, 5);
  });

  it("rotates to 90° when a slot is too narrow even for 45°", () => {
    // The 45° branch needs a slot of at least 12 * 2.1 = 25.2px; the 90° branch
    // needs 12 * 1.2 = 14.4px. 40 categories give a 18px slot, between the two.
    const cats = Array.from({ length: 40 }, () => label(8));
    const out = xTickLayout(cats, { width: 800, height: 600 });
    expect(out).toMatchObject({ show: true, rotate: 90 });
    expect(out.height).toBeCloseTo(8 * CHAR_PX, 5);
  });

  // The two rotation thresholds are borrowed numbers (2.1 and 1.2 times the
  // font size). Testing a slot comfortably inside a branch does not pin them —
  // only a slot that sits between the current threshold and a plausible wrong
  // one does. The grid reserves 56px left and 24px right, so a chart of width W
  // with N categories gives each one (W - 80) / N pixels.

  it("takes 45° at a slot just above the 2.1x threshold, not 90°", () => {
    // 30 categories over 890px is a 27px slot: above 12 * 2.1 = 25.2, and below
    // what a larger factor would demand.
    const out = xTickLayout(
      Array.from({ length: 30 }, () => label(6)),
      { width: 890, height: 400 },
    );
    expect(out.rotate).toBe(45);
  });

  it("still takes 90° at a slot just above the 1.2x threshold, rather than hiding", () => {
    // 50 categories over 880px is a 16px slot: below the 45° threshold but
    // above 12 * 1.2 = 14.4.
    const out = xTickLayout(
      Array.from({ length: 50 }, () => label(6)),
      { width: 880, height: 400 },
    );
    expect(out).toMatchObject({ show: true, rotate: 90 });
  });

  it("pins the 6px gap that decides when neighbours count as overlapping", () => {
    // 20 categories over 880px is a 40px slot; five-character labels are 36px.
    // They only overlap once the 6px gap is added (36 + 6 > 40), so a smaller
    // gap would leave them horizontal.
    const out = xTickLayout(
      Array.from({ length: 20 }, () => label(5)),
      { width: 880, height: 400 },
    );
    expect(out.rotate).toBe(45);
  });

  it("still shows 90° labels taking just over half the height", () => {
    // 28-character labels are 201.6px; against a 400px chart that is 50% of the
    // height — under the 70% ceiling, over a stricter one.
    const out = xTickLayout(
      Array.from({ length: 50 }, () => label(28)),
      { width: 880, height: 400 },
    );
    expect(out).toMatchObject({ show: true, rotate: 90 });
  });

  it("hides the labels rather than let them eat the chart", () => {
    // Rotated to 90°, a 60-character label wants 432px — over 70% of a 400px
    // chart, so Metabase drops the labels instead.
    const cats = Array.from({ length: 40 }, () => label(60));
    expect(xTickLayout(cats, { width: 800, height: 400 })).toEqual({
      show: false,
      rotate: 0,
      height: 0,
    });
  });

  it("hides the labels when the slots are narrower than either rotation allows", () => {
    // 200 categories over 720px is a 3.6px slot, below the 14.4px the 90°
    // branch needs.
    const cats = Array.from({ length: 200 }, () => label(4));
    expect(xTickLayout(cats, { width: 800, height: 400 }).show).toBe(false);
  });

  it("reserves more vertical room the longer the rotated labels are", () => {
    const short = Array.from({ length: 20 }, () => label(6));
    const long = Array.from({ length: 20 }, () => label(10));
    const a = xTickLayout(short, { width: 800, height: 600 });
    const b = xTickLayout(long, { width: 800, height: 600 });
    expect(b.height).toBeGreaterThan(a.height);
  });

  it("measures the widest label, not the first", () => {
    const cats = [label(2), label(2), label(30), label(2)];
    const wide = xTickLayout(cats, { width: 600, height: 600 });
    const narrow = xTickLayout([label(2), label(2), label(2), label(2)], {
      width: 600,
      height: 600,
    });
    expect(wide.height).toBeGreaterThan(narrow.height);
  });

  it("treats a null category as an empty label", () => {
    expect(() => xTickLayout([null, "a", null], { width: 400, height: 300 })).not.toThrow();
  });
});
