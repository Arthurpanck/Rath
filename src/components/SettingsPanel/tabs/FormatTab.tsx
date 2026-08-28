// The "Mise en forme" tab: how numbers are printed — style, currency,
// separators, decimals, prefix and suffix.

import { NumberInput, Radio, Select, Stack, TextInput } from "@mantine/core";
import type {
  CurrencyPlacement,
  CurrencyStyle,
  NumberStyle,
  SeparatorStyle,
} from "../../../viz/settings";
import { CURRENCIES, SEPARATOR_OPTIONS } from "../../../viz/format";
import { Label } from "../primitives";
import type { FormatTabProps } from "../types";

export function FormatTab({ vizId, settings, onChange, allCols }: FormatTabProps) {
  const fmt = settings.numberFormat;
  const patch = (p: Partial<typeof fmt>) => onChange({ numberFormat: { ...fmt, ...p } });
  return (
    <Stack gap="md">
      {(vizId === "scalar" || vizId === "object") && (
        <Select label="Champ à afficher" data={allCols} value={settings.scalarField ?? null} onChange={(v) => onChange({ scalarField: v ?? undefined })} placeholder="Automatique" clearable comboboxProps={{ withinPortal: true }} size="sm" />
      )}
      <Select
        label="Style"
        size="sm"
        data={[
          { value: "normal", label: "Normal" },
          { value: "percent", label: "Pourcentage" },
          { value: "scientific", label: "Scientifique" },
          { value: "currency", label: "Devise" },
        ]}
        value={fmt.style}
        onChange={(v) => v && patch({ style: v as NumberStyle })}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true }}
      />
      {fmt.style === "currency" && (
        <>
          <Select label="Unité de devise" size="sm" data={CURRENCIES} value={fmt.currency} onChange={(v) => v && patch({ currency: v })} allowDeselect={false} comboboxProps={{ withinPortal: true }} />
          <Stack gap={4}>
            <Label>Style de libellé de devise</Label>
            <Radio.Group value={fmt.currencyStyle} onChange={(v) => patch({ currencyStyle: v as CurrencyStyle })}>
              <Stack gap={4}>
                <Radio size="xs" value="symbol" label="Symbole (€)" />
                <Radio size="xs" value="code" label="Code (EUR)" />
                <Radio size="xs" value="name" label="Nom (euros)" />
              </Stack>
            </Radio.Group>
          </Stack>
          <Stack gap={4}>
            <Label>Où afficher l'unité de devise</Label>
            <Radio.Group value={fmt.currencyPlacement} onChange={(v) => patch({ currencyPlacement: v as CurrencyPlacement })}>
              <Stack gap={4}>
                <Radio size="xs" value="cell" label="Dans chaque cellule du tableau" />
                <Radio size="xs" value="header" label="Dans l'en-tête de colonne" />
              </Stack>
            </Radio.Group>
          </Stack>
        </>
      )}
      <Select label="Style de séparateur" size="sm" data={SEPARATOR_OPTIONS} value={fmt.separator} onChange={(v) => v && patch({ separator: v as SeparatorStyle })} allowDeselect={false} comboboxProps={{ withinPortal: true }} />
      <NumberInput label="Nombre de décimales" size="sm" placeholder="auto" min={0} max={10} value={fmt.decimals ?? undefined} onChange={(v) => patch({ decimals: v === "" || v == null ? null : Number(v) })} />
      <NumberInput label="Multiplier par un nombre" size="sm" placeholder="1" hideControls value={fmt.multiplyBy ?? undefined} onChange={(v) => patch({ multiplyBy: v === "" || v == null ? null : Number(v) })} />
      <TextInput label="Ajouter un préfixe" size="sm" value={fmt.prefix ?? ""} onChange={(e) => patch({ prefix: e.currentTarget.value })} />
      <TextInput label="Ajouter un suffixe" size="sm" value={fmt.suffix ?? ""} onChange={(e) => patch({ suffix: e.currentTarget.value })} />
    </Stack>
  );
}
