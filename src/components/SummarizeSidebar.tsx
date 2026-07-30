import { useState } from "react";
import { ActionIcon, Anchor, Box, Button, Divider, Group, Menu, ScrollArea, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import type { Dataset } from "../data/types";
import { isMetric } from "../data/types";
import type { AggFn, Aggregation, Summarize } from "../data/query";
import { AGG_FN_LABEL, describeAggregation } from "../data/query";
import { MB_COLORS } from "../viz/options/constants";

const FNS: AggFn[] = ["count", "sum", "mean", "min", "max", "distinct"];

/** Metabase's right-hand "Résumer par" / "Regrouper par" sidebar. */
export function SummarizeSidebar({
  dataset,
  summarize,
  onChange,
  onDone,
}: {
  dataset: Dataset;
  summarize: Summarize;
  onChange: (s: Summarize) => void;
  onDone: () => void;
}) {
  const [search, setSearch] = useState("");
  const metricCols = dataset.cols.filter(isMetric);
  const groupable = dataset.cols.filter((c) => c.display_name.toLowerCase().includes(search.toLowerCase()));

  const addAgg = (a: Aggregation) => onChange({ ...summarize, aggregations: [...summarize.aggregations, a] });
  const removeAgg = (i: number) => onChange({ ...summarize, aggregations: summarize.aggregations.filter((_, j) => j !== i) });
  const toggleBreakout = (name: string) =>
    onChange({
      ...summarize,
      breakouts: summarize.breakouts.includes(name) ? summarize.breakouts.filter((n) => n !== name) : [...summarize.breakouts, name],
    });

  return (
    <Box style={{ width: 300, borderLeft: `1px solid ${MB_COLORS.border}`, background: MB_COLORS.bgLight, display: "flex", flexDirection: "column", height: "100%" }}>
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="sm" p="md">
          <Text fw={700} fz="sm" style={{ color: MB_COLORS.textPrimary }}>Résumer par</Text>

          {summarize.aggregations.map((a, i) => (
            <Group key={i} gap={4} wrap="nowrap" style={{ background: MB_COLORS.brand, borderRadius: 8, padding: "6px 8px 6px 12px" }}>
              <Text fz="sm" fw={700} style={{ flex: 1, color: "#fff" }}>{describeAggregation(dataset, a)}</Text>
              <ActionIcon size="sm" variant="transparent" aria-label="Retirer l'agrégation" onClick={() => removeAgg(i)}>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </ActionIcon>
            </Group>
          ))}

          <Menu shadow="md" width={230} position="bottom-start" withinPortal>
            <Menu.Target>
              <Anchor component="button" type="button" fz="sm" fw={700} style={{ color: MB_COLORS.brand, alignSelf: "flex-start" }}>
                + Ajouter une agrégation
              </Anchor>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => addAgg({ fn: "count" })}>{AGG_FN_LABEL.count} de lignes</Menu.Item>
              {FNS.filter((f) => f !== "count").map((fn) => (
                <Menu.Sub key={fn}>
                  <Menu.Sub.Target>
                    <Menu.Sub.Item>{AGG_FN_LABEL[fn]} de…</Menu.Sub.Item>
                  </Menu.Sub.Target>
                  <Menu.Sub.Dropdown>
                    {metricCols.map((c) => (
                      <Menu.Item key={c.name} onClick={() => addAgg({ fn, column: c.name })}>{c.display_name}</Menu.Item>
                    ))}
                    {metricCols.length === 0 && <Menu.Item disabled>Aucune colonne numérique</Menu.Item>}
                  </Menu.Sub.Dropdown>
                </Menu.Sub>
              ))}
            </Menu.Dropdown>
          </Menu>

          <Divider my="xs" />

          <Text fw={700} fz="sm" style={{ color: MB_COLORS.textPrimary }}>Regrouper par</Text>
          <TextInput
            size="xs"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            rightSection={<svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke={MB_COLORS.textTertiary} strokeWidth="1.7" /><path d="M13 13l4 4" stroke={MB_COLORS.textTertiary} strokeWidth="1.7" strokeLinecap="round" /></svg>}
          />

          <Stack gap={2}>
            {groupable.map((c) => {
              const active = summarize.breakouts.includes(c.name);
              return (
                <UnstyledButton
                  key={c.name}
                  onClick={() => toggleBreakout(c.name)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: active ? MB_COLORS.brand : "transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text fz={9} fw={700} style={{ width: 26, color: active ? "rgba(255,255,255,0.8)" : MB_COLORS.textTertiary }}>
                    {c.base_type === "number" ? "123" : c.base_type === "date" ? "DATE" : "ABC"}
                  </Text>
                  <Text fz="sm" fw={active ? 700 : 400} style={{ flex: 1, color: active ? "#fff" : MB_COLORS.textPrimary }}>
                    {c.display_name}
                  </Text>
                  {!active && <Text fz="xs" style={{ color: MB_COLORS.textTertiary }}>+</Text>}
                </UnstyledButton>
              );
            })}
          </Stack>
        </Stack>
      </ScrollArea>

      <Box p="md" style={{ borderTop: `1px solid ${MB_COLORS.border}` }}>
        <Button fullWidth radius="xl" color="brand" onClick={onDone}>Terminé</Button>
      </Box>
    </Box>
  );
}

/** Top-bar button that toggles the sidebar. */
export function SummarizeButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <Button
      size="xs"
      radius="md"
      variant={active ? "light" : "subtle"}
      color="brand"
      onClick={onClick}
      leftSection={<Text fz="sm" fw={700} component="span">Σ</Text>}
    >
      Résumer
    </Button>
  );
}
