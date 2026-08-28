import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node, not jsdom: the layout code under test measures text through
    // viz/options/text.ts, which falls back to a deterministic character-width
    // estimate when there is no document. That fallback is what makes these
    // assertions reproducible.
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
