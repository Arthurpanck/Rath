import { useEffect, useMemo, useState } from "react";
import { Box, Group, Text } from "@mantine/core";
import type { Dataset } from "../data/types";
import type { VizId } from "../viz/registry";
import { VIZ_BY_ID } from "../viz/registry";
import type { VizSettings } from "../viz/settings";
import { defaultSettings } from "../viz/settings";
import { VizPickerSidebar } from "./VizPickerSidebar";
import { SettingsPanel } from "./SettingsPanel";
import { ChartCanvas } from "./ChartCanvas";
import { BottomBar } from "./BottomBar";
import { MB_COLORS } from "../viz/options/constants";

type SidebarMode = "closed" | "picker" | "settings";

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
  const [sidebar, setSidebar] = useState<SidebarMode>("picker");
  const [mode, setMode] = useState<"table" | "chart">("chart");
  const [settings, setSettings] = useState<VizSettings>(() => defaultSettings(dataset));

  // Reset settings whenever a new dataset is loaded.
  useEffect(() => {
    setSettings(defaultSettings(dataset));
  }, [dataset]);

  const patchSettings = (patch: Partial<VizSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const effectiveViz: VizId = mode === "table" ? "table" : selected;

  const renderStart = useMemo(() => performance.now(), [effectiveViz, dataset, settings]);
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

      {/* Body: sidebar (picker | settings) + canvas */}
      <Box style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {sidebar === "picker" && (
          <VizPickerSidebar
            dataset={dataset}
            selected={selected}
            onSelect={(id) => {
              setSelected(id);
              setMode("chart");
            }}
            onDone={() => setSidebar("closed")}
            onOpenSettings={() => {
              setMode("chart");
              setSidebar("settings");
            }}
          />
        )}

        {sidebar === "settings" && (
          <SettingsPanel
            vizId={selected}
            dataset={dataset}
            settings={settings}
            onChange={patchSettings}
            onBack={() => setSidebar("picker")}
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
              <Group justify="space-between" mb={8}>
                <Text fw={700} style={{ color: MB_COLORS.textPrimary, fontSize: 15 }}>
                  {VIZ_BY_ID[effectiveViz].name}
                </Text>
                {mode === "chart" && (
                  <button
                    onClick={() => setSidebar(sidebar === "settings" ? "picker" : "settings")}
                    aria-label="Réglages"
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: MB_COLORS.textTertiary, display: "inline-flex" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5 5l1.4 1.4M13.6 13.6L15 15M15 5l-1.4 1.4M6.4 13.6L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </Group>
              <Box style={{ flex: 1, minHeight: 0 }}>
                <ChartCanvas vizId={effectiveViz} dataset={dataset} settings={settings} />
              </Box>
            </Box>
          </Box>

          <BottomBar
            rowCount={dataset.rows.length}
            mode={mode}
            onToggleMode={setMode}
            onOpenPicker={() => setSidebar((s) => (s === "closed" ? "picker" : "closed"))}
            pickerOpen={sidebar !== "closed"}
            elapsedMs={elapsed}
          />
        </Box>
      </Box>
    </Box>
  );
}
