// Screenshot harness: the app's own chart pipeline (data → settings →
// ChartCanvas) rendered on a bare page, so a capture shows the chart and its
// legend and nothing of the editing UI. Driven by `scripts/shots.mjs`.
//
// Usage: /shot.html#<encodeURIComponent(JSON.stringify(spec))>
import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "../styles.css";
import { theme } from "../theme";
import { ChartCanvas } from "../components/ChartCanvas";
import { parseCsv } from "../data/csv";
import { applyQuery, type Summarize } from "../data/query";
import { SAMPLE_CSV, SAMPLE_DATES_CSV, SAMPLE_LYON_CSV, SAMPLE_MULTI_CSV } from "../data/sample";
import type { Dataset } from "../data/types";
import type { VizId } from "../viz/registry";
import { defaultNumberFormat, defaultSettings, type VizSettings } from "../viz/settings";
import { MB_COLORS } from "../viz/options/constants";

const SAMPLES: Record<string, string> = {
  annee: SAMPLE_CSV,
  dates: SAMPLE_DATES_CSV,
  multi: SAMPLE_MULTI_CSV,
  lyon: SAMPLE_LYON_CSV,
};

export interface ShotSpec {
  /** A bundled sample name, or a raw CSV string. */
  data: string;
  csv?: string;
  /** Optional "Résumer" step, applied before the chart, like in the app. */
  summarize?: Summarize;
  viz: VizId;
  settings?: Partial<VizSettings>;
  width?: number;
  height?: number;
}

declare global {
  interface Window {
    /** Timestamp of the last render; the capture waits for it to stop moving. */
    __shotFinishedAt?: number;
  }
}

function loadDataset(spec: ShotSpec): Dataset {
  const text = spec.csv ?? SAMPLES[spec.data] ?? SAMPLE_CSV;
  const raw = parseCsv(text);
  return spec.summarize ? applyQuery(raw, [], spec.summarize) : raw;
}

function mergeSettings(dataset: Dataset, patch: Partial<VizSettings> = {}): VizSettings {
  const base = defaultSettings(dataset);
  return {
    ...base,
    ...patch,
    numberFormat: { ...defaultNumberFormat(), ...(patch.numberFormat ?? {}) },
    colors: { ...base.colors, ...(patch.colors ?? {}) },
    series: { ...base.series, ...(patch.series ?? {}) },
  };
}

function readSpec(): ShotSpec {
  const raw = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (!raw) return { data: "annee", viz: "bar" };
  return JSON.parse(raw) as ShotSpec;
}

/**
 * ECharts measures and draws its labels on a canvas, so a chart rendered before
 * Lato has arrived would keep the fallback metrics. The capture therefore waits
 * for the font — with a deadline, so an offline run still produces images.
 */
function useLatoReady(deadlineMs = 1500): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const loaded = () => [...document.fonts].some((f) => f.family.replace(/["']/g, "") === "Lato" && f.status === "loaded");
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
    };
    const started = performance.now();
    const poll = () => {
      if (done) return;
      if (loaded() || performance.now() - started > deadlineMs) return finish();
      window.setTimeout(poll, 30);
    };
    Promise.all([document.fonts.load("400 12px Lato"), document.fonts.load("700 12px Lato")]).catch(() => undefined);
    document.fonts.ready.then(poll).catch(poll);
    poll();
    return () => {
      done = true;
    };
  }, [deadlineMs]);
  return ready;
}

function Shot() {
  const spec = readSpec();
  const dataset = loadDataset(spec);
  const settings = mergeSettings(dataset, spec.settings);
  const [, setTick] = useState(0);
  const fontsReady = useLatoReady();

  // React-rendered vizs (Nombre, Tendance, tables) never emit an ECharts
  // "finished" event, so they are declared ready one frame after mount.
  const react = ["table", "object", "scalar", "smartscalar", "pivot"].includes(spec.viz);
  useEffect(() => {
    if (!react || !fontsReady) return;
    const id = window.setTimeout(() => {
      window.__shotFinishedAt = performance.now();
      setTick((t) => t + 1);
    }, 60);
    return () => window.clearTimeout(id);
  }, [react, fontsReady]);

  return (
    <div
      id="shot-card"
      style={{
        width: spec.width ?? 900,
        height: spec.height ?? 520,
        background: MB_COLORS.white,
        border: `1px solid ${MB_COLORS.border}`,
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ width: "100%", height: "100%" }}>
        {fontsReady && (
        <ChartCanvas
          vizId={spec.viz}
          dataset={dataset}
          settings={settings}
          onChartReady={(chart) => {
            if (!chart) return;
            // Handy when checking what the app actually handed to ECharts.
            (window as unknown as { __chart?: unknown }).__chart = chart;
            // A chart can render more than once (the resize observer rebuilds
            // the option), so every pass pushes the timestamp forward and the
            // capture waits for it to settle rather than firing on the first.
            chart.on("finished", () => {
              window.__shotFinishedAt = performance.now();
            });
          }}
        />
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  // No StrictMode here: its double-mount disposes and re-creates the ECharts
  // instance, which would race the readiness flag.
  <MantineProvider theme={theme}>
    <Shot />
  </MantineProvider>,
);
