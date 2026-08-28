// The values of the treemap's "Grouping" column, listed under the picker: one
// row per value with its colour, a rename field and a "×" to drop it from the
// chart — the sub-dimensions Metabase shows indented under Grouping.

import { useMemo, useState } from "react";
import { ActionIcon, Anchor, Group, Menu, Popover, SimpleGrid, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import type { Dataset } from "../../data/types";
import type { VizSettings } from "../../viz/settings";
import { ACCENT_COLORS, MB_COLORS, seriesColor } from "../../viz/options/constants";
import { ColorDot, Label } from "./primitives";

/**
 * The values of the treemap's "Grouping" column, in size order: one row per
 * value with its colour, a "…" for renaming and a "×" to drop it from the
 * chart — the sub-dimensions Metabase lists under the Grouping select.
 */
export function TreemapGroupList({
  dataset,
  settings,
  onChange,
}: {
  dataset: Dataset;
  settings: VizSettings;
  onChange: (p: Partial<VizSettings>) => void;
}) {
  const values = useMemo(() => {
    const col = dataset.cols.find((c) => c.name === settings.dimension);
    if (!col) return [] as string[];
    const metric = dataset.cols.find((c) => c.name === settings.metrics?.[0]);
    const totals = new Map<string, number>();
    for (const r of dataset.rows) {
      const key = String(r[col.index] ?? "");
      totals.set(key, (totals.get(key) ?? 0) + (metric ? Number(r[metric.index]) || 0 : 1));
    }
    // Long-tail columns would fill the panel with hundreds of rows.
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([name]) => name);
  }, [dataset, settings.dimension, settings.metrics]);

  const hidden: string[] = settings.hiddenValues ?? [];
  const shown = values.filter((v) => !hidden.includes(v));
  const restorable = values.filter((v) => hidden.includes(v));
  if (values.length === 0) return null;

  return (
    <Stack gap={6} pl="md">
      {shown.map((value) => (
        <TreemapGroupRow
          key={value}
          value={value}
          // Indexed over every value, so removing one does not recolour the rest.
          color={settings.colors[value] ?? seriesColor(values.indexOf(value))}
          name={settings.series[value]?.name}
          settings={settings}
          onChange={onChange}
          onRemove={() => onChange({ hiddenValues: [...hidden, value] })}
        />
      ))}
      {restorable.length > 0 && (
        <Menu shadow="md" width={240} position="bottom-start" withinPortal>
          <Menu.Target>
            <Anchor component="button" type="button" fz="sm" fw={700} style={{ color: MB_COLORS.brand, alignSelf: "flex-start" }}>
              Ajouter une valeur
            </Anchor>
          </Menu.Target>
          <Menu.Dropdown mah={300} style={{ overflowY: "auto" }}>
            {restorable.map((v) => (
              <Menu.Item key={v} onClick={() => onChange({ hiddenValues: hidden.filter((h) => h !== v) })}>{v}</Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}
    </Stack>
  );
}

function TreemapGroupRow({
  value,
  color,
  name,
  settings,
  onChange,
  onRemove,
}: {
  value: string;
  color: string;
  name?: string;
  settings: VizSettings;
  onChange: (p: Partial<VizSettings>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Group gap={8} wrap="nowrap" style={{ border: `1px solid ${MB_COLORS.border}`, borderRadius: 8, padding: "6px 8px 6px 12px" }}>
      <ColorDot size={20} value={color} onChange={(v) => onChange({ colors: { ...settings.colors, [value]: v } })} />
      <Text fz="sm" fw={700} title={value} style={{ flex: 1, minWidth: 0, color: MB_COLORS.textPrimary }}>
        {name ?? value}
      </Text>
      <Popover opened={open} onChange={setOpen} position="left-start" withArrow shadow="lg" width={260} withinPortal>
        <Popover.Target>
          <ActionIcon variant="subtle" color="gray" aria-label={`Paramètres de ${value}`} onClick={() => setOpen((o) => !o)}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" /></svg>
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown p="sm">
          <Stack gap="xs">
            <TextInput
              size="sm"
              label="Nom affiché"
              value={name ?? value}
              onChange={(e) => onChange({ series: { ...settings.series, [value]: { ...settings.series[value], name: e.currentTarget.value } } })}
            />
            <Label>Couleur</Label>
            <SimpleGrid cols={4} spacing={8}>
              {ACCENT_COLORS.map((c) => (
                <UnstyledButton
                  key={c}
                  aria-label={c}
                  onClick={() => onChange({ colors: { ...settings.colors, [value]: c } })}
                  style={{ width: 24, height: 24, borderRadius: "50%", background: c, outline: c.toLowerCase() === color.toLowerCase() ? `2px solid ${MB_COLORS.textPrimary}` : "none", outlineOffset: 2 }}
                />
              ))}
            </SimpleGrid>
          </Stack>
        </Popover.Dropdown>
      </Popover>
      <ActionIcon variant="subtle" color="gray" aria-label={`Retirer ${value}`} onClick={onRemove}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </ActionIcon>
    </Group>
  );
}
