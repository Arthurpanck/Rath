// Builds the PowerPoint prototyping kit from the captures in `captures/`:
// dashboard templates to arrange the charts on, then an annex showing every
// variation, with a fill-in form in each slide's speaker notes.
//
//   node scripts/deck.mjs   →  presentation/Kit-prototypage-tableau-de-bord.pptx
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { GROUPS } from "./catalogue.mjs";

const require = createRequire(import.meta.url);
const PptxGenJS = require("pptxgenjs");

const ROOT = path.resolve(".");
const CAPTURES = path.join(ROOT, "captures");
const OUT = path.join(ROOT, "presentation", "Kit-prototypage-tableau-de-bord.pptx");

// ---------------------------------------------------------------- palette ----
const INK = "232936";
const INK_SOFT = "2F3849";
const TEXT = "343B4C";
const MUTED = "7C8598";
const ACCENT = "E2622C";
const CARD_BG = "F5F7F9";
const BORDER = "DCE1E7";
const WHITE = "FFFFFF";
const HEAD = "Cambria";
const BODY = "Calibri";

const W = 13.333;
const H = 7.5;
const MARGIN = 0.5;
const USABLE = W - MARGIN * 2;

// --------------------------------------------------------------- helpers ----
/** Reads a PNG's pixel size straight from its IHDR chunk. */
function pngSize(file) {
  const fd = fs.openSync(file, "r");
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/** Fits a picture inside a box without distorting it, centred. */
function fit(file, box) {
  const { w: pw, h: ph } = pngSize(file);
  const scale = Math.min(box.w / pw, box.h / ph);
  const w = pw * scale;
  const h = ph * scale;
  return { path: file, x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

const shotFile = (group, shot) => path.join(CAPTURES, group.dir, `${shot.file}.png`);

function titleZone(slide, kicker, title, subtitle) {
  slide.addText(kicker.toUpperCase(), {
    x: MARGIN, y: 0.30, w: USABLE, h: 0.22, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 10, bold: true, charSpacing: 2, color: ACCENT,
  });
  slide.addText(title, {
    x: MARGIN, y: 0.54, w: USABLE, h: 0.5, isTextBox: true, margin: 0,
    fontFace: HEAD, fontSize: 26, bold: true, color: INK,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: MARGIN, y: 1.04, w: USABLE - 0.4, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BODY, fontSize: 12, color: MUTED,
    });
  }
}

/** Small numbered disc — the deck's one repeated motif. */
function badge(slide, n, x, y, size = 0.34, fill = ACCENT) {
  slide.addShape("ellipse", { x, y, w: size, h: size, fill: { color: fill }, line: { color: fill, width: 0 } });
  slide.addText(String(n), {
    x, y, w: size, h: size, isTextBox: true, margin: 0, align: "center", valign: "middle",
    fontFace: BODY, fontSize: size >= 0.4 ? 14 : 12, bold: true, color: WHITE,
  });
}

// ------------------------------------------------------------ fill-in form ----
const COMMON_FIELDS = [
  "Graphique choisi (dossier / fichier)",
  "Titre affiché",
  "Question à laquelle il répond",
  "Source / table",
  "Mesure(s) affichée(s)",
  "Agrégation (somme / moyenne / nombre…)",
  "Dimension (axe X ou parts)",
  "Éclatement par une 2ᵉ dimension",
  "Filtres appliqués",
  "Période couverte",
  "Tri",
  "Nom de l'axe X",
  "Nom de l'axe Y + unité",
  "Format des valeurs (nombre / % / €)",
  "Valeurs affichées sur le graphique (oui / non)",
  "Légende (oui / non)",
  "Ligne d'objectif",
  "Au clic (filtrer, ouvrir le détail, rien)",
];

const DOTS = " : ..............................................";
const formLines = (fields) => fields.map((f) => `  ${f}${DOTS}`).join("\n");

const zoneForm = (n, hint) =>
  [`----- ZONE ${n}${hint ? ` (${hint})` : ""} -----`, formLines(COMMON_FIELDS), "  Remarques" + DOTS, ""].join("\n");

const dashboardHeaderForm = [
  "TITRE DU TABLEAU DE BORD" + DOTS,
  "Pour qui / pour quoi faire" + DOTS,
  "Fréquence de mise à jour" + DOTS,
  "Filtres communs à toute la page" + DOTS,
  "",
  "Remplissez une fiche par zone. Laissez une zone vide si vous ne l'utilisez pas.",
  "",
].join("\n");

// =============================================================== the deck ====
const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE";
pres.author = "Kit de prototypage";
pres.title = "Kit de prototypage de tableau de bord";

pres.defineSlideMaster({
  title: "LIGHT",
  background: { color: WHITE },
  slideNumber: { x: 12.35, y: 7.02, w: 0.6, h: 0.25, fontFace: BODY, fontSize: 9, color: "AEB6C2", align: "right" },
});
pres.defineSlideMaster({ title: "DARK", background: { color: INK } });

const light = () => pres.addSlide({ masterName: "LIGHT" });
const dark = () => pres.addSlide({ masterName: "DARK" });

// Page numbers referenced in the text: 1 cover, 2 mode d'emploi, 3 fiche,
// 4 choisir, 5-8 gabarits, 9 intercalaire, 10+ annexe.
const FIRST_TEMPLATE_PAGE = 5;
const ANNEX_DIVIDER_PAGE = 9;
const FIRST_ANNEX_PAGE = 10;

/** Balanced pagination: 6 per page max, then evened out so no page is empty-ish. */
function paginate(shots) {
  const pages = Math.max(1, Math.ceil(shots.length / 6));
  const per = Math.ceil(shots.length / pages);
  const out = [];
  for (let i = 0; i < shots.length; i += per) out.push(shots.slice(i, i + per));
  return out;
}

const annexPages = GROUPS.map((g) => ({ group: g, pages: paginate(g.shots) }));
let page = FIRST_ANNEX_PAGE;
for (const entry of annexPages) {
  entry.firstPage = page;
  page += entry.pages.length;
}
const LAST_ANNEX_PAGE = page - 1;

// ------------------------------------------------------------------ cover ----
{
  const s = dark();
  s.addText("KIT DE PROTOTYPAGE", {
    x: MARGIN + 0.2, y: 1.15, w: 8, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BODY, fontSize: 12, bold: true, charSpacing: 3, color: ACCENT,
  });
  s.addText("Construisez votre\ntableau de bord\ndans ce PowerPoint", {
    x: MARGIN + 0.2, y: 1.52, w: 8.1, h: 2.2, isTextBox: true, margin: 0,
    fontFace: HEAD, fontSize: 33, bold: true, color: WHITE, lineSpacing: 40,
  });
  s.addText(
    "Choisissez vos graphiques dans l'annexe, posez-les sur un gabarit, décrivez-les dans les commentaires : le tableau de bord est spécifié.",
    { x: MARGIN + 0.2, y: 3.85, w: 7.9, h: 1.0, isTextBox: true, margin: 0, fontFace: BODY, fontSize: 14, color: "C3CAD6", lineSpacing: 22 },
  );
  const facts = [
    ["12", "types de graphiques"],
    ["109", "déclinaisons prêtes à coller"],
    ["4", "gabarits de page"],
  ];
  facts.forEach(([n, label], i) => {
    const x = MARGIN + 0.2 + i * 2.75;
    s.addText(n, { x, y: 5.00, w: 1.2, h: 0.62, isTextBox: true, margin: 0, fontFace: HEAD, fontSize: 34, bold: true, color: ACCENT });
    s.addText(label, { x, y: 5.63, w: 2.5, h: 0.5, isTextBox: true, margin: 0, fontFace: BODY, fontSize: 11, color: "9AA4B4" });
  });

  const covers = [
    "01-barres/04-empilees.png",
    "03-courbe/01-defaut.png",
    "06-camembert/01-anneau-defaut.png",
  ];
  covers.forEach((rel, i) => {
    const box = { x: 9.15, y: 1.15 + i * 1.75, w: 3.55, h: 1.55 };
    s.addShape("roundRect", { ...box, rectRadius: 0.05, fill: { color: "FFFFFF" }, line: { color: "3A4356", width: 0.75 } });
    s.addImage(fit(path.join(CAPTURES, rel), { x: box.x + 0.08, y: box.y + 0.08, w: box.w - 0.16, h: box.h - 0.16 }));
  });
  s.addNotes(
    [
      "Kit de prototypage de tableau de bord.",
      "",
      "Ce fichier sert à décrire un tableau de bord avant de le construire : on choisit les graphiques, on les dispose, on remplit les commentaires.",
      "Toutes les images de l'annexe sortent de l'outil de visualisation : ce que vous voyez est ce qui sera produit.",
    ].join("\n"),
  );
}

// ---------------------------------------------------------- mode d'emploi ----
{
  const s = light();
  titleZone(s, "Mode d'emploi", "Quatre gestes, et c'est spécifié");
  const steps = [
    ["Choisissez", `Feuilletez l'annexe (pages ${FIRST_ANNEX_PAGE} à ${LAST_ANNEX_PAGE}) : 12 types de graphiques, chacun décliné. Cliquez sur l'image qui vous va, puis Ctrl+C.`],
    ["Posez", `Allez sur un gabarit (pages ${FIRST_TEMPLATE_PAGE} à ${FIRST_TEMPLATE_PAGE + 3}), collez l'image dans un cadre en pointillés, supprimez le cadre et redimensionnez.`],
    ["Décrivez", "Sous la diapositive, la zone Commentaires contient déjà une fiche par zone. Remplissez-la : titre, mesure, axes, filtres…"],
    ["Renvoyez", "Une page = un écran. Le fichier rendu vaut cahier des charges : chaque graphique y est nommé, situé et paramétré."],
  ];
  const cardW = (USABLE - 3 * 0.3) / 4;
  steps.forEach(([title, text], i) => {
    const x = MARGIN + i * (cardW + 0.3);
    s.addShape("roundRect", { x, y: 1.75, w: cardW, h: 3.3, rectRadius: 0.06, fill: { color: CARD_BG }, line: { color: BORDER, width: 0.75 } });
    badge(s, i + 1, x + 0.28, 2.05, 0.42);
    s.addText(title, { x: x + 0.28, y: 2.62, w: cardW - 0.56, h: 0.36, isTextBox: true, margin: 0, fontFace: HEAD, fontSize: 17, bold: true, color: INK });
    s.addText(text, { x: x + 0.28, y: 3.02, w: cardW - 0.56, h: 2.0, isTextBox: true, margin: 0, fontFace: BODY, fontSize: 12, color: TEXT, lineSpacing: 18 });
  });

  s.addShape("roundRect", { x: MARGIN, y: 5.45, w: USABLE, h: 1.15, rectRadius: 0.06, fill: { color: INK }, line: { color: INK, width: 0 } });
  s.addText("Où est la zone Commentaires ?", {
    x: MARGIN + 0.35, y: 5.65, w: 4.2, h: 0.3, isTextBox: true, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: WHITE,
  });
  s.addText(
    "Sous la diapositive, en mode Normal. Si elle n'apparaît pas : onglet Affichage ▸ Notes, ou faites glisser vers le haut la bordure du bas de la fenêtre.",
    { x: MARGIN + 0.35, y: 5.96, w: USABLE - 0.7, h: 0.5, isTextBox: true, margin: 0, fontFace: BODY, fontSize: 12, color: "C3CAD6" },
  );
  s.addNotes(
    [
      "MODE D'EMPLOI",
      "",
      "1. Choisir : annexe pages " + FIRST_ANNEX_PAGE + " à " + LAST_ANNEX_PAGE + ". Chaque image est une déclinaison réelle du graphique.",
      "2. Poser : gabarits pages " + FIRST_TEMPLATE_PAGE + " à " + (FIRST_TEMPLATE_PAGE + 3) + ". Collez l'image par-dessus un cadre en pointillés, puis supprimez le cadre.",
      "3. Décrire : cette zone-ci. Les gabarits arrivent avec une fiche pré-remplie par zone.",
      "4. Renvoyer : une page = un écran du tableau de bord.",
      "",
      "Astuce : dupliquez un gabarit (clic droit sur la vignette ▸ Dupliquer la diapositive) pour un deuxième écran.",
    ].join("\n"),
  );
}

// ------------------------------------------------------- la fiche à remplir ----
{
  const s = light();
  titleZone(s, "La fiche", "Ce qu'on vous demande pour chaque graphique", "Recopiée automatiquement dans les commentaires de chaque gabarit — ici pour mémoire.");
  const colW = (USABLE - 0.4) / 2;
  const half = Math.ceil(COMMON_FIELDS.length / 2);
  [COMMON_FIELDS.slice(0, half), COMMON_FIELDS.slice(half)].forEach((col, ci) => {
    const x = MARGIN + ci * (colW + 0.4);
    col.forEach((field, i) => {
      const y = 1.62 + i * 0.53;
      s.addText(field, { x, y, w: colW * 0.62, h: 0.34, isTextBox: true, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11.5, color: TEXT });
      s.addShape("line", { x: x + colW * 0.63, y: y + 0.3, w: colW * 0.37, h: 0, line: { color: BORDER, width: 1, dashType: "dash" } });
    });
  });
  s.addNotes(
    [
      "FICHE GRAPHIQUE — modèle",
      "",
      "À recopier une fois par graphique posé sur une page. Les gabarits la contiennent déjà, pré-numérotée par zone.",
      "",
      formLines(COMMON_FIELDS),
      "  Remarques" + DOTS,
      "",
      "Les champs sans objet (par exemple les axes d'un camembert) peuvent rester vides.",
      "L'annexe rappelle, pour chaque type de graphique, les champs qui le concernent vraiment.",
    ].join("\n"),
  );
}

// -------------------------------------------------- choisir son graphique ----
{
  const s = light();
  titleZone(s, "Repères", "Quel graphique pour quelle intention ?");
  const picks = [
    ["Comparer des catégories", "Barres · p. " + annexPages[0].firstPage, "01-barres/01-groupees.png"],
    ["Suivre une évolution", "Courbe · p. " + annexPages[2].firstPage, "03-courbe/01-defaut.png"],
    ["Montrer une composition", "Aire 100 % · p. " + annexPages[3].firstPage, "04-aire/03-empilee-100.png"],
    ["Afficher un chiffre clé", "Nombre · p. " + annexPages[6].firstPage, "07-nombre/01-defaut.png"],
    ["Détailler une répartition", "Camembert · p. " + annexPages[5].firstPage, "06-camembert/01-anneau-defaut.png"],
    ["Expliquer un écart", "Cascade · p. " + annexPages[8].firstPage, "09-cascade/01-defaut.png"],
  ];
  const cw = (USABLE - 2 * 0.3) / 3;
  const ch = 2.4;
  picks.forEach(([intent, where, rel], i) => {
    const x = MARGIN + (i % 3) * (cw + 0.3);
    const y = 1.55 + Math.floor(i / 3) * (ch + 0.3);
    s.addShape("roundRect", { x, y, w: cw, h: ch, rectRadius: 0.06, fill: { color: CARD_BG }, line: { color: BORDER, width: 0.75 } });
    s.addImage(fit(path.join(CAPTURES, rel), { x: x + 0.12, y: y + 0.12, w: cw - 0.24, h: ch - 0.95 }));
    s.addText(intent, { x: x + 0.18, y: y + ch - 0.78, w: cw - 0.36, h: 0.3, isTextBox: true, margin: 0, fontFace: HEAD, fontSize: 14, bold: true, color: INK });
    s.addText(where, { x: x + 0.18, y: y + ch - 0.46, w: cw - 0.36, h: 0.28, isTextBox: true, margin: 0, fontFace: BODY, fontSize: 11, color: ACCENT });
  });
  s.addNotes(
    [
      "REPÈRES — choisir un type de graphique",
      "",
      "Comparer des catégories entre elles → barres (verticales), ou barres horizontales si les libellés sont longs ou s'il s'agit d'un classement.",
      "Suivre une évolution dans le temps → courbe ; aire si ce qui compte est la composition du total.",
      "Montrer une composition → aire empilée 100 % dans le temps, barres empilées 100 % par catégorie, camembert pour un instant donné.",
      "Afficher un chiffre clé → Nombre ; Tendance si l'évolution compte ; Jauge ou Progression s'il y a une cible.",
      "Détailler une répartition → camembert (2 à 6 parts), sinon barres horizontales triées.",
      "Expliquer un écart → cascade.",
      "Chercher une corrélation → nuage de points.",
      "",
      "Règle simple : un écran de tableau de bord tient en 4 à 6 graphiques, chiffres clés compris.",
    ].join("\n"),
  );
}

// -------------------------------------------------------------- gabarits ----
/** One dashed drop zone with its number. */
function dropZone(s, n, x, y, w, h, hint) {
  s.addShape("roundRect", { x, y, w, h, rectRadius: 0.05, fill: { color: "FCFDFE" }, line: { color: "BFC8D6", width: 1.25, dashType: "dash" } });
  badge(s, n, x + 0.16, y + 0.16, 0.34);
  s.addText(hint, {
    x: x + 0.16, y: y + 0.58, w: w - 0.32, h: h - 0.74, isTextBox: true, margin: 0,
    align: "center", valign: "middle", fontFace: BODY, fontSize: 11.5, color: "94A0B0",
  });
}

function dashboardTitleFields(s) {
  s.addText("Titre du tableau de bord :", {
    x: MARGIN, y: 0.34, w: 2.6, h: 0.3, isTextBox: true, margin: 0, fontFace: BODY, fontSize: 12, bold: true, color: INK,
  });
  s.addShape("line", { x: MARGIN + 2.65, y: 0.62, w: 5.2, h: 0, line: { color: BORDER, width: 1, dashType: "dash" } });
  s.addText("Pour qui :", {
    x: MARGIN + 8.2, y: 0.34, w: 1.1, h: 0.3, isTextBox: true, margin: 0, fontFace: BODY, fontSize: 12, bold: true, color: INK,
  });
  s.addShape("line", { x: MARGIN + 9.35, y: 0.62, w: 2.95, h: 0, line: { color: BORDER, width: 1, dashType: "dash" } });
}

const templates = [
  {
    name: "Gabarit A — chiffres clés + deux graphiques",
    tip: "Le grand classique : ce qu'on lit en premier en haut, le détail en dessous.",
    zones: (s) => {
      const kw = (USABLE - 3 * 0.25) / 4;
      for (let i = 0; i < 4; i++) dropZone(s, i + 1, MARGIN + i * (kw + 0.25), 0.95, kw, 1.5, "Chiffre clé\n(Nombre · Tendance · Jauge)");
      const gw = (USABLE - 0.3) / 2;
      dropZone(s, 5, MARGIN, 2.62, gw, 4.03, "Graphique principal");
      dropZone(s, 6, MARGIN + gw + 0.3, 2.62, gw, 4.03, "Graphique secondaire");
    },
    hints: ["chiffre clé", "chiffre clé", "chiffre clé", "chiffre clé", "graphique principal", "graphique secondaire"],
  },
  {
    name: "Gabarit B — quatre graphiques",
    tip: "Quatre angles de lecture de même poids. Au-delà, la page devient illisible.",
    zones: (s) => {
      const gw = (USABLE - 0.3) / 2;
      const gh = (5.7 - 0.3) / 2;
      for (let i = 0; i < 4; i++) {
        dropZone(s, i + 1, MARGIN + (i % 2) * (gw + 0.3), 0.95 + Math.floor(i / 2) * (gh + 0.3), gw, gh, "Graphique");
      }
    },
    hints: ["haut gauche", "haut droite", "bas gauche", "bas droite"],
  },
  {
    name: "Gabarit C — un graphique dominant",
    tip: "Quand une seule question porte la page, et que le reste sert de contexte.",
    zones: (s) => {
      const big = USABLE * 0.615;
      dropZone(s, 1, MARGIN, 0.95, big, 5.7, "Graphique dominant");
      const sw = USABLE - big - 0.3;
      const sh = (5.7 - 0.5) / 3;
      for (let i = 0; i < 3; i++) {
        dropZone(s, i + 2, MARGIN + big + 0.3, 0.95 + i * (sh + 0.25), sw, sh, i === 0 ? "Chiffre clé" : "Graphique d'appoint");
      }
    },
    hints: ["dominant", "appoint 1", "appoint 2", "appoint 3"],
  },
  {
    name: "Gabarit D — page libre",
    tip: "Rien d'imposé : posez, déplacez, redimensionnez. Numérotez vos zones à la main dans les commentaires.",
    zones: (s) => {
      s.addShape("roundRect", { x: MARGIN, y: 0.95, w: USABLE, h: 5.7, rectRadius: 0.05, fill: { color: "FCFDFE" }, line: { color: "BFC8D6", width: 1.25, dashType: "dash" } });
      for (let i = 1; i < 4; i++) {
        s.addShape("line", { x: MARGIN + (USABLE / 4) * i, y: 1.15, w: 0, h: 5.3, line: { color: "E8ECF1", width: 1 } });
      }
      s.addShape("line", { x: MARGIN + 0.2, y: 0.95 + 5.7 / 2, w: USABLE - 0.4, h: 0, line: { color: "E8ECF1", width: 1 } });
      s.addText("Zone libre — les repères clairs aident seulement à aligner", {
        x: MARGIN, y: 3.55, w: USABLE, h: 0.4, isTextBox: true, margin: 0, align: "center", fontFace: BODY, fontSize: 12, color: "94A0B0",
      });
    },
    hints: ["zone 1", "zone 2", "zone 3", "zone 4"],
  },
];

templates.forEach((tpl, ti) => {
  const s = light();
  dashboardTitleFields(s);
  tpl.zones(s);
  s.addText(`${tpl.name} — ${tpl.tip}`, {
    x: MARGIN, y: 6.82, w: USABLE - 0.9, h: 0.3, isTextBox: true, margin: 0, fontFace: BODY, fontSize: 10, italic: true, color: MUTED,
  });
  s.addNotes(
    [
      tpl.name.toUpperCase(),
      "",
      dashboardHeaderForm,
      tpl.hints.map((hint, i) => zoneForm(i + 1, hint)).join("\n"),
      "Besoin d'un deuxième écran ? Clic droit sur la vignette de cette page ▸ Dupliquer la diapositive.",
    ].join("\n"),
  );
});

// ---------------------------------------------------- intercalaire annexe ----
{
  const s = dark();
  s.addText("ANNEXE", {
    x: MARGIN + 0.2, y: 0.85, w: 6, h: 0.3, isTextBox: true, margin: 0, fontFace: BODY, fontSize: 12, bold: true, charSpacing: 3, color: ACCENT,
  });
  s.addText("Le catalogue des graphiques", {
    x: MARGIN + 0.2, y: 1.18, w: 8, h: 0.7, isTextBox: true, margin: 0, fontFace: HEAD, fontSize: 32, bold: true, color: WHITE,
  });
  s.addText(
    "Chaque type est présenté avec ses déclinaisons réelles : avec ou sans valeurs, avec ou sans légende, empilé, 100 %, formats de nombres. Copiez l'image qui correspond à ce que vous voulez voir.",
    { x: MARGIN + 0.2, y: 1.95, w: 8.6, h: 0.8, isTextBox: true, margin: 0, fontFace: BODY, fontSize: 13, color: "C3CAD6", lineSpacing: 20 },
  );
  const colW = (USABLE - 0.6 - 0.5) / 2;
  annexPages.forEach((entry, i) => {
    const col = i < 6 ? 0 : 1;
    const row = i % 6;
    const x = MARGIN + 0.2 + col * (colW + 0.5);
    const y = 3.0 + row * 0.61;
    s.addText(entry.group.title, { x, y, w: colW - 1.5, h: 0.3, isTextBox: true, margin: 0, valign: "middle", fontFace: BODY, fontSize: 13, color: WHITE });
    s.addText(`${entry.group.shots.length} déclinaisons`, {
      x: x + colW - 2.5, y, w: 1.5, h: 0.3, isTextBox: true, margin: 0, valign: "middle", align: "right", fontFace: BODY, fontSize: 11, color: "8B95A6",
    });
    s.addText(`p. ${entry.firstPage}`, {
      x: x + colW - 0.9, y, w: 0.9, h: 0.3, isTextBox: true, margin: 0, valign: "middle", align: "right", fontFace: BODY, fontSize: 12, bold: true, color: ACCENT,
    });
    s.addShape("line", { x, y: y + 0.42, w: colW, h: 0, line: { color: "3A4356", width: 0.75 } });
  });
  s.addNotes(
    [
      "ANNEXE — sommaire",
      "",
      ...annexPages.map((e) => `${e.group.title} : ${e.group.shots.length} déclinaisons, page ${e.firstPage}. ${e.group.usage}`),
    ].join("\n"),
  );
}

// -------------------------------------------------------- pages d'annexe ----
const GRID = { top: 1.40, height: 5.30, gap: 0.28, rowGap: 0.22, caption: 0.46 };

annexPages.forEach((entry) => {
  const { group, pages } = entry;
  pages.forEach((shots, pi) => {
    const s = light();
    const counter = pages.length > 1 ? ` (${pi + 1}/${pages.length})` : "";
    titleZone(s, `Annexe · ${group.title}`, `${group.title} — déclinaisons${counter}`, pi === 0 ? group.usage : undefined);

    const cols = Math.min(shots.length, 3);
    const rows = Math.ceil(shots.length / cols);
    const colW = (USABLE - (cols - 1) * GRID.gap) / cols;
    const imgH = Math.min((GRID.height - rows * GRID.caption - (rows - 1) * GRID.rowGap) / rows, colW * 0.62);
    const cardH = imgH + GRID.caption;
    const blockH = rows * cardH + (rows - 1) * GRID.rowGap;
    const top = GRID.top + Math.max(0, (GRID.height - blockH) / 2);

    shots.forEach((shot, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, shots.length - row * cols);
      const rowW = inRow * colW + (inRow - 1) * GRID.gap;
      const x = MARGIN + (USABLE - rowW) / 2 + (i % cols) * (colW + GRID.gap);
      const y = top + row * (cardH + GRID.rowGap);

      s.addShape("roundRect", { x, y, w: colW, h: cardH, rectRadius: 0.05, fill: { color: CARD_BG }, line: { color: BORDER, width: 0.75 } });
      s.addImage(fit(shotFile(group, shot), { x: x + 0.10, y: y + 0.10, w: colW - 0.20, h: imgH - 0.16 }));
      s.addText(
        [
          { text: shot.file.slice(0, 2) + "  ", options: { color: ACCENT, bold: true } },
          { text: shot.label, options: { color: INK, bold: true } },
        ],
        { x: x + 0.14, y: y + imgH - 0.04, w: colW - 0.28, h: 0.26, isTextBox: true, margin: 0, valign: "middle", fontFace: BODY, fontSize: 11 },
      );
      s.addText(`${group.dir}/${shot.file}.png`, {
        x: x + 0.14, y: y + imgH + 0.20, w: colW - 0.28, h: 0.22, isTextBox: true, margin: 0, valign: "middle", fontFace: BODY, fontSize: 8, color: MUTED,
      });
    });

    s.addNotes(
      [
        `ANNEXE — ${group.title.toUpperCase()}${counter}`,
        "",
        `À quoi ça sert : ${group.usage}`,
        `Jeu de données des exemples : ${group.data.replace(/`/g, "")}`,
        "",
        "SUR CETTE PAGE :",
        ...shots.map((sh) => `  ${sh.file.slice(0, 2)} — ${sh.label} : ${sh.desc}`),
        "",
        "SI VOUS RETENEZ UN DE CES GRAPHIQUES, précisez (à recopier dans les commentaires de votre page de tableau de bord) :",
        formLines([
          "Déclinaison retenue (numéro + nom)",
          "Titre affiché",
          "Question à laquelle il répond",
          "Source / table",
          ...group.fields,
          "Au clic (filtrer, ouvrir le détail, rien)",
          "Remarques",
        ]),
      ].join("\n"),
    );
  });
});

// -------------------------------------------------------------------- fin ----
{
  const s = dark();
  s.addText("POUR FINIR", {
    x: MARGIN + 0.2, y: 1.5, w: 6, h: 0.3, isTextBox: true, margin: 0, fontFace: BODY, fontSize: 12, bold: true, charSpacing: 3, color: ACCENT,
  });
  s.addText("Avant de renvoyer le fichier", {
    x: MARGIN + 0.2, y: 1.85, w: 9, h: 0.7, isTextBox: true, margin: 0, fontFace: HEAD, fontSize: 32, bold: true, color: WHITE,
  });
  const checks = [
    "Chaque page porte un titre et un destinataire.",
    "Chaque graphique posé a sa fiche remplie dans les commentaires.",
    "Les mesures et les filtres sont nommés comme dans vos données, pas en langage courant.",
    "Les cadres en pointillés inutilisés ont été supprimés.",
    "Les pages de l'annexe et les gabarits vides peuvent rester : ils ne gênent pas.",
  ];
  checks.forEach((c, i) => {
    const y = 2.95 + i * 0.62;
    badge(s, i + 1, MARGIN + 0.2, y - 0.02, 0.34, ACCENT);
    s.addText(c, { x: MARGIN + 0.75, y, w: 7.4, h: 0.4, isTextBox: true, margin: 0, valign: "middle", fontFace: BODY, fontSize: 13.5, color: "D6DCE6" });
  });

  // Miniature of what a finished page looks like — the drop-zone motif again.
  const mx = 8.9;
  const my = 2.35;
  const mw = 3.9;
  const mh = 2.7;
  s.addShape("roundRect", { x: mx, y: my, w: mw, h: mh, rectRadius: 0.06, fill: { color: "2C3444" }, line: { color: "3F4A5E", width: 0.75 } });
  const kw = (mw - 0.5 - 3 * 0.12) / 4;
  for (let i = 0; i < 4; i++) {
    s.addShape("roundRect", { x: mx + 0.25 + i * (kw + 0.12), y: my + 0.3, w: kw, h: 0.42, rectRadius: 0.04, fill: { color: "394356" }, line: { color: "394356", width: 0 } });
  }
  const gw2 = (mw - 0.5 - 0.12) / 2;
  for (let i = 0; i < 2; i++) {
    s.addShape("roundRect", { x: mx + 0.25 + i * (gw2 + 0.12), y: my + 0.88, w: gw2, h: 1.15, rectRadius: 0.04, fill: { color: "394356" }, line: { color: "394356", width: 0 } });
  }
  s.addShape("roundRect", { x: mx + 0.25, y: my + 2.13, w: mw - 0.5, h: 0.3, rectRadius: 0.04, fill: { color: ACCENT }, line: { color: ACCENT, width: 0 } });
  s.addText("une page = un écran", {
    x: mx + 0.25, y: my + 2.13, w: mw - 0.5, h: 0.3, isTextBox: true, margin: 0, align: "center", valign: "middle",
    fontFace: BODY, fontSize: 10, bold: true, color: WHITE,
  });
  s.addNotes(
    [
      "CHECKLIST DE FIN",
      "",
      ...checks.map((c, i) => `${i + 1}. ${c}`),
      "",
      "Rappel : les images de l'annexe sont des rendus réels de l'outil. Si une déclinaison vous manque (une variante de format, un tri, une couleur), décrivez-la dans les commentaires : elle est réalisable.",
    ].join("\n"),
  );
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
await pres.writeFile({ fileName: OUT });
console.log(`Deck écrit : ${OUT}`);
