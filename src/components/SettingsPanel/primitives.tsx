// Shared building blocks for the settings panel.

import { useState } from "react";
import {
  Popover,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import type { SegmentedControlItem } from "@mantine/core";
import { ACCENT_COLORS, MB_COLORS } from "../../viz/options/constants";
import type { SelectOption } from "./types";

/** A settings field's caption. */
export const Label = ({ children }: { children: React.ReactNode }) => (
  <Text fz="sm" fw={700} style={{ color: MB_COLORS.textPrimary }}>
    {children}
  </Text>
);

/**
 * A labelled column picker.
 *
 * Defined at module level, deliberately. It used to live inside DonneesTab's
 * render body, which made it a brand-new component type on every render: React
 * unmounted and remounted the whole Select subtree each time any setting
 * changed, closing open dropdowns and dropping focus mid-interaction.
 */
export function FieldSelect({
  label,
  value,
  data,
  onPick,
  clearable = false,
  placeholder = "Sélectionnez un champ",
}: {
  label: string;
  value: string | null | undefined;
  data: SelectOption[];
  onPick: (value: string | null) => void;
  clearable?: boolean;
  placeholder?: string;
}) {
  return (
    <Stack gap={6}>
      <Label>{label}</Label>
      <Select
        data={data}
        value={value ?? null}
        onChange={onPick}
        allowDeselect={false}
        clearable={clearable}
        comboboxProps={{ withinPortal: true }}
        placeholder={placeholder}
        size="sm"
      />
    </Stack>
  );
}

// Metabase color affordance: a round color dot that opens a small swatch palette.
export function ColorDot({
  value,
  onChange,
  size = 18,
}: {
  value: string;
  onChange: (v: string) => void;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      opened={open}
      onChange={setOpen}
      position="bottom-start"
      withArrow
      shadow="md"
      width={160}
    >
      <Popover.Target>
        <UnstyledButton
          onClick={() => setOpen((o) => !o)}
          aria-label={value}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: value,
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
            flexShrink: 0,
          }}
        />
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <SimpleGrid cols={4} spacing={8}>
          {ACCENT_COLORS.map((c) => (
            <UnstyledButton
              key={c}
              aria-label={c}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: c,
                outline:
                  c.toLowerCase() === value.toLowerCase()
                    ? `2px solid ${MB_COLORS.textPrimary}`
                    : "none",
                outlineOffset: 2,
              }}
            />
          ))}
        </SimpleGrid>
      </Popover.Dropdown>
    </Popover>
  );
}

/** A labelled segmented control over a string-union setting. */
export function Seg<T extends string>({
  label,
  value,
  onChange,
  data,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  data: { label: React.ReactNode; value: T }[];
}) {
  return (
    <Stack gap={4}>
      <Label>{label}</Label>
      <SegmentedControl
        fullWidth
        size="xs"
        value={value}
        onChange={(v) => onChange(v as T)}
        data={data satisfies SegmentedControlItem[]}
      />
    </Stack>
  );
}
