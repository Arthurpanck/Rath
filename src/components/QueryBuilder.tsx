import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Group, Text } from "@mantine/core";
import type * as echarts from "echarts";
import type { Dataset } from "../data/types";
import type { VizId } from "../viz/registry";
import { VIZ_BY_ID } from "../viz/registry";
import { defaultDisplay, maybeResetDisplay } from "../viz/auto-display";
import type { VizSettings } from "../viz/settings";
import { settingsForQuery } from "../viz/settings";
import { exportPng } from "../data/export";
import type { Filter, Summarize } from "../data/query";
import { applyQuery } from "../data/query";
import { FilterButton } from "./FilterPopover";
import { SummarizeButton, SummarizeSidebar } from "./SummarizeSidebar";
import { VizPickerSidebar } from "./VizPickerSidebar";
import { SettingsPanel } from "./SettingsPanel";
import { ChartCanvas } from "./ChartCanvas";
import { BottomBar, type ExportKind } from "./BottomBar";
import { MB_COLORS } from "../viz/options/constants";

type SidebarMode = "closed" | "picker" | "settings";

export function QueryBuilder({
  dataset: rawDataset,
  datasetName,
  onReset,
}: {
  dataset: Dataset;
  datasetName: string;
  onReset: () => void;
}) {
  // Metabase-style recommendation decides the chart we open with.
  // Query stage: "Filtrer" then "Résumer", exactly like a Metabase question.
  const [filters, setFilters] = useState<Filter[]>([]);
  const [summarize, setSummarize] = useState<Summarize>({ aggregations: [], breakouts: [] });
  const [summarizeOpen, setSummarizeOpen] = useState(false);
  const dataset = useMemo(() => applyQuery(rawDataset, filters, summarize), [rawDataset, filters, summarize]);

  const [selected, setSelected] = useState<VizId>(() => defaultDisplay(dataset, null));
  // Set when the user picks a chart by hand (Metabase's displayIsLocked).
  const [displayLocked, setDisplayLocked] = useState(false);
  // Like Metabase: after a query runs you land on the table with the
  // visualization picker collapsed; you open it via the "Visualisation" button.
  const [sidebar, setSidebar] = useState<SidebarMode>("closed");
  const [mode, setMode] = useState<"table" | "chart">("table");
  const [settings, setSettings] = useState<VizSettings>(() => settingsForQuery(dataset, null));
  const chartRef = useRef<echarts.ECharts | null>(null);

  const handleExport = (_kind: ExportKind) => {
    const chart = chartRef.current;
    if (chart) exportPng(chart, datasetName || "graphique");
  };

  // Reset settings whenever a new dataset is loaded.
  useEffect(() => {
    setFilters([]);
    setSummarize({ aggregations: [], breakouts: [] });
    setDisplayLocked(false);
  }, [rawDataset]);

  // After every query change, re-pick the display the way Metabase does.
  useEffect(() => {
    setSettings(settingsForQuery(dataset, summarize.aggregations.length ? summarize : null));
    setSelected((current) => {
      const next = maybeResetDisplay({ current, dataset, summarize, locked: displayLocked });
      if (!next.locked && displayLocked) setDisplayLocked(false);
      if (next.display !== "table") setMode("chart");
      return next.display;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        wrap="nowrap"
        style={{ padding: "10px 16px", borderBottom: `1px solid ${MB_COLORS.border}`, height: 52, flexShrink: 0 }}
      >
        {/* The title shrinks and ellipsises so a long file name never pushes
            the actions onto a second row. */}
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Text
            fw={700}
            title={datasetName}
            style={{ color: MB_COLORS.textPrimary, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}
          >
            {datasetName}
          </Text>
          <Text style={{ color: MB_COLORS.textTertiary, fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}>
            {dataset.cols.length} colonnes · {dataset.rows.length} lignes
          </Text>
        </Group>
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <FilterButton dataset={rawDataset} filters={filters} onChange={setFilters} />
          <SummarizeButton active={summarizeOpen || summarize.aggregations.length > 0} onClick={() => setSummarizeOpen((o) => !o)} />
          <button
            onClick={onReset}
            style={{ border: `1px solid ${MB_COLORS.border}`, background: MB_COLORS.white, color: MB_COLORS.textSecondary, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            Importer un autre CSV
          </button>
          {/* Placeholder for now: clickable, but saving is not wired up yet. */}
          <Button variant="subtle" size="xs" color="brand" onClick={() => undefined}>
            Sauvegarder
          </Button>
        </Group>
      </Group>

      {/* Body: sidebar (picker | settings) + canvas */}
      <Box style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {sidebar === "picker" && (
          <VizPickerSidebar
            dataset={dataset}
            selected={effectiveViz}
            onSelect={(id) => {
              // The picker highlights the current display; picking "Table"
              // returns to table mode, any other type switches to chart mode.
              setDisplayLocked(true);
              if (id === "table") {
                setMode("table");
              } else {
                setSelected(id);
                setMode("chart");
              }
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
              </Group>
              <Box style={{ flex: 1, minHeight: 0 }}>
                <ChartCanvas
                  vizId={effectiveViz}
                  dataset={dataset}
                  settings={settings}
                  onChartReady={(c) => {
                    chartRef.current = c;
                  }}
                />
              </Box>
            </Box>
          </Box>

          <BottomBar
            rowCount={dataset.rows.length}
            mode={mode}
            onToggleMode={setMode}
            onOpenPicker={() => setSidebar((s) => (s === "picker" ? "closed" : "picker"))}
            onOpenSettings={() => {
              setMode("chart");
              setSidebar((s) => (s === "settings" ? "closed" : "settings"));
            }}
            pickerOpen={sidebar === "picker"}
            settingsOpen={sidebar === "settings"}
            elapsedMs={elapsed}
            onExport={handleExport}
            canExportImage={mode === "chart" && !["table", "object", "scalar", "smartscalar", "pivot"].includes(effectiveViz)}
          />
        </Box>

        {summarizeOpen && (
          <SummarizeSidebar dataset={rawDataset} summarize={summarize} onChange={setSummarize} onDone={() => setSummarizeOpen(false)} />
        )}
      </Box>
    </Box>
  );
}
