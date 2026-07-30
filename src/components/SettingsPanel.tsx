import { useState } from "react";
import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Group,
  Menu,
  MultiSelect,
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
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Dataset } from "../data/types";
import { getDimensions, isMetric } from "../data/types";
import type { VizId } from "../viz/registry";
import { VIZ_BY_ID } from "../viz/registry";
import type {
  AxisPosition,
  ComparisonType,
  CurrencyPlacement,
  CurrencyStyle,
  GaugeRange,
  LabelFormatting,
  LineDash,
  LineShape,
  LineSize,
  MarkerMode,
  MissingValues,
  NumberStyle,
  PieLabelDisplay,
  PieValueFormat,
  PiePercent,
  ColorRule,
  ConditionOp,
  FunnelDisplay,
  QuartileStyle,
  SeparatorStyle,
  SeriesDisplay,
  SeriesOpts,
  SortOrder,
  Stacking,
  VizSettings,
  XScale,
  YScale,
} from "../viz/settings";
import { resolveShape } from "../viz/settings";
import { CURRENCIES, SEPARATOR_OPTIONS } from "../viz/format";
import { MAP_REGIONS } from "../viz/options/geo-sankey";
import { seriesColor, MB_COLORS } from "../viz/options/constants";

const SWATCHES = ["#509EE3", "#88BF4D", "#A989C5", "#EF8C8C", "#F9D45C", "#F2A86F", "#98D9D9", "#7172AD"];

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "none", label: "Ordre des données" },
  { value: "dim-asc", label: "Dimension ↑" },
  { value: "dim-desc", label: "Dimension ↓" },
  { value: "value-asc", label: "Valeur ↑" },
  { value: "value-desc", label: "Valeur ↓" },
];

// Charts whose Axe Y series expose the "…" per-series popover.
const SERIES_POPOVER_VIZ = ["bar", "line", "area", "combo", "row"];
const CARTESIAN = ["bar", "line", "area", "combo", "row"];

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
  scalar: ["Mise en forme", "Couleurs"],
  gauge: ["Données", "Plages", "Mise en forme"],
  sankey: ["Données"],
  map: ["Données"],
  pivot: ["Données"],
  treemap: ["Données", "Affichage"],
  table: ["Couleurs"],
  object: ["Données"],
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <Text fz="sm" fw={700} style={{ color: MB_COLORS.textPrimary }}>
    {children}
  </Text>
);

// -------------------------------------------------------------- small icons ----

