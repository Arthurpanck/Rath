import { useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  Popover,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import type { Column, Dataset } from "../data/types";
import { isMetric } from "../data/types";
import type { AggFn, Aggregation, Bucket, Summarize } from "../data/query";
import {
  AGG_MENU,
  bucketLabel,
  bucketsFor,
  defaultBucketFor,
  describeAggregation,
  kindOf,
} from "../data/query";
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
    <span
      style={{ width: 18, display: "inline-flex", justifyContent: "center", color, flexShrink: 0 }}
      aria-hidden
    >
      {isId ? (
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M10 6.5v.01M10 9v4.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : kind === "number" ? (
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
          <path
            d="M7 3L5.5 17M14 3l-1.5 14M3 7.5h14M2.5 12.5h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : kind === "date" ? (
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
          <rect
            x="3"
            y="5"
            width="14"
            height="12"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M3 9h14M7 3v3M13 3v3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
          <path
            d="M4 4h12M10 4v13M7 17h6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

/** Row used in both drill steps (function list, then column list). */
function PickRow({
  label,
  onClick,
  active,
  col,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  col?: Column;
}) {
  return (
    <UnstyledButton
      className={active ? undefined : "mb-row-green"}
      onClick={onClick}
      style={{
        padding: "7px 10px",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: active ? "var(--mantine-color-summarize-filled)" : "transparent",
      }}
    >
      {col && <TypeGlyph col={col} active={active} />}
      <Text
        fz="sm"
        fw={active ? 700 : 400}
        style={{ color: active ? "#fff" : MB_COLORS.textPrimary }}
      >
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
  const columns = dataset.cols.filter((c) =>
    fn === "distinct" || fn === "min" || fn === "max" ? true : isMetric(c),
  );
  const shownFns = AGG_MENU.filter((m) => m.label.toLowerCase().includes(search.toLowerCase()));
  const shownCols = columns.filter((c) =>
    c.display_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box w={300}>
      {fn && entry ? (
        <>
          <Group gap={4} p="xs" style={{ borderBottom: `1px solid ${MB_COLORS.border}` }}>
            <UnstyledButton
              onClick={() => {
                setFn(null);
                setSearch("");
              }}
              aria-label="Retour"
              style={{ color: MB_COLORS.textSecondary, display: "inline-flex" }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M12 4L6 10l6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </UnstyledButton>
            <Text fw={700} fz="sm" style={{ color: MB_COLORS.textPrimary }}>
              {entry.label}
            </Text>
          </Group>
          <Box p="xs">
            <TextInput
              size="xs"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<SearchIcon />}
            />
          </Box>
          <Stack gap={2} px={4} pb={4} style={{ maxHeight: 300, overflowY: "auto" }}>
            {shownCols.map((c) => (
              <PickRow
                key={c.name}
                col={c}
                label={c.display_name}
                onClick={() => {
                  onPick({ fn, column: c.name });
                  onClose();
                }}
              />
            ))}
            {shownCols.length === 0 && (
              <Text fz="xs" p="sm" style={{ color: MB_COLORS.textTertiary }}>
                Aucune colonne compatible.
              </Text>
            )}
          </Stack>
        </>
      ) : (
        <>
          <Box p="xs">
            <TextInput
              size="xs"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<SearchIcon />}
            />
          </Box>
          <Text fw={700} fz="sm" px="sm" pb={4} style={{ color: MB_COLORS.textPrimary }}>
            Fonctions de base
          </Text>
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
  sourceName,
}: {
  dataset: Dataset;
  summarize: Summarize;
  onChange: (s: Summarize) => void;
  onDone: () => void;
  /** Source table name, shown as the group label above the dimensions. */
  sourceName: string;
}) {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const groupable = dataset.cols.filter((c) =>
    c.display_name.toLowerCase().includes(search.toLowerCase()),
  );

  const addAgg = (a: Aggregation) =>
    onChange({ ...summarize, aggregations: [...summarize.aggregations, a] });
  const replaceAgg = (i: number, a: Aggregation) =>
    onChange({
      ...summarize,
      aggregations: summarize.aggregations.map((x, j) => (j === i ? a : x)),
    });
  const removeAgg = (i: number) =>
    onChange({ ...summarize, aggregations: summarize.aggregations.filter((_, j) => j !== i) });

  /** Picking a dimension applies Metabase's default bucket (months, auto bins). */
  const toggleBreakout = (col: Column) => {
    const buckets = { ...(summarize.buckets ?? {}) };
    if (summarize.breakouts.includes(col.name)) {
      delete buckets[col.name];
      onChange({
        ...summarize,
        breakouts: summarize.breakouts.filter((n) => n !== col.name),
        buckets,
      });
    } else {
      const def = defaultBucketFor(col);
      if (def) buckets[col.name] = def;
      onChange({ ...summarize, breakouts: [...summarize.breakouts, col.name], buckets });
    }
  };
  const setBucket = (name: string, bucket: Bucket) =>
    onChange({ ...summarize, buckets: { ...(summarize.buckets ?? {}), [name]: bucket } });

  return (
    // 328 − 32px of padding − the scrollbar leaves Metabase's 286.56px rows.
    <Box
      style={{
        width: 328,
        borderLeft: `1px solid ${MB_COLORS.border}`,
        background: MB_COLORS.bgLight,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="sm" py="md">
          <Text fw={700} fz={17} px="lg" style={{ color: MB_COLORS.textPrimary }}>
            Résumer par
          </Text>

          {summarize.aggregations.length === 0 ? (
            <Popover
              opened={addOpen}
              onChange={setAddOpen}
              position="bottom-start"
              shadow="lg"
              withinPortal
            >
              <Popover.Target>
                <UnstyledButton
                  onClick={() => setAddOpen((o) => !o)}
                  className="mb-row-green"
                  mx="lg"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: MB_COLORS.bgLight,
                    border: `1px solid ${MB_COLORS.border}`,
                  }}
                >
                  <Text
                    fz="lg"
                    fw={700}
                    style={{ color: "var(--mantine-color-summarize-filled)", lineHeight: 1 }}
                  >
                    +
                  </Text>
                  <Text fz="sm" fw={700} style={{ color: "var(--mantine-color-summarize-filled)" }}>
                    Ajouter une fonction ou une métrique
                  </Text>
                </UnstyledButton>
              </Popover.Target>
              <Popover.Dropdown p={0}>
                <AggPicker dataset={dataset} onPick={addAgg} onClose={() => setAddOpen(false)} />
              </Popover.Dropdown>
            </Popover>
          ) : (
            <Group gap="sm" wrap="wrap" align="flex-start" px="lg">
              {summarize.aggregations.map((a, i) => (
                <Popover
                  key={i}
                  opened={editing === i}
                  onChange={(o) => setEditing(o ? i : null)}
                  position="bottom-start"
                  shadow="lg"
                  withinPortal
                >
                  <Popover.Target>
                    <Group
                      gap={2}
                      wrap="nowrap"
                      style={{
                        background: "var(--mantine-color-summarize-filled)",
                        borderRadius: 6,
                        padding: "3px 4px 3px 12px",
                      }}
                    >
                      <UnstyledButton onClick={() => setEditing(i)}>
                        <Text fz="sm" fw={700} style={{ color: "#fff" }}>
                          {describeAggregation(dataset, a)}
                        </Text>
                      </UnstyledButton>
                      <ActionIcon
                        size="sm"
                        variant="transparent"
                        aria-label="Retirer l'agrégation"
                        onClick={() => removeAgg(i)}
                      >
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                          <path
                            d="M5 5l10 10M15 5L5 15"
                            stroke="#fff"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </ActionIcon>
                    </Group>
                  </Popover.Target>
                  <Popover.Dropdown p={0}>
                    <AggPicker
                      dataset={dataset}
                      onPick={(x) => replaceAgg(i, x)}
                      onClose={() => setEditing(null)}
                    />
                  </Popover.Dropdown>
                </Popover>
              ))}

              <Popover
                opened={addOpen}
                onChange={setAddOpen}
                position="bottom-start"
                shadow="lg"
                withinPortal
              >
                <Popover.Target>
                  {/* A plain "+", not an outlined square — as in Metabase. */}
                  <UnstyledButton
                    aria-label="Ajouter une agrégation"
                    onClick={() => setAddOpen((o) => !o)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "4px 6px",
                      color: "var(--mantine-color-summarize-filled)",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M10 4v12M4 10h12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </UnstyledButton>
                </Popover.Target>
                <Popover.Dropdown p={0}>
                  <AggPicker dataset={dataset} onPick={addAgg} onClose={() => setAddOpen(false)} />
                </Popover.Dropdown>
              </Popover>
            </Group>
          )}

          {/* "Regrouper par" only appears once something is being summarised. */}
          {summarize.aggregations.length > 0 && (
            <>
              <Divider my="md" />

              <Stack gap={0} px="lg">
                <Text
                  component="h5"
                  fw={900}
                  fz="sm"
                  m={0}
                  style={{ color: MB_COLORS.textPrimary }}
                >
                  Regrouper par
                </Text>
                <Box my="sm" />
                <Box mb="md">
                  <TextInput
                    size="sm"
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    leftSection={<SearchIcon />}
                  />
                </Box>

                {/* Dimensions, grouped under the name of their source. */}
                <Text
                  fz="xs"
                  fw={700}
                  mb={4}
                  title={sourceName}
                  style={{
                    color: MB_COLORS.textTertiary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {sourceName}
                </Text>
                <Stack gap={4}>
                  {groupable.map((c) => {
                    const active = summarize.breakouts.includes(c.name);
                    const options = bucketsFor(c);
                    const bucket = summarize.buckets?.[c.name];
                    return (
                      <Box
                        key={c.name}
                        className={active ? undefined : "mb-dim"}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          borderRadius: 6,
                          // Metabase's dimension rows are a fixed 34px tall, and the
                          // green highlight covers exactly that box.
                          height: 34,
                          background: active
                            ? "var(--mantine-color-summarize-filled)"
                            : "transparent",
                        }}
                      >
                        <UnstyledButton
                          onClick={() => toggleBreakout(c)}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            height: "100%",
                            padding: "0 10px",
                          }}
                        >
                          <TypeGlyph col={c} active={active} />
                          <Text
                            className="mb-dim-name"
                            fz="sm"
                            fw={700}
                            title={c.display_name}
                            style={{
                              minWidth: 0,
                              color: active ? "#fff" : MB_COLORS.textPrimary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {c.display_name}
                          </Text>
                        </UnstyledButton>

                        {/* Temporal unit / binning strategy, on the picked dimension. */}
                        {active && options.length > 0 && (
                          <Menu shadow="md" width={240} position="bottom-end" withinPortal>
                            <Menu.Target>
                              <UnstyledButton
                                aria-label={
                                  kindOf(c) === "date"
                                    ? "Compartiment temporel"
                                    : "Stratégie de regroupement en classes"
                                }
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  maxWidth: "55%",
                                  flexShrink: 0,
                                  padding: "0 8px",
                                  color: "#fff",
                                }}
                              >
                                <Text
                                  fz="xs"
                                  fw={700}
                                  style={{
                                    minWidth: 0,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {bucketLabel(c, bucket)}
                                </Text>
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  style={{ flexShrink: 0 }}
                                >
                                  <path
                                    d="M4 7l6 6 6-6"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </UnstyledButton>
                            </Menu.Target>
                            <Menu.Dropdown>
                              {options.map((o) => (
                                <Menu.Item
                                  key={o.value}
                                  onClick={() => setBucket(c.name, o.value)}
                                  fw={o.value === bucket ? 700 : 400}
                                >
                                  {o.label}
                                </Menu.Item>
                              ))}
                            </Menu.Dropdown>
                          </Menu>
                        )}

                        {active ? (
                          <UnstyledButton
                            aria-label="Supprimer la dimension"
                            onClick={() => toggleBreakout(c)}
                            style={{ display: "flex", padding: "0 10px" }}
                          >
                            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                              <path
                                d="M5 5l10 10M15 5L5 15"
                                stroke="#fff"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </UnstyledButton>
                        ) : (
                          <UnstyledButton
                            className="mb-dim-add"
                            aria-label="Ajouter une dimension"
                            onClick={() => toggleBreakout(c)}
                            style={{
                              display: "flex",
                              padding: "0 10px",
                              color: "var(--mantine-color-summarize-filled)",
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                              <path
                                d="M10 4v12M4 10h12"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </UnstyledButton>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Stack>
            </>
          )}
        </Stack>
      </ScrollArea>

      <Box p="md" style={{ borderTop: `1px solid ${MB_COLORS.border}` }}>
        <Button fullWidth radius="xl" color="summarize" onClick={onDone}>
          Terminé
        </Button>
      </Box>
    </Box>
  );
}

/** Top-bar button that toggles the sidebar. */
export function SummarizeButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="default"
      color="summarize"
      onClick={onClick}
      data-active={active || undefined}
      leftSection={
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path
            d="M15 3.5H4l6 6.5-6 6.5h11"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      }
    >
      Résumer
    </Button>
  );
}
