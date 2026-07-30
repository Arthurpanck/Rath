import { Text } from "@mantine/core";
import type { Column, Dataset } from "../data/types";
import { analyzeShape } from "../data/types";
import type { VizSettings } from "../viz/settings";
import { findColumn, resolveShape } from "../viz/settings";
import { formatNumber, matchColorRule } from "../viz/format";
import { MB_COLORS } from "../viz/options/constants";

export function ScalarView({ dataset, settings, column }: { dataset: Dataset; settings: VizSettings; column?: Column }) {
  const metric = findColumn(dataset, settings.scalarField) ?? column ?? analyzeShape(dataset).metrics[0];
  const raw = metric ? Number(dataset.rows[0]?.[metric.index]) : NaN;
  const value = isNaN(raw) ? "—" : formatNumber(raw, settings.numberFormat);
  const ruleColor = isNaN(raw) ? undefined : matchColorRule(raw, settings.colorRules);
  return (
    <div style={{ textAlign: "center" }}>
      <Text fw={700} style={{ fontSize: 64, lineHeight: 1.05, color: ruleColor ?? MB_COLORS.textPrimary }}>
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

  // One row per entry in the "Comparaisons" list.
  const COMP_LABEL = { previous: "valeur précédente", first: "première valeur", average: "moyenne de la série" } as const;
  const baseFor = (kind: (typeof settings.comparisons)[number]): number => {
    if (kind === "first") return values[0] ?? last;
    if (kind === "average") return values.length ? values.reduce((s, v) => s + v, 0) / values.length : last;
    return values[values.length - 2] ?? last;
  };

  return (
    <div style={{ textAlign: "center" }}>
      <Text fw={700} style={{ fontSize: 60, lineHeight: 1.05, color: MB_COLORS.textPrimary }}>
        {formatNumber(last, settings.numberFormat)}
      </Text>
      {(settings.comparisons ?? ["previous"]).map((kind, i) => {
        const base = baseFor(kind);
        const delta = base === 0 ? 0 : ((last - base) / Math.abs(base)) * 100;
        const up = delta >= 0;
        return (
          <div key={`${kind}-${i}`} style={{ marginTop: i === 0 ? 6 : 2 }}>
            <Text component="span" style={{ fontSize: 16, color: up ? "#88BF4D" : "#EF8C8C", fontWeight: 700 }}>
              {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
            </Text>
            <Text component="span" style={{ fontSize: 13, color: MB_COLORS.textTertiary, marginLeft: 6 }}>
              vs. {COMP_LABEL[kind]}
              {settings.showValues ? ` (${formatNumber(base, settings.numberFormat)})` : ""}
            </Text>
          </div>
        );
      })}
    </div>
  );
}
