import { useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  ColorInput,
  Group,
  NumberInput,
  Popover,
  Radio,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import type { Dataset } from "../data/types";
import { getDimensions, isMetric } from "../data/types";
import type { VizId } from "../viz/registry";
import { VIZ_BY_ID } from "../viz/registry";
import type {
  Aggregation,
  CurrencyStyle,
  GaugeRange,
  LabelFormatting,
  NumberStyle,
  PiePercent,
  SortOrder,
  Stacking,
  VizSettings,
  XScale,
  YScale,
} from "../viz/settings";
import { findColumn, resolveShape } from "../viz/settings";
import type { AxisPosition, BarWidth, FillOpacity, LineDash, LineShape, LineSize, MarkerMode, SeriesDisplay, SeriesOpts } from "../viz/settings";
import { CURRENCIES } from "../viz/format";
import { seriesColor, MB_COLORS } from "../viz/options/constants";

const SWATCHES = ["#509EE3", "#88BF4D", "#A989C5", "#EF8C8C", "#F9D45C", "#F2A86F", "#98D9D9", "#7172AD"];

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

// Which tabs Metabase shows for each viz.
const TABS: Record<string, string[]> = {
  bar: ["Données", "Affichage", "Axes"],
  line: ["Données", "Affichage", "Axes"],
  area: ["Données", "Affichage", "Axes"],
  combo: ["Données", "Affichage", "Axes"],
  row: ["Données", "Affichage", "Axes"],
  scatter: ["Données", "Affichage", "Axes"],
  waterfall: ["Données", "Affichage", "Axes"],
  boxplot: ["Données", "Affichage", "Axes"],
  pie: ["Données", "Affichage"],
  funnel: ["Données", "Affichage"],
  smartscalar: ["Données", "Affichage"],
  progress: ["Données", "Mise en forme"],
  scalar: ["Mise en forme"],
  gauge: ["Plages", "Mise en forme"],
  sankey: ["Données"],
  map: ["Données"],
  pivot: ["Données"],
  table: ["Données"],
  object: ["Données"],
};

const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <Text component="label" fz="sm" fw={700} htmlFor={htmlFor} style={{ color: MB_COLORS.textPrimary }}>
    {children}
  </Text>
);

