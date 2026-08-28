// The Y-axis series list: a drag-to-reorder row per measure, each with its
// colour, its name and the "…" popover holding that series' own style and
// number formatting.

import { useState } from "react";
import {
  ActionIcon,
  Anchor,
  Box,
  Group,
  Menu,
  NumberInput,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Column } from "../../data/types";
import type { VizId } from "../../viz/registry";
import { SERIES_POPOVER_VIZ } from "../../viz/families";
import type {
  AxisPosition,
  LineDash,
  LineShape,
  LineSize,
  MarkerMode,
  MissingValues,
  SeriesDisplay,
  SeriesOpts,
  VizSettings,
} from "../../viz/settings";
import { MB_COLORS, seriesColor } from "../../viz/options/constants";
import { ColorDot, Label, Seg } from "./primitives";
import { IconArea, IconBar, IconCurved, IconDashed, IconDotted, IconLine, IconSolid, IconStepped, IconStraight } from "./icons";
import type { SelectOption, SeriesListProps } from "./types";

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

export function SeriesList({
  vizId,
  settings,
  onChange,
  activeMetrics,
  metricOptions,
  label,
}: SeriesListProps) {
  const names: string[] = activeMetrics.map((m) => m.name);
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
  const available: SelectOption[] = metricOptions.filter((o) => !names.includes(o.value));

  return (
    <Stack gap={6}>
      <Label>{label}</Label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={names} strategy={verticalListSortingStrategy}>
          <Stack gap={6}>
            {activeMetrics.map((m: Column, i: number) => (
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
            {available.map((o) => (
              <Menu.Item key={o.value} onClick={() => add(o.value)}>{o.label}</Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}
    </Stack>
  );
}

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
