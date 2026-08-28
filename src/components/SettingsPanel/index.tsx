// The chart settings panel: the sidebar that opens on the gear, with one tab
// per group of settings — the same Données / Affichage / Axes / Mise en forme
// split Metabase uses.
//
// This file holds only the shell: the header, the tab strip and the dispatch to
// the tab that is open. Each tab lives in ./tabs, the shared widgets in
// ./primitives, and the prop shapes in ./types.

import { useState } from "react";
import { Box, Button, Group, ScrollArea, Tabs, Text, UnstyledButton } from "@mantine/core";
import type { Dataset } from "../../data/types";
import { getDimensions, isMetric } from "../../data/types";
import type { VizId } from "../../viz/registry";
import { VIZ_BY_ID } from "../../viz/registry";
import { CARTESIAN_VIZ } from "../../viz/families";
import type { VizSettings } from "../../viz/settings";
import { resolveShape } from "../../viz/settings";
import { MB_COLORS } from "../../viz/options/constants";
import { TABS } from "./constants";
import { AffichageTab } from "./tabs/AffichageTab";
import { AxesTab } from "./tabs/AxesTab";
import { ConditionalColorsTab } from "./tabs/ConditionalColorsTab";
import { DonneesTab } from "./tabs/DonneesTab";
import { FormatTab } from "./tabs/FormatTab";
import { RangesTab } from "./tabs/RangesTab";

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
  const isCartesian = CARTESIAN_VIZ.includes(vizId);

  return (
    <Box style={{ width: 400, borderRight: `1px solid ${MB_COLORS.border}`, background: MB_COLORS.white, display: "flex", flexDirection: "column", height: "100%" }}>
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
              <DonneesTab vizId={vizId} dataset={dataset} settings={settings} onChange={onChange} allCols={allCols} dimOptions={dimOptions} metricOptions={metricOptions} activeMetrics={activeMetrics} />
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
