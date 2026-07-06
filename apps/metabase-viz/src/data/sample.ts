import type { Dataset } from "./types";

// Mirrors the "Nombre de commandes regroupées par Année" example seen in the
// Metabase builder, so the app has something to render before a CSV is imported.
export const SAMPLE_CSV = `Année,Commandes,Revenu
2017,150,32000
2018,235,54000
2019,201,61000
2020,188,58000
2021,301,92000`;

// A monthly time series to exercise the real date axis.
export const SAMPLE_DATES_CSV = `Date,Visiteurs,Conversions
2023-01-01,1200,84
2023-02-01,1350,97
2023-03-01,1580,120
2023-04-01,1490,110
2023-05-01,1720,140
2023-06-01,1980,165
2023-07-01,2100,178
2023-08-01,1950,160
2023-09-01,2240,195
2023-10-01,2510,220
2023-11-01,2680,240
2023-12-01,3020,275`;

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
