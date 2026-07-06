import { Button, Group, Text } from "@mantine/core";
import { MB_COLORS } from "../viz/options/constants";

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
  pickerOpen,
  elapsedMs,
}: {
  rowCount: number;
  mode: "table" | "chart";
  onToggleMode: (m: "table" | "chart") => void;
  onOpenPicker: () => void;
  pickerOpen: boolean;
  elapsedMs: number;
}) {
  return (
    <Group
      justify="space-between"
      style={{ padding: "10px 16px", borderTop: `1px solid ${MB_COLORS.border}`, background: MB_COLORS.white, height: 56 }}
    >
      <Group gap="xs">
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
      </Group>

      <ViewToggle mode={mode} onChange={onToggleMode} />

      <Group gap="md">
        <Text fz="sm" style={{ color: MB_COLORS.textTertiary, whiteSpace: "nowrap" }}>
          Affichage de {rowCount} ligne{rowCount > 1 ? "s" : ""}
        </Text>
        <Text fz="xs" style={{ color: MB_COLORS.textTertiary }}>{elapsedMs}ms</Text>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 15h12" stroke={MB_COLORS.textTertiary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Group>
    </Group>
  );
}
