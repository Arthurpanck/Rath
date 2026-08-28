// The "Plages" tab: the gauge's coloured bands, each a range of the measure
// with its own colour and label.

import { ActionIcon, Anchor, NumberInput, Stack, Table, TextInput } from "@mantine/core";
import type { GaugeRange } from "../../../viz/settings";
import { MB_COLORS, seriesColor } from "../../../viz/options/constants";
import { ColorDot } from "../primitives";
import { DEFAULT_RANGES } from "../constants";
import type { TabProps } from "../types";

export function RangesTab({ settings, onChange }: TabProps) {
  const ranges = settings.gaugeRanges ?? DEFAULT_RANGES;
  const update = (i: number, p: Partial<GaugeRange>) =>
    onChange({ gaugeRanges: ranges.map((r, idx) => (idx === i ? { ...r, ...p } : r)) });
  const remove = (i: number) => onChange({ gaugeRanges: ranges.filter((_, idx) => idx !== i) });
  const add = () => {
    const last = ranges[ranges.length - 1];
    onChange({
      gaugeRanges: [
        ...ranges,
        {
          color: seriesColor(ranges.length),
          label: "",
          min: last?.max ?? 0,
          max: (last?.max ?? 0) + 1,
        },
      ],
    });
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
                <ColorDot value={r.color} onChange={(v) => update(i, { color: v })} />
              </Table.Td>
              <Table.Td>
                <TextInput
                  size="xs"
                  placeholder="(optionnel)"
                  value={r.label}
                  onChange={(e) => update(i, { label: e.currentTarget.value })}
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  size="xs"
                  hideControls
                  w={56}
                  value={r.min}
                  onChange={(v) => update(i, { min: Number(v) || 0 })}
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  size="xs"
                  hideControls
                  w={56}
                  value={r.max}
                  onChange={(v) => update(i, { max: Number(v) || 0 })}
                />
              </Table.Td>
              <Table.Td>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  aria-label="Supprimer la plage"
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
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Anchor
        component="button"
        type="button"
        fz="sm"
        fw={700}
        style={{ color: MB_COLORS.brand, alignSelf: "flex-start" }}
        onClick={add}
      >
        Ajouter une plage
      </Anchor>
    </Stack>
  );
}
