import { useState } from "react";
import { ActionIcon, Box, Button, Divider, Group, Popover, ScrollArea, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import type { Column, Dataset } from "../data/types";
import { isMetric } from "../data/types";
import type { AggFn, Aggregation, Summarize } from "../data/query";
import { AGG_MENU, describeAggregation, kindOf } from "../data/query";
import { MB_COLORS } from "../viz/options/constants";

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
    <circle cx="9" cy="9" r="5.5" stroke={MB_COLORS.textTertiary} strokeWidth="1.7" />
    <path d="M13 13l4 4" stroke={MB_COLORS.textTertiary} strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

function TypeGlyph({ col, active }: { col: Column; active?: boolean }) {
  const kind = kindOf(col);
  const isId = /(^|_)id($|_)|^_mb_row_id$/i.test(col.name);
  const color = active ? "rgba(255,255,255,0.85)" : MB_COLORS.textTertiary;
  return (
    <span style={{ width: 18, display: "inline-flex", justifyContent: "center", color, flexShrink: 0 }} aria-hidden>
      {isId ? (
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" /><path d="M10 6.5v.01M10 9v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      ) : kind === "number" ? (
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M7 3L5.5 17M14 3l-1.5 14M3 7.5h14M2.5 12.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      ) : kind === "date" ? (
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><rect x="3" y="5" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M3 9h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M4 4h12M10 4v13M7 17h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      )}
    </span>
  );
}

/** Row used in both drill steps (function list, then column list). */
function PickRow({ label, onClick, active, col }: { label: string; onClick: () => void; active?: boolean; col?: Column }) {
  return (
    <UnstyledButton
      className={active ? undefined : "mb-row"}
      onClick={onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: active ? "var(--mantine-color-summarize-6)" : "transparent",
      }}
    >
      {col && <TypeGlyph col={col} active={active} />}
      <Text fz="sm" fw={active ? 700 : 400} style={{ color: active ? "#fff" : MB_COLORS.textPrimary }}>
        {label}
      </Text>
    </UnstyledButton>
  );
}

