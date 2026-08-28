// Prop shapes shared by the settings panel and its tabs.
//
// These used to be `: any` on four tab components, which quietly switched off
// the type checking the rest of the project relies on — in the one place where
// the state is most tangled. Naming them once keeps the tabs honest and makes
// each one's data dependencies readable from its signature.

import type { Column, Dataset } from "../../data/types";
import type { VizId } from "../../viz/registry";
import type { VizSettings } from "../../viz/settings";

/** An entry in a Mantine `Select`. */
export interface SelectOption {
  value: string;
  label: string;
}

/** What every settings tab needs: the current settings and a way to patch them. */
export interface TabProps {
  settings: VizSettings;
  onChange: (patch: Partial<VizSettings>) => void;
}

/** Tabs whose content branches on the chart type. */
export interface VizTabProps extends TabProps {
  vizId: VizId;
}

/** The dataset's columns, pre-split into the three pickers the tabs offer. */
export interface ColumnOptions {
  /** Every column — for fields that accept any type. */
  allCols: SelectOption[];
  /** Non-numeric columns — for dimension pickers. */
  dimOptions: SelectOption[];
  /** Numeric columns — for measure pickers. */
  metricOptions: SelectOption[];
}

export interface DonneesTabProps extends VizTabProps, ColumnOptions {
  dataset: Dataset;
  /** The measures currently plotted, resolved from settings + dataset shape. */
  activeMetrics: Column[];
}

export interface AffichageTabProps extends VizTabProps {
  isCartesian: boolean;
  allCols: SelectOption[];
}

export interface FormatTabProps extends VizTabProps {
  allCols: SelectOption[];
}

export interface ConditionalColorsTabProps extends VizTabProps {
  allCols: SelectOption[];
}

export interface SeriesListProps extends VizTabProps {
  activeMetrics: Column[];
  metricOptions: SelectOption[];
  label: string;
}
