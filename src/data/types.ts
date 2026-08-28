// Minimal, Metabase-inspired data model — decoupled from any Metabase code.
// Metabase uses `cols` (DatasetColumn[]) + `rows` (RowValue[][]); we mirror that
// shape so the chart builders read like Metabase's, but with our own simple types.

export type ColumnType = "number" | "string" | "date" | "boolean";

export interface Column {
  /** Machine name (CSV header). */
  name: string;
  /** Human label shown in the UI (defaults to `name`). */
  display_name: string;
  /** Inferred base type, drives dimension/metric detection. */
  base_type: ColumnType;
  /** Position in each row tuple. */
  index: number;
}

export interface Dataset {
  cols: Column[];
  rows: unknown[][];
}

/** A column is a "metric" (candidate Y value) when it is numeric. */
export const isMetric = (col: Column): boolean => col.base_type === "number";

/** A column is a "dimension" (candidate X / grouping) when it is not numeric. */
export const isDimension = (col: Column): boolean => col.base_type !== "number";

export const getMetrics = (dataset: Dataset): Column[] => dataset.cols.filter(isMetric);
export const getDimensions = (dataset: Dataset): Column[] => dataset.cols.filter(isDimension);

/**
 * Metabase-style default dimension/metric split:
 * - dimension = first non-numeric column, else the first column (e.g. a year id);
 * - metrics = numeric columns, excluding whatever was chosen as the dimension,
 *   so a numeric x-axis column is never also plotted as a series.
 */
export function analyzeShape(dataset: Dataset): { dimension: Column; metrics: Column[] } {
  const dims = getDimensions(dataset);
  const dimension = dims[0] ?? dataset.cols[0];
  const metrics = getMetrics(dataset).filter((m) => m.index !== dimension.index);
  return { dimension, metrics };
}

/**
 * Separator for composite keys built by joining several cell values into one
 * string (grouping, pivoting). NUL cannot occur in CSV data, so a key can never
 * collide with a value that happens to contain the separator.
 *
 * Metabase does the same, in echarts/cartesian/constants/dataset.ts. Write it as
 * an escape, never as a literal NUL byte: a raw NUL makes the file register as
 * binary, and grep then silently skips it.
 */
export const NULL_CHAR = "\0";