// Metabase color affordance: a round color dot that opens a small swatch palette.
function ColorDot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover opened={open} onChange={setOpen} position="bottom-start" withArrow shadow="md" width={160}>
      <Popover.Target>
        <UnstyledButton
          onClick={() => setOpen((o) => !o)}
          aria-label={value}
          style={{ width: 18, height: 18, borderRadius: "50%", background: value, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)", flexShrink: 0 }}
        />
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <SimpleGrid cols={4} spacing={8}>
          {SWATCHES.map((c) => (
            <UnstyledButton
              key={c}
              aria-label={c}
              onClick={() => { onChange(c); setOpen(false); }}
              style={{ width: 24, height: 24, borderRadius: "50%", background: c, outline: c.toLowerCase() === value.toLowerCase() ? `2px solid ${MB_COLORS.textPrimary}` : "none", outlineOffset: 2 }}
            />
          ))}
        </SimpleGrid>
      </Popover.Dropdown>
    </Popover>
  );
}

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
  const def = VIZ_BY_ID[vizId];
  const tabs = TABS[vizId] ?? ["Données"];
  const [tab, setTab] = useState(tabs[0]);
  const [editingSeries, setEditingSeries] = useState<string | null>(null);
  const seriesConfigurable = ["bar", "line", "area", "combo", "row"].includes(vizId);

  const allCols = dataset.cols.map((c) => ({ value: c.name, label: c.display_name }));
  const dimCols = getDimensions(dataset);
  const dimOptions = dimCols.map((c) => ({ value: c.name, label: c.display_name }));
  const metricCols = dataset.cols.filter(isMetric);
  const metricOptions = metricCols.map((c) => ({ value: c.name, label: c.display_name }));
  const { metrics: activeMetrics } = resolveShape(dataset, settings);

  const isCartesian = ["bar", "line", "area", "combo", "row"].includes(vizId);

  return (
    <Box style={{ width: 320, borderRight: `1px solid ${MB_COLORS.border}`, background: MB_COLORS.white, display: "flex", flexDirection: "column", height: "100%" }}>
      <Group gap="xs" style={{ padding: "12px 16px", borderBottom: `1px solid ${MB_COLORS.border}` }}>
        <UnstyledButton onClick={onBack} aria-label="Retour" style={{ color: MB_COLORS.textSecondary, display: "inline-flex" }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </UnstyledButton>
        <Text fw={700} style={{ color: MB_COLORS.textPrimary }}>Options {def.name}</Text>
      </Group>

      <Tabs value={tab} onChange={(v) => { if (v) { setTab(v); setEditingSeries(null); } }} variant="default">
        <Tabs.List grow style={{ padding: "0 8px" }}>
          {tabs.map((t) => (
            <Tabs.Tab key={t} value={t} style={{ fontWeight: 700, fontSize: 13 }}>{t}</Tabs.Tab>
          ))}
        </Tabs.List>

        <ScrollArea style={{ height: "calc(100vh - 190px)" }}>
          <Box style={{ padding: 16 }}>
            {tab === "Données" && editingSeries && (
              <SeriesSettingsPanel vizId={vizId} dataset={dataset} seriesKey={editingSeries} settings={settings} onChange={onChange} onBack={() => setEditingSeries(null)} />
            )}
            {tab === "Données" && !editingSeries && (
              <DonneesTab vizId={vizId} dataset={dataset} settings={settings} onChange={onChange} allCols={allCols} dimOptions={dimOptions} metricCols={metricCols} metricOptions={metricOptions} activeMetrics={activeMetrics} onEditSeries={seriesConfigurable ? setEditingSeries : undefined} />
            )}
            {tab === "Affichage" && (
              <AffichageTab vizId={vizId} dataset={dataset} settings={settings} onChange={onChange} isCartesian={isCartesian} activeMetrics={activeMetrics} />
            )}
            {tab === "Axes" && <AxesTab settings={settings} onChange={onChange} />}
            {tab === "Mise en forme" && <FormatTab vizId={vizId} settings={settings} onChange={onChange} allCols={allCols} />}
            {tab === "Plages" && <RangesTab settings={settings} onChange={onChange} />}
          </Box>
        </ScrollArea>
      </Tabs>

      <Box style={{ padding: 16, borderTop: `1px solid ${MB_COLORS.border}`, marginTop: "auto" }}>
        <Button fullWidth radius="xl" onClick={onBack} color="brand">Terminé</Button>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------- Données ----

function DonneesTab({
  vizId,
  settings,
  onChange,
  allCols,
  dimOptions,
  metricOptions,
  activeMetrics,
  onEditSeries,
}: any) {
  const addSeries = (name: string) => {
    const cur = settings.metrics ?? activeMetrics.map((m: any) => m.name);
    if (!cur.includes(name)) onChange({ metrics: [...cur, name] });
  };
  const removeSeries = (name: string) => {
    const cur: string[] = settings.metrics ?? activeMetrics.map((m: any) => m.name);
    const next = cur.filter((n) => n !== name);
    if (next.length) onChange({ metrics: next });
  };
  const availableToAdd = metricOptions.filter((o: any) => !activeMetrics.some((m: any) => m.name === o.value));

  // Field-picker single select (Metabase look).
  const FieldSelect = ({ label, value, data, onPick }: any) => (
    <Stack gap={6}>
      <Label>{label}</Label>
      <Select data={data} value={value ?? null} onChange={(v) => v && onPick(v)} allowDeselect={false} comboboxProps={{ withinPortal: true }} placeholder="Sélectionnez un champ" size="sm" />
    </Stack>
  );

  if (vizId === "pie") {
    return (
      <Stack gap="md">
        <FieldSelect label="Mesure" value={settings.metrics?.[0] ?? activeMetrics[0]?.name} data={metricOptions} onPick={(v: string) => onChange({ metrics: [v] })} />
        <FieldSelect label="Dimension" value={settings.dimension} data={allCols} onPick={(v: string) => onChange({ dimension: v })} />
        {DataExtras(settings, onChange, { agg: true, sort: true })}
      </Stack>
    );
  }
  if (vizId === "funnel") {
    return (
      <Stack gap="md">
        <FieldSelect label="Colonne avec les étapes" value={settings.dimension} data={allCols} onPick={(v: string) => onChange({ dimension: v })} />
        <FieldSelect label="Mesure" value={settings.metrics?.[0] ?? activeMetrics[0]?.name} data={metricOptions} onPick={(v: string) => onChange({ metrics: [v] })} />
      </Stack>
    );
  }
  if (vizId === "smartscalar" || vizId === "gauge" || vizId === "progress") {
    return <FieldSelect label="Nombre principal" value={settings.metrics?.[0] ?? activeMetrics[0]?.name} data={metricOptions} onPick={(v: string) => onChange({ metrics: [v] })} />;
  }
  if (vizId === "sankey") {
    return (
      <Stack gap="md">
        <FieldSelect label="Source" value={settings.sourceField} data={dimOptions} onPick={(v: string) => onChange({ sourceField: v })} />
        <FieldSelect label="Destination" value={settings.targetField} data={dimOptions} onPick={(v: string) => onChange({ targetField: v })} />
        <FieldSelect label="Mesure" value={settings.metrics?.[0]} data={metricOptions} onPick={(v: string) => onChange({ metrics: [v] })} />
      </Stack>
    );
  }
  if (vizId === "pivot") {
    return (
      <Stack gap="md">
        <FieldSelect label="Lignes" value={settings.rowField} data={dimOptions} onPick={(v: string) => onChange({ rowField: v })} />
        <FieldSelect label="Colonnes" value={settings.colField} data={dimOptions} onPick={(v: string) => onChange({ colField: v })} />
        <FieldSelect label="Mesure" value={settings.metrics?.[0]} data={metricOptions} onPick={(v: string) => onChange({ metrics: [v] })} />
        {DataExtras(settings, onChange, { agg: true })}
      </Stack>
    );
  }
  if (vizId === "map") {
    return (
      <Stack gap="md">
        <FieldSelect label="Champ de région" value={settings.locationField} data={allCols} onPick={(v: string) => onChange({ locationField: v })} />
        <FieldSelect label="Champ de métrique" value={settings.metrics?.[0]} data={metricOptions} onPick={(v: string) => onChange({ metrics: [v] })} />
      </Stack>
    );
  }
  if (vizId === "table" || vizId === "object") {
    return <Text fz="sm" style={{ color: MB_COLORS.textTertiary }}>Aucune option de données pour ce type.</Text>;
  }

  // Cartesian family (bar/line/area/combo/row/scatter/waterfall/boxplot).
  const rowChart = vizId === "row";
  const xLabel = rowChart ? "Axe Y" : "Axe X";
  const yLabel = rowChart ? "Axe X" : "Axe Y";

  return (
    <Stack gap="lg">
      <FieldSelect label={`${xLabel} (dimension)`} value={settings.dimension} data={allCols} onPick={(v: string) => onChange({ dimension: v })} />

      {/* Series field-picker (Axe Y) */}
      <Stack gap={6}>
        <Label>{yLabel}</Label>
        <Stack gap={6}>
          {activeMetrics.map((m: any, i: number) => (
            <Group key={m.name} gap={8} wrap="nowrap" style={{ border: `1px solid ${MB_COLORS.border}`, borderRadius: 8, padding: "6px 10px" }}>
              <span style={{ color: MB_COLORS.textTertiary, cursor: "grab", display: "inline-flex" }} aria-hidden>
                <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2" cy="3" r="1.3" /><circle cx="8" cy="3" r="1.3" /><circle cx="2" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="2" cy="13" r="1.3" /><circle cx="8" cy="13" r="1.3" /></svg>
              </span>
              <ColorDot value={settings.colors[m.name] ?? seriesColor(i)} onChange={(v) => onChange({ colors: { ...settings.colors, [m.name]: v } })} />
              <Text fz="sm" fw={600} style={{ flex: 1, color: MB_COLORS.textPrimary }}>{m.display_name}</Text>
              {onEditSeries && (
                <ActionIcon size="sm" variant="subtle" color="gray" aria-label={`Options ${m.display_name}`} onClick={() => onEditSeries(m.name)}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" /></svg>
                </ActionIcon>
              )}
              {activeMetrics.length > 1 && (
                <ActionIcon size="sm" variant="subtle" color="gray" aria-label={`Retirer ${m.display_name}`} onClick={() => removeSeries(m.name)}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </ActionIcon>
              )}
            </Group>
          ))}
        </Stack>
        {availableToAdd.length > 0 && (
          <Select placeholder="Ajouter une autre série" data={availableToAdd} value={null} onChange={(v) => v && addSeries(v)} comboboxProps={{ withinPortal: true }} size="sm" />
        )}
      </Stack>

      {["bar", "line", "area", "combo", "row"].includes(vizId) && (
        <Select
          label="Éclater par (2ᵉ dimension)"
          placeholder="aucun"
          data={dimOptions.filter((o: any) => o.value !== settings.dimension)}
          value={settings.breakout ?? null}
          onChange={(v) => onChange({ breakout: v ?? undefined })}
          clearable
          comboboxProps={{ withinPortal: true }}
          size="sm"
        />
      )}

      {DataExtras(settings, onChange, { agg: true, sort: true })}
    </Stack>
  );
}

function DataExtras(settings: VizSettings, onChange: (p: Partial<VizSettings>) => void, opts: { agg?: boolean; sort?: boolean }) {
  return (
    <Stack gap="md">
      {opts.agg && (
        <Select label="Agrégation" data={AGG_OPTIONS} value={settings.aggregation} onChange={(v) => v && onChange({ aggregation: v as Aggregation })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
      )}
      {opts.sort && (
        <Select label="Tri" data={SORT_OPTIONS} value={settings.sort} onChange={(v) => v && onChange({ sort: v as SortOrder })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
      )}
    </Stack>
  );
}

// -------------------------------------------------------------- Affichage ----

function AffichageTab({ vizId, settings, onChange, isCartesian }: any) {
  const stackable = ["bar", "area", "row"].includes(vizId);
  const cartesianDisplay = isCartesian;

  return (
    <Stack gap="md">
      {stackable && (
        <Stack gap={6}>
          <Label>Empilement</Label>
          <SegmentedControl
            fullWidth
            size="xs"
            value={settings.stacking}
            onChange={(v) => onChange({ stacking: v as Stacking })}
            data={[
              { label: "Ne pas empiler", value: "none" },
              { label: "Empiler", value: "stacked" },
              { label: "100 %", value: "normalized" },
            ]}
          />
        </Stack>
      )}

      {["bar", "line", "area", "combo", "gauge", "progress"].includes(vizId) && (
        <NumberInput label="Ligne d'objectif" placeholder="aucun" value={settings.goalValue ?? undefined} onChange={(v) => onChange({ goalValue: v === "" || v == null ? null : Number(v) })} size="sm" hideControls />
      )}

      {(cartesianDisplay || vizId === "waterfall") && (
        <Switch size="sm" checked={settings.showValues} label="Afficher les valeurs sur les points de données" onChange={(e) => onChange({ showValues: e.currentTarget.checked })} />
      )}

      {cartesianDisplay && (
        <Stack gap={6}>
          <Label>Mise en forme automatique</Label>
          <SegmentedControl
            fullWidth
            size="xs"
            value={settings.labelFormatting}
            onChange={(v) => onChange({ labelFormatting: v as LabelFormatting })}
            data={[
              { label: "Auto", value: "auto" },
              { label: "Compact", value: "compact" },
              { label: "Complet", value: "full" },
            ]}
          />
        </Stack>
      )}

      {["bar", "line", "area", "combo"].includes(vizId) && (
        <Switch size="sm" checked={settings.showTrendline} label="Courbe de tendance" onChange={(e) => onChange({ showTrendline: e.currentTarget.checked })} />
      )}

      {["bar", "line", "area", "combo", "row", "pie", "funnel"].includes(vizId) && (
        <Switch size="sm" checked={settings.showLegend} label="Afficher la légende" onChange={(e) => onChange({ showLegend: e.currentTarget.checked })} />
      )}

      {vizId === "pie" && (
        <>
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
        </>
      )}

    </Stack>
  );
}

// ------------------------------------------------------------------ Axes ----

function AxesTab({ settings, onChange }: { settings: VizSettings; onChange: (p: Partial<VizSettings>) => void }) {
  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <Text fw={700} tt="uppercase" fz="xs" style={{ color: MB_COLORS.textTertiary }}>Axe X</Text>
        <Switch size="sm" checked={settings.xShowTitle} label="Afficher le libellé" onChange={(e) => onChange({ xShowTitle: e.currentTarget.checked })} />
        {settings.xShowTitle && <TextInput size="sm" placeholder="Libellé de l'axe X" value={settings.xAxisTitle ?? ""} onChange={(e) => onChange({ xAxisTitle: e.currentTarget.value || undefined })} />}
        <Switch size="sm" checked={settings.xShowLine} label="Afficher les lignes et les graduations" onChange={(e) => onChange({ xShowLine: e.currentTarget.checked, xAxisEnabled: e.currentTarget.checked })} />
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
        <Text fw={700} tt="uppercase" fz="xs" style={{ color: MB_COLORS.textTertiary }}>Axe Y</Text>
        <Switch size="sm" checked={settings.yShowTitle} label="Afficher le libellé" onChange={(e) => onChange({ yShowTitle: e.currentTarget.checked })} />
        {settings.yShowTitle && <TextInput size="sm" placeholder="Libellé de l'axe Y" value={settings.yAxisTitle ?? ""} onChange={(e) => onChange({ yAxisTitle: e.currentTarget.value || undefined })} />}
        <Switch size="sm" checked={settings.yShowLine} label="Afficher les lignes et les graduations" onChange={(e) => onChange({ yShowLine: e.currentTarget.checked, yAxisEnabled: e.currentTarget.checked })} />
        <Stack gap={4}>
          <Label>Échelle</Label>
          <SegmentedControl fullWidth size="xs" value={settings.yScale} onChange={(v) => onChange({ yScale: v as YScale })} data={[{ label: "Linéaire", value: "linear" }, { label: "Logarithmique", value: "log" }]} />
        </Stack>
        <Switch size="sm" checked={!settings.yAutoRange} label="Plage de l'axe Y personnalisée" onChange={(e) => onChange({ yAutoRange: !e.currentTarget.checked })} />
        {!settings.yAutoRange ? (
          <Group grow gap="xs">
            <NumberInput label="Min" size="sm" hideControls value={settings.yMin ?? undefined} onChange={(v) => onChange({ yMin: v === "" || v == null ? null : Number(v) })} />
            <NumberInput label="Max" size="sm" hideControls value={settings.yMax ?? undefined} onChange={(v) => onChange({ yMax: v === "" || v == null ? null : Number(v) })} />
          </Group>
        ) : (
          <Switch size="sm" checked={settings.unpinFromZero} label="Détacher de zéro" onChange={(e) => onChange({ unpinFromZero: e.currentTarget.checked })} />
        )}
      </Stack>
    </Stack>
  );
}

// ----------------------------------------------------------- Mise en forme ----

function FormatTab({ vizId, settings, onChange, allCols }: any) {
  const fmt = settings.numberFormat;
  const patch = (p: Partial<typeof fmt>) => onChange({ numberFormat: { ...fmt, ...p } });
  return (
    <Stack gap="md">
      {(vizId === "scalar" || vizId === "object") && (
        <Select label="Champ à afficher" data={allCols} value={settings.scalarField ?? null} onChange={(v) => onChange({ scalarField: v ?? undefined })} placeholder="Automatique" clearable comboboxProps={{ withinPortal: true }} size="sm" />
      )}
      <Select
        label="Style"
        size="sm"
        data={[
          { value: "normal", label: "Normal" },
          { value: "percent", label: "Pourcentage" },
          { value: "scientific", label: "Scientifique" },
          { value: "currency", label: "Devise" },
        ]}
        value={fmt.style}
        onChange={(v) => v && patch({ style: v as NumberStyle })}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true }}
      />
      {fmt.style === "currency" && (
        <>
          <Select label="Unité de devise" size="sm" data={CURRENCIES} value={fmt.currency} onChange={(v) => v && patch({ currency: v })} allowDeselect={false} comboboxProps={{ withinPortal: true }} />
          <Stack gap={4}>
            <Label>Style de libellé de devise</Label>
            <Radio.Group value={fmt.currencyStyle} onChange={(v) => patch({ currencyStyle: v as CurrencyStyle })}>
              <Stack gap={4}>
                <Radio size="xs" value="symbol" label="Symbole (€)" />
                <Radio size="xs" value="code" label="Code (EUR)" />
                <Radio size="xs" value="name" label="Nom (euros)" />
              </Stack>
            </Radio.Group>
          </Stack>
        </>
      )}
      <NumberInput label="Nombre de décimales" size="sm" placeholder="auto" min={0} max={10} value={fmt.decimals ?? undefined} onChange={(v) => patch({ decimals: v === "" || v == null ? null : Number(v) })} />
      <NumberInput label="Multiplier par un nombre" size="sm" placeholder="1" hideControls value={fmt.multiplyBy ?? undefined} onChange={(v) => patch({ multiplyBy: v === "" || v == null ? null : Number(v) })} />
      <TextInput label="Ajouter un préfixe" size="sm" value={fmt.prefix ?? ""} onChange={(e) => patch({ prefix: e.currentTarget.value })} />
      <TextInput label="Ajouter un suffixe" size="sm" value={fmt.suffix ?? ""} onChange={(e) => patch({ suffix: e.currentTarget.value })} />
    </Stack>
  );
}

// ---------------------------------------------------------------- Plages ----

const DEFAULT_RANGES: GaugeRange[] = [
  { color: "#EF8C8C", label: "", min: 0, max: 0.5 },
  { color: "#F9D45C", label: "", min: 0.5, max: 1 },
  { color: "#88BF4D", label: "", min: 1, max: 2 },
];

function RangesTab({ settings, onChange }: { settings: VizSettings; onChange: (p: Partial<VizSettings>) => void }) {
  const ranges = settings.gaugeRanges ?? DEFAULT_RANGES;
  const update = (i: number, p: Partial<GaugeRange>) => {
    const next = ranges.map((r, idx) => (idx === i ? { ...r, ...p } : r));
    onChange({ gaugeRanges: next });
  };
  const remove = (i: number) => onChange({ gaugeRanges: ranges.filter((_, idx) => idx !== i) });
  const add = () => {
    const last = ranges[ranges.length - 1];
    onChange({ gaugeRanges: [...ranges, { color: seriesColor(ranges.length), label: "", min: last?.max ?? 0, max: (last?.max ?? 0) + 1 }] });
  };
  return (
    <Stack gap="sm">
      <Table verticalSpacing={4} horizontalSpacing={6} style={{ fontSize: 12 }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th></Table.Th>
            <Table.Th style={{ color: MB_COLORS.textTertiary }}>Libellé</Table.Th>
            <Table.Th style={{ color: MB_COLORS.textTertiary }}>Min</Table.Th>
            <Table.Th style={{ color: MB_COLORS.textTertiary }}>Max</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {ranges.map((r, i) => (
            <Table.Tr key={i}>
              <Table.Td>
                <ColorInput value={r.color} onChange={(v) => update(i, { color: v })} withPicker={false} withEyeDropper={false} swatches={SWATCHES} size="xs" styles={{ input: { width: 26, height: 22, padding: 0 }, wrapper: { width: 26 } }} />
              </Table.Td>
              <Table.Td><TextInput size="xs" placeholder="(optionnel)" value={r.label} onChange={(e) => update(i, { label: e.currentTarget.value })} /></Table.Td>
              <Table.Td><NumberInput size="xs" hideControls w={56} value={r.min} onChange={(v) => update(i, { min: Number(v) || 0 })} /></Table.Td>
              <Table.Td><NumberInput size="xs" hideControls w={56} value={r.max} onChange={(v) => update(i, { max: Number(v) || 0 })} /></Table.Td>
              <Table.Td>
                <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Supprimer la plage" onClick={() => remove(i)}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Button variant="subtle" size="compact-sm" color="brand" onClick={add} style={{ alignSelf: "flex-start" }}>+ Ajouter une plage</Button>
    </Stack>
  );
}

// ------------------------------------------------ Series settings ("…") ----

function Seg<T extends string>({ label, value, onChange, data }: { label: string; value: T; onChange: (v: T) => void; data: { label: string; value: T }[] }) {
  return (
    <Stack gap={4}>
      <Label>{label}</Label>
      <SegmentedControl fullWidth size="xs" value={value} onChange={(v) => onChange(v as T)} data={data} />
    </Stack>
  );
}

function baseDisplay(vizId: VizId): SeriesDisplay {
  if (vizId === "area") return "area";
  if (vizId === "bar" || vizId === "row" || vizId === "combo") return "bar";
  return "line";
}

function SeriesSettingsPanel({
  vizId,
  dataset,
  seriesKey,
  settings,
  onChange,
  onBack,
}: {
  vizId: VizId;
  dataset: Dataset;
  seriesKey: string;
  settings: VizSettings;
  onChange: (patch: Partial<VizSettings>) => void;
  onBack: () => void;
}) {
  const col = findColumn(dataset, seriesKey);
  const displayName = col?.display_name ?? seriesKey;
  const opts: SeriesOpts = settings.series[seriesKey] ?? {};
  const patch = (p: Partial<SeriesOpts>) => onChange({ series: { ...settings.series, [seriesKey]: { ...opts, ...p } } });

  const display = opts.display ?? baseDisplay(vizId);
  const isLineLike = display === "line" || display === "area";
  const idx = resolveShape(dataset, settings).metrics.findIndex((m) => m.name === seriesKey);

  return (
    <Stack gap="md">
      <Group gap="xs">
        <UnstyledButton onClick={onBack} aria-label="Retour aux séries" style={{ color: MB_COLORS.textSecondary, display: "inline-flex" }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </UnstyledButton>
        <Text fw={700} style={{ color: MB_COLORS.textPrimary }}>{opts.name ?? displayName}</Text>
      </Group>

      {/* Color + rename */}
      <Group gap={8} wrap="nowrap">
        <ColorDot value={settings.colors[seriesKey] ?? seriesColor(idx < 0 ? 0 : idx)} onChange={(v) => onChange({ colors: { ...settings.colors, [seriesKey]: v } })} />
        <TextInput size="sm" style={{ flex: 1 }} value={opts.name ?? displayName} onChange={(e) => patch({ name: e.currentTarget.value })} data-testid="series-name-input" />
      </Group>

      <Seg<AxisPosition> label={vizId === "row" ? "Position de l'axe des abscisses" : "Position de l'axe des ordonnées"} value={opts.axis ?? "auto"} onChange={(v) => patch({ axis: v })} data={[{ label: "Auto", value: "auto" }, { label: vizId === "row" ? "Bas" : "Gauche", value: "left" }, { label: vizId === "row" ? "Haut" : "Droite", value: "right" }]} />

      <Seg<SeriesDisplay> label="Type d'affichage" value={display} onChange={(v) => patch({ display: v })} data={[{ label: "Ligne", value: "line" }, { label: "Aire", value: "area" }, { label: "Barre", value: "bar" }]} />

      {isLineLike && (
        <>
          <Seg<LineShape> label="Forme de la ligne" value={opts.lineShape ?? "straight"} onChange={(v) => patch({ lineShape: v })} data={[{ label: "Droite", value: "straight" }, { label: "Courbe", value: "curved" }, { label: "Paliers", value: "stepped" }]} />
          <Seg<LineDash> label="Style de ligne" value={opts.lineDash ?? "solid"} onChange={(v) => patch({ lineDash: v })} data={[{ label: "Pleine", value: "solid" }, { label: "Tirets", value: "dashed" }, { label: "Points", value: "dotted" }]} />
          <Seg<LineSize> label="Taille de la ligne" value={opts.lineSize ?? "M"} onChange={(v) => patch({ lineSize: v })} data={[{ label: "S", value: "S" }, { label: "M", value: "M" }, { label: "L", value: "L" }]} />
          <Seg<MarkerMode> label="Afficher les points sur les lignes" value={opts.markers ?? "auto"} onChange={(v) => patch({ markers: v })} data={[{ label: "Auto", value: "auto" }, { label: "Oui", value: "on" }, { label: "Non", value: "off" }]} />
        </>
      )}

      {display === "area" && (
        <Seg<FillOpacity> label="Opacité du remplissage" value={opts.areaOpacity ?? "auto"} onChange={(v) => patch({ areaOpacity: v })} data={[{ label: "Auto", value: "auto" }, { label: "Opaque", value: "opaque" }, { label: "Transparent", value: "transparent" }]} />
      )}

      {display === "bar" && (
        <Seg<BarWidth> label={vizId === "row" ? "Hauteur de barre" : "Largeur de barre"} value={opts.barWidth ?? "normal"} onChange={(v) => patch({ barWidth: v })} data={[{ label: "Très mince", value: "xs" }, { label: "Normal", value: "normal" }, { label: "Large", value: "wide" }, { label: "Très large", value: "xl" }]} />
      )}

      <Switch size="sm" checked={opts.showValues ?? false} label="Afficher les valeurs pour cette série" onChange={(e) => patch({ showValues: e.currentTarget.checked })} />
      <Switch size="sm" checked={opts.trendline ?? false} label="Afficher une courbe de tendance pour cette série" onChange={(e) => patch({ trendline: e.currentTarget.checked })} />
    </Stack>
  );
}
