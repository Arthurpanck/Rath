// The "Affichage" tab: how the chart draws what it was given — stacking, data
// labels, legend, goal line, and the per-chart display options.

import { Group, MultiSelect, NumberInput, Select, Stack, Switch, Text } from "@mantine/core";
import type {
  LabelFormatting,
  PieLabelDisplay,
  PiePercent,
  PieValueFormat,
  QuartileStyle,
  Stacking,
} from "../../../viz/settings";
import { GOAL_VIZ, LEGEND_VIZ, TREND_LINE_VIZ } from "../../../viz/families";
import { MB_COLORS } from "../../../viz/options/constants";
import { ColorDot, Label, Seg } from "../primitives";
import type { AffichageTabProps } from "../types";

export function AffichageTab({
  vizId,
  settings,
  onChange,
  isCartesian,
  allCols,
}: AffichageTabProps) {
  const tooltipOptions = allCols.filter((o) => o.value !== settings.dimension);
  return (
    <Stack gap="md">
      {/* Empilement: available for every cartesian chart, including Courbe. */}
      {isCartesian && (
        <>
          <Seg<Stacking>
            label="Empilement"
            value={settings.stacking}
            onChange={(v) => onChange({ stacking: v })}
            data={[
              { label: "Ne pas empiler", value: "none" },
              { label: "Empiler", value: "stacked" },
              { label: "100 %", value: "normalized" },
            ]}
          />
          {settings.stacking !== "none" && (
            <Switch
              size="sm"
              checked={settings.showStackTotals}
              label="Afficher les totaux d'empilement"
              onChange={(e) => onChange({ showStackTotals: e.currentTarget.checked })}
            />
          )}
        </>
      )}

      {GOAL_VIZ.includes(vizId) && (
        <NumberInput
          label="Ligne d'objectif"
          placeholder="aucun"
          value={settings.goalValue ?? undefined}
          onChange={(v) => onChange({ goalValue: v === "" || v == null ? null : Number(v) })}
          size="sm"
          hideControls
        />
      )}

      {(isCartesian || vizId === "waterfall") && (
        <Switch
          size="sm"
          checked={settings.showValues}
          label="Afficher les valeurs sur les points de données"
          onChange={(e) => onChange({ showValues: e.currentTarget.checked })}
        />
      )}

      {isCartesian && (
        <Seg<LabelFormatting>
          label="Mise en forme automatique"
          value={settings.labelFormatting}
          onChange={(v) => onChange({ labelFormatting: v })}
          data={[
            { label: "Auto", value: "auto" },
            { label: "Compact", value: "compact" },
            { label: "Complet", value: "full" },
          ]}
        />
      )}

      {TREND_LINE_VIZ.includes(vizId) && (
        <Switch
          size="sm"
          checked={settings.showTrendline}
          label="Courbe de tendance"
          onChange={(e) => onChange({ showTrendline: e.currentTarget.checked })}
        />
      )}

      {isCartesian && tooltipOptions.length > 0 && (
        <MultiSelect
          label="Colonnes d'infobulle supplémentaires"
          placeholder="aucune"
          data={tooltipOptions}
          value={settings.tooltipColumns}
          onChange={(v) => onChange({ tooltipColumns: v })}
          comboboxProps={{ withinPortal: true }}
          size="sm"
          clearable
        />
      )}

      {LEGEND_VIZ.includes(vizId) && (
        <Switch
          size="sm"
          checked={settings.showLegend}
          label="Afficher la légende"
          onChange={(e) => onChange({ showLegend: e.currentTarget.checked })}
        />
      )}

      {vizId === "waterfall" && (
        <>
          <Stack gap={6}>
            <Label>Augmentation/Diminution (optionnel)</Label>
            <Group gap={10} wrap="nowrap">
              <ColorDot
                value={settings.increaseColor}
                onChange={(v) => onChange({ increaseColor: v })}
              />
              <Text fz="sm" style={{ flex: 1, color: MB_COLORS.textPrimary }}>
                Augmentation
              </Text>
            </Group>
            <Group gap={10} wrap="nowrap">
              <ColorDot
                value={settings.decreaseColor}
                onChange={(v) => onChange({ decreaseColor: v })}
              />
              <Text fz="sm" style={{ flex: 1, color: MB_COLORS.textPrimary }}>
                Diminution
              </Text>
            </Group>
          </Stack>
          <Switch
            size="sm"
            checked={settings.showTotalColumn}
            label="Afficher la colonne de total"
            onChange={(e) => onChange({ showTotalColumn: e.currentTarget.checked })}
          />
        </>
      )}

      {vizId === "pie" && (
        <>
          <Switch
            size="sm"
            checked={settings.pieDonut}
            label="Anneau (donut)"
            onChange={(e) => onChange({ pieDonut: e.currentTarget.checked })}
          />
          {settings.pieDonut && (
            <Switch
              size="sm"
              checked={settings.pieShowTotal}
              label="Afficher le total au centre"
              onChange={(e) => onChange({ pieShowTotal: e.currentTarget.checked })}
            />
          )}
          <Seg<PieLabelDisplay>
            label="Affichage des étiquettes"
            value={settings.pieLabelDisplay}
            onChange={(v) => onChange({ pieLabelDisplay: v })}
            data={[
              { label: "Automatique", value: "auto" },
              { label: "Visible", value: "on" },
              { label: "Masqué", value: "off" },
            ]}
          />
          <Seg<PieValueFormat>
            label="Format des valeurs"
            value={settings.pieValueFormat}
            onChange={(v) => onChange({ pieValueFormat: v })}
            data={[
              { label: "Pourcentage", value: "percent" },
              { label: "Valeur", value: "value" },
              { label: "Valeur + %", value: "both" },
            ]}
          />
          <Select
            label="Pourcentages"
            data={[
              { value: "off", label: "Masqués" },
              { value: "chart", label: "Sur le graphique" },
              { value: "legend", label: "Dans la légende" },
              { value: "both", label: "Les deux" },
            ]}
            value={settings.pieShowPercent}
            onChange={(v) => v && onChange({ pieShowPercent: v as PiePercent })}
            allowDeselect={false}
            comboboxProps={{ withinPortal: true }}
            size="sm"
          />
        </>
      )}

      {vizId === "boxplot" && (
        <>
          <Switch
            size="sm"
            checked={settings.showOutliers}
            label="Afficher les valeurs extrêmes"
            onChange={(e) => onChange({ showOutliers: e.currentTarget.checked })}
          />
          <Seg<QuartileStyle>
            label="Style des quartiles"
            value={settings.quartileStyle}
            onChange={(v) => onChange({ quartileStyle: v })}
            data={[
              { label: "Boîte", value: "box" },
              { label: "Ligne", value: "line" },
            ]}
          />
        </>
      )}

      {vizId === "scatter" && (
        <Switch
          size="sm"
          checked={settings.scatterShowLabels}
          label="Afficher les étiquettes des points"
          onChange={(e) => onChange({ scatterShowLabels: e.currentTarget.checked })}
        />
      )}

      {vizId === "treemap" && (
        <>
          <Switch
            size="sm"
            checked={settings.treemapShowPercent}
            label="Afficher les pourcentages"
            onChange={(e) => onChange({ treemapShowPercent: e.currentTarget.checked })}
          />
          <Switch
            size="sm"
            checked={settings.treemapShowLeafLabels}
            label="Afficher les libellés des feuilles"
            onChange={(e) => onChange({ treemapShowLeafLabels: e.currentTarget.checked })}
          />
          <Switch
            size="sm"
            checked={settings.treemapShowLeafValues}
            label="Afficher les valeurs des feuilles"
            onChange={(e) => onChange({ treemapShowLeafValues: e.currentTarget.checked })}
          />
          <Switch
            size="sm"
            checked={settings.treemapShowParentLabels}
            label="Afficher les libellés des parents"
            onChange={(e) => onChange({ treemapShowParentLabels: e.currentTarget.checked })}
          />
          <Switch
            size="sm"
            checked={settings.treemapShowParentValues}
            label="Afficher les valeurs des parents"
            onChange={(e) => onChange({ treemapShowParentValues: e.currentTarget.checked })}
          />
        </>
      )}

      {vizId === "smartscalar" && (
        <Switch
          size="sm"
          checked={settings.showValues}
          label="Afficher la valeur de comparaison"
          onChange={(e) => onChange({ showValues: e.currentTarget.checked })}
        />
      )}
    </Stack>
  );
}
