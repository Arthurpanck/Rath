import { Table } from "@mantine/core";
import type { Dataset } from "../data/types";
import { nf2 } from "../viz/format";
import { MB_COLORS } from "../viz/options/constants";

const nf = (v: unknown) => (typeof v === "number" ? nf2(v) : String(v ?? ""));

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

  const headerCell = {
    background: MB_COLORS.tableHeaderBg,
    color: MB_COLORS.tableHeaderText,
    fontWeight: 700,
    fontSize: 12,
    whiteSpace: "nowrap" as const,
    borderBottom: `1px solid ${MB_COLORS.border}`,
    padding: "10px 16px",
  };

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto" }} className="mb-table">
      <style>{`.mb-table tbody tr:hover td { background: ${MB_COLORS.tableRowHover}; }`}</style>
      <Table stickyHeader verticalSpacing={0} horizontalSpacing={0} style={{ fontSize: 13, borderCollapse: "separate", borderSpacing: 0 }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ ...headerCell, color: MB_COLORS.textTertiary, textAlign: "center", width: 52 }}>_mb_row_id</Table.Th>
            {dataset.cols.map((c) => (
              <Table.Th key={c.name} style={{ ...headerCell, textAlign: c.base_type === "number" ? "right" : "left" }}>
                {c.display_name}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {dataset.rows.map((row, i) => (
            <Table.Tr key={i}>
              <Table.Td style={{ textAlign: "center", padding: "6px 12px", borderBottom: `1px solid ${MB_COLORS.tableRowBorder}` }}>
                <span
                  style={{
                    display: "inline-flex",
                    minWidth: 22,
                    justifyContent: "center",
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: MB_COLORS.tableIdBg,
                    color: MB_COLORS.brand,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {i + 1}
                </span>
              </Table.Td>
              {dataset.cols.map((c) => (
                <Table.Td
                  key={c.name}
                  style={{
                    color: MB_COLORS.textPrimary,
                    textAlign: c.base_type === "number" ? "right" : "left",
                    padding: "8px 16px",
                    whiteSpace: "nowrap",
                    borderBottom: `1px solid ${MB_COLORS.tableRowBorder}`,
                  }}
                >
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
