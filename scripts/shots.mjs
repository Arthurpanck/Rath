// Renders every chart variation listed below through the running dev server
// (/shot.html — the app's own ChartCanvas, without the editing UI) and writes
// one PNG per variation into captures/<type>/, plus a README per folder.
//
//   npm run dev                    # in one shell
//   node scripts/shots.mjs         # in another
//
// Options: SHOT_BASE_URL (default http://localhost:5175), SHOT_ONLY=<folder>
import { createRequire } from "node:module";
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { CSV, GROUPS } from "./catalogue.mjs";

const requireCjs = createRequire(import.meta.url);
function loadPlaywright() {
  for (const id of ["playwright", "playwright-core"]) {
    try {
      return requireCjs(id);
    } catch {}
  }
  const root = execSync("npm root -g").toString().trim();
  return requireCjs(path.join(root, "playwright"));
}

const BASE = process.env.SHOT_BASE_URL ?? "http://localhost:5175";
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap";
const FONT_CACHE = path.resolve("node_modules/.cache/shot-fonts");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const OUT = path.resolve("captures");
const ONLY = process.env.SHOT_ONLY;


// ------------------------------------------------------------------ fonts ----
// The app loads Lato from Google Fonts. A headless browser behind a proxy (or
// offline) would silently fall back to a system sans and the captures would no
// longer match the app, so the font is cached once with curl and served back to
// the page from disk. If it cannot be fetched, the captures still render — just
// in the fallback font — and a warning is printed.
function curlBuffer(url) {
  return execFileSync("curl", ["-sSL", "--fail", "-A", UA, url], { maxBuffer: 64 * 1024 * 1024 });
}

async function cacheFonts() {
  const cssFile = path.join(FONT_CACHE, "lato.css");
  await fs.mkdir(FONT_CACHE, { recursive: true });
  let css;
  try {
    css = await fs.readFile(cssFile, "utf8");
  } catch {
    css = curlBuffer(FONT_CSS).toString("utf8");
    await fs.writeFile(cssFile, css);
  }
  const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]);
  const files = new Map();
  for (const url of urls) {
    const name = url.split("/").pop().replace(/[^\w.-]/g, "_");
    const file = path.join(FONT_CACHE, name);
    try {
      files.set(url, await fs.readFile(file));
    } catch {
      const buf = curlBuffer(url);
      await fs.writeFile(file, buf);
      files.set(url, buf);
    }
  }
  return { css, files };
}

async function serveFonts(page) {
  let cache = null;
  try {
    cache = await cacheFonts();
  } catch (err) {
    console.warn(`  ! Lato indisponible (${err.message.split("\n")[0]}) — captures en police de repli.`);
    return;
  }
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/css; charset=utf-8", body: cache.css }),
  );
  await page.route("https://fonts.gstatic.com/**", (route) => {
    const body = cache.files.get(route.request().url());
    return body
      ? route.fulfill({ status: 200, contentType: "font/woff2", body })
      : route.abort();
  });
}

// ---------------------------------------------------------------- driver ----
function resolveSpec(spec) {
  const out = { ...spec };
  if (typeof out.data === "string" && out.data.startsWith("csv:")) {
    const key = out.data.slice(4);
    if (!CSV[key]) throw new Error(`Unknown inline CSV: ${key}`);
    out.csv = CSV[key];
    out.data = key;
  }
  return out;
}

async function main() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ args: ["--font-render-hinting=none"] });
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1200, height: 760 } });
  await serveFonts(page);

  let n = 0;
  const groups = ONLY ? GROUPS.filter((g) => g.dir === ONLY) : GROUPS;
  for (const group of groups) {
    const dir = path.join(OUT, group.dir);
    await fs.mkdir(dir, { recursive: true });
    for (const shot of group.shots) {
      const spec = resolveSpec(shot.spec);
      const url = `${BASE}/shot.html?n=${n++}#${encodeURIComponent(JSON.stringify(spec))}`;
      await page.goto(url, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      // Charts render more than once (mount, then the resize-driven rebuild),
      // and symbols fade in per point: wait until nothing has rendered for a
      // while, so no capture lands in the middle of an animation.
      await page.waitForFunction(
        () => window.__shotFinishedAt != null && performance.now() - window.__shotFinishedAt > 400,
        null,
        { timeout: 20000 },
      );
      const card = await page.waitForSelector("#shot-card");
      await card.screenshot({ path: path.join(dir, `${shot.file}.png`) });
      process.stdout.write(`  ${group.dir}/${shot.file}.png\n`);
    }
    await writeGroupReadme(group, dir);
  }
  // The index lists every type, even when only one folder was regenerated.
  await writeIndexReadme(GROUPS);
  await browser.close();
  console.log(`\n${n} captures écrites dans ${OUT}`);
}

