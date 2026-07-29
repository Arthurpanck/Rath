import { Text } from "@mantine/core";
import type { Column, Dataset } from "../data/types";
import { analyzeShape } from "../data/types";
import type { VizSettings } from "../viz/settings";
import { findColumn, resolveShape } from "../viz/settings";
import { formatNumber } from "../viz/format";
import { MB_COLORS } from "../viz/options/constants";

const nf = (v: number) => Intl.NumberFormat("fr-FR").format(v);

export function ScalarView({ dataset, settings, column }: { dataset: Dataset; settings: VizSettings; column?: Column }) {
  const metric = findColumn(dataset, settings.scalarField) ?? column ?? analyzeShape(dataset).metrics[0];
  const raw = metric ? Number(dataset.rows[0]?.[metric.index]) : NaN;
  const value = isNaN(raw) ? "—" : formatNumber(raw, settings.numberFormat);
  return (
    <div style={{ textAlign: "center" }}>
      <Text fw={700} style={{ fontSize: 64, lineHeight: 1.05, color: MB_COLORS.textPrimary }}>
        {value}
      </Text>
      {metric && (
        <Text style={{ fontSize: 15, color: MB_COLORS.textTertiary, marginTop: 8 }}>{metric.display_name}</Text>
      )}
    </div>
  );
}

export function TrendView({ dataset, settings }: { dataset: Dataset; settings: VizSettings }) {
  const metric = resolveShape(dataset, settings).metrics[0];
  const values = dataset.rows.map((r) => Number(r[metric?.index])).filter((v) => !isNaN(v));
  const last = values[values.length - 1] ?? 0;
  const prev = values[values.length - 2] ?? last;
  const delta = prev === 0 ? 0 : ((last - prev) / Math.abs(prev)) * 100;
  const up = delta >= 0;
  return (
    <div style={{ textAlign: "center" }}>
      <Text fw={700} style={{ fontSize: 60, lineHeight: 1.05, color: MB_COLORS.textPrimary }}>{nf(last)}</Text>
      <Text style={{ fontSize: 16, marginTop: 6, color: up ? "#88BF4D" : "#EF8C8C", fontWeight: 700 }}>
        {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
      </Text>
      <Text style={{ fontSize: 13, color: MB_COLORS.textTertiary, marginTop: 4 }}>
        vs. période précédente
      </Text>
    </div>
  );
}
