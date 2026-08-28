// Pie sizing, transferred from Metabase's getRadiusOption / getBorderWidth and
// their slice font-size rule, using the ratios in their pie/constants.ts
// (maxSideLength 550, side padding 12, inner radius 3/5, two-ring inner radius
// 2/5, border proportion 360, font 20 down to a floor of 14).
//
// Nothing here is a fixed pixel value: every measurement is derived from the
// room the chart has. That is exactly why it needs pinning — a wrong ratio
// still renders a pie, just not the one Metabase draws.

import { describe, expect, it } from "vitest";

import { pieGeometry } from "./other";

describe("pieGeometry", () => {
  it("takes the side padding off both edges", () => {
    // 400 - 12 * 2
    expect(pieGeometry(400, 1, false).innerSide).toBe(376);
  });

  it("stops growing past Metabase's maximum side length", () => {
    expect(pieGeometry(2000, 1, false).innerSide).toBe(550);
    expect(pieGeometry(600, 1, false).innerSide).toBe(550);
  });

  it("falls back to the maximum when the size is unknown", () => {
    expect(pieGeometry(undefined, 1, false).innerSide).toBe(550 - 24);
  });

  it("fills the square with the outer radius", () => {
    expect(pieGeometry(400, 1, false).outerRadius).toBe(188);
  });

  it("keeps the radius positive on an impossibly small chart", () => {
    expect(pieGeometry(10, 1, false).outerRadius).toBe(1);
  });

  it("has no hole unless it is a donut", () => {
    expect(pieGeometry(400, 1, false).innerRadius).toBe(0);
    expect(pieGeometry(400, 2, false).innerRadius).toBe(0);
  });

  it("uses the three-fifths hole for a single-ring donut", () => {
    const { outerRadius, innerRadius } = pieGeometry(400, 1, true);
    expect(innerRadius).toBeCloseTo(outerRadius * (3 / 5), 10);
  });

  it("narrows the hole to two-fifths once there is a second ring", () => {
    const { outerRadius, innerRadius } = pieGeometry(400, 2, true);
    expect(innerRadius).toBeCloseTo(outerRadius * (2 / 5), 10);
    expect(innerRadius).toBeLessThan(pieGeometry(400, 1, true).innerRadius);
  });

  it("keeps the gap between slices at one degree of the circumference", () => {
    // A single ring spaces slices by pi * side / 360, i.e. one degree of arc.
    expect(pieGeometry(400, 1, false).sliceBorderWidth).toBeCloseTo((Math.PI * 376) / 360, 10);
  });

  it("uses a hairline border once the rings are nested", () => {
    expect(pieGeometry(400, 2, false).sliceBorderWidth).toBe(1);
  });

  it("scales the slice font with the chart, up to the maximum", () => {
    expect(pieGeometry(2000, 1, false).sliceFontSize).toBe(20);
  });

  it("never shrinks the slice font below the floor", () => {
    // 20 * (376 / 550) is 13.67, under the 14px floor.
    expect(pieGeometry(400, 1, false).sliceFontSize).toBe(14);
    expect(pieGeometry(100, 1, false).sliceFontSize).toBe(14);
  });

  it("uses the fixed multi-ring font when there is more than one ring", () => {
    expect(pieGeometry(2000, 2, false).sliceFontSize).toBe(12);
  });

  it("grows every measurement monotonically with the available space", () => {
    const small = pieGeometry(300, 1, true);
    const large = pieGeometry(500, 1, true);
    expect(large.outerRadius).toBeGreaterThan(small.outerRadius);
    expect(large.innerRadius).toBeGreaterThan(small.innerRadius);
    expect(large.sliceBorderWidth).toBeGreaterThan(small.sliceBorderWidth);
  });
});
