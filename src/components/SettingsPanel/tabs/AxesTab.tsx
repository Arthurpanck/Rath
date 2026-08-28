// The "Axes" tab: scale, range and titles for the value and dimension axes.

import { Group, NumberInput, Select, Stack, Switch, Text, TextInput } from "@mantine/core";
import type { XScale, YScale } from "../../../viz/settings";
import { MB_COLORS } from "../../../viz/options/constants";
import { Seg } from "../primitives";
import type { TabProps } from "../types";

export function AxesTab({ settings, onChange }: TabProps) {
  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <Text fw={700} tt="uppercase" fz="xs" style={{ color: MB_COLORS.textTertiary }}>
          Axe X
        </Text>
        <Switch
          size="sm"
          checked={settings.xShowTitle}
          label="Afficher le libellé"
          onChange={(e) => onChange({ xShowTitle: e.currentTarget.checked })}
        />
        {settings.xShowTitle && (
          <TextInput
            size="sm"
            placeholder="Libellé de l'axe X"
            value={settings.xAxisTitle ?? ""}
            onChange={(e) => onChange({ xAxisTitle: e.currentTarget.value || undefined })}
          />
        )}
        <Switch
          size="sm"
          checked={settings.xShowLine}
          label="Afficher les lignes et les graduations"
          onChange={(e) =>
            onChange({ xShowLine: e.currentTarget.checked, xAxisEnabled: e.currentTarget.checked })
          }
        />
        <Select
          label="Échelle"
          size="sm"
          data={[
            { value: "auto", label: "Automatique" },
            { value: "ordinal", label: "Ordinale" },
            { value: "linear", label: "Linéaire" },
            { value: "timeseries", label: "Chronologique" },
          ]}
          value={settings.xScale}
          onChange={(v) => v && onChange({ xScale: v as XScale })}
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
        />
      </Stack>

      <Stack gap="sm">
        <Text fw={700} tt="uppercase" fz="xs" style={{ color: MB_COLORS.textTertiary }}>
          Axe Y
        </Text>
        <Switch
          size="sm"
          checked={settings.yShowTitle}
          label="Afficher le libellé"
          onChange={(e) => onChange({ yShowTitle: e.currentTarget.checked })}
        />
        {settings.yShowTitle && (
          <TextInput
            size="sm"
            placeholder="Libellé de l'axe Y"
            value={settings.yAxisTitle ?? ""}
            onChange={(e) => onChange({ yAxisTitle: e.currentTarget.value || undefined })}
          />
        )}
        <Switch
          size="sm"
          checked={settings.yShowLine}
          label="Afficher les lignes et les graduations"
          onChange={(e) =>
            onChange({ yShowLine: e.currentTarget.checked, yAxisEnabled: e.currentTarget.checked })
          }
        />
        <Seg<YScale>
          label="Échelle"
          value={settings.yScale}
          onChange={(v) => onChange({ yScale: v })}
          data={[
            { label: "Linéaire", value: "linear" },
            { label: "Logarithmique", value: "log" },
          ]}
        />
        <Switch
          size="sm"
          checked={settings.yAutoRange}
          label="Plage automatique de l'axe des ordonnées"
          onChange={(e) => onChange({ yAutoRange: e.currentTarget.checked })}
        />
        {!settings.yAutoRange ? (
          <Group grow gap="xs">
            <NumberInput
              label="Min"
              size="sm"
              hideControls
              value={settings.yMin ?? undefined}
              onChange={(v) => onChange({ yMin: v === "" || v == null ? null : Number(v) })}
            />
            <NumberInput
              label="Max"
              size="sm"
              hideControls
              value={settings.yMax ?? undefined}
              onChange={(v) => onChange({ yMax: v === "" || v == null ? null : Number(v) })}
            />
          </Group>
        ) : (
          <Switch
            size="sm"
            checked={settings.unpinFromZero}
            label="Détacher de zéro"
            onChange={(e) => onChange({ unpinFromZero: e.currentTarget.checked })}
          />
        )}
        <NumberInput
          label="Nombre de graduations"
          size="sm"
          placeholder="auto"
          min={2}
          max={20}
          value={settings.ySplitNumber ?? undefined}
          onChange={(v) => onChange({ ySplitNumber: v === "" || v == null ? null : Number(v) })}
        />
      </Stack>
    </Stack>
  );
}
