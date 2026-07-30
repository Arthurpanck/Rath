import type { NumberFormat, SeparatorStyle, SeriesFormat } from "./settings";

// Shared default: plain numbers show at most 2 decimals (like Metabase).
export const nf2 = (v: number): string => (v == null || isNaN(v) ? "" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v));

// "Style de séparateur": each option maps to a locale (+ grouping toggle).
const SEP_LOCALE: Record<SeparatorStyle, { locale: string; grouping: boolean }> = {
  "comma-dot": { locale: "en-US", grouping: true }, // 100,000.00
  "space-comma": { locale: "fr-FR", grouping: true }, // 100 000,00
  "dot-comma": { locale: "de-DE", grouping: true }, // 100.000,00
  "none-dot": { locale: "en-US", grouping: false }, // 100000.00
  "apos-dot": { locale: "de-CH", grouping: true }, // 100'000.00
};

export const SEPARATOR_OPTIONS: { value: SeparatorStyle; label: string }[] = [
  { value: "comma-dot", label: "100,000.00" },
  { value: "space-comma", label: "100 000,00" },
  { value: "dot-comma", label: "100.000,00" },
  { value: "none-dot", label: "100000.00" },
  { value: "apos-dot", label: "100'000.00" },
];

// Metabase-style number formatting (Mise en forme): style, currency, separator,
// decimals, multiplier, prefix/suffix. Used by scalar, gauge/progress, labels.
export function formatNumber(value: number, fmt: NumberFormat): string {
  if (value == null || isNaN(value)) return "";
  let v = value;
  if (fmt.multiplyBy != null && fmt.multiplyBy !== 0) v *= fmt.multiplyBy;

  const { locale, grouping } = SEP_LOCALE[fmt.separator] ?? SEP_LOCALE["space-comma"];
  const decimals = fmt.decimals ?? undefined;
  // When no explicit decimal count is set, cap at 2 decimals by default.
  const fracOpts =
    decimals != null ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : { maximumFractionDigits: 2 };
  const base = { useGrouping: grouping, ...fracOpts } as Intl.NumberFormatOptions;

  let core: string;
  switch (fmt.style) {
    case "percent":
      core = new Intl.NumberFormat(locale, { style: "percent", ...base }).format(v);
      break;
    case "currency":
      // "Dans l'en-tête de colonne" means the unit is shown in the header, so
      // the value itself stays a plain number.
      core =
        fmt.currencyPlacement === "header"
          ? new Intl.NumberFormat(locale, base).format(v)
          : new Intl.NumberFormat(locale, {
              style: "currency",
              currency: fmt.currency || "EUR",
              currencyDisplay: fmt.currencyStyle === "code" ? "code" : fmt.currencyStyle === "name" ? "name" : "symbol",
              ...base,
            }).format(v);
      break;
    case "scientific":
      core = v.toExponential(decimals ?? undefined);
      break;
    default:
      core = new Intl.NumberFormat(locale, base).format(v);
  }
  return `${fmt.prefix ?? ""}${core}${fmt.suffix ?? ""}`;
}

/** Per-series formatting from the popover's "Mise en forme" tab. */
export function formatSeriesValue(value: number, f: SeriesFormat | undefined, compact = false): string {
  if (value == null || isNaN(value)) return "";
  let v = value;
  if (f?.multiplyBy != null && f.multiplyBy !== 0) v *= f.multiplyBy;
  const decimals = f?.decimals ?? null;
  const core = compact
    ? formatCompact(v)
    : new Intl.NumberFormat("fr-FR", decimals != null ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : { maximumFractionDigits: 2 }).format(v);
  return `${f?.prefix ?? ""}${core}${f?.suffix ?? ""}`;
}

// Compact (1,2 k / 3,4 M) vs full formatting for chart data labels.
export function formatCompact(value: number): string {
  if (value == null || isNaN(value)) return "";
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export const CURRENCIES: { value: string; label: string }[] = [
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "US Dollar ($)" },
  { value: "GBP", label: "Livre sterling (£)" },
  { value: "CHF", label: "Franc suisse" },
  { value: "CAD", label: "Dollar canadien" },
  { value: "JPY", label: "Yen japonais (¥)" },
  { value: "CNY", label: "Yuan chinois" },
];
