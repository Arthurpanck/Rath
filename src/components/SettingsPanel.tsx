import {
  Box,
  Button,
  ColorInput,
  Divider,
  Group,
  NumberInput,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import type { Dataset } from "../data/types";
import { getDimensions, isMetric } from "../data/types";
import type { VizId } from "../viz/registry";
import { VIZ_BY_ID } from "../viz/registry";
import type { Aggregation, PiePercent, SortOrder, Stacking, VizSettings, YScale } from "../viz/settings";
import { resolveShape } from "../viz/settings";
import { buildFrame } from "../viz/frame";
import { settingsCapabilities } from "../viz/options";
import { seriesColor, MB_COLORS } from "../viz/options/constants";

const AGG_OPTIONS: { value: Aggregation; label: string }[] = [
  { value: "sum", label: "Somme" },
  { value: "mean", label: "Moyenne" },
  { value: "count", label: "Nombre (count)" },
  { value: "distinct", label: "Valeurs distinctes" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "none", label: "Ordre des données" },
  { value: "dim-asc", label: "Dimension ↑" },
  { value: "dim-desc", label: "Dimension ↓" },
  { value: "value-asc", label: "Valeur ↑" },
  { value: "value-desc", label: "Valeur ↓" },
];

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Text fw={700} tt="uppercase" fz="xs" style={{ color: MB_COLORS.textTertiary, letterSpacing: 0.4 }}>
    {children}
  </Text>
);

