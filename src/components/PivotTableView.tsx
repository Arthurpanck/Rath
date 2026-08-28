import { Table, Text } from "@mantine/core";
import type { Dataset } from "../data/types";
import { getDimensions, getMetrics } from "../data/types";
import type { Aggregation, VizSettings } from "../viz/settings";
import { findColumn } from "../viz/settings";
import { MB_COLORS } from "../viz/options/constants";

const nf = (v: number | null) => (v == null ? "" : Intl.NumberFormat("fr-FR").format(v));

function agg(values: number[], a: Aggregation): number | null {
  if (a === "count") return values.length;
  if (values.length === 0) return null;
  switch (a) {
    case "mean":
      return values.reduce((s, v) => s + v, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "distinct":
      return new Set(values).size;
    default:
      return values.reduce((s, v) => s + v, 0);
  }
}

export function PivotTableView({ dataset, settings }: { dataset: Dataset; settings: VizSettings }) {
  const dims = getDimensions(dataset);
  const rowCol = findColumn(dataset, settings.rowField) ?? dims[0];
  const colCol = findColumn(dataset, settings.colField) ?? dims[1] ?? dims[0];
  const metric = findColumn(dataset, settings.metrics?.[0]) ?? getMetrics(dataset)[0];

  if (!rowCol || !colCol || rowCol.index === colCol.index || !metric) {
    return (
      <Text
        style={{ color: MB_COLORS.textTertiary, textAlign: "center", maxWidth: 380, fontSize: 14 }}
      >
        Le tableau croisé nécessite deux colonnes de catégories distinctes (lignes et colonnes) et
        une valeur numérique.
      </Text>
    );
  }

  const uniq = (idx: number) => [...new Set(dataset.rows.map((r) => String(r[idx])))];
  const rowVals = uniq(rowCol.index);
  const colVals = uniq(colCol.index);

  const cell = (rv: string, cv: string) => {
    const vals = dataset.rows
      .filter((r) => String(r[rowCol.index]) === rv && String(r[colCol.index]) === cv)
      .map((r) => Number(r[metric.index]))
      .filter((v) => !isNaN(v));
    return agg(vals, settings.aggregation);
  };
  const rowTotal = (rv: string) => {
    const vals = dataset.rows
      .filter((r) => String(r[rowCol.index]) === rv)
      .map((r) => Number(r[metric.index]))
      .filter((v) => !isNaN(v));
    return agg(vals, settings.aggregation);
  };
  const colTotal = (cv: string) => {
    const vals = dataset.rows
      .filter((r) => String(r[colCol.index]) === cv)
      .map((r) => Number(r[metric.index]))
      .filter((v) => !isNaN(v));
    return agg(vals, settings.aggregation);
  };
  const grand = agg(
    dataset.rows.map((r) => Number(r[metric.index])).filter((v) => !isNaN(v)),
    settings.aggregation,
  );

  const th = {
    color: MB_COLORS.textSecondary,
    whiteSpace: "nowrap" as const,
    background: MB_COLORS.bgLight,
  };
  const totalStyle = {
    fontWeight: 700 as const,
    color: MB_COLORS.textPrimary,
    background: MB_COLORS.bgLight,
  };

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
      <Table
        stickyHeader
        withColumnBorders
        withRowBorders
        highlightOnHover
        verticalSpacing="xs"
        horizontalSpacing="md"
        style={{ fontSize: 13 }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ ...th, fontWeight: 700 }}>
              {rowCol.display_name} \ {colCol.display_name}
            </Table.Th>
            {colVals.map((cv) => (
              <Table.Th key={cv} style={{ ...th, textAlign: "right" }}>
                {cv}
              </Table.Th>
            ))}
            <Table.Th style={{ ...th, textAlign: "right", fontWeight: 700 }}>Total</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rowVals.map((rv) => (
            <Table.Tr key={rv}>
              <Table.Td
                style={{ fontWeight: 600, color: MB_COLORS.textPrimary, whiteSpace: "nowrap" }}
              >
                {rv}
              </Table.Td>
              {colVals.map((cv) => (
                <Table.Td key={cv} style={{ textAlign: "right", color: MB_COLORS.textPrimary }}>
                  {nf(cell(rv, cv))}
                </Table.Td>
              ))}
              <Table.Td style={{ ...totalStyle, textAlign: "right" }}>{nf(rowTotal(rv))}</Table.Td>
            </Table.Tr>
          ))}
          <Table.Tr>
            <Table.Td style={totalStyle}>Total</Table.Td>
            {colVals.map((cv) => (
              <Table.Td key={cv} style={{ ...totalStyle, textAlign: "right" }}>
                {nf(colTotal(cv))}
              </Table.Td>
            ))}
            <Table.Td style={{ ...totalStyle, textAlign: "right" }}>{nf(grand)}</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </div>
  );
}
