import type { NumberFormat } from "./settings";

// Metabase-style number formatting (Mise en forme): style, currency, decimals,
// multiplier, prefix/suffix. Used by the scalar viz, gauge/progress and labels.
export function formatNumber(value: number, fmt: NumberFormat): string {
  if (value == null || isNaN(value)) return "";
  let v = value;
  if (fmt.multiplyBy != null && fmt.multiplyBy !== 0) v *= fmt.multiplyBy;

  const decimals = fmt.decimals ?? undefined;
  const fracOpts = decimals != null ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : {};

  let core: string;
  switch (fmt.style) {
    case "percent":
      core = new Intl.NumberFormat("fr-FR", { style: "percent", ...fracOpts }).format(v);
      break;
    case "currency":
      core = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: fmt.currency || "EUR",
        currencyDisplay: fmt.currencyStyle === "code" ? "code" : fmt.currencyStyle === "name" ? "name" : "symbol",
        ...fracOpts,
      }).format(v);
      break;
    case "scientific":
      core = v.toExponential(decimals ?? undefined).replace(".", ",");
      break;
    default:
      core = new Intl.NumberFormat("fr-FR", fracOpts).format(v);
  }
  return `${fmt.prefix ?? ""}${core}${fmt.suffix ?? ""}`;
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
