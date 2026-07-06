import { useEffect, useMemo, useState } from "react";
import { Box, Group, Text } from "@mantine/core";
import type { Dataset } from "../data/types";
import type { VizId } from "../viz/registry";
import { VIZ_BY_ID } from "../viz/registry";
import { VizPickerSidebar } from "./VizPickerSidebar";
import { ChartCanvas } from "./ChartCanvas";
import { BottomBar } from "./BottomBar";
import { MB_COLORS } from "../viz/options/constants";

export function QueryBuilder({
  dataset,
  datasetName,
  onReset,
}: {
  dataset: Dataset;
  datasetName: string;
  onReset: () => void;
}) {
  const [selected, setSelected] = useState<VizId>("bar");
  const [pickerOpen, setPickerOpen] = useState(true);
  const [mode, setMode] = useState<"table" | "chart">("chart");

  // When toggling to "table" mode, show the raw table; "chart" shows the picked viz.
  const effectiveViz: VizId = mode === "table" ? "table" : selected;

  const renderStart = useMemo(() => performance.now(), [effectiveViz, dataset]);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(Math.max(1, Math.round(performance.now() - renderStart)));
  }, [renderStart]);

  return (
    <Box style={{ height: "100vh", display: "flex", flexDirection: "column", background: MB_COLORS.white }}>
      {/* Top bar */}
      <Group
        justify="space-between"
        style={{ padding: "10px 16px", borderBottom: `1px solid ${MB_COLORS.border}`, height: 52, flexShrink: 0 }}
      >
        <Group gap="sm">
          <Text fw={700} style={{ color: MB_COLORS.textPrimary, fontSize: 16 }}>{datasetName}</Text>
          <Text style={{ color: MB_COLORS.textTertiary, fontSize: 13 }}>
            {dataset.cols.length} colonnes · {dataset.rows.length} lignes
          </Text>
        </Group>
        <Group gap="xs">
          <button
            onClick={onReset}
            style={{ border: `1px solid ${MB_COLORS.border}`, background: MB_COLORS.white, color: MB_COLORS.textSecondary, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            Importer un autre CSV
          </button>
        </Group>
      </Group>

      {/* Body: picker + canvas */}
      <Box style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {pickerOpen && (
          <VizPickerSidebar
            dataset={dataset}
            selected={selected}
            onSelect={(id) => {
              setSelected(id);
              setMode("chart");
            }}
            onDone={() => setPickerOpen(false)}
          />
        )}

        <Box style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Box style={{ flex: 1, minHeight: 0, padding: 24, background: MB_COLORS.white }}>
            <Box
              style={{
                height: "100%",
                border: `1px solid ${MB_COLORS.border}`,
                borderRadius: 10,
                padding: 16,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Text fw={700} style={{ color: MB_COLORS.textPrimary, fontSize: 15, marginBottom: 8 }}>
                {VIZ_BY_ID[effectiveViz].name}
              </Text>
              <Box style={{ flex: 1, minHeight: 0 }}>
                <ChartCanvas vizId={effectiveViz} dataset={dataset} />
              </Box>
            </Box>
          </Box>

          <BottomBar
            rowCount={dataset.rows.length}
            mode={mode}
            onToggleMode={setMode}
            onOpenPicker={() => setPickerOpen((o) => !o)}
            pickerOpen={pickerOpen}
            elapsedMs={elapsed}
          />
        </Box>
      </Box>
    </Box>
  );
}
