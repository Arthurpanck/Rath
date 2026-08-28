// The "Données" tab: which columns feed the chart. Every chart type has its own
// field set, so this branches on vizId before falling back to the cartesian
// dimension + series layout.

import { ActionIcon, Anchor, Group, NumberInput, Select, Stack, Text } from "@mantine/core";
import type { ComparisonType, MapRegion, SortOrder } from "../../../viz/settings";
import { CARTESIAN_VIZ } from "../../../viz/families";
import { MAP_REGIONS } from "../../../viz/options/geo-sankey";
import { MB_COLORS } from "../../../viz/options/constants";
import { FieldSelect, Label } from "../primitives";
import { SeriesList } from "../SeriesList";
import { TreemapGroupList } from "../TreemapGroups";
import { SORT_OPTIONS } from "../constants";
import type { DonneesTabProps } from "../types";

export function DonneesTab({
  vizId,
  dataset,
  settings,
  onChange,
  allCols,
  dimOptions,
  metricOptions,
  activeMetrics,
}: DonneesTabProps) {
  if (vizId === "pie") {
    return (
      <Stack gap="md">
        <FieldSelect
          label="Mesure"
          value={settings.metrics?.[0] ?? activeMetrics[0]?.name}
          data={metricOptions}
          onPick={(v) => v && onChange({ metrics: [v] })}
        />
        <FieldSelect
          label="Dimension"
          value={settings.dimension}
          data={allCols}
          onPick={(v) => v && onChange({ dimension: v })}
        />
        <FieldSelect
          label="Anneau intérieur"
          value={settings.innerRing}
          data={dimOptions}
          onPick={(v) => onChange({ innerRing: v ?? undefined })}
          clearable
          placeholder="(optionnel)"
        />
        <FieldSelect
          label="Anneau extérieur"
          value={settings.outerRing}
          data={dimOptions}
          onPick={(v) => onChange({ outerRing: v ?? undefined })}
          clearable
          placeholder="(optionnel)"
        />
        <Select
          label="Tri"
          data={SORT_OPTIONS}
          value={settings.sort}
          onChange={(v) => v && onChange({ sort: v as SortOrder })}
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
          size="sm"
        />
      </Stack>
    );
  }
  if (vizId === "smartscalar") {
    const comparisons: ComparisonType[] = settings.comparisons ?? ["previous"];
    const COMP_LABEL: Record<ComparisonType, string> = {
      previous: "Valeur précédente",
      first: "Première valeur",
      average: "Moyenne de la série",
    };
    return (
      <Stack gap="md">
        <FieldSelect
          label="Nombre principal"
          value={settings.metrics?.[0] ?? activeMetrics[0]?.name}
          data={metricOptions}
          onPick={(v) => v && onChange({ metrics: [v] })}
        />
        <Stack gap={6}>
          <Label>Comparaisons</Label>
          {comparisons.map((c, i) => (
            <Group
              key={`${c}-${i}`}
              gap={6}
              wrap="nowrap"
              style={{
                border: `1px solid ${MB_COLORS.border}`,
                borderRadius: 8,
                padding: "4px 8px",
              }}
            >
              <Select
                size="xs"
                style={{ flex: 1 }}
                data={[
                  { value: "previous", label: COMP_LABEL.previous },
                  { value: "first", label: COMP_LABEL.first },
                  { value: "average", label: COMP_LABEL.average },
                ]}
                value={c}
                onChange={(v) =>
                  v &&
                  onChange({
                    comparisons: comparisons.map((x, j) => (j === i ? (v as ComparisonType) : x)),
                  })
                }
                allowDeselect={false}
                comboboxProps={{ withinPortal: true }}
              />
              {comparisons.length > 1 && (
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  aria-label="Retirer la comparaison"
                  onClick={() => onChange({ comparisons: comparisons.filter((_, j) => j !== i) })}
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
              )}
            </Group>
          ))}
          {comparisons.length < 3 && (
            <Anchor
              component="button"
              type="button"
              fz="sm"
              fw={700}
              style={{ color: MB_COLORS.brand, alignSelf: "flex-start" }}
              onClick={() => onChange({ comparisons: [...comparisons, "previous"] })}
            >
              Ajouter une comparaison
            </Anchor>
          )}
        </Stack>
      </Stack>
    );
  }
  if (vizId === "gauge" || vizId === "progress") {
    return (
      <Stack gap="md">
        <FieldSelect
          label="Nombre principal"
          value={settings.metrics?.[0] ?? activeMetrics[0]?.name}
          data={metricOptions}
          onPick={(v) => v && onChange({ metrics: [v] })}
        />
        <NumberInput
          label={vizId === "progress" ? "Objectif" : "Objectif (optionnel)"}
          placeholder="auto"
          size="sm"
          hideControls
          value={settings.goalValue ?? undefined}
          onChange={(v) => onChange({ goalValue: v === "" || v == null ? null : Number(v) })}
        />
      </Stack>
    );
  }
  if (vizId === "sankey") {
    return (
      <Stack gap="md">
        <FieldSelect
          label="Source"
          value={settings.sourceField}
          data={dimOptions}
          onPick={(v) => v && onChange({ sourceField: v })}
        />
        <FieldSelect
          label="Destination"
          value={settings.targetField}
          data={dimOptions}
          onPick={(v) => v && onChange({ targetField: v })}
        />
        <FieldSelect
          label="Mesure"
          value={settings.metrics?.[0]}
          data={metricOptions}
          onPick={(v) => v && onChange({ metrics: [v] })}
        />
      </Stack>
    );
  }
  if (vizId === "pivot") {
    return (
      <Stack gap="md">
        <FieldSelect
          label="Lignes"
          value={settings.rowField}
          data={dimOptions}
          onPick={(v) => v && onChange({ rowField: v })}
        />
        <FieldSelect
          label="Colonnes"
          value={settings.colField}
          data={dimOptions}
          onPick={(v) => v && onChange({ colField: v })}
        />
        <FieldSelect
          label="Mesure"
          value={settings.metrics?.[0]}
          data={metricOptions}
          onPick={(v) => v && onChange({ metrics: [v] })}
        />
      </Stack>
    );
  }
  if (vizId === "map") {
    return (
      <Stack gap="md">
        <Select
          label="Carte par région"
          size="sm"
          data={MAP_REGIONS.map((r) => ({ value: r.value, label: r.label }))}
          value={settings.mapRegion}
          onChange={(v) => v && onChange({ mapRegion: v as MapRegion })}
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
        />
        <FieldSelect
          label="Champ de région"
          value={settings.locationField}
          data={allCols}
          onPick={(v) => v && onChange({ locationField: v })}
          placeholder="Nom, code INSEE…"
        />
        <FieldSelect
          label="Champ de métrique"
          value={settings.metrics?.[0]}
          data={metricOptions}
          onPick={(v) => v && onChange({ metrics: [v] })}
        />
      </Stack>
    );
  }
  if (vizId === "scatter") {
    const xName = settings.metrics?.[0] ?? activeMetrics[0]?.name;
    const yName = settings.metrics?.[1] ?? activeMetrics[1]?.name ?? activeMetrics[0]?.name;
    return (
      <Stack gap="md">
        <FieldSelect
          label="Taille des bulles"
          value={settings.bubbleField}
          data={metricOptions}
          onPick={(v) => onChange({ bubbleField: v ?? undefined })}
          clearable
        />
        <FieldSelect
          label="Axe X"
          value={xName}
          data={metricOptions}
          onPick={(v) => v && onChange({ metrics: [v, yName].filter(Boolean) })}
        />
        <FieldSelect
          label="Axe Y"
          value={yName}
          data={metricOptions}
          onPick={(v) => v && onChange({ metrics: [xName, v].filter(Boolean) })}
        />
      </Stack>
    );
  }
  if (vizId === "waterfall") {
    return (
      <Stack gap="md">
        <FieldSelect
          label="Axe X (dimension)"
          value={settings.dimension}
          data={allCols}
          onPick={(v) => v && onChange({ dimension: v })}
        />
        <FieldSelect
          label="Mesure"
          value={settings.metrics?.[0] ?? activeMetrics[0]?.name}
          data={metricOptions}
          onPick={(v) => v && onChange({ metrics: [v] })}
        />
        <Select
          label="Tri"
          data={SORT_OPTIONS}
          value={settings.sort}
          onChange={(v) => v && onChange({ sort: v as SortOrder })}
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
          size="sm"
        />
      </Stack>
    );
  }
  if (vizId === "treemap") {
    return (
      <Stack gap="md">
        <Stack gap={6}>
          <FieldSelect
            label="Grouping"
            value={settings.dimension}
            data={dimOptions}
            onPick={(v) => v && onChange({ dimension: v, hiddenValues: [] })}
          />
          {/* The values of the grouping column, each with its own colour —
              this is the list Metabase shows indented under "Grouping". */}
          <TreemapGroupList dataset={dataset} settings={settings} onChange={onChange} />
        </Stack>
        <FieldSelect
          label="Sub-grouping"
          value={settings.breakout}
          data={dimOptions.filter((o) => o.value !== settings.dimension)}
          onPick={(v) => onChange({ breakout: v ?? undefined })}
          clearable
          placeholder="Sélectionner une colonne"
        />
        <FieldSelect
          label="Valeur"
          value={settings.metrics?.[0] ?? activeMetrics[0]?.name}
          data={metricOptions}
          onPick={(v) => v && onChange({ metrics: [v] })}
        />
      </Stack>
    );
  }
  if (vizId === "table" || vizId === "object") {
    return (
      <Text fz="sm" style={{ color: MB_COLORS.textTertiary }}>
        Aucune option de données pour ce type.
      </Text>
    );
  }

  // Cartesian family + boxplot. Row chart inverts the axis labels.
  const rowChart = vizId === "row";
  return (
    <Stack gap="lg">
      <FieldSelect
        label={`${rowChart ? "Axe Y" : "Axe X"} (dimension)`}
        value={settings.dimension}
        data={allCols}
        onPick={(v) => v && onChange({ dimension: v })}
      />
      <SeriesList
        vizId={vizId}
        settings={settings}
        onChange={onChange}
        activeMetrics={activeMetrics}
        metricOptions={metricOptions}
        label={rowChart ? "Axe X" : "Axe Y"}
      />
      {CARTESIAN_VIZ.includes(vizId) && (
        <Select
          label="Éclater par (2ᵉ dimension)"
          placeholder="aucun"
          data={dimOptions.filter((o) => o.value !== settings.dimension)}
          value={settings.breakout ?? null}
          onChange={(v) => onChange({ breakout: v ?? undefined })}
          clearable
          comboboxProps={{ withinPortal: true }}
          size="sm"
        />
      )}
      <Select
        label="Tri"
        data={SORT_OPTIONS}
        value={settings.sort}
        onChange={(v) => v && onChange({ sort: v as SortOrder })}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true }}
        size="sm"
      />
    </Stack>
  );
}
