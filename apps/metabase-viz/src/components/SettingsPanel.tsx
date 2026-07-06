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
import { isMetric } from "../data/types";
import type { VizId } from "../viz/registry";
import { VIZ_BY_ID } from "../viz/registry";
import type { Stacking, VizSettings } from "../viz/settings";
import { resolveShape } from "../viz/settings";
import { settingsCapabilities } from "../viz/options";
import { seriesColor, MB_COLORS } from "../viz/options/constants";

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
  const metricColumns = dataset.cols.filter(isMetric);
  const metricOptions = metricColumns.map((c) => ({ value: c.name, label: c.display_name }));

  const toggleMetric = (name: string) => {
    const current = settings.metrics ?? activeMetrics.map((m) => m.name);
    const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
    onChange({ metrics: next.length ? next : current });
  };

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

            {caps.metrics && caps.multiMetric && (
              <Stack gap={4}>
                <Text fz="sm" fw={500} style={{ color: MB_COLORS.textPrimary }}>
                  Séries (valeurs)
                </Text>
                <Stack gap={2}>
                  {metricColumns.map((c) => {
                    const checked = activeMetrics.some((m) => m.name === c.name);
                    return (
                      <Switch
                        key={c.name}
                        size="sm"
                        checked={checked}
                        label={c.display_name}
                        onChange={() => toggleMetric(c.name)}
                        disabled={checked && activeMetrics.length === 1}
                      />
                    );
                  })}
                  {metricColumns.length === 0 && (
                    <Text fz="xs" style={{ color: MB_COLORS.textTertiary }}>Aucune colonne numérique.</Text>
                  )}
                </Stack>
              </Stack>
            )}

            {caps.metrics && !caps.multiMetric && (
              <Select
                label="Valeur"
                data={metricOptions}
                value={settings.metrics?.[0] ?? activeMetrics[0]?.name ?? null}
                onChange={(v) => v && onChange({ metrics: [v] })}
                allowDeselect={false}
                comboboxProps={{ withinPortal: true }}
                size="sm"
              />
            )}
          </Stack>

          <Divider />

          {/* AFFICHAGE */}
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

            {caps.values && (
              <Switch
                size="sm"
                checked={settings.showValues}
                label="Afficher les valeurs"
                onChange={(e) => onChange({ showValues: e.currentTarget.checked })}
              />
            )}

            {caps.legend && (
              <Switch
                size="sm"
                checked={settings.showLegend}
                label="Afficher la légende"
                onChange={(e) => onChange({ showLegend: e.currentTarget.checked })}
              />
            )}

            {caps.goal && (
              <NumberInput
                label="Objectif"
                placeholder="aucun"
                value={settings.goalValue ?? undefined}
                onChange={(v) => onChange({ goalValue: v === "" || v == null ? null : Number(v) })}
                size="sm"
                hideControls
              />
            )}

            {caps.axisTitles && (
              <Group grow gap="xs">
                <TextInput label="Titre axe X" size="sm" value={settings.xAxisTitle ?? ""} onChange={(e) => onChange({ xAxisTitle: e.currentTarget.value || undefined })} />
                <TextInput label="Titre axe Y" size="sm" value={settings.yAxisTitle ?? ""} onChange={(e) => onChange({ yAxisTitle: e.currentTarget.value || undefined })} />
              </Group>
            )}
          </Stack>

          {caps.colors && activeMetrics.length > 0 && (
            <>
              <Divider />
              <Stack gap="sm">
                <SectionLabel>Couleurs</SectionLabel>
                {activeMetrics.map((m, i) => (
                  <ColorInput
                    key={m.name}
                    size="sm"
                    label={m.display_name}
                    format="hex"
                    swatches={["#509EE3", "#88BF4D", "#A989C5", "#EF8C8C", "#F9D45C", "#F2A86F", "#98D9D9", "#7172AD"]}
                    value={settings.colors[m.name] ?? seriesColor(i)}
                    onChange={(v) => onChange({ colors: { ...settings.colors, [m.name]: v } })}
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