/** The aggregation picker: a flat function list, then a column list — no submenus. */
function AggPicker({
  dataset,
  onPick,
  onClose,
}: {
  dataset: Dataset;
  onPick: (a: Aggregation) => void;
  onClose: () => void;
}) {
  const [fn, setFn] = useState<AggFn | null>(null);
  const [search, setSearch] = useState("");

  const entry = AGG_MENU.find((m) => m.fn === fn);
  // "Minimum/Maximum de" accept any comparable column; the rest need numbers.
  const columns = dataset.cols.filter((c) => (fn === "distinct" || fn === "min" || fn === "max" ? true : isMetric(c)));
  const shownFns = AGG_MENU.filter((m) => m.label.toLowerCase().includes(search.toLowerCase()));
  const shownCols = columns.filter((c) => c.display_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box w={300}>
      {fn && entry ? (
        <>
          <Group gap={4} p="xs" style={{ borderBottom: `1px solid ${MB_COLORS.border}` }}>
            <UnstyledButton onClick={() => { setFn(null); setSearch(""); }} aria-label="Retour" style={{ color: MB_COLORS.textSecondary, display: "inline-flex" }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </UnstyledButton>
            <Text fw={700} fz="sm" style={{ color: MB_COLORS.textPrimary }}>{entry.label}</Text>
          </Group>
          <Box p="xs">
            <TextInput size="xs" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.currentTarget.value)} leftSection={<SearchIcon />} />
          </Box>
          <Stack gap={2} px={4} pb={4} style={{ maxHeight: 300, overflowY: "auto" }}>
            {shownCols.map((c) => (
              <PickRow key={c.name} col={c} label={c.display_name} onClick={() => { onPick({ fn, column: c.name }); onClose(); }} />
            ))}
            {shownCols.length === 0 && <Text fz="xs" p="sm" style={{ color: MB_COLORS.textTertiary }}>Aucune colonne compatible.</Text>}
          </Stack>
        </>
      ) : (
        <>
          <Box p="xs">
            <TextInput size="xs" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.currentTarget.value)} leftSection={<SearchIcon />} />
          </Box>
          <Text fw={700} fz="sm" px="sm" pb={4} style={{ color: MB_COLORS.textPrimary }}>Fonctions de base</Text>
          <Stack gap={2} px={4} pb={4} style={{ maxHeight: 320, overflowY: "auto" }}>
            {shownFns.map((m) => (
              <PickRow
                key={m.fn}
                label={m.label}
                onClick={() => {
                  if (m.needsColumn) setFn(m.fn);
                  else {
                    onPick({ fn: m.fn });
                    onClose();
                  }
                }}
              />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}

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
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const groupable = dataset.cols.filter((c) => c.display_name.toLowerCase().includes(search.toLowerCase()));

  const addAgg = (a: Aggregation) => onChange({ ...summarize, aggregations: [...summarize.aggregations, a] });
  const replaceAgg = (i: number, a: Aggregation) => onChange({ ...summarize, aggregations: summarize.aggregations.map((x, j) => (j === i ? a : x)) });
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

          <Group gap={6} wrap="wrap">
            {summarize.aggregations.map((a, i) => (
              <Popover key={i} opened={editing === i} onChange={(o) => setEditing(o ? i : null)} position="bottom-start" shadow="lg" withinPortal>
                <Popover.Target>
                  <Group gap={2} wrap="nowrap" style={{ background: "var(--mantine-color-summarize-6)", borderRadius: 6, padding: "4px 4px 4px 10px" }}>
                    <UnstyledButton onClick={() => setEditing(i)}>
                      <Text fz="sm" fw={700} style={{ color: "#fff" }}>{describeAggregation(dataset, a)}</Text>
                    </UnstyledButton>
                    <ActionIcon size="sm" variant="transparent" aria-label="Retirer l'agrégation" onClick={() => removeAgg(i)}>
                      <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
                    </ActionIcon>
                  </Group>
                </Popover.Target>
                <Popover.Dropdown p={0}>
                  <AggPicker dataset={dataset} onPick={(x) => replaceAgg(i, x)} onClose={() => setEditing(null)} />
                </Popover.Dropdown>
              </Popover>
            ))}

            <Popover opened={addOpen} onChange={setAddOpen} position="bottom-start" shadow="lg" withinPortal>
              <Popover.Target>
                <ActionIcon variant="default" size="md" aria-label="Ajouter une agrégation" onClick={() => setAddOpen((o) => !o)}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke={MB_COLORS.textSecondary} strokeWidth="1.8" strokeLinecap="round" /></svg>
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown p={0}>
                <AggPicker dataset={dataset} onPick={addAgg} onClose={() => setAddOpen(false)} />
              </Popover.Dropdown>
            </Popover>
          </Group>

          <Divider my="xs" />

          <Text fw={700} fz="sm" style={{ color: MB_COLORS.textPrimary }}>Regrouper par</Text>
          <TextInput size="xs" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.currentTarget.value)} rightSection={<SearchIcon />} />

          <Stack gap={2}>
            {groupable.map((c) => {
              const active = summarize.breakouts.includes(c.name);
              return (
                <UnstyledButton
                  key={c.name}
                  className={active ? undefined : "mb-row"}
                  onClick={() => toggleBreakout(c.name)}
                  style={{ padding: "8px 10px", borderRadius: 6, background: active ? "var(--mantine-color-summarize-6)" : "transparent", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <TypeGlyph col={c} active={active} />
                  <Text fz="sm" fw={active ? 700 : 400} style={{ flex: 1, color: active ? "#fff" : MB_COLORS.textPrimary }}>
                    {c.display_name}
                  </Text>
                  {active ? (
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  ) : (
                    <Text fz="xs" style={{ color: MB_COLORS.textTertiary }}>+</Text>
                  )}
                </UnstyledButton>
              );
            })}
          </Stack>
        </Stack>
      </ScrollArea>

      <Box p="md" style={{ borderTop: `1px solid ${MB_COLORS.border}` }}>
        <Button fullWidth radius="xl" color="summarize" onClick={onDone}>Terminé</Button>
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
      variant={active ? "filled" : "default"}
      color="summarize"
      onClick={onClick}
      leftSection={<Text fz="sm" fw={700} component="span">Σ</Text>}
    >
      Résumer
    </Button>
  );
}
