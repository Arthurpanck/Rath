import { useState } from "react";
import { Box, Button, Collapse, Grid, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import type { Dataset } from "../data/types";
import type { VizId } from "../viz/registry";
import { splitVisualizations } from "../viz/registry";
import { ChartTypeOption } from "./ChartTypeOption";
import { MB_COLORS } from "../viz/options/constants";

function OptionGrid({
  items,
  selected,
  onSelect,
}: {
  items: ReturnType<typeof splitVisualizations>["sensible"];
  selected: VizId;
  onSelect: (id: VizId) => void;
}) {
  return (
    <Grid gutter="lg" align="flex-start">
      {items.map((viz) => (
        <Grid.Col span={4} key={viz.id}>
          <ChartTypeOption viz={viz} selected={selected === viz.id} onSelect={onSelect} onOpenSettings={() => {}} />
        </Grid.Col>
      ))}
    </Grid>
  );
}

export function VizPickerSidebar({
  dataset,
  selected,
  onSelect,
  onDone,
}: {
  dataset: Dataset;
  selected: VizId;
  onSelect: (id: VizId) => void;
  onDone: () => void;
}) {
  const { sensible, others } = splitVisualizations(dataset);
  const [open, setOpen] = useState(others.some((o) => o.id === selected));

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
      <Box style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        <Stack gap="md">
          <OptionGrid items={sensible} selected={selected} onSelect={onSelect} />

          {others.length > 0 && (
            <Box mt="lg">
              <UnstyledButton onClick={() => setOpen((o) => !o)} style={{ width: "100%" }}>
                <Group gap={6} justify="space-between">
                  <Text fw={700} tt="uppercase" fz="sm" style={{ color: MB_COLORS.textSecondary }}>
                    Autres graphiques
                  </Text>
                  <Text style={{ color: MB_COLORS.textTertiary, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
                    ⌄
                  </Text>
                </Group>
              </UnstyledButton>
              <Collapse in={open}>
                <Box mt="md">
                  <OptionGrid items={others} selected={selected} onSelect={onSelect} />
                </Box>
              </Collapse>
            </Box>
          )}
        </Stack>
      </Box>

      <Box style={{ padding: 16, borderTop: `1px solid ${MB_COLORS.border}` }}>
        <Button fullWidth radius="xl" onClick={onDone} color="brand">
          Terminé
        </Button>
      </Box>
    </Box>
  );
}
