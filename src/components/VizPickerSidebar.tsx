import { useState } from "react";
import { Box, Button, Collapse, Grid, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import type { Dataset } from "../data/types";
import type { VizId } from "../viz/registry";
import { splitVisualizations } from "../viz/registry";
import { ChartTypeOption } from "./ChartTypeOption";
import { Chevron } from "../viz/icons";
import { MB_COLORS } from "../viz/options/constants";

function OptionGrid({
  items,
  selected,
  onSelect,
  onOpenSettings,
}: {
  items: ReturnType<typeof splitVisualizations>["sensible"];
  selected: VizId;
  onSelect: (id: VizId) => void;
  onOpenSettings: () => void;
}) {
  return (
    <Grid gutter="lg" align="flex-start">
      {items.map((viz) => (
        <Grid.Col span={4} key={viz.id}>
          <ChartTypeOption viz={viz} selected={selected === viz.id} onSelect={onSelect} onOpenSettings={onOpenSettings} />
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
  onOpenSettings,
}: {
  dataset: Dataset;
  selected: VizId;
  onSelect: (id: VizId) => void;
  onDone: () => void;
  onOpenSettings: () => void;
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
          <OptionGrid items={sensible} selected={selected} onSelect={onSelect} onOpenSettings={onOpenSettings} />

          {others.length > 0 && (
            <Box mt="lg">
              <UnstyledButton onClick={() => setOpen((o) => !o)} style={{ width: "100%" }}>
                <Group gap={6} justify="space-between">
                  <Text fw={700} tt="uppercase" fz="sm" style={{ color: MB_COLORS.textSecondary }}>
                    Autres graphiques
                  </Text>
                  <span style={{ color: MB_COLORS.textTertiary, display: "inline-flex" }}>
                    <Chevron open={open} size={16} />
                  </span>
                </Group>
              </UnstyledButton>
              <Collapse in={open}>
                <Box mt="md">
                  <OptionGrid items={others} selected={selected} onSelect={onSelect} onOpenSettings={onOpenSettings} />
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