export function SettingsPanel({
  vizId,
  dataset,
  settings,
  onChange,
  onBack,
}: {
  vizId: VizId;
  dataset: Dataset;
  settings: VizSettings;
  onChange: (patch: Partial<VizSettings>) => void;
  onBack: () => void;
}) {
  const caps = settingsCapabilities(vizId);
  const def = VIZ_BY_ID[vizId];
  const { metrics: activeMetrics } = resolveShape(dataset, settings);

  const allColumnOptions = dataset.cols.map((c) => ({ value: c.name, label: c.display_name }));
  const dimColumns = getDimensions(dataset);
  const dimOptions = dimColumns.map((c) => ({ value: c.name, label: c.display_name }));
  const metricColumns = dataset.cols.filter(isMetric);
  const metricOptions = metricColumns.map((c) => ({ value: c.name, label: c.display_name }));

  const toggleMetric = (name: string) => {
    const current = settings.metrics ?? activeMetrics.map((m) => m.name);
    const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
    onChange({ metrics: next.length ? next : current });
  };

  // Color targets = the actual chart series (metrics, or breakout values).
  const colorTargets =
    vizId === "progress"
      ? activeMetrics.slice(0, 1).map((m) => ({ key: m.name, name: m.display_name }))
      : buildFrame(dataset, settings).series.map((s) => ({ key: s.key, name: s.name }));

  return (
    <Box
      style={{
        width: 300,
        borderRight: `1px solid ${MB_COLORS.border}`,
        background: MB_COLORS.white,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Group gap="xs" style={{ padding: "14px 16px", borderBottom: `1px solid ${MB_COLORS.border}` }}>
        <UnstyledButton onClick={onBack} aria-label="Retour" style={{ color: MB_COLORS.textSecondary, display: "inline-flex" }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </UnstyledButton>
        <Text fw={700} style={{ color: MB_COLORS.textPrimary }}>
          {def.name} · réglages
        </Text>
      </Group>

      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="lg" style={{ padding: 16 }}>
          {/* DONNÉES */}
          <Stack gap="sm">
            <SectionLabel>Données</SectionLabel>

            {caps.sankeyFields && (
              <>
                <Select label="Source" data={dimOptions} value={settings.sourceField ?? dimColumns[0]?.name ?? null} onChange={(v) => v && onChange({ sourceField: v })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
                <Select label="Cible" data={dimOptions} value={settings.targetField ?? dimColumns[1]?.name ?? null} onChange={(v) => v && onChange({ targetField: v })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
                <Select label="Valeur" data={metricOptions} value={settings.metrics?.[0] ?? metricColumns[0]?.name ?? null} onChange={(v) => v && onChange({ metrics: [v] })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
              </>
            )}

            {caps.pivotFields && (
              <>
                <Select label="Lignes" data={dimOptions} value={settings.rowField ?? dimColumns[0]?.name ?? null} onChange={(v) => v && onChange({ rowField: v })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
                <Select label="Colonnes" data={dimOptions} value={settings.colField ?? dimColumns[1]?.name ?? null} onChange={(v) => v && onChange({ colField: v })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
                <Select label="Valeur" data={metricOptions} value={settings.metrics?.[0] ?? metricColumns[0]?.name ?? null} onChange={(v) => v && onChange({ metrics: [v] })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
              </>
            )}

            {caps.mapFields && (
              <>
                <Select label="Localisation (pays / ISO-2)" data={allColumnOptions} value={settings.locationField ?? dimColumns[0]?.name ?? null} onChange={(v) => v && onChange({ locationField: v })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
                <Select label="Valeur" data={metricOptions} value={settings.metrics?.[0] ?? metricColumns[0]?.name ?? null} onChange={(v) => v && onChange({ metrics: [v] })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
              </>
            )}

            {caps.dimension && (
              <Select
                label="Axe X (dimension)"
                data={allColumnOptions}
                value={settings.dimension ?? null}
                onChange={(v) => v && onChange({ dimension: v })}
                allowDeselect={false}
                comboboxProps={{ withinPortal: true }}
                size="sm"
              />
            )}

            {caps.breakout && (
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

            {caps.metrics && caps.multiMetric && !settings.breakout && (
              <Stack gap={4}>
                <Text fz="sm" fw={500} style={{ color: MB_COLORS.textPrimary }}>Séries (valeurs)</Text>
                <Stack gap={2}>
                  {metricColumns.map((c) => {
                    const checked = activeMetrics.some((m) => m.name === c.name);
                    return (
                      <Switch key={c.name} size="sm" checked={checked} label={c.display_name} onChange={() => toggleMetric(c.name)} disabled={checked && activeMetrics.length === 1} />
                    );
                  })}
                  {metricColumns.length === 0 && <Text fz="xs" style={{ color: MB_COLORS.textTertiary }}>Aucune colonne numérique.</Text>}
                </Stack>
              </Stack>
            )}

            {caps.metrics && caps.multiMetric && settings.breakout && (
              <Select label="Valeur" data={metricOptions} value={settings.metrics?.[0] ?? activeMetrics[0]?.name ?? null} onChange={(v) => v && onChange({ metrics: [v] })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
            )}

            {caps.aggregation && (
              <Select label="Agrégation" data={AGG_OPTIONS} value={settings.aggregation} onChange={(v) => v && onChange({ aggregation: v as Aggregation })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
            )}

            {caps.sort && (
              <Select label="Tri" data={SORT_OPTIONS} value={settings.sort} onChange={(v) => v && onChange({ sort: v as SortOrder })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
            )}
          </Stack>

          {(caps.stacking || caps.values || caps.legend || caps.goal || caps.axisTitles || caps.trendline) && (
            <>
              <Divider />
              <Stack gap="sm">
                <SectionLabel>Affichage</SectionLabel>

                {caps.stacking && (
                  <Stack gap={4}>
                    <Text fz="sm" fw={500} style={{ color: MB_COLORS.textPrimary }}>Empilement</Text>
                    <SegmentedControl
                      fullWidth
                      size="xs"
                      value={settings.stacking}
                      onChange={(v) => onChange({ stacking: v as Stacking })}
                      data={[
                        { label: "Aucun", value: "none" },
                        { label: "Empilé", value: "stacked" },
                        { label: "100 %", value: "normalized" },
                      ]}
                    />
                  </Stack>
                )}

                {caps.values && <Switch size="sm" checked={settings.showValues} label="Afficher les valeurs" onChange={(e) => onChange({ showValues: e.currentTarget.checked })} />}
                {caps.legend && <Switch size="sm" checked={settings.showLegend} label="Afficher la légende" onChange={(e) => onChange({ showLegend: e.currentTarget.checked })} />}
                {caps.trendline && <Switch size="sm" checked={settings.showTrendline} label="Courbe de tendance" onChange={(e) => onChange({ showTrendline: e.currentTarget.checked })} />}

                {caps.goal && (
                  <NumberInput label="Objectif" placeholder="aucun" value={settings.goalValue ?? undefined} onChange={(v) => onChange({ goalValue: v === "" || v == null ? null : Number(v) })} size="sm" hideControls />
                )}

                {caps.axisTitles && (
                  <Group grow gap="xs">
                    <TextInput label="Titre axe X" size="sm" value={settings.xAxisTitle ?? ""} onChange={(e) => onChange({ xAxisTitle: e.currentTarget.value || undefined })} />
                    <TextInput label="Titre axe Y" size="sm" value={settings.yAxisTitle ?? ""} onChange={(e) => onChange({ yAxisTitle: e.currentTarget.value || undefined })} />
                  </Group>
                )}
              </Stack>
            </>
          )}

          {(caps.axisToggles || caps.yScale || caps.yRange) && (
            <>
              <Divider />
              <Stack gap="sm">
                <SectionLabel>Axes</SectionLabel>

                {caps.yScale && (
                  <Stack gap={4}>
                    <Text fz="sm" fw={500} style={{ color: MB_COLORS.textPrimary }}>Échelle de l'axe Y</Text>
                    <SegmentedControl
                      fullWidth
                      size="xs"
                      value={settings.yScale}
                      onChange={(v) => onChange({ yScale: v as YScale })}
                      data={[
                        { label: "Linéaire", value: "linear" },
                        { label: "Logarithmique", value: "log" },
                      ]}
                    />
                  </Stack>
                )}

                {caps.axisToggles && (
                  <>
                    <Switch size="sm" checked={settings.xAxisEnabled} label="Afficher l'axe X" onChange={(e) => onChange({ xAxisEnabled: e.currentTarget.checked })} />
                    <Switch size="sm" checked={settings.yAxisEnabled} label="Afficher l'axe Y" onChange={(e) => onChange({ yAxisEnabled: e.currentTarget.checked })} />
                  </>
                )}

                {caps.yRange && (
                  <>
                    <Switch size="sm" checked={!settings.yAutoRange} label="Plage de l'axe Y personnalisée" onChange={(e) => onChange({ yAutoRange: !e.currentTarget.checked })} />
                    {!settings.yAutoRange && (
                      <Group grow gap="xs">
                        <NumberInput label="Min" size="sm" hideControls value={settings.yMin ?? undefined} onChange={(v) => onChange({ yMin: v === "" || v == null ? null : Number(v) })} />
                        <NumberInput label="Max" size="sm" hideControls value={settings.yMax ?? undefined} onChange={(v) => onChange({ yMax: v === "" || v == null ? null : Number(v) })} />
                      </Group>
                    )}
                    {settings.yAutoRange && caps.yScale && (
                      <Switch size="sm" checked={settings.unpinFromZero} label="Ne pas commencer à zéro" onChange={(e) => onChange({ unpinFromZero: e.currentTarget.checked })} />
                    )}
                  </>
                )}
              </Stack>
            </>
          )}

          {caps.pie && (
            <>
              <Divider />
              <Stack gap="sm">
                <SectionLabel>Camembert</SectionLabel>
                <Switch size="sm" checked={settings.pieDonut} label="Anneau (donut)" onChange={(e) => onChange({ pieDonut: e.currentTarget.checked })} />
                {settings.pieDonut && <Switch size="sm" checked={settings.pieShowTotal} label="Afficher le total au centre" onChange={(e) => onChange({ pieShowTotal: e.currentTarget.checked })} />}
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
              </Stack>
            </>
          )}

          {caps.colors && colorTargets.length > 0 && (
            <>
              <Divider />
              <Stack gap="sm">
                <SectionLabel>Couleurs</SectionLabel>
                {colorTargets.map((t, i) => (
                  <ColorInput
                    key={t.key}
                    size="sm"
                    label={t.name}
                    format="hex"
                    swatches={["#509EE3", "#88BF4D", "#A989C5", "#EF8C8C", "#F9D45C", "#F2A86F", "#98D9D9", "#7172AD"]}
                    value={settings.colors[t.key] ?? seriesColor(i)}
                    onChange={(v) => onChange({ colors: { ...settings.colors, [t.key]: v } })}
                  />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </ScrollArea>

      <Box style={{ padding: 16, borderTop: `1px solid ${MB_COLORS.border}` }}>
        <Button fullWidth radius="xl" onClick={onBack} color="brand">
          Terminé
        </Button>
      </Box>
    </Box>
  );
}
