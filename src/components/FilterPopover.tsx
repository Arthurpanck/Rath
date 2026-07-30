import { useMemo, useState } from "react";
import { ActionIcon, Anchor, Box, Button, Checkbox, Divider, Group, Menu, Popover, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import type { Column, Dataset } from "../data/types";
import type { Filter, FilterOp } from "../data/query";
import { OPERATORS, defaultOperatorFor, describeFilter, distinctValues, kindOf, operatorLabel, operatorsFor } from "../data/query";
import { MB_COLORS } from "../viz/options/constants";

/** Metabase's column-type glyphs: # numeric, T text, calendar date, tag id. */
function TypeIcon({ col }: { col: Column }) {
  const kind = kindOf(col);
  const isId = /(^|_)id($|_)|^_mb_row_id$/i.test(col.name);
  return (
    <span style={{ width: 18, display: "inline-flex", justifyContent: "center", color: MB_COLORS.textTertiary, flexShrink: 0 }} aria-hidden>
      {isId ? (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 8.5l5.5-5.5H16a1 1 0 011 1v7.5L11.5 17z" stroke="currentColor" strokeWidth="1.5" /><circle cx="13" cy="7" r="1.2" fill="currentColor" /></svg>
      ) : kind === "number" ? (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M7 3L5.5 17M14 3l-1.5 14M3 7.5h14M2.5 12.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      ) : kind === "date" ? (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="3" y="5" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M3 9h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M4 4h12M10 4v13M7 17h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      )}
    </span>
  );
}

/** The table glyph Metabase puts in front of the source name. */
function TableIcon() {
  return (
    <span style={{ display: "inline-flex", color: MB_COLORS.textTertiary, flexShrink: 0 }} aria-hidden>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="3" width="15" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2.5 8h15M8 8v9" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </span>
  );
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" style={{ transform: up ? "rotate(180deg)" : undefined, flexShrink: 0 }} aria-hidden>
      <path d="M4 7l6 6 6-6" stroke={MB_COLORS.textTertiary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FilterButton({
  dataset,
  filters,
  onChange,
  sourceName,
  chipsVisible,
  onToggleChips,
}: {
  dataset: Dataset;
  filters: Filter[];
  onChange: (f: Filter[]) => void;
  /** Name of the source table, shown as the group header above the fields. */
  sourceName: string;
  chipsVisible: boolean;
  onToggleChips: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [field, setField] = useState<string | null>(null);
  const [op, setOp] = useState<FilterOp>("=");
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [picked, setPicked] = useState<string[]>([]); // text checkbox selection
  const [search, setSearch] = useState("");
  const [valueSearch, setValueSearch] = useState("");

  const col = dataset.cols.find((c) => c.name === field);
  const kind = kindOf(col);
  const arity = OPERATORS.find((o) => o.value === op)?.arity ?? 1;
  // Text equality uses the checkbox list; other text operators use free text.
  const useCheckboxes = kind === "text" && (op === "=" || op === "!=");
  const values = useMemo(() => (useCheckboxes && field ? distinctValues(dataset, field) : []), [dataset, field, useCheckboxes]);
  const shownValues = values.filter((v) => v.toLowerCase().includes(valueSearch.toLowerCase()));

  const reset = () => {
    setField(null);
    setV1("");
    setV2("");
    setPicked([]);
    setSearch("");
    setValueSearch("");
  };
  const pickField = (name: string) => {
    const c = dataset.cols.find((x) => x.name === name);
    setField(name);
    setOp(defaultOperatorFor(c));
    setV1("");
    setV2("");
    setPicked([]);
  };
  const apply = (keepOpen: boolean) => {
    if (!field) return;
    let vals: (string | number)[];
    if (useCheckboxes) {
      if (picked.length === 0) return;
      vals = picked;
    } else if (arity === 0) {
      vals = [];
    } else if (arity === 2) {
      if (!v1.trim() || !v2.trim()) return;
      vals = [v1, v2];
    } else {
      if (!v1.trim()) return;
      vals = [v1];
    }
    onChange([...filters, { column: field, operator: op, values: vals }]);
    reset();
    if (!keepOpen) setOpen(false);
  };

  const visibleCols = dataset.cols.filter((c) => c.display_name.toLowerCase().includes(search.toLowerCase()));
  const dateInput = kind === "date" && arity === 2;

  return (
    <Button.Group>
      <Popover opened={open} onChange={(o) => { setOpen(o); if (!o) reset(); }} position="bottom-start" shadow="lg" width={380} withinPortal>
        <Popover.Target>
          <Button
            size="sm"
            variant="default"
            color="filter"
            onClick={() => setOpen((o) => !o)}
            leftSection={
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M6 10h8M8.5 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            }
          >
            Filtre
          </Button>
        </Popover.Target>
        <Popover.Dropdown p={0}>
          {!field ? (
            <Box>
              <Box p="sm">
                <TextInput
                  size="sm"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                  leftSection={<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke={MB_COLORS.textTertiary} strokeWidth="1.7" /><path d="M13 13l4 4" stroke={MB_COLORS.textTertiary} strokeWidth="1.7" strokeLinecap="round" /></svg>}
                />
              </Box>
              {/* Fields sit under a collapsible header naming their source table. */}
              <Stack gap={0} style={{ maxHeight: 380, overflowY: "auto", paddingBottom: 6 }}>
                <UnstyledButton
                  onClick={() => setCollapsed((c) => !c)}
                  className="mb-row"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px" }}
                >
                  <TableIcon />
                  <Text fw={700} fz="md" title={sourceName} style={{ flex: 1, minWidth: 0, color: MB_COLORS.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {sourceName}
                  </Text>
                  <Chevron up={!collapsed} />
                </UnstyledButton>
                {!collapsed && visibleCols.map((c) => (
                  <UnstyledButton key={c.name} className="mb-row-purple" onClick={() => pickField(c.name)} style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <TypeIcon col={c} />
                    <Text fz="sm" fw={700} style={{ color: MB_COLORS.textPrimary }}>{c.display_name}</Text>
                  </UnstyledButton>
                ))}
                {!collapsed && visibleCols.length === 0 && <Text fz="xs" p="sm" style={{ color: MB_COLORS.textTertiary }}>Aucune colonne.</Text>}
              </Stack>
            </Box>
          ) : (
            <Box p="sm">
              <Group gap={4} mb="sm">
                <UnstyledButton onClick={reset} aria-label="Retour" style={{ color: MB_COLORS.textSecondary, display: "inline-flex" }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </UnstyledButton>
                <Text fw={700} fz="sm" style={{ color: MB_COLORS.textPrimary }}>{col?.display_name}</Text>
              </Group>

              <Menu shadow="md" width={250} position="bottom-start" withinPortal>
                <Menu.Target>
                  <Button size="xs" variant="default" fullWidth justify="space-between" aria-label="Opérateur de filtre"
                    rightSection={<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}>
                    {operatorLabel(op, col)}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown mah={300} style={{ overflowY: "auto" }}>
                  {operatorsFor(col).map((o) => (
                    <Menu.Item key={`${o.value}-${o.label}`} onClick={() => { setOp(o.value); setPicked([]); }}>{o.label}</Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>

              {/* Text equality → checkbox list of the actual values */}
              {useCheckboxes && (
                <Stack gap={6} mt="sm">
                  <TextInput size="xs" placeholder="Rechercher une valeur..." value={valueSearch} onChange={(e) => setValueSearch(e.currentTarget.value)} />
                  <Stack gap={4} style={{ maxHeight: 200, overflowY: "auto" }}>
                    {shownValues.map((v) => (
                      <Checkbox
                        key={v}
                        size="xs"
                        color="filter"
                        label={v}
                        checked={picked.includes(v)}
                        onChange={(e) => setPicked(e.currentTarget.checked ? [...picked, v] : picked.filter((x) => x !== v))}
                      />
                    ))}
                    {shownValues.length === 0 && <Text fz="xs" style={{ color: MB_COLORS.textTertiary }}>Aucune valeur.</Text>}
                  </Stack>
                </Stack>
              )}

              {/* Free-text / numeric / fixed date range inputs */}
              {!useCheckboxes && arity > 0 && (
                <Group grow gap="xs" mt="sm">
                  <TextInput
                    size="xs"
                    type={dateInput ? "date" : "text"}
                    placeholder={arity === 2 ? "Min" : kind === "number" ? "Valeur" : "Saisir une valeur"}
                    value={v1}
                    onChange={(e) => setV1(e.currentTarget.value)}
                  />
                  {arity === 2 && (
                    <TextInput size="xs" type={dateInput ? "date" : "text"} placeholder="Max" value={v2} onChange={(e) => setV2(e.currentTarget.value)} />
                  )}
                </Group>
              )}

              <Divider my="sm" />
              <Stack gap="xs">
                <Button size="xs" radius="md" color="filter" onClick={() => apply(false)}>Appliquer le filtre</Button>
                <Anchor component="button" type="button" fz="xs" fw={700} style={{ color: "var(--mantine-color-filter-6)" }} onClick={() => apply(true)}>
                  + Ajouter un autre filtre
                </Anchor>
              </Stack>
            </Box>
          )}
        </Popover.Dropdown>
      </Popover>

      {/* Attached counter: toggles the filter bar, exactly like Metabase. */}
      {filters.length > 0 && (
        <Button
          size="sm"
          variant="default"
          color="filter"
          px={10}
          onClick={onToggleChips}
          aria-label={chipsVisible ? "Masquer les filtres" : "Afficher les filtres"}
        >
          <Box
            style={{
              background: "var(--mantine-color-filter-6)",
              color: "#fff",
              borderRadius: 6,
              minWidth: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              padding: "0 5px",
            }}
          >
            {filters.length}
          </Box>
        </Button>
      )}
    </Button.Group>
  );
}

/** The row of active filter chips Metabase shows under the header. */
export function FilterBar({
  dataset,
  filters,
  onChange,
}: {
  dataset: Dataset;
  filters: Filter[];
  onChange: (f: Filter[]) => void;
}) {
  if (filters.length === 0) return null;
  return (
    <Group gap={6} wrap="wrap" style={{ padding: "8px 16px", borderBottom: `1px solid ${MB_COLORS.border}`, flexShrink: 0 }}>
      {filters.map((f, i) => (
        <Group key={i} gap={4} wrap="nowrap" style={{ background: "var(--mantine-color-filter-0)", borderRadius: 999, padding: "3px 4px 3px 12px", maxWidth: 320 }}>
          <Text
            fz="xs"
            fw={700}
            title={describeFilter(dataset, f)}
            style={{ color: "var(--mantine-color-filter-7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {describeFilter(dataset, f)}
          </Text>
          <ActionIcon size="xs" variant="subtle" color="filter" aria-label="Retirer le filtre" onClick={() => onChange(filters.filter((_, j) => j !== i))}>
            <svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </ActionIcon>
        </Group>
      ))}
    </Group>
  );
}
