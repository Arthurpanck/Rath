// Option lists and per-chart tab layout for the settings panel.

import type { ConditionOp, GaugeRange, SortOrder } from "../../viz/settings";
import type { VizId } from "../../viz/registry";
import { ACCENT_COLORS } from "../../viz/options/constants";

export const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "none", label: "Ordre des données" },
  { value: "dim-asc", label: "Dimension ↑" },
  { value: "dim-desc", label: "Dimension ↓" },
  { value: "value-asc", label: "Valeur ↑" },
  { value: "value-desc", label: "Valeur ↓" },
];

// Which tabs Metabase shows for each viz.
export const TABS: Record<VizId, string[]> = {
  bar: ["Données", "Affichage", "Axes"],
  line: ["Données", "Affichage", "Axes"],
  area: ["Données", "Affichage", "Axes"],
  combo: ["Données", "Affichage", "Axes"],
  row: ["Données", "Affichage", "Axes"],
  scatter: ["Données", "Affichage", "Axes"],
  waterfall: ["Données", "Affichage", "Axes"],
  boxplot: ["Données", "Affichage", "Axes"],
  pie: ["Données", "Affichage"],
  smartscalar: ["Données", "Affichage"],
  progress: ["Données", "Mise en forme"],
  scalar: ["Mise en forme", "Couleurs"],
  gauge: ["Données", "Plages", "Mise en forme"],
  sankey: ["Données"],
  map: ["Données"],
  pivot: ["Données"],
  treemap: ["Données", "Affichage"],
  table: ["Couleurs"],
  object: ["Données"],
};

export const COND_OPS: { value: ConditionOp; label: string }[] = [
  { value: ">", label: "Supérieur à" },
  { value: ">=", label: "Supérieur ou égal à" },
  { value: "<", label: "Inférieur à" },
  { value: "<=", label: "Inférieur ou égal à" },
  { value: "=", label: "Égal à" },
  { value: "!=", label: "Différent de" },
];

/** The gauge's starting bands: red below half the goal, amber up to it, green past it. */
export const DEFAULT_RANGES: GaugeRange[] = [
  { color: ACCENT_COLORS[3], label: "", min: 0, max: 0.5 },
  { color: ACCENT_COLORS[4], label: "", min: 0.5, max: 1 },
  { color: ACCENT_COLORS[1], label: "", min: 1, max: 2 },
];