const ic = { stroke: "currentColor", strokeWidth: 1.7, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const IconLine = () => <svg width="18" height="14" viewBox="0 0 20 14"><path d="M2 11L7 5l4 3 7-7" {...ic} /></svg>;
const IconArea = () => <svg width="18" height="14" viewBox="0 0 20 14"><path d="M2 11L7 5l4 3 7-7v10H2z" fill="currentColor" opacity="0.35" /><path d="M2 11L7 5l4 3 7-7" {...ic} /></svg>;
const IconBar = () => <svg width="18" height="14" viewBox="0 0 20 14"><rect x="2" y="7" width="4" height="6" fill="currentColor" /><rect x="8" y="3" width="4" height="10" fill="currentColor" /><rect x="14" y="9" width="4" height="4" fill="currentColor" /></svg>;
const IconStraight = () => <svg width="18" height="14" viewBox="0 0 20 14"><path d="M2 11l6-6 4 3 6-5" {...ic} /></svg>;
const IconCurved = () => <svg width="18" height="14" viewBox="0 0 20 14"><path d="M2 11c4 0 4-8 8-8s4 6 8 6" {...ic} /></svg>;
const IconStepped = () => <svg width="18" height="14" viewBox="0 0 20 14"><path d="M2 11h4V7h4V4h4v4h2" {...ic} /></svg>;
const IconSolid = () => <svg width="18" height="14" viewBox="0 0 20 14"><path d="M2 7h16" {...ic} /></svg>;
const IconDashed = () => <svg width="18" height="14" viewBox="0 0 20 14"><path d="M2 7h4M8 7h4M16 7h2" {...ic} /></svg>;
const IconDotted = () => <svg width="18" height="14" viewBox="0 0 20 14"><path d="M3 7h1M7 7h1M11 7h1M15 7h1" {...ic} strokeWidth={2.4} /></svg>;

// Metabase color affordance: a round color dot that opens a small swatch palette.
function ColorDot({ value, onChange, size = 18 }: { value: string; onChange: (v: string) => void; size?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover opened={open} onChange={setOpen} position="bottom-start" withArrow shadow="md" width={160}>
      <Popover.Target>
        <UnstyledButton
          onClick={() => setOpen((o) => !o)}
          aria-label={value}
          style={{ width: size, height: size, borderRadius: "50%", background: value, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)", flexShrink: 0 }}
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

function Seg<T extends string>({ label, value, onChange, data }: { label: string; value: T; onChange: (v: T) => void; data: { label: React.ReactNode; value: T }[] }) {
  return (
    <Stack gap={4}>
      <Label>{label}</Label>
      <SegmentedControl fullWidth size="xs" value={value} onChange={(v) => onChange(v as T)} data={data as any} />
    </Stack>
  );
}

// ============================================================ main panel ====

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

  const allCols = dataset.cols.map((c) => ({ value: c.name, label: c.display_name }));
  const dimOptions = getDimensions(dataset).map((c) => ({ value: c.name, label: c.display_name }));
  const metricCols = dataset.cols.filter(isMetric);
  const metricOptions = metricCols.map((c) => ({ value: c.name, label: c.display_name }));
  const { metrics: activeMetrics } = resolveShape(dataset, settings);
  const isCartesian = CARTESIAN.includes(vizId);

  return (
    <Box style={{ width: 320, borderRight: `1px solid ${MB_COLORS.border}`, background: MB_COLORS.white, display: "flex", flexDirection: "column", height: "100%" }}>
      <Group gap="xs" style={{ padding: "12px 16px", borderBottom: `1px solid ${MB_COLORS.border}` }}>
        <UnstyledButton onClick={onBack} aria-label="Retour" style={{ color: MB_COLORS.textSecondary, display: "inline-flex" }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </UnstyledButton>
        <Text fw={700} style={{ color: MB_COLORS.textPrimary }}>Options {def.name}</Text>
      </Group>

      <Tabs value={tab} onChange={(v) => v && setTab(v)} variant="default">
        <Tabs.List grow style={{ padding: "0 8px" }}>
          {tabs.map((t) => (
            <Tabs.Tab key={t} value={t} style={{ fontWeight: 700, fontSize: 13 }}>{t}</Tabs.Tab>
          ))}
        </Tabs.List>

        <ScrollArea style={{ height: "calc(100vh - 190px)" }}>
          <Box style={{ padding: 16 }}>
            {tab === "Données" && (
              <DonneesTab vizId={vizId} settings={settings} onChange={onChange} allCols={allCols} dimOptions={dimOptions} metricOptions={metricOptions} activeMetrics={activeMetrics} />
            )}
            {tab === "Affichage" && <AffichageTab vizId={vizId} settings={settings} onChange={onChange} isCartesian={isCartesian} allCols={allCols} />}
            {tab === "Axes" && <AxesTab settings={settings} onChange={onChange} />}
            {tab === "Mise en forme" && <FormatTab vizId={vizId} settings={settings} onChange={onChange} allCols={allCols} />}
            {tab === "Plages" && <RangesTab settings={settings} onChange={onChange} />}
            {tab === "Couleurs" && <ConditionalColorsTab vizId={vizId} settings={settings} onChange={onChange} allCols={allCols} />}
          </Box>
        </ScrollArea>
      </Tabs>

      <Box style={{ padding: 16, borderTop: `1px solid ${MB_COLORS.border}`, marginTop: "auto" }}>
        <Button fullWidth radius="xl" onClick={onBack} color="brand">Terminé</Button>
      </Box>
    </Box>
  );
}

// ============================================== series list (sortable) ====

function SeriesRow({
  seriesKey,
  displayName,
  color,
  index,
  canRemove,
  hasPopover,
  vizId,
  settings,
  onChange,
  onRemove,
}: {
  seriesKey: string;
  displayName: string;
  color: string;
  index: number;
  canRemove: boolean;
  hasPopover: boolean;
  vizId: VizId;
  settings: VizSettings;
  onChange: (p: Partial<VizSettings>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: seriesKey });
  const opts: SeriesOpts = settings.series[seriesKey] ?? {};
  return (
    <Group
      ref={setNodeRef}
      gap={8}
      wrap="nowrap"
      style={{
        border: `1px solid ${MB_COLORS.border}`,
        borderRadius: 8,
        padding: "6px 10px",
        background: MB_COLORS.white,
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.12)" : undefined,
      }}
    >
      <span {...attributes} {...listeners} aria-label={`Déplacer ${displayName}`} style={{ color: MB_COLORS.textTertiary, cursor: "grab", display: "inline-flex", touchAction: "none" }}>
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2" cy="3" r="1.3" /><circle cx="8" cy="3" r="1.3" /><circle cx="2" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="2" cy="13" r="1.3" /><circle cx="8" cy="13" r="1.3" /></svg>
      </span>
      <ColorDot value={color} onChange={(v) => onChange({ colors: { ...settings.colors, [seriesKey]: v } })} />
      <Text fz="sm" fw={600} style={{ flex: 1, color: MB_COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {opts.name ?? displayName}
      </Text>
      {hasPopover && (
        <SeriesPopover vizId={vizId} seriesKey={seriesKey} displayName={displayName} index={index} settings={settings} onChange={onChange} />
      )}
      {canRemove && (
        <ActionIcon size="sm" variant="subtle" color="gray" aria-label={`Retirer ${displayName}`} onClick={onRemove}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </ActionIcon>
      )}
    </Group>
  );
}

function SeriesList({
  vizId,
  settings,
  onChange,
  activeMetrics,
  metricOptions,
  label,
}: any) {
  const names: string[] = activeMetrics.map((m: any) => m.name);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const hasPopover = SERIES_POPOVER_VIZ.includes(vizId);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = names.indexOf(String(active.id));
    const to = names.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = [...names];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange({ metrics: next });
  };

  const remove = (name: string) => {
    const next = names.filter((n) => n !== name);
    if (next.length) onChange({ metrics: next });
  };
  const add = (name: string) => {
    if (!names.includes(name)) onChange({ metrics: [...names, name] });
  };
  const available = metricOptions.filter((o: any) => !names.includes(o.value));

  return (
    <Stack gap={6}>
      <Label>{label}</Label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={names} strategy={verticalListSortingStrategy}>
          <Stack gap={6}>
            {activeMetrics.map((m: any, i: number) => (
              <SeriesRow
                key={m.name}
                seriesKey={m.name}
                displayName={m.display_name}
                color={settings.colors[m.name] ?? seriesColor(i)}
                index={i}
                canRemove={activeMetrics.length > 1}
                hasPopover={hasPopover}
                vizId={vizId}
                settings={settings}
                onChange={onChange}
                onRemove={() => remove(m.name)}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
      {available.length > 0 && (
        <Menu shadow="md" width={220} position="bottom-start">
          <Menu.Target>
            <Anchor component="button" type="button" fz="sm" fw={700} style={{ color: MB_COLORS.brand, alignSelf: "flex-start" }}>
              Ajouter une autre série
            </Anchor>
          </Menu.Target>
          <Menu.Dropdown>
            {available.map((o: any) => (
              <Menu.Item key={o.value} onClick={() => add(o.value)}>{o.label}</Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}
    </Stack>
  );
}

// ===================================== per-series popover (Style / format) ====

function SeriesPopover({
  vizId,
  seriesKey,
  displayName,
  index,
  settings,
  onChange,
}: {
  vizId: VizId;
  seriesKey: string;
  displayName: string;
  index: number;
  settings: VizSettings;
  onChange: (p: Partial<VizSettings>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("Style");
  const opts: SeriesOpts = settings.series[seriesKey] ?? {};
  const patch = (p: Partial<SeriesOpts>) => onChange({ series: { ...settings.series, [seriesKey]: { ...opts, ...p } } });
  const fmt = opts.fmt ?? {};
  const patchFmt = (p: Partial<typeof fmt>) => patch({ fmt: { ...fmt, ...p } });

  const baseDisplay: SeriesDisplay = vizId === "area" ? "area" : vizId === "line" ? "line" : "bar";
  const display = opts.display ?? baseDisplay;
  const axisLabel = vizId === "row" ? "Position de l'axe des abscisses" : "Position de l'axe des ordonnées";

  return (
    <Popover opened={open} onChange={setOpen} position="left-start" withArrow shadow="lg" width={330} withinPortal>
      <Popover.Target>
        <ActionIcon size="sm" variant="subtle" color="gray" aria-label={`Options ${displayName}`} onClick={() => setOpen((o) => !o)}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" /></svg>
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Tabs value={tab} onChange={(v) => v && setTab(v)}>
          <Tabs.List grow>
            <Tabs.Tab value="Style" style={{ fontWeight: 700, fontSize: 13 }}>Style</Tabs.Tab>
            <Tabs.Tab value="Mise en forme" style={{ fontWeight: 700, fontSize: 13 }}>Mise en forme</Tabs.Tab>
          </Tabs.List>

          <ScrollArea.Autosize mah={460}>
            <Box p="md">
              {tab === "Style" ? (
                <Stack gap="md">
                  {/* 1. Couleur + nom */}
                  <Group gap={10} wrap="nowrap">
                    <ColorDot size={24} value={settings.colors[seriesKey] ?? seriesColor(index)} onChange={(v) => onChange({ colors: { ...settings.colors, [seriesKey]: v } })} />
                    <TextInput size="sm" style={{ flex: 1 }} value={opts.name ?? displayName} onChange={(e) => patch({ name: e.currentTarget.value })} data-testid="series-name-input" />
                  </Group>

                  {/* 2. Type d'affichage */}
                  <Seg<SeriesDisplay> label="Type d'affichage" value={display} onChange={(v) => patch({ display: v })} data={[{ label: <IconLine />, value: "line" }, { label: <IconArea />, value: "area" }, { label: <IconBar />, value: "bar" }]} />

                  {/* 3. Forme de la ligne */}
                  <Seg<LineShape> label="Forme de la ligne" value={opts.lineShape ?? "straight"} onChange={(v) => patch({ lineShape: v })} data={[{ label: <IconStraight />, value: "straight" }, { label: <IconCurved />, value: "curved" }, { label: <IconStepped />, value: "stepped" }]} />

                  {/* 4. Style de ligne */}
                  <Seg<LineDash> label="Style de ligne" value={opts.lineDash ?? "solid"} onChange={(v) => patch({ lineDash: v })} data={[{ label: <IconSolid />, value: "solid" }, { label: <IconDashed />, value: "dashed" }, { label: <IconDotted />, value: "dotted" }]} />

                  {/* 5. Taille de la ligne */}
                  <Seg<LineSize> label="Taille de la ligne" value={opts.lineSize ?? "M"} onChange={(v) => patch({ lineSize: v })} data={[{ label: "S", value: "S" }, { label: "M", value: "M" }, { label: "L", value: "L" }]} />

                  {/* 6. Afficher les points */}
                  <Seg<MarkerMode> label="Afficher les points sur les lignes" value={opts.markers ?? "auto"} onChange={(v) => patch({ markers: v })} data={[{ label: "Auto", value: "auto" }, { label: "Activé", value: "on" }, { label: "Désactivé", value: "off" }]} />

                  {/* 7. Remplacer les valeurs manquantes par */}
                  <Select
                    label="Remplacer les valeurs manquantes par"
                    size="sm"
                    data={[
                      { value: "interpolate", label: "Interpolé linéairement" },
                      { value: "zero", label: "Zéro" },
                      { value: "none", label: "Aucun" },
                    ]}
                    value={opts.missing ?? "interpolate"}
                    onChange={(v) => v && patch({ missing: v as MissingValues })}
                    allowDeselect={false}
                    comboboxProps={{ withinPortal: true }}
                  />

                  {/* 8. Position de l'axe */}
                  <Seg<AxisPosition> label={axisLabel} value={opts.axis ?? "auto"} onChange={(v) => patch({ axis: v })} data={[{ label: "Auto", value: "auto" }, { label: vizId === "row" ? "Bas" : "Gauche", value: "left" }, { label: vizId === "row" ? "Haut" : "Droite", value: "right" }]} />

                  {/* 9 & 10. Tendance / valeurs pour cette série */}
                  <Switch size="sm" checked={opts.trendline ?? false} label="Afficher une courbe de tendance pour cette série" onChange={(e) => patch({ trendline: e.currentTarget.checked })} />
                  <Switch size="sm" checked={opts.showValues ?? false} label="Afficher les valeurs pour cette série" onChange={(e) => patch({ showValues: e.currentTarget.checked })} />
                </Stack>
              ) : (
                <Stack gap="md">
                  <NumberInput label="Nombre de décimales" size="sm" placeholder="auto" min={0} max={10} value={fmt.decimals ?? undefined} onChange={(v) => patchFmt({ decimals: v === "" || v == null ? null : Number(v) })} />
                  <NumberInput label="Multiplier par un nombre" size="sm" placeholder="1" hideControls value={fmt.multiplyBy ?? undefined} onChange={(v) => patchFmt({ multiplyBy: v === "" || v == null ? null : Number(v) })} />
                  <TextInput label="Ajouter un préfixe" size="sm" value={fmt.prefix ?? ""} onChange={(e) => patchFmt({ prefix: e.currentTarget.value })} />
                  <TextInput label="Ajouter un suffixe" size="sm" value={fmt.suffix ?? ""} onChange={(e) => patchFmt({ suffix: e.currentTarget.value })} />
                </Stack>
              )}
            </Box>
          </ScrollArea.Autosize>
        </Tabs>
      </Popover.Dropdown>
    </Popover>
  );
}

// ================================================================ Données ====

function DonneesTab({ vizId, settings, onChange, allCols, dimOptions, metricOptions, activeMetrics }: any) {
  const FieldSelect = ({ label, value, data, onPick, clearable = false, placeholder = "Sélectionnez un champ" }: any) => (
    <Stack gap={6}>
      <Label>{label}</Label>
      <Select data={data} value={value ?? null} onChange={(v: any) => onPick(v)} allowDeselect={false} clearable={clearable} comboboxProps={{ withinPortal: true }} placeholder={placeholder} size="sm" />
    </Stack>
  );

  if (vizId === "pie") {
    return (
      <Stack gap="md">
        <FieldSelect label="Mesure" value={settings.metrics?.[0] ?? activeMetrics[0]?.name} data={metricOptions} onPick={(v: string) => v && onChange({ metrics: [v] })} />
        <FieldSelect label="Dimension" value={settings.dimension} data={allCols} onPick={(v: string) => v && onChange({ dimension: v })} />
        <FieldSelect label="Anneau intérieur" value={settings.innerRing} data={dimOptions} onPick={(v: string) => onChange({ innerRing: v ?? undefined })} clearable placeholder="(optionnel)" />
        <FieldSelect label="Anneau extérieur" value={settings.outerRing} data={dimOptions} onPick={(v: string) => onChange({ outerRing: v ?? undefined })} clearable placeholder="(optionnel)" />
        <Select label="Tri" data={SORT_OPTIONS} value={settings.sort} onChange={(v) => v && onChange({ sort: v as SortOrder })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
      </Stack>
    );
  }
  if (vizId === "funnel") {
    return (
      <Stack gap="md">
        <FieldSelect label="Colonne avec les étapes" value={settings.dimension} data={allCols} onPick={(v: string) => v && onChange({ dimension: v })} />
        <FieldSelect label="Mesure" value={settings.metrics?.[0] ?? activeMetrics[0]?.name} data={metricOptions} onPick={(v: string) => v && onChange({ metrics: [v] })} />
      </Stack>
    );
  }
  if (vizId === "smartscalar") {
    const comparisons: ComparisonType[] = settings.comparisons ?? ["previous"];
    const COMP_LABEL: Record<ComparisonType, string> = { previous: "Valeur précédente", first: "Première valeur", average: "Moyenne de la série" };
    return (
      <Stack gap="md">
        <FieldSelect label="Nombre principal" value={settings.metrics?.[0] ?? activeMetrics[0]?.name} data={metricOptions} onPick={(v: string) => v && onChange({ metrics: [v] })} />
        <Stack gap={6}>
          <Label>Comparaisons</Label>
          {comparisons.map((c, i) => (
            <Group key={`${c}-${i}`} gap={6} wrap="nowrap" style={{ border: `1px solid ${MB_COLORS.border}`, borderRadius: 8, padding: "4px 8px" }}>
              <Select
                size="xs"
                style={{ flex: 1 }}
                data={[
                  { value: "previous", label: COMP_LABEL.previous },
                  { value: "first", label: COMP_LABEL.first },
                  { value: "average", label: COMP_LABEL.average },
                ]}
                value={c}
                onChange={(v) => v && onChange({ comparisons: comparisons.map((x, j) => (j === i ? (v as ComparisonType) : x)) })}
                allowDeselect={false}
                comboboxProps={{ withinPortal: true }}
              />
              {comparisons.length > 1 && (
                <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Retirer la comparaison" onClick={() => onChange({ comparisons: comparisons.filter((_, j) => j !== i) })}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </ActionIcon>
              )}
            </Group>
          ))}
          {comparisons.length < 3 && (
            <Anchor component="button" type="button" fz="sm" fw={700} style={{ color: MB_COLORS.brand, alignSelf: "flex-start" }} onClick={() => onChange({ comparisons: [...comparisons, "previous"] })}>
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
        <FieldSelect label="Nombre principal" value={settings.metrics?.[0] ?? activeMetrics[0]?.name} data={metricOptions} onPick={(v: string) => v && onChange({ metrics: [v] })} />
        <NumberInput label={vizId === "progress" ? "Objectif" : "Objectif (optionnel)"} placeholder="auto" size="sm" hideControls value={settings.goalValue ?? undefined} onChange={(v) => onChange({ goalValue: v === "" || v == null ? null : Number(v) })} />
      </Stack>
    );
  }
  if (vizId === "sankey") {
    return (
      <Stack gap="md">
        <FieldSelect label="Source" value={settings.sourceField} data={dimOptions} onPick={(v: string) => v && onChange({ sourceField: v })} />
        <FieldSelect label="Destination" value={settings.targetField} data={dimOptions} onPick={(v: string) => v && onChange({ targetField: v })} />
        <FieldSelect label="Mesure" value={settings.metrics?.[0]} data={metricOptions} onPick={(v: string) => v && onChange({ metrics: [v] })} />
      </Stack>
    );
  }
  if (vizId === "pivot") {
    return (
      <Stack gap="md">
        <FieldSelect label="Lignes" value={settings.rowField} data={dimOptions} onPick={(v: string) => v && onChange({ rowField: v })} />
        <FieldSelect label="Colonnes" value={settings.colField} data={dimOptions} onPick={(v: string) => v && onChange({ colField: v })} />
        <FieldSelect label="Mesure" value={settings.metrics?.[0]} data={metricOptions} onPick={(v: string) => v && onChange({ metrics: [v] })} />
      </Stack>
    );
  }
  if (vizId === "map") {
    return (
      <Stack gap="md">
        <Select label="Carte par région" size="sm" data={MAP_REGIONS.map((r) => ({ value: r.value, label: r.label }))} value={settings.mapRegion} onChange={(v) => v && onChange({ mapRegion: v as any })} allowDeselect={false} comboboxProps={{ withinPortal: true }} />
        <FieldSelect label="Champ de région" value={settings.locationField} data={allCols} onPick={(v: string) => v && onChange({ locationField: v })} placeholder="Nom, code INSEE…" />
        <FieldSelect label="Champ de métrique" value={settings.metrics?.[0]} data={metricOptions} onPick={(v: string) => v && onChange({ metrics: [v] })} />
      </Stack>
    );
  }
  if (vizId === "scatter") {
    const xName = settings.metrics?.[0] ?? activeMetrics[0]?.name;
    const yName = settings.metrics?.[1] ?? activeMetrics[1]?.name ?? activeMetrics[0]?.name;
    return (
      <Stack gap="md">
        <FieldSelect label="Taille des bulles" value={settings.bubbleField} data={metricOptions} onPick={(v: string) => onChange({ bubbleField: v ?? undefined })} clearable />
        <FieldSelect label="Axe X" value={xName} data={metricOptions} onPick={(v: string) => v && onChange({ metrics: [v, yName].filter(Boolean) })} />
        <FieldSelect label="Axe Y" value={yName} data={metricOptions} onPick={(v: string) => v && onChange({ metrics: [xName, v].filter(Boolean) })} />
      </Stack>
    );
  }
  if (vizId === "waterfall") {
    return (
      <Stack gap="md">
        <FieldSelect label="Axe X (dimension)" value={settings.dimension} data={allCols} onPick={(v: string) => v && onChange({ dimension: v })} />
        <FieldSelect label="Mesure" value={settings.metrics?.[0] ?? activeMetrics[0]?.name} data={metricOptions} onPick={(v: string) => v && onChange({ metrics: [v] })} />
        <Select label="Tri" data={SORT_OPTIONS} value={settings.sort} onChange={(v) => v && onChange({ sort: v as SortOrder })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
      </Stack>
    );
  }
  if (vizId === "treemap") {
    return (
      <Stack gap="md">
        <FieldSelect label="Dimension" value={settings.dimension} data={dimOptions} onPick={(v: string) => v && onChange({ dimension: v })} />
        <FieldSelect label="Grouping (2ᵉ niveau)" value={settings.breakout} data={dimOptions.filter((o: any) => o.value !== settings.dimension)} onPick={(v: string) => onChange({ breakout: v ?? undefined })} clearable placeholder="(optionnel)" />
        <FieldSelect label="Mesure" value={settings.metrics?.[0] ?? activeMetrics[0]?.name} data={metricOptions} onPick={(v: string) => v && onChange({ metrics: [v] })} />
      </Stack>
    );
  }
  if (vizId === "table" || vizId === "object") {
    return <Text fz="sm" style={{ color: MB_COLORS.textTertiary }}>Aucune option de données pour ce type.</Text>;
  }

  // Cartesian family + boxplot. Row chart inverts the axis labels.
  const rowChart = vizId === "row";
  return (
    <Stack gap="lg">
      <FieldSelect label={`${rowChart ? "Axe Y" : "Axe X"} (dimension)`} value={settings.dimension} data={allCols} onPick={(v: string) => v && onChange({ dimension: v })} />
      <SeriesList vizId={vizId} settings={settings} onChange={onChange} activeMetrics={activeMetrics} metricOptions={metricOptions} label={rowChart ? "Axe X" : "Axe Y"} />
      {CARTESIAN.includes(vizId) && (
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
      <Select label="Tri" data={SORT_OPTIONS} value={settings.sort} onChange={(v) => v && onChange({ sort: v as SortOrder })} allowDeselect={false} comboboxProps={{ withinPortal: true }} size="sm" />
    </Stack>
  );
}

// ============================================================== Affichage ====

function AffichageTab({ vizId, settings, onChange, isCartesian, allCols }: any) {
  const tooltipOptions = (allCols ?? []).filter((o: any) => o.value !== settings.dimension);
  return (
    <Stack gap="md">
      {/* Empilement: available for every cartesian chart, including Courbe. */}
      {isCartesian && (
        <>
          <Seg<Stacking>
            label="Empilement"
            value={settings.stacking}
            onChange={(v) => onChange({ stacking: v })}
            data={[{ label: "Ne pas empiler", value: "none" }, { label: "Empiler", value: "stacked" }, { label: "100 %", value: "normalized" }]}
          />
          {settings.stacking !== "none" && (
            <Switch size="sm" checked={settings.showStackTotals} label="Afficher les totaux d'empilement" onChange={(e) => onChange({ showStackTotals: e.currentTarget.checked })} />
          )}
        </>
      )}

      {["bar", "line", "area", "combo", "gauge", "progress"].includes(vizId) && (
        <NumberInput label="Ligne d'objectif" placeholder="aucun" value={settings.goalValue ?? undefined} onChange={(v) => onChange({ goalValue: v === "" || v == null ? null : Number(v) })} size="sm" hideControls />
      )}

      {(isCartesian || vizId === "waterfall") && (
        <Switch size="sm" checked={settings.showValues} label="Afficher les valeurs sur les points de données" onChange={(e) => onChange({ showValues: e.currentTarget.checked })} />
      )}

      {isCartesian && (
        <Seg<LabelFormatting> label="Mise en forme automatique" value={settings.labelFormatting} onChange={(v) => onChange({ labelFormatting: v })} data={[{ label: "Auto", value: "auto" }, { label: "Compact", value: "compact" }, { label: "Complet", value: "full" }]} />
      )}

      {["bar", "line", "area", "combo"].includes(vizId) && (
        <Switch size="sm" checked={settings.showTrendline} label="Courbe de tendance" onChange={(e) => onChange({ showTrendline: e.currentTarget.checked })} />
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

      {["bar", "line", "area", "combo", "row", "pie", "funnel"].includes(vizId) && (
        <Switch size="sm" checked={settings.showLegend} label="Afficher la légende" onChange={(e) => onChange({ showLegend: e.currentTarget.checked })} />
      )}

      {vizId === "waterfall" && (
        <>
          <Stack gap={6}>
            <Label>Augmentation/Diminution (optionnel)</Label>
            <Group gap={10} wrap="nowrap">
              <ColorDot value={settings.increaseColor} onChange={(v) => onChange({ increaseColor: v })} />
              <Text fz="sm" style={{ flex: 1, color: MB_COLORS.textPrimary }}>Augmentation</Text>
            </Group>
            <Group gap={10} wrap="nowrap">
              <ColorDot value={settings.decreaseColor} onChange={(v) => onChange({ decreaseColor: v })} />
              <Text fz="sm" style={{ flex: 1, color: MB_COLORS.textPrimary }}>Diminution</Text>
            </Group>
          </Stack>
          <Switch size="sm" checked={settings.showTotalColumn} label="Afficher la colonne de total" onChange={(e) => onChange({ showTotalColumn: e.currentTarget.checked })} />
        </>
      )}

      {vizId === "pie" && (
        <>
          <Switch size="sm" checked={settings.pieDonut} label="Anneau (donut)" onChange={(e) => onChange({ pieDonut: e.currentTarget.checked })} />
          {settings.pieDonut && <Switch size="sm" checked={settings.pieShowTotal} label="Afficher le total au centre" onChange={(e) => onChange({ pieShowTotal: e.currentTarget.checked })} />}
          <Seg<PieLabelDisplay> label="Affichage des étiquettes" value={settings.pieLabelDisplay} onChange={(v) => onChange({ pieLabelDisplay: v })} data={[{ label: "Automatique", value: "auto" }, { label: "Visible", value: "on" }, { label: "Masqué", value: "off" }]} />
          <Seg<PieValueFormat> label="Format des valeurs" value={settings.pieValueFormat} onChange={(v) => onChange({ pieValueFormat: v })} data={[{ label: "Pourcentage", value: "percent" }, { label: "Valeur", value: "value" }, { label: "Valeur + %", value: "both" }]} />
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

      {vizId === "funnel" && (
        <>
          <Seg<FunnelDisplay> label="Type d'affichage" value={settings.funnelDisplay} onChange={(v) => onChange({ funnelDisplay: v })} data={[{ label: "Entonnoir", value: "funnel" }, { label: "Barres", value: "bar" }]} />
          <Switch size="sm" checked={settings.funnelShowPercent} label="Afficher le taux de conversion" onChange={(e) => onChange({ funnelShowPercent: e.currentTarget.checked })} />
        </>
      )}

      {vizId === "boxplot" && (
        <>
          <Switch size="sm" checked={settings.showOutliers} label="Afficher les valeurs extrêmes" onChange={(e) => onChange({ showOutliers: e.currentTarget.checked })} />
          <Seg<QuartileStyle> label="Style des quartiles" value={settings.quartileStyle} onChange={(v) => onChange({ quartileStyle: v })} data={[{ label: "Boîte", value: "box" }, { label: "Ligne", value: "line" }]} />
        </>
      )}

      {vizId === "scatter" && (
        <Switch size="sm" checked={settings.scatterShowLabels} label="Afficher les étiquettes des points" onChange={(e) => onChange({ scatterShowLabels: e.currentTarget.checked })} />
      )}

      {vizId === "treemap" && (
        <>
          <Switch size="sm" checked={settings.treemapShowLeafLabels} label="Afficher les libellés des feuilles" onChange={(e) => onChange({ treemapShowLeafLabels: e.currentTarget.checked })} />
          <Switch size="sm" checked={settings.treemapShowLeafValues} label="Afficher les valeurs des feuilles" onChange={(e) => onChange({ treemapShowLeafValues: e.currentTarget.checked })} />
          <Switch size="sm" checked={settings.treemapShowParentLabels} label="Afficher les libellés des parents" onChange={(e) => onChange({ treemapShowParentLabels: e.currentTarget.checked })} />
          <Switch size="sm" checked={settings.treemapShowParentValues} label="Afficher les valeurs des parents" onChange={(e) => onChange({ treemapShowParentValues: e.currentTarget.checked })} />
        </>
      )}

      {vizId === "smartscalar" && (
        <Switch size="sm" checked={settings.showValues} label="Afficher la valeur de comparaison" onChange={(e) => onChange({ showValues: e.currentTarget.checked })} />
      )}
    </Stack>
  );
}

// =================================================================== Axes ====

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
        <Seg<YScale> label="Échelle" value={settings.yScale} onChange={(v) => onChange({ yScale: v })} data={[{ label: "Linéaire", value: "linear" }, { label: "Logarithmique", value: "log" }]} />
        <Switch size="sm" checked={settings.yAutoRange} label="Plage automatique de l'axe des ordonnées" onChange={(e) => onChange({ yAutoRange: e.currentTarget.checked })} />
        {!settings.yAutoRange ? (
          <Group grow gap="xs">
            <NumberInput label="Min" size="sm" hideControls value={settings.yMin ?? undefined} onChange={(v) => onChange({ yMin: v === "" || v == null ? null : Number(v) })} />
            <NumberInput label="Max" size="sm" hideControls value={settings.yMax ?? undefined} onChange={(v) => onChange({ yMax: v === "" || v == null ? null : Number(v) })} />
          </Group>
        ) : (
          <Switch size="sm" checked={settings.unpinFromZero} label="Détacher de zéro" onChange={(e) => onChange({ unpinFromZero: e.currentTarget.checked })} />
        )}
        <NumberInput label="Nombre de graduations" size="sm" placeholder="auto" min={2} max={20} value={settings.ySplitNumber ?? undefined} onChange={(v) => onChange({ ySplitNumber: v === "" || v == null ? null : Number(v) })} />
      </Stack>
    </Stack>
  );
}

// ========================================================= Mise en forme ====

function FormatTab({ vizId, settings, onChange, allCols }: any) {
  const fmt = settings.numberFormat;
  const patch = (p: Partial<typeof fmt>) => onChange({ numberFormat: { ...fmt, ...p } });
  return (
    <Stack gap="md">
      {(vizId === "scalar" || vizId === "object") && (
        <Select label="Champ à afficher" data={allCols} value={settings.scalarField ?? null} onChange={(v: any) => onChange({ scalarField: v ?? undefined })} placeholder="Automatique" clearable comboboxProps={{ withinPortal: true }} size="sm" />
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
          <Stack gap={4}>
            <Label>Où afficher l'unité de devise</Label>
            <Radio.Group value={fmt.currencyPlacement} onChange={(v) => patch({ currencyPlacement: v as CurrencyPlacement })}>
              <Stack gap={4}>
                <Radio size="xs" value="cell" label="Dans chaque cellule du tableau" />
                <Radio size="xs" value="header" label="Dans l'en-tête de colonne" />
              </Stack>
            </Radio.Group>
          </Stack>
        </>
      )}
      <Select label="Style de séparateur" size="sm" data={SEPARATOR_OPTIONS} value={fmt.separator} onChange={(v) => v && patch({ separator: v as SeparatorStyle })} allowDeselect={false} comboboxProps={{ withinPortal: true }} />
      <NumberInput label="Nombre de décimales" size="sm" placeholder="auto" min={0} max={10} value={fmt.decimals ?? undefined} onChange={(v) => patch({ decimals: v === "" || v == null ? null : Number(v) })} />
      <NumberInput label="Multiplier par un nombre" size="sm" placeholder="1" hideControls value={fmt.multiplyBy ?? undefined} onChange={(v) => patch({ multiplyBy: v === "" || v == null ? null : Number(v) })} />
      <TextInput label="Ajouter un préfixe" size="sm" value={fmt.prefix ?? ""} onChange={(e) => patch({ prefix: e.currentTarget.value })} />
      <TextInput label="Ajouter un suffixe" size="sm" value={fmt.suffix ?? ""} onChange={(e) => patch({ suffix: e.currentTarget.value })} />
    </Stack>
  );
}

// =================================================== Couleurs conditionnelles ====

const COND_OPS: { value: ConditionOp; label: string }[] = [
  { value: ">", label: "Supérieur à" },
  { value: ">=", label: "Supérieur ou égal à" },
  { value: "<", label: "Inférieur à" },
  { value: "<=", label: "Inférieur ou égal à" },
  { value: "=", label: "Égal à" },
  { value: "!=", label: "Différent de" },
];

function ConditionalColorsTab({ vizId, settings, onChange, allCols }: any) {
  const rules: ColorRule[] = settings.colorRules ?? [];
  const update = (i: number, p: Partial<ColorRule>) => onChange({ colorRules: rules.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  const remove = (i: number) => onChange({ colorRules: rules.filter((_, j) => j !== i) });
  const add = () => onChange({ colorRules: [...rules, { column: allCols[0]?.value, operator: ">", value: 0, color: SWATCHES[3] }] });

  return (
    <Stack gap="md">
      <Text fz="xs" style={{ color: MB_COLORS.textTertiary }}>
        Colorez {vizId === "table" ? "les cellules ou les lignes" : "la valeur"} selon une condition.
      </Text>

      {rules.map((r, i) => (
        <Stack key={i} gap={6} style={{ border: `1px solid ${MB_COLORS.border}`, borderRadius: 8, padding: 10 }}>
          <Group justify="space-between">
            <Text fz="xs" fw={700} style={{ color: MB_COLORS.textTertiary }}>Règle {i + 1}</Text>
            <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Supprimer la règle" onClick={() => remove(i)}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </ActionIcon>
          </Group>
          <Select size="xs" label="Colonne" data={allCols} value={r.column ?? null} onChange={(v) => v && update(i, { column: v })} allowDeselect={false} comboboxProps={{ withinPortal: true }} />
          <Group grow gap="xs">
            <Select size="xs" label="Condition" data={COND_OPS} value={r.operator} onChange={(v) => v && update(i, { operator: v as ConditionOp })} allowDeselect={false} comboboxProps={{ withinPortal: true }} />
            <NumberInput size="xs" label="Valeur" hideControls value={r.value} onChange={(v) => update(i, { value: Number(v) || 0 })} />
          </Group>
          <Group gap={10} wrap="nowrap" mt={4}>
            <ColorDot value={r.color} onChange={(v) => update(i, { color: v })} />
            <Text fz="sm" style={{ flex: 1, color: MB_COLORS.textPrimary }}>Couleur</Text>
          </Group>
          {vizId === "table" && (
            <Switch size="sm" checked={!!r.wholeRow} label="Colorer toute la ligne" onChange={(e) => update(i, { wholeRow: e.currentTarget.checked })} />
          )}
        </Stack>
      ))}

      <Anchor component="button" type="button" fz="sm" fw={700} style={{ color: MB_COLORS.brand, alignSelf: "flex-start" }} onClick={add}>
        Ajouter une règle
      </Anchor>
    </Stack>
  );
}

// ================================================================= Plages ====

const DEFAULT_RANGES: GaugeRange[] = [
  { color: "#EF8C8C", label: "", min: 0, max: 0.5 },
  { color: "#F9D45C", label: "", min: 0.5, max: 1 },
  { color: "#88BF4D", label: "", min: 1, max: 2 },
];

function RangesTab({ settings, onChange }: { settings: VizSettings; onChange: (p: Partial<VizSettings>) => void }) {
  const ranges = settings.gaugeRanges ?? DEFAULT_RANGES;
  const update = (i: number, p: Partial<GaugeRange>) => onChange({ gaugeRanges: ranges.map((r, idx) => (idx === i ? { ...r, ...p } : r)) });
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
              <Table.Td><ColorDot value={r.color} onChange={(v) => update(i, { color: v })} /></Table.Td>
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
      <Anchor component="button" type="button" fz="sm" fw={700} style={{ color: MB_COLORS.brand, alignSelf: "flex-start" }} onClick={add}>
        Ajouter une plage
      </Anchor>
    </Stack>
  );
}
