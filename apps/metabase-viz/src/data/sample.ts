import type { Dataset } from "./types";

// Mirrors the "Nombre de commandes regroupées par Année" example seen in the
// Metabase builder, so the app has something to render before a CSV is imported.
export const SAMPLE_CSV = `Année,Commandes,Revenu
2017,150,32000
2018,235,54000
2019,201,61000
2020,188,58000
2021,301,92000`;

export const SAMPLE_DATASET: Dataset = {
  cols: [
    { name: "Année", display_name: "Année", base_type: "string", index: 0 },
    { name: "Commandes", display_name: "Commandes", base_type: "number", index: 1 },
    { name: "Revenu", display_name: "Revenu", base_type: "number", index: 2 },
  ],
  rows: [
    ["2017", 150, 32000],
    ["2018", 235, 54000],
    ["2019", 201, 61000],
    ["2020", 188, 58000],
    ["2021", 301, 92000],
  ],
};
