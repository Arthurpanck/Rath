// Automatic display selection, ported from Metabase's default-display rules
// (metabase-lib) plus Question.maybeResetDisplay / _maybeSwitchToScalar.

import type { Column, Dataset } from "../data/types";
import { getDimensions, isMetric } from "../data/types";
import type { Summarize } from "../data/query";
import type { VizId } from "./registry";
import { VIZ_BY_ID, groupVisualizationsBySensibility } from "./registry";

// Geo detection is scoped to the bundled Grand Lyon layers: a "Pays" column
// has no matching map here, so it should drive a bar chart, not a map.
const GEO_NAME = /(commune|arrondissement|insee|territoire|\bctm\b|quartier|ville)/i;

const isTemporal = (c: Column) => c.base_type === "date";
const isGeo = (c: Column) =>
  c.base_type === "string" && GEO_NAME.test(`${c.name} ${c.display_name}`);

/**
 * Metabase's default-display decision table, driven by the query shape
 * (how many aggregations, and what the breakouts are).
 */
export function defaultDisplay(dataset: Dataset, summarize: Summarize | null): VizId {
  const aggCount = summarize?.aggregations.length ?? 0;
  const breakoutCols = (summarize?.breakouts ?? [])
    .map((n) => dataset.cols.find((c) => c.name === n))
    .filter((c): c is Column => !!c);

  // Unaggregated data stays a table — there is nothing to plot yet.
  if (aggCount === 0) return "table";

  // A single number and nothing to break it out by.
  if (breakoutCols.length === 0) return "scalar";

  const hasTemporal = breakoutCols.some(isTemporal);
  const hasGeo = breakoutCols.some(isGeo);

  if (breakoutCols.length === 1) {
    if (hasTemporal) return "line";
    if (hasGeo) return "map";
    return "bar";
  }

  if (breakoutCols.length === 2) {
    // Two breakouts: a time series wins, otherwise grouped bars.
    if (hasTemporal) return "line";
    if (hasGeo) return "map";
    return "bar";
  }

  return "table";
}

/**
 * Port of Question.maybeResetDisplay: keep the user's chart while it still
 * suits the data, otherwise fall back to the shape-appropriate default.
 * `locked` means the user picked the chart by hand.
 */
export function maybeResetDisplay({
  current,
  dataset,
  summarize,
  locked,
}: {
  current: VizId;
  dataset: Dataset;
  summarize: Summarize | null;
  locked: boolean;
}): { display: VizId; locked: boolean } {
  const { recommended, sensible } = groupVisualizationsBySensibility(dataset);
  const sensibleIds = [...recommended, ...sensible].map((v) => v.id);
  const isSensible = sensibleIds.includes(current) && VIZ_BY_ID[current].isSensible(dataset);
  const preferred = defaultDisplay(dataset, summarize);

  // 1 row x 1 column always reads better as a scalar (Metabase does this last).
  const oneByOne = dataset.rows.length === 1 && dataset.cols.length === 1;
  if (oneByOne && !["scalar", "progress", "gauge"].includes(current)) {
    return { display: "scalar", locked: false };
  }

  // A locked chart that is still sensible is left alone; once it stops being
  // sensible the lock is released and we re-pick.
  if (locked && isSensible) return { display: current, locked: true };
  if (isSensible && preferred === "table") return { display: current, locked };

  return { display: preferred, locked: false };
}

/** Column-shape summary used by the auto-display rules (and handy for debugging). */
export function analyzeColumns(dataset: Dataset): {
  metrics: Column[];
  dimensions: Column[];
  temporal: Column[];
  geo: Column[];
  category: Column[];
} {
  const dimensions = getDimensions(dataset);
  return {
    metrics: dataset.cols.filter(isMetric),
    dimensions,
    temporal: dimensions.filter(isTemporal),
    geo: dimensions.filter(isGeo),
    category: dimensions.filter((c) => !isTemporal(c) && !isGeo(c)),
  };
}
