import { Table } from "@mantine/core";
import type { Dataset } from "../data/types";
import { MB_COLORS } from "../viz/options/constants";

const nf = (v: unknown) => (typeof v === "number" ? Intl.NumberFormat("fr-FR").format(v) : String(v ?? ""));

export function DataTable({ dataset, detail = false }: { dataset: Dataset; detail?: boolean }) {
  if (detail) {
    // "Visualisation détaillée": show the first row as key/value pairs.
    const row = dataset.rows[0] ?? [];
    return (
      <div style={{ width: "100%", maxWidth: 520, padding: 24 }}>
        <Table verticalSpacing="sm" striped withRowBorders>
          <Table.Tbody>
            {dataset.cols.map((c) => (
              <Table.Tr key={c.name}>
                <Table.Td style={{ color: MB_COLORS.textTertiary, fontWeight: 700, textTransform: "uppercase", fontSize: 11, width: "40%" }}>
                  {c.display_name}
                </Table.Td>
                <Table.Td style={{ color: MB_COLORS.textPrimary }}>{nf(row[c.index])}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
      <Table stickyHeader highlightOnHover verticalSpacing="xs" horizontalSpacing="md" style={{ fontSize: 13 }}>
        <Table.Thead>
          <Table.Tr>
            {dataset.cols.map((c) => (
              <Table.Th key={c.name} style={{ color: MB_COLORS.textSecondary, whiteSpace: "nowrap" }}>
                {c.display_name}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {dataset.rows.map((row, i) => (
            <Table.Tr key={i}>
              {dataset.cols.map((c) => (
                <Table.Td key={c.name} style={{ color: MB_COLORS.textPrimary, textAlign: c.base_type === "number" ? "right" : "left" }}>
                  {nf(row[c.index])}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}
