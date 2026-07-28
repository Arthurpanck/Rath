import Papa from "papaparse";
import type { Column, ColumnType, Dataset } from "./types";

const DATE_RE = /^\d{4}([-/]\d{1,2}){0,2}([ T]\d{1,2}:\d{2}(:\d{2})?)?$/;

function inferType(values: unknown[]): ColumnType {
  const sample = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (sample.length === 0) return "string";

  const allNumbers = sample.every((v) => typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))));
  if (allNumbers) return "number";

  const allBooleans = sample.every((v) => v === true || v === false || v === "true" || v === "false");
  if (allBooleans) return "boolean";

  const allDates = sample.every((v) => typeof v === "string" && DATE_RE.test(v.trim()));
  if (allDates) return "date";

  return "string";
}

function coerce(value: unknown, type: ColumnType): unknown {
  if (value === null || value === undefined || value === "") return null;
  switch (type) {
    case "number":
      return typeof value === "number" ? value : Number(value);
    case "boolean":
      return value === true || value === "true";
    default:
      return value;
  }
}

/**
 * Parse a raw CSV string into our Metabase-shaped Dataset, inferring column
 * types the way Metabase does (numeric → metric, everything else → dimension).
 */
export function parseCsv(text: string): Dataset {
  const result = Papa.parse<Record<string, unknown>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  const rawRows = result.data;

  const columnValues: unknown[][] = headers.map((h) => rawRows.map((r) => r[h]));

  const cols: Column[] = headers.map((name, index) => {
    const base_type = inferType(columnValues[index]);
    return { name, display_name: name, base_type, index };
  });

  const rows: unknown[][] = rawRows.map((r) => cols.map((c) => coerce(r[c.name], c.base_type)));

  return { cols, rows };
}
