import { ActionIcon, Button, Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { Cog } from "../viz/icons";
import { MB_COLORS } from "../viz/options/constants";

export type ExportKind = "png" | "svg" | "csv";

// Segmented table/chart toggle like Metabase's bottom-right switcher.
function ViewToggle({ mode, onChange }: { mode: "table" | "chart"; onChange: (m: "table" | "chart") => void }) {
  const btn = (active: boolean) =>
    ({
      width: 40,
      height: 30,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: active ? MB_COLORS.brand : "transparent",
      color: active ? MB_COLORS.white : MB_COLORS.textTertiary,
      cursor: "pointer",
      border: "none",
    }) as const;
  return (
    <div style={{ display: "inline-flex", background: MB_COLORS.bgLight, borderRadius: 999, padding: 3, gap: 2, border: `1px solid ${MB_COLORS.border}` }}>
      <button style={{ ...btn(mode === "table"), borderRadius: 999 }} onClick={() => onChange("table")} aria-label="Table">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="3.5" width="15" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" /><path d="M2.5 8H17.5M2.5 12H17.5M7.5 3.5V16.5M12.5 3.5V16.5" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      <button style={{ ...btn(mode === "chart"), borderRadius: 999 }} onClick={() => onChange("chart")} aria-label="Graphique">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 14L7.5 8.5L11 11.5L17 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}

export function BottomBar({
  rowCount,
  mode,
  onToggleMode,
  onOpenPicker,
  onOpenSettings,
  pickerOpen,
  settingsOpen,
  elapsedMs,
  onExport,
  canExportImage,
}: {
  rowCount: number;
  mode: "table" | "chart";
  onToggleMode: (m: "table" | "chart") => void;
  onOpenPicker: () => void;
  onOpenSettings: () => void;
  pickerOpen: boolean;
  settingsOpen: boolean;
  elapsedMs: number;
  onExport: (kind: ExportKind) => void;
  canExportImage: boolean;
}) {
  return (
    <Group
      justify="space-between"
      style={{ padding: "10px 16px", borderTop: `1px solid ${MB_COLORS.border}`, background: MB_COLORS.white, height: 56 }}
    >
      <Group gap={6}>
        <Button
          radius="xl"
          size="sm"
          onClick={onOpenPicker}
          variant={pickerOpen ? "filled" : "light"}
          color="brand"
          leftSection={
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><rect x="3" y="9" width="3.2" height="8" rx="0.5" fill="currentColor" /><rect x="8.4" y="4" width="3.2" height="13" rx="0.5" fill="currentColor" /><rect x="13.8" y="11" width="3.2" height="6" rx="0.5" fill="currentColor" /></svg>
          }
        >
          Visualisation
        </Button>
        <ActionIcon
          radius="xl"
          size="lg"
          variant={settingsOpen ? "filled" : "light"}
          color="brand"
          onClick={onOpenSettings}
          aria-label="Paramètres de visualisation"
        >
          <Cog size={17} />
        </ActionIcon>
      </Group>

      <ViewToggle mode={mode} onChange={onToggleMode} />

      <Group gap="md">
        <Text fz="sm" style={{ color: MB_COLORS.textTertiary, whiteSpace: "nowrap" }}>
          Affichage de {rowCount} ligne{rowCount > 1 ? "s" : ""}
        </Text>
        <Text fz="xs" style={{ color: MB_COLORS.textTertiary }}>{elapsedMs}ms</Text>
        <Menu shadow="md" width={180} position="top-end">
          <Menu.Target>
            <UnstyledButton aria-label="Exporter" style={{ display: "inline-flex", color: MB_COLORS.textTertiary }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 15h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Exporter</Menu.Label>
            {canExportImage && <Menu.Item onClick={() => onExport("png")}>Image PNG</Menu.Item>}
            {canExportImage && <Menu.Item onClick={() => onExport("svg")}>Image SVG (vectoriel)</Menu.Item>}
            <Menu.Item onClick={() => onExport("csv")}>Données CSV</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