async function writeGroupReadme(group, dir) {
  const lines = [
    `# ${group.title}`,
    "",
    group.intro,
    "",
    `**Jeu de données :** ${group.data}`,
    "",
    "| Fichier | Variante | Ce qui change |",
    "| --- | --- | --- |",
    ...group.shots.map((s) => `| \`${s.file}.png\` | ${s.label} | ${s.desc} |`),
    "",
    "---",
    "",
    ...group.shots.flatMap((s) => [`### ${s.label} — \`${s.file}.png\``, "", s.desc, "", `![${s.label}](${s.file}.png)`, ""]),
  ];
  await fs.writeFile(path.join(dir, "README.md"), lines.join("\n"));
}

async function writeIndexReadme(groups) {
  const lines = [
    "# Captures de graphiques",
    "",
    "Chaque sous-dossier correspond à un type de graphique ; à l'intérieur, un PNG par déclinaison",
    "(avec / sans valeurs, avec / sans légende, empilé, 100 %, formats de nombres…).",
    "Le `README.md` de chaque dossier décrit précisément ce qui change d'une image à l'autre.",
    "",
    "Les images ne montrent que le graphique et sa légende : ni barre d'outils, ni panneau de réglages.",
    "",
    "| Dossier | Type | Déclinaisons | Ce que couvrent les variations |",
    "| --- | --- | --- | --- |",
    ...groups.map((g) => `| [\`${g.dir}/\`](${g.dir}/README.md) | ${g.title} | ${g.shots.length} | ${g.intro.replace(/\n/g, " ")} |`),
    "",
    `**Total : ${groups.reduce((s, g) => s + g.shots.length, 0)} captures.**`,
    "",
    "## Régénérer",
    "",
    "```bash",
    "npm install",
    "npm run dev            # sert l'application ET /shot.html sur le port 5175",
    "node scripts/shots.mjs # relance toutes les captures",
    "```",
    "",
    "`SHOT_ONLY=06-camembert node scripts/shots.mjs` ne régénère qu'un dossier.",
    "",
    "## Comment les captures sont produites",
    "",
    "`shot.html` monte le composant `ChartCanvas` de l'application — même pipeline de données",
    "(`data/csv.ts` → `data/query.ts` → `viz/frame.ts`) et mêmes options ECharts que dans l'écran",
    "de création — sur une page nue. Le jeu de données, le type de graphique et les réglages",
    "sont passés dans l'URL, et Playwright capture le seul cadre du graphique.",
    "Le catalogue des variations est en tête de `scripts/shots.mjs`.",
    "",
    "## Jeux de données utilisés",
    "",
    "| Nom | Colonnes | Sert à |",
    "| --- | --- | --- |",
    "| `annee` | Année, Commandes, Revenu (5 lignes) | barres, combiné, chiffre clé |",
    "| `dates` | Date, Visiteurs, Conversions (12 mois) | courbe, aire, tendance |",
    "| `multi` | Pays, Catégorie, Ventes (15 lignes) | empilements, camembert |",
    "| `lyon` | Commune, Population, Equipements (15 lignes) | tris, échelle log, nuage de points |",
    "| CSV en ligne | cascade, trimestres, taux, jauge, progression… | cascade, jauge, progression, tendance |",
    "",
    "Les quatre premiers sont les échantillons livrés avec l'application (`src/data/sample.ts`).",
  ];
  await fs.writeFile(path.join(OUT, "README.md"), lines.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
