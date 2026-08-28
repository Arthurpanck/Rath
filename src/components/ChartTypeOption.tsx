import { ActionIcon, Center, Stack, Text } from "@mantine/core";
import type { VizDef } from "../viz/registry";
import { VizIcon, Cog } from "../viz/icons";
import { MB_COLORS } from "../viz/options/constants";

// Mirrors metabase ChartTypeOption: circular 50px button, filled/brand when
// selected, outline/brand otherwise, bold label below, gear badge when selected.
export function ChartTypeOption({
  viz,
  selected,
  onSelect,
  onOpenSettings,
}: {
  viz: VizDef;
  selected: boolean;
  onSelect: (id: VizDef["id"]) => void;
  onOpenSettings?: () => void;
}) {
  return (
    <Center pos="relative">
      <Stack align="center" gap={6} role="option" aria-selected={selected}>
        <ActionIcon
          w="3.125rem"
          h="3.125rem"
          radius="xl"
          variant={selected ? "filled" : "outline"}
          color="brand"
          onClick={() => (selected ? onOpenSettings?.() : onSelect(viz.id))}
          styles={{
            root: {
              borderColor: MB_COLORS.brand,
              backgroundColor: selected ? MB_COLORS.brand : MB_COLORS.white,
              color: selected ? MB_COLORS.white : MB_COLORS.brand,
            },
          }}
          aria-label={viz.name}
        >
          <VizIcon name={viz.icon} size={20} />
        </ActionIcon>

        {selected && onOpenSettings && (
          <ActionIcon
            pos="absolute"
            top="-0.5rem"
            right="-0.6rem"
            radius="xl"
            size="sm"
            variant="default"
            onClick={onOpenSettings}
            styles={{
              root: {
                backgroundColor: MB_COLORS.white,
                borderColor: MB_COLORS.border,
                color: MB_COLORS.textTertiary,
              },
            }}
            aria-label="Paramètres"
          >
            <Cog size={13} />
          </ActionIcon>
        )}

        <Text
          ta="center"
          fw={700}
          fz="sm"
          lh={1.15}
          onClick={() => (selected ? onOpenSettings?.() : onSelect(viz.id))}
          style={{
            maxWidth: 92,
            cursor: "pointer",
            color: selected ? MB_COLORS.brand : MB_COLORS.textSecondary,
          }}
        >
          {viz.name}
        </Text>
      </Stack>
    </Center>
  );
}
