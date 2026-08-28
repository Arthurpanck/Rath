// The "Couleurs conditionnelles" tab: rules that recolour a cell — or a whole
// row — when its value satisfies a comparison.

import { ActionIcon, Anchor, Group, NumberInput, Select, Stack, Switch, Text } from "@mantine/core";
import type { ColorRule, ConditionOp } from "../../../viz/settings";
import { ACCENT_COLORS, MB_COLORS } from "../../../viz/options/constants";
import { ColorDot } from "../primitives";
import { COND_OPS } from "../constants";
import type { ConditionalColorsTabProps } from "../types";

export function ConditionalColorsTab({
  vizId,
  settings,
  onChange,
  allCols,
}: ConditionalColorsTabProps) {
  const rules: ColorRule[] = settings.colorRules ?? [];
  const update = (i: number, p: Partial<ColorRule>) =>
    onChange({ colorRules: rules.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  const remove = (i: number) => onChange({ colorRules: rules.filter((_, j) => j !== i) });
  const add = () =>
    onChange({
      colorRules: [
        ...rules,
        { column: allCols[0]?.value, operator: ">", value: 0, color: ACCENT_COLORS[3] },
      ],
    });

  return (
    <Stack gap="md">
      <Text fz="xs" style={{ color: MB_COLORS.textTertiary }}>
        Colorez {vizId === "table" ? "les cellules ou les lignes" : "la valeur"} selon une
        condition.
      </Text>

      {rules.map((r, i) => (
        <Stack
          key={i}
          gap={6}
          style={{ border: `1px solid ${MB_COLORS.border}`, borderRadius: 8, padding: 10 }}
        >
          <Group justify="space-between">
            <Text fz="xs" fw={700} style={{ color: MB_COLORS.textTertiary }}>
              Règle {i + 1}
            </Text>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              aria-label="Supprimer la règle"
              onClick={() => remove(i)}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </ActionIcon>
          </Group>
          <Select
            size="xs"
            label="Colonne"
            data={allCols}
            value={r.column ?? null}
            onChange={(v) => v && update(i, { column: v })}
            allowDeselect={false}
            comboboxProps={{ withinPortal: true }}
          />
          <Group grow gap="xs">
            <Select
              size="xs"
              label="Condition"
              data={COND_OPS}
              value={r.operator}
              onChange={(v) => v && update(i, { operator: v as ConditionOp })}
              allowDeselect={false}
              comboboxProps={{ withinPortal: true }}
            />
            <NumberInput
              size="xs"
              label="Valeur"
              hideControls
              value={r.value}
              onChange={(v) => update(i, { value: Number(v) || 0 })}
            />
          </Group>
          <Group gap={10} wrap="nowrap" mt={4}>
            <ColorDot value={r.color} onChange={(v) => update(i, { color: v })} />
            <Text fz="sm" style={{ flex: 1, color: MB_COLORS.textPrimary }}>
              Couleur
            </Text>
          </Group>
          {vizId === "table" && (
            <Switch
              size="sm"
              checked={!!r.wholeRow}
              label="Colorer toute la ligne"
              onChange={(e) => update(i, { wholeRow: e.currentTarget.checked })}
            />
          )}
        </Stack>
      ))}

      <Anchor
        component="button"
        type="button"
        fz="sm"
        fw={700}
        style={{ color: MB_COLORS.brand, alignSelf: "flex-start" }}
        onClick={add}
      >
        Ajouter une règle
      </Anchor>
    </Stack>
  );
}
