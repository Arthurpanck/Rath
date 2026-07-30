import { useState } from "react";
import { ActionIcon, Anchor, Box, Button, Divider, Group, Menu, Popover, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import type { Column, Dataset } from "../data/types";
import type { Filter, FilterOp } from "../data/query";
import { OPERATORS, defaultOperatorFor, describeFilter, operatorsFor } from "../data/query";
import { MB_COLORS } from "../viz/options/constants";

/** Small type glyph, like Metabase's int/string/label column icons. */
function TypeIcon({ col }: { col: Column }) {
  const label = col.base_type === "number" ? "123" : col.base_type === "date" ? "📅" : "ABC";
  return (
    <Text fz={9} fw={700} style={{ color: MB_COLORS.textTertiary, width: 26, flexShrink: 0 }}>
      {label}
    </Text>
  );
}

export function FilterButton({
  dataset,
  filters,
  onChange,
}: {
  dataset: Dataset;
  filters: Filter[];
  onChange: (f: Filter[]) => void;
}) {
  const [open, setOpen] = useState(false);
  // null = field list, otherwise we are editing a filter for that column.
  const [field, setField] = useState<string | null>(null);
  const [op, setOp] = useState<FilterOp>("=");
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [search, setSearch] = useState("");

  const col = dataset.cols.find((c) => c.name === field);
  const arity = OPERATORS.find((o) => o.value === op)?.arity ?? 1;

  const reset = () => {
    setField(null);
    setV1("");
    setV2("");
    setSearch("");
  };
  const pickField = (name: string) => {
    const c = dataset.cols.find((x) => x.name === name);
    setField(name);
    setOp(defaultOperatorFor(c));
    setV1("");
    setV2("");
  };
  const apply = (keepOpen: boolean) => {
    if (!field) return;
    const values = arity === 0 ? [] : arity === 2 ? [v1, v2] : [v1];
    if (arity > 0 && values.some((x) => String(x).trim() === "")) return;
    onChange([...filters, { column: field, operator: op, values }]);
    reset();
    if (!keepOpen) setOpen(false);
  };

  const visible = dataset.cols.filter((c) => c.display_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Group gap={6}>
      <Popover opened={open} onChange={(o) => { setOpen(o); if (!o) reset(); }} position="bottom-start" shadow="lg" width={320} withinPortal>
        <Popover.Target>
          <Button
            size="xs"
            radius="md"
            variant={filters.length ? "light" : "subtle"}
            color="brand"
            onClick={() => setOpen((o) => !o)}
            leftSection={
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M3 5h14l-5.5 6.5V16l-3-1.5v-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            }
          >
            Filtre
          </Button>
        </Popover.Target>
        <Popover.Dropdown p={0}>
          {!field ? (
            <Box>
              <Box p="xs" style={{ borderBottom: `1px solid ${MB_COLORS.border}` }}>
                <TextInput size="xs" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
              </Box>
              <Stack gap={0} style={{ maxHeight: 320, overflowY: "auto", padding: 4 }}>
                {visible.map((c) => (
                  <UnstyledButton
                    key={c.name}
                    onClick={() => pickField(c.name)}
                    style={{ padding: "8px 10px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}
                    className="mb-row"
                  >
                    <TypeIcon col={c} />
                    <Text fz="sm" style={{ color: MB_COLORS.textPrimary }}>{c.display_name}</Text>
                  </UnstyledButton>
                ))}
                {visible.length === 0 && <Text fz="xs" p="sm" style={{ color: MB_COLORS.textTertiary }}>Aucune colonne.</Text>}
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

              <Menu shadow="md" width={220} position="bottom-start" withinPortal>
                <Menu.Target>
                  <Button size="xs" variant="default" fullWidth justify="space-between" aria-label="Opérateur de filtre"
                    rightSection={<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}>
                    {OPERATORS.find((o) => o.value === op)?.label}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {operatorsFor(col).map((o) => (
                    <Menu.Item key={o.value} onClick={() => setOp(o.value)}>{o.label}</Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>

              {arity > 0 && (
                <Group grow gap="xs" mt="sm">
                  <TextInput size="xs" placeholder={arity === 2 ? "Min" : "Valeur"} value={v1} onChange={(e) => setV1(e.currentTarget.value)} />
                  {arity === 2 && <TextInput size="xs" placeholder="Max" value={v2} onChange={(e) => setV2(e.currentTarget.value)} />}
                </Group>
              )}

              <Divider my="sm" />
              <Stack gap="xs">
                <Button size="xs" radius="md" color="brand" onClick={() => apply(false)}>Appliquer le filtre</Button>
                <Anchor component="button" type="button" fz="xs" fw={700} style={{ color: MB_COLORS.brand }} onClick={() => apply(true)}>
                  + Ajouter un autre filtre
                </Anchor>
              </Stack>
            </Box>
          )}
        </Popover.Dropdown>
      </Popover>

      {/* Active filter chips */}
      {filters.map((f, i) => (
        <Group key={i} gap={4} style={{ background: MB_COLORS.tableIdBg, borderRadius: 999, padding: "2px 4px 2px 10px" }}>
          <Text fz="xs" fw={600} style={{ color: MB_COLORS.brand }}>{describeFilter(dataset, f)}</Text>
          <ActionIcon size="xs" variant="subtle" color="brand" aria-label="Retirer le filtre" onClick={() => onChange(filters.filter((_, j) => j !== i))}>
            <svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </ActionIcon>
        </Group>
      ))}
    </Group>
  );
}
