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

// ------------------------------------------------------------- datasets ----
// Bundled samples ("annee", "dates", "multi", "lyon") come from src/data/sample.ts.
// Anything else is inline CSV, imported exactly like a dropped file.
const CSV = {
  cascade: `Poste,Montant
Report N-1,42000
Nouveaux clients,18500
Renouvellements,12400
Résiliations,-9800
Remises,-4300
Upsell,7600`,
  combo3: `Trimestre,Ventes,Retours,Objectif
T1,42000,5200,45000
T2,51000,6100,48000
T3,47500,4800,52000
T4,63000,7300,56000`,
  taux: `Segment,Taux de conversion
Boutique en ligne,0.0911`,
  jauge: `Indicateur,Satisfaction
NPS 2024,72`,
  progression: `Indicateur,Ventes
Trimestre en cours,7400`,
  progressionDepassee: `Indicateur,Ventes
Trimestre en cours,11800`,
  baisse: `Mois,Abonnés
2024-01-01,4820
2024-02-01,4610
2024-03-01,4390
2024-04-01,4180
2024-05-01,3950
2024-06-01,3720`,
  canaux: `Mois,Canal,Sessions
2024-01-01,Recherche,6100
2024-01-01,Direct,4200
2024-01-01,Social,2300
2024-02-01,Recherche,6400
2024-02-01,Direct,4050
2024-02-01,Social,2750
2024-03-01,Recherche,5900
2024-03-01,Direct,4380
2024-03-01,Social,3400
2024-04-01,Recherche,6250
2024-04-01,Direct,4610
2024-04-01,Social,4120
2024-05-01,Recherche,6800
2024-05-01,Direct,4490
2024-05-01,Social,4980
2024-06-01,Recherche,7150
2024-06-01,Direct,4720
2024-06-01,Social,5860`,
  revenus: `Mois,Revenu
2024-07-01,128400
2024-08-01,134900
2024-09-01,141200
2024-10-01,152600
2024-11-01,148300
2024-12-01,167900`,
};

const SUM_REVENU = { aggregations: [{ fn: "sum", column: "Revenu" }], breakouts: [] };

// Shorthands for the two shapes used most often.
const multiBreakout = { dimension: "Pays", metrics: ["Ventes"], breakout: "Catégorie" };
const anneeCommandes = { dimension: "Année", metrics: ["Commandes"] };
const CANAUX = { dimension: "Mois", metrics: ["Sessions"], breakout: "Canal" };

const CARD = { width: 900, height: 520 };
const SQUARE = { width: 760, height: 520 };
const SMALL = { width: 620, height: 360 };
const GAUGE = { width: 720, height: 430 };
// The pie derives its radius from the smallest side, so a wide, low card leaves
// room for the labels drawn outside the ring.
const PIE = { width: 1060, height: 430 };

// ------------------------------------------------------------- catalogue ----
const GROUPS = [
  {
    dir: "01-barres",
    title: "Barres",
    intro:
      "Le graphique en barres verticales. Les variations couvrent l'empilement (aucun / empilé / 100 %), l'affichage des valeurs, la légende, les étiquettes d'axes, le tri, l'objectif et la courbe de tendance.",
    data: "`Pays, Catégorie, Ventes` (15 lignes) éclaté par catégorie, sauf mention contraire.",
    shots: [
      { file: "01-groupees", label: "Groupées (défaut)", desc: "Réglages par défaut : barres côte à côte, aucune valeur affichée, légende visible.", spec: { data: "multi", viz: "bar", settings: multiBreakout } },
      { file: "02-groupees-avec-valeurs", label: "Groupées + valeurs", desc: "« Afficher les valeurs sur les points de données » activé : le chiffre est écrit au-dessus de chaque barre.", spec: { data: "multi", viz: "bar", settings: { ...multiBreakout, showValues: true } } },
      { file: "03-groupees-sans-legende", label: "Groupées sans légende", desc: "« Afficher la légende » désactivé : les séries restent colorées mais ne sont plus nommées.", spec: { data: "multi", viz: "bar", settings: { ...multiBreakout, showLegend: false } } },
      { file: "04-empilees", label: "Empilées", desc: "Empilement = « Empiler » : les séries s'additionnent dans une seule barre par catégorie, en valeur absolue.", spec: { data: "multi", viz: "bar", settings: { ...multiBreakout, stacking: "stacked" } } },
      { file: "05-empilees-avec-valeurs", label: "Empilées + valeurs", desc: "Empilé avec les valeurs écrites à l'intérieur de chaque segment.", spec: { data: "multi", viz: "bar", settings: { ...multiBreakout, stacking: "stacked", showValues: true } } },
      { file: "06-empilees-avec-totaux", label: "Empilées + totaux", desc: "Empilé avec « Afficher les totaux d'empilement » : le total de la pile est écrit au-dessus de la barre.", spec: { data: "multi", viz: "bar", settings: { ...multiBreakout, stacking: "stacked", showStackTotals: true } } },
      { file: "07-empilees-100", label: "Empilées 100 %", desc: "Empilement = « 100 % » : chaque barre est ramenée à 100, l'axe Y est en pourcentage — on lit des parts, plus des volumes.", spec: { data: "multi", viz: "bar", settings: { ...multiBreakout, stacking: "normalized" } } },
      { file: "08-empilees-100-avec-valeurs", label: "Empilées 100 % + valeurs", desc: "Idem, avec le pourcentage écrit dans chaque segment.", spec: { data: "multi", viz: "bar", settings: { ...multiBreakout, stacking: "normalized", showValues: true } } },
      { file: "09-serie-unique", label: "Série unique", desc: "Une seule mesure (`Commandes` par année) : la légende disparaît d'elle-même, le nom de la série sert de titre d'axe Y.", spec: { data: "annee", viz: "bar", settings: anneeCommandes } },
      { file: "10-serie-unique-avec-valeurs", label: "Série unique + valeurs", desc: "Même graphique avec les valeurs au-dessus des barres.", spec: { data: "annee", viz: "bar", settings: { ...anneeCommandes, showValues: true } } },
      { file: "11-avec-ligne-objectif", label: "Ligne d'objectif", desc: "« Ligne d'objectif » = 250 : une ligne pointillée étiquetée traverse le graphique.", spec: { data: "annee", viz: "bar", settings: { ...anneeCommandes, goalValue: 250 } } },
      { file: "12-avec-courbe-tendance", label: "Courbe de tendance", desc: "« Courbe de tendance » activée : régression linéaire en pointillés par-dessus les barres.", spec: { data: "annee", viz: "bar", settings: { ...anneeCommandes, showTrendline: true } } },
      { file: "13-triees-valeur-decroissante", label: "Triées par valeur", desc: "Tri = valeur décroissante sur 15 communes : les libellés d'axe X pivotent automatiquement quand ils ne tiennent plus à l'horizontale.", spec: { data: "lyon", viz: "bar", settings: { dimension: "Commune", metrics: ["Population"], sort: "value-desc" } } },
      { file: "14-sans-etiquettes-axes", label: "Sans étiquettes d'axes", desc: "Libellés et graduations des deux axes coupés, valeurs affichées à la place : la version « épurée » pour un tableau de bord.", spec: { data: "annee", viz: "bar", settings: { ...anneeCommandes, showValues: true, xShowTitle: false, yShowTitle: false, xAxisEnabled: false, yAxisEnabled: false, xShowLine: false, yShowLine: false } } },
      { file: "15-avec-titres-axes", label: "Titres d'axes personnalisés", desc: "Titres d'axes saisis à la main (« Exercice » / « Nombre de commandes ») au lieu du nom de colonne.", spec: { data: "annee", viz: "bar", settings: { ...anneeCommandes, xAxisTitle: "Exercice", yAxisTitle: "Nombre de commandes" } } },
      { file: "16-valeurs-compactes", label: "Valeurs compactes", desc: "Mise en forme des étiquettes = « Compact » : 92 000 s'écrit 92 k. Utile quand les nombres sont longs.", spec: { data: "annee", viz: "bar", settings: { dimension: "Année", metrics: ["Revenu"], showValues: true, labelFormatting: "compact" } } },
      { file: "17-echelle-logarithmique", label: "Échelle logarithmique", desc: "Axe Y logarithmique : les petites communes redeviennent lisibles à côté de Lyon.", spec: { data: "lyon", viz: "bar", settings: { dimension: "Commune", metrics: ["Population"], sort: "value-desc", yScale: "log" } } },
      { file: "18-deux-mesures", label: "Deux mesures", desc: "Deux colonnes de valeurs (`Commandes` et `Revenu`) au lieu d'un éclatement : une série par mesure, sur le même axe.", spec: { data: "annee", viz: "bar", settings: { dimension: "Année", metrics: ["Commandes", "Revenu"] } } },
      { file: "19-couleurs-personnalisees", label: "Couleurs personnalisées", desc: "Couleur par série choisie dans la palette d'accents Metabase, au lieu de l'ordre par défaut.", spec: { data: "multi", viz: "bar", settings: { ...multiBreakout, stacking: "stacked", colors: { Électronique: "#7172AD", Vêtements: "#F2A86F", Maison: "#98D9D9" } } } },
    ],
  },
  {
    dir: "02-barres-horizontales",
    title: "Barres horizontales",
    intro: "Le même graphique couché : les catégories descendent le long de l'axe Y, ce qui laisse la place à des libellés longs.",
    data: "`Pays, Catégorie, Ventes`, éclaté par catégorie ; les deux dernières utilisent les 15 communes du Grand Lyon.",
    shots: [
      { file: "01-defaut", label: "Défaut", desc: "Barres groupées horizontalement, légende visible, pas de valeurs.", spec: { data: "multi", viz: "row", settings: multiBreakout } },
      { file: "02-avec-valeurs", label: "Avec valeurs", desc: "Valeurs écrites au bout de chaque barre.", spec: { data: "multi", viz: "row", settings: { ...multiBreakout, showValues: true } } },
      { file: "03-empilees", label: "Empilées", desc: "Empilement = « Empiler » : une barre par pays, segmentée par catégorie.", spec: { data: "multi", viz: "row", settings: { ...multiBreakout, stacking: "stacked" } } },
      { file: "04-empilees-avec-valeurs", label: "Empilées + valeurs", desc: "Empilé, valeurs écrites dans les segments.", spec: { data: "multi", viz: "row", settings: { ...multiBreakout, stacking: "stacked", showValues: true } } },
      { file: "05-empilees-100", label: "Empilées 100 %", desc: "Empilement = « 100 % » : toutes les barres font la même longueur, l'axe est en pourcentage.", spec: { data: "multi", viz: "row", settings: { ...multiBreakout, stacking: "normalized" } } },
      { file: "06-empilees-100-avec-valeurs", label: "Empilées 100 % + valeurs", desc: "Idem, avec le pourcentage dans chaque segment.", spec: { data: "multi", viz: "row", settings: { ...multiBreakout, stacking: "normalized", showValues: true } } },
      { file: "07-sans-legende", label: "Sans légende", desc: "Empilé sans légende.", spec: { data: "multi", viz: "row", settings: { ...multiBreakout, stacking: "stacked", showLegend: false } } },
      { file: "08-serie-unique-triee", label: "Série unique triée", desc: "Un classement : une mesure, tri par valeur décroissante, libellés à gauche.", spec: { data: "lyon", viz: "row", settings: { dimension: "Commune", metrics: ["Population"], sort: "value-desc" } } },
      { file: "09-sans-etiquettes-axes", label: "Sans étiquettes de valeurs", desc: "Graduations de l'axe des valeurs coupées, valeurs écrites au bout des barres.", spec: { data: "lyon", viz: "row", settings: { dimension: "Commune", metrics: ["Population"], sort: "value-desc", showValues: true, yAxisEnabled: false, yShowLine: false, yShowTitle: false } } },
    ],
  },
  {
    dir: "03-courbe",
    title: "Courbe",
    intro: "La courbe, sur un vrai axe temporel. Les variations portent surtout sur la forme du trait, les points, les axes et les repères (objectif, tendance).",
    data: "`Date, Visiteurs, Conversions` — 12 mois de 2023.",
    shots: [
      { file: "01-defaut", label: "Défaut", desc: "Deux séries, trait droit, points visibles, légende en haut.", spec: { data: "dates", viz: "line", settings: {} } },
      { file: "02-avec-valeurs", label: "Avec valeurs", desc: "Valeur écrite au-dessus de chaque point.", spec: { data: "dates", viz: "line", settings: { showValues: true } } },
      { file: "03-sans-legende", label: "Sans légende", desc: "Légende masquée.", spec: { data: "dates", viz: "line", settings: { showLegend: false } } },
      { file: "04-lissee", label: "Ligne lissée", desc: "Forme de la ligne = « courbée » sur les deux séries.", spec: { data: "dates", viz: "line", settings: { series: { Visiteurs: { lineShape: "curved" }, Conversions: { lineShape: "curved" } } } } },
      { file: "05-en-escalier", label: "En escalier", desc: "Forme de la ligne = « en escalier » : la valeur tient jusqu'au point suivant.", spec: { data: "dates", viz: "line", settings: { series: { Visiteurs: { lineShape: "stepped" }, Conversions: { lineShape: "stepped" } } } } },
      { file: "06-pointillee", label: "Pointillée", desc: "Style de ligne = « tirets », par exemple pour une série prévisionnelle.", spec: { data: "dates", viz: "line", settings: { series: { Visiteurs: { lineDash: "dashed" }, Conversions: { lineDash: "dotted" } } } } },
      { file: "07-sans-points", label: "Sans points", desc: "« Afficher les points sur les lignes » = désactivé : trait nu.", spec: { data: "dates", viz: "line", settings: { series: { Visiteurs: { markers: "off" }, Conversions: { markers: "off" } } } } },
      { file: "08-ligne-epaisse", label: "Ligne épaisse", desc: "Taille de ligne = L sur la série principale, S sur la secondaire : la hiérarchie se lit tout de suite.", spec: { data: "dates", viz: "line", settings: { series: { Visiteurs: { lineSize: "L" }, Conversions: { lineSize: "S" } } } } },
      { file: "09-deux-axes-y", label: "Deux axes Y", desc: "`Conversions` renvoyée sur l'axe de droite : deux ordres de grandeur cohabitent sans écraser l'un des deux.", spec: { data: "dates", viz: "line", settings: { series: { Conversions: { axis: "right" } } } } },
      { file: "10-serie-unique", label: "Série unique", desc: "Une seule mesure : plus de légende, le nom de la série passe en titre d'axe Y.", spec: { data: "dates", viz: "line", settings: { metrics: ["Visiteurs"] } } },
      { file: "11-avec-ligne-objectif", label: "Ligne d'objectif", desc: "Objectif à 2 000 visiteurs : ligne pointillée étiquetée.", spec: { data: "dates", viz: "line", settings: { metrics: ["Visiteurs"], goalValue: 2000 } } },
      { file: "12-avec-courbe-tendance", label: "Courbe de tendance", desc: "Régression linéaire ajoutée en pointillés à la couleur de la série.", spec: { data: "dates", viz: "line", settings: { metrics: ["Visiteurs"], showTrendline: true } } },
      { file: "13-sans-etiquettes-axes", label: "Sans étiquettes d'axes", desc: "Axes muets : il ne reste que la forme de la courbe (usage type sparkline agrandie).", spec: { data: "dates", viz: "line", settings: { metrics: ["Visiteurs"], xAxisEnabled: false, yAxisEnabled: false, xShowTitle: false, yShowTitle: false, xShowLine: false, yShowLine: false } } },
      { file: "14-valeurs-compactes", label: "Valeurs compactes", desc: "Valeurs affichées en notation compacte (2,5 k au lieu de 2 510).", spec: { data: "dates", viz: "line", settings: { metrics: ["Visiteurs"], showValues: true, labelFormatting: "compact" } } },
    ],
  },
  {
    dir: "04-aire",
    title: "Aire",
    intro: "L'aire est une courbe remplie : elle sert surtout à montrer une composition dans le temps. C'est là que l'empilement 100 % prend tout son sens.",
    data: "`Mois, Canal, Sessions` — 6 mois × 3 canaux d'acquisition, éclaté par canal ; la dernière capture utilise `Pays, Catégorie, Ventes`.",
    shots: [
      { file: "01-defaut", label: "Défaut", desc: "Aires superposées (non empilées), remplissage à 30 % d'opacité : les séries se masquent partiellement.", spec: { data: "csv:canaux", viz: "area", settings: CANAUX } },
      { file: "02-empilee", label: "Empilée", desc: "Empilement = « Empiler » : les aires s'additionnent, le haut de la pile donne le total des sessions.", spec: { data: "csv:canaux", viz: "area", settings: { ...CANAUX, stacking: "stacked" } } },
      { file: "03-empilee-100", label: "Empilée 100 %", desc: "Empilement = « 100 % » : la surface est pleine et on lit l'évolution des parts — ici le social qui grignote la recherche.", spec: { data: "csv:canaux", viz: "area", settings: { ...CANAUX, stacking: "normalized" } } },
      { file: "04-empilee-avec-valeurs", label: "Empilée + valeurs", desc: "Empilé avec les valeurs écrites dans les bandes.", spec: { data: "csv:canaux", viz: "area", settings: { ...CANAUX, stacking: "stacked", showValues: true } } },
      { file: "05-empilee-100-avec-valeurs", label: "Empilée 100 % + valeurs", desc: "Même graphique en 100 %, avec le pourcentage dans chaque bande.", spec: { data: "csv:canaux", viz: "area", settings: { ...CANAUX, stacking: "normalized", showValues: true } } },
      { file: "06-sans-legende", label: "Sans légende", desc: "Empilé, légende masquée.", spec: { data: "csv:canaux", viz: "area", settings: { ...CANAUX, stacking: "stacked", showLegend: false } } },
      { file: "07-lissee", label: "Lissée", desc: "Aires empilées à contour courbé.", spec: { data: "csv:canaux", viz: "area", settings: { ...CANAUX, stacking: "stacked", series: { Recherche: { lineShape: "curved" }, Direct: { lineShape: "curved" }, Social: { lineShape: "curved" } } } } },
      { file: "08-remplissage-opaque", label: "Remplissage opaque", desc: "Opacité = « opaque » : aplats pleins, contraste maximal.", spec: { data: "csv:canaux", viz: "area", settings: { ...CANAUX, stacking: "stacked", series: { Recherche: { areaOpacity: "opaque" }, Direct: { areaOpacity: "opaque" }, Social: { areaOpacity: "opaque" } } } } },
      { file: "09-remplissage-transparent", label: "Remplissage transparent", desc: "Opacité = « transparent » sur des aires non empilées : le remplissage n'est qu'un rappel, le trait domine.", spec: { data: "csv:canaux", viz: "area", settings: { ...CANAUX, series: { Recherche: { areaOpacity: "transparent" }, Direct: { areaOpacity: "transparent" }, Social: { areaOpacity: "transparent" } } } } },
      { file: "10-axe-categoriel", label: "Axe catégoriel", desc: "L'aire ne sert pas qu'au temps : mêmes réglages sur un axe de catégories (ventes par pays, empilées par catégorie de produit).", spec: { data: "multi", viz: "area", settings: { ...multiBreakout, stacking: "stacked" } } },
    ],
  },
  {
    dir: "05-combine",
    title: "Combiné (barres + courbe)",
    intro: "Le graphique composé : la première mesure en barres, les suivantes en courbe. C'est le format « réalisé vs objectif » ou « volume vs taux ».",
    data: "`Année, Commandes, Revenu` (5 ans) et un jeu trimestriel `Ventes, Retours, Objectif`.",
    shots: [
      { file: "01-defaut", label: "Défaut", desc: "1ʳᵉ mesure en barres, 2ᵉ en courbe, même axe Y — les deux échelles s'écrasent, d'où la variante suivante.", spec: { data: "annee", viz: "combo", settings: { dimension: "Année", metrics: ["Commandes", "Revenu"] } } },
      { file: "02-deux-axes-y", label: "Deux axes Y", desc: "`Revenu` basculé sur l'axe de droite : c'est le réglage à privilégier dès que les ordres de grandeur diffèrent.", spec: { data: "annee", viz: "combo", settings: { dimension: "Année", metrics: ["Commandes", "Revenu"], series: { Revenu: { axis: "right" } } } } },
      { file: "03-avec-valeurs", label: "Avec valeurs", desc: "Deux axes + valeurs affichées sur les barres et sur les points.", spec: { data: "annee", viz: "combo", settings: { dimension: "Année", metrics: ["Commandes", "Revenu"], series: { Revenu: { axis: "right" } }, showValues: true, labelFormatting: "compact" } } },
      { file: "04-sans-legende", label: "Sans légende", desc: "Deux axes, légende masquée.", spec: { data: "annee", viz: "combo", settings: { dimension: "Année", metrics: ["Commandes", "Revenu"], series: { Revenu: { axis: "right" } }, showLegend: false } } },
      { file: "05-courbe-lissee", label: "Courbe lissée", desc: "La série en courbe est lissée et ses points masqués : elle se lit comme une tendance.", spec: { data: "annee", viz: "combo", settings: { dimension: "Année", metrics: ["Commandes", "Revenu"], series: { Revenu: { axis: "right", lineShape: "curved", markers: "off" } } } } },
      { file: "06-inverse", label: "Rôles inversés", desc: "Type d'affichage forcé par série : `Revenu` en barres, `Commandes` en courbe.", spec: { data: "annee", viz: "combo", settings: { dimension: "Année", metrics: ["Commandes", "Revenu"], series: { Commandes: { display: "line", axis: "right" }, Revenu: { display: "bar" } } } } },
      { file: "07-avec-objectif", label: "Ligne d'objectif", desc: "Combiné plus une ligne d'objectif à 250 commandes.", spec: { data: "annee", viz: "combo", settings: { dimension: "Année", metrics: ["Commandes", "Revenu"], series: { Revenu: { axis: "right" } }, goalValue: 250 } } },
      { file: "08-trois-mesures", label: "Trois mesures", desc: "Trois séries : `Ventes` en barres, `Retours` et `Objectif` en courbes.", spec: { data: "csv:combo3", viz: "combo", settings: { dimension: "Trimestre", metrics: ["Ventes", "Retours", "Objectif"] } } },
      { file: "09-barres-empilees-plus-courbe", label: "Barres empilées + courbe", desc: "Empilement activé : seules les barres s'empilent, la courbe `Objectif` reste posée par-dessus.", spec: { data: "csv:combo3", viz: "combo", settings: { dimension: "Trimestre", metrics: ["Ventes", "Retours", "Objectif"], stacking: "stacked", series: { Ventes: { display: "bar" }, Retours: { display: "bar" }, Objectif: { display: "line" } } } } },
      { file: "10-aire-plus-barres", label: "Aire + barres", desc: "Type d'affichage par série poussé plus loin : une aire derrière, des barres devant.", spec: { data: "csv:combo3", viz: "combo", settings: { dimension: "Trimestre", metrics: ["Ventes", "Objectif"], series: { Ventes: { display: "bar" }, Objectif: { display: "area" } } } } },
    ],
  },
  {
    dir: "06-camembert",
    title: "Camembert",
    intro:
      "Le camembert et sa version anneau (donut). Ici tout se joue sur les étiquettes : pourcentage, valeur absolue, les deux, dans la légende, ou rien du tout.",
    data: "`Pays, Catégorie, Ventes` — somme des ventes par pays (5 parts).",
    shots: [
      { file: "01-anneau-defaut", label: "Anneau (défaut)", desc: "Réglages par défaut : anneau, total au centre, légende à droite, aucune étiquette sur les parts.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays" }, ...PIE } },
      { file: "02-camembert-plein", label: "Camembert plein", desc: "« Anneau (donut) » désactivé : disque plein, donc plus de total au centre.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays", pieDonut: false }, ...PIE } },
      { file: "03-pourcentages-sur-le-graphique", label: "Pourcentages sur le graphique", desc: "Pourcentages = « Sur le graphique » : chaque part porte sa part du total.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays", pieShowPercent: "chart" }, ...PIE } },
      { file: "04-etiquettes-nom-et-pourcentage", label: "Nom + pourcentage", desc: "Affichage des étiquettes = « Visible », format = pourcentage : le nom de la part et sa part sont écrits en dehors du disque.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays", pieLabelDisplay: "on", pieValueFormat: "percent" }, ...PIE } },
      { file: "05-etiquettes-valeurs-absolues", label: "Valeurs absolues", desc: "Format des valeurs = « Valeur » : on lit les ventes en unités, pas en parts.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays", pieLabelDisplay: "on", pieValueFormat: "value" }, ...PIE } },
      { file: "06-etiquettes-valeur-et-pourcentage", label: "Valeur + pourcentage", desc: "Format des valeurs = « Valeur + % » : les deux lectures d'un coup.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays", pieLabelDisplay: "on", pieValueFormat: "both" }, ...PIE } },
      { file: "07-pourcentages-dans-la-legende", label: "Pourcentages dans la légende", desc: "Pourcentages = « Dans la légende » : le disque reste net, les chiffres passent à droite.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays", pieShowPercent: "legend" }, ...PIE } },
      { file: "08-pourcentages-partout", label: "Pourcentages partout", desc: "Pourcentages = « Les deux » : sur les parts et dans la légende.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays", pieShowPercent: "both" }, ...PIE } },
      { file: "09-sans-etiquettes", label: "Sans étiquettes", desc: "Affichage des étiquettes = « Masqué » : ni pourcentage, ni total central — la lecture passe uniquement par la légende.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays", pieLabelDisplay: "off" }, ...PIE } },
      { file: "10-sans-legende", label: "Sans légende", desc: "Légende masquée : l'anneau se recentre et les étiquettes portent les noms.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays", showLegend: false, pieLabelDisplay: "on", pieValueFormat: "both" }, ...PIE } },
      { file: "11-sans-total-au-centre", label: "Sans total au centre", desc: "« Afficher le total au centre » désactivé : l'anneau garde son trou, mais vide.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays", pieShowTotal: false }, ...PIE } },
      { file: "12-deux-anneaux", label: "Deux anneaux", desc: "Anneau intérieur = `Pays`, anneau extérieur = `Catégorie` : la décomposition à deux niveaux.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays", innerRing: "Pays", outerRing: "Catégorie" }, ...PIE } },
      { file: "13-trie-par-valeur", label: "Trié par valeur", desc: "Tri par valeur décroissante : les parts partent de la plus grosse.", spec: { data: "multi", viz: "pie", settings: { dimension: "Pays", sort: "value-desc", pieShowPercent: "legend" }, ...PIE } },
    ],
  },
  {
    dir: "07-nombre",
    title: "Nombre (chiffre clé)",
    intro:
      "Le « Nombre » n'affiche qu'une valeur : tout se joue dans sa mise en forme (devise, pourcentage, décimales, préfixe/suffixe, couleur conditionnelle).",
    data: "`Année, Commandes, Revenu` résumé en une somme, sauf le pourcentage (un taux de conversion).",
    shots: [
      { file: "01-defaut", label: "Défaut", desc: "Somme du revenu, format par défaut : séparateur de milliers français, libellé de la mesure en dessous.", spec: { data: "annee", summarize: SUM_REVENU, viz: "scalar", settings: { scalarField: "sum_Revenu" }, ...SMALL } },
      { file: "02-format-devise", label: "Devise", desc: "Style = « Devise », symbole € affiché avec la valeur.", spec: { data: "annee", summarize: SUM_REVENU, viz: "scalar", settings: { scalarField: "sum_Revenu", numberFormat: { style: "currency", currency: "EUR", currencyStyle: "symbol", currencyPlacement: "cell" } }, ...SMALL } },
      { file: "03-devise-en-code", label: "Devise en code", desc: "Même chose avec le code ISO (EUR) au lieu du symbole.", spec: { data: "annee", summarize: SUM_REVENU, viz: "scalar", settings: { scalarField: "sum_Revenu", numberFormat: { style: "currency", currency: "EUR", currencyStyle: "code", currencyPlacement: "cell" } }, ...SMALL } },
      { file: "04-pourcentage", label: "Pourcentage", desc: "Style = « Pourcentage » sur un taux stocké en 0,0911 → affiché 9,11 %.", spec: { data: "csv:taux", viz: "scalar", settings: { scalarField: "Taux de conversion", numberFormat: { style: "percent", decimals: 2 } }, ...SMALL } },
      { file: "05-deux-decimales", label: "Deux décimales", desc: "« Nombre de décimales » = 2 : le chiffre est figé au centime près.", spec: { data: "annee", summarize: SUM_REVENU, viz: "scalar", settings: { scalarField: "sum_Revenu", numberFormat: { decimals: 2 } }, ...SMALL } },
      { file: "06-prefixe-suffixe", label: "Préfixe / suffixe", desc: "Préfixe « ≈ » et suffixe « € HT » ajoutés autour de la valeur.", spec: { data: "annee", summarize: SUM_REVENU, viz: "scalar", settings: { scalarField: "sum_Revenu", numberFormat: { prefix: "≈ ", suffix: " € HT" } }, ...SMALL } },
      { file: "07-multiplie-par", label: "Multiplié par", desc: "« Multiplier par » 0,001 et suffixe « k€ » : la même donnée exprimée en milliers.", spec: { data: "annee", summarize: SUM_REVENU, viz: "scalar", settings: { scalarField: "sum_Revenu", numberFormat: { multiplyBy: 0.001, decimals: 1, suffix: " k€" } }, ...SMALL } },
      { file: "08-separateur-anglo-saxon", label: "Séparateur anglo-saxon", desc: "Style de séparateur = 100,000.00 au lieu de 100 000,00.", spec: { data: "annee", summarize: SUM_REVENU, viz: "scalar", settings: { scalarField: "sum_Revenu", numberFormat: { separator: "comma-dot" } }, ...SMALL } },
      { file: "09-notation-scientifique", label: "Notation scientifique", desc: "Style = « Scientifique » : 2,97e+5.", spec: { data: "annee", summarize: SUM_REVENU, viz: "scalar", settings: { scalarField: "sum_Revenu", numberFormat: { style: "scientific", decimals: 2 } }, ...SMALL } },
      { file: "10-couleur-conditionnelle", label: "Couleur conditionnelle", desc: "Règle « > 200 000 → vert » : le chiffre change de couleur quand le seuil est franchi.", spec: { data: "annee", summarize: SUM_REVENU, viz: "scalar", settings: { scalarField: "sum_Revenu", colorRules: [{ operator: ">", value: 200000, color: "#88BF4D" }] }, ...SMALL } },
      { file: "11-couleur-conditionnelle-alerte", label: "Couleur conditionnelle (alerte)", desc: "Même règle, seuil relevé à 500 000 : la valeur passe sous le seuil et vire au rouge.", spec: { data: "annee", summarize: SUM_REVENU, viz: "scalar", settings: { scalarField: "sum_Revenu", colorRules: [{ operator: "<", value: 500000, color: "#EF8C8C" }] }, ...SMALL } },
    ],
  },
  {
    dir: "08-tendance",
    title: "Tendance (smart scalar)",
    intro: "La dernière valeur d'une série, comparée à quelque chose : la valeur précédente, la première, la moyenne — ou les trois à la fois.",
    data: "`Date, Visiteurs, Conversions` (12 mois), plus deux séries dédiées : abonnés en baisse et revenus mensuels.",
    shots: [
      { file: "01-defaut", label: "Défaut", desc: "Dernière valeur et écart en % vs la valeur précédente, flèche verte car en hausse.", spec: { data: "dates", viz: "smartscalar", settings: { metrics: ["Visiteurs"] }, ...SMALL } },
      { file: "02-vs-premiere-valeur", label: "vs première valeur", desc: "Comparaison = « première valeur » : l'écart depuis le début de la série.", spec: { data: "dates", viz: "smartscalar", settings: { metrics: ["Visiteurs"], comparisons: ["first"] }, ...SMALL } },
      { file: "03-vs-moyenne", label: "vs moyenne", desc: "Comparaison = « moyenne de la série ».", spec: { data: "dates", viz: "smartscalar", settings: { metrics: ["Visiteurs"], comparisons: ["average"] }, ...SMALL } },
      { file: "04-trois-comparaisons", label: "Trois comparaisons", desc: "Les trois comparaisons empilées sous le chiffre.", spec: { data: "dates", viz: "smartscalar", settings: { metrics: ["Visiteurs"], comparisons: ["previous", "first", "average"] }, ...SMALL } },
      { file: "05-avec-valeur-de-comparaison", label: "Avec valeur de référence", desc: "« Afficher la valeur de comparaison » : la base du calcul est rappelée entre parenthèses.", spec: { data: "dates", viz: "smartscalar", settings: { metrics: ["Visiteurs"], comparisons: ["previous", "first"], showValues: true }, ...SMALL } },
      { file: "06-tendance-a-la-baisse", label: "Tendance à la baisse", desc: "Série décroissante : flèche rouge vers le bas.", spec: { data: "csv:baisse", viz: "smartscalar", settings: { metrics: ["Abonnés"], comparisons: ["previous", "first"], showValues: true }, ...SMALL } },
      { file: "07-format-devise", label: "Format devise", desc: "Même viz avec un format monétaire appliqué au chiffre et à la valeur de référence.", spec: { data: "csv:revenus", viz: "smartscalar", settings: { metrics: ["Revenu"], comparisons: ["previous", "average"], showValues: true, numberFormat: { style: "currency", currency: "EUR", currencyStyle: "symbol", currencyPlacement: "cell", decimals: 0 } }, ...SMALL } },
    ],
  },
  {
    dir: "09-cascade",
    title: "Cascade (waterfall)",
    intro: "La cascade décompose un écart : chaque barre part de là où la précédente s'est arrêtée, en vert si elle ajoute, en rouge si elle retire.",
    data: "`Poste, Montant` — un pont de chiffre d'affaires avec des postes positifs et négatifs.",
    shots: [
      { file: "01-defaut", label: "Défaut", desc: "Colonne de total finale incluse, couleurs par défaut.", spec: { data: "csv:cascade", viz: "waterfall", settings: { dimension: "Poste", metrics: ["Montant"] } } },
      { file: "02-avec-valeurs", label: "Avec valeurs", desc: "Montant de chaque marche écrit au-dessus de la barre.", spec: { data: "csv:cascade", viz: "waterfall", settings: { dimension: "Poste", metrics: ["Montant"], showValues: true } } },
      { file: "03-sans-colonne-total", label: "Sans colonne de total", desc: "« Afficher la colonne de total » désactivé : il ne reste que les mouvements.", spec: { data: "csv:cascade", viz: "waterfall", settings: { dimension: "Poste", metrics: ["Montant"], showTotalColumn: false, showValues: true } } },
      { file: "04-couleurs-personnalisees", label: "Couleurs personnalisées", desc: "Couleurs « Augmentation » / « Diminution » remplacées par le bleu et le violet de la palette.", spec: { data: "csv:cascade", viz: "waterfall", settings: { dimension: "Poste", metrics: ["Montant"], increaseColor: "#509EE3", decreaseColor: "#A989C5", showValues: true } } },
      { file: "05-valeurs-compactes", label: "Valeurs compactes", desc: "Étiquettes en notation compacte et titres d'axes personnalisés.", spec: { data: "csv:cascade", viz: "waterfall", settings: { dimension: "Poste", metrics: ["Montant"], showValues: true, labelFormatting: "compact", xAxisTitle: "Poste", yAxisTitle: "Chiffre d'affaires (€)" } } },
    ],
  },
  {
    dir: "10-jauge",
    title: "Jauge",
    intro: "Une valeur unique replacée sur une échelle : soit un simple arc de progression vers un objectif, soit des plages colorées avec aiguille.",
    data: "`Indicateur, Satisfaction` — une seule ligne.",
    shots: [
      { file: "01-defaut", label: "Défaut", desc: "Arc de progression bleu jusqu'à l'objectif (100).", spec: { data: "csv:jauge", viz: "gauge", settings: { metrics: ["Satisfaction"], goalValue: 100 }, ...GAUGE } },
      { file: "02-avec-plages-colorees", label: "Plages colorées", desc: "Trois plages (rouge / jaune / vert) et une aiguille, comme un feu tricolore.", spec: { data: "csv:jauge", viz: "gauge", settings: { metrics: ["Satisfaction"], gaugeRanges: [{ color: "#EF8C8C", label: "Faible", min: 0, max: 40 }, { color: "#F9D45C", label: "Moyen", min: 40, max: 70 }, { color: "#88BF4D", label: "Bon", min: 70, max: 100 }] }, ...GAUGE } },
      { file: "03-avec-suffixe", label: "Avec suffixe", desc: "Mise en forme du nombre : suffixe « /100 » ajouté sous l'aiguille.", spec: { data: "csv:jauge", viz: "gauge", settings: { metrics: ["Satisfaction"], gaugeRanges: [{ color: "#EF8C8C", label: "Faible", min: 0, max: 40 }, { color: "#F9D45C", label: "Moyen", min: 40, max: 70 }, { color: "#88BF4D", label: "Bon", min: 70, max: 100 }], numberFormat: { suffix: " /100" } }, ...GAUGE } },
    ],
  },
  {
    dir: "11-progression",
    title: "Progression",
    intro: "Une barre valeur / objectif avec le pourcentage d'atteinte écrit au-dessus.",
    data: "`Indicateur, Ventes` — une seule ligne.",
    shots: [
      { file: "01-defaut", label: "Défaut", desc: "7 400 sur un objectif de 10 000 : la barre est remplie à 74 %.", spec: { data: "csv:progression", viz: "progress", settings: { metrics: ["Ventes"], goalValue: 10000 }, ...SMALL } },
      { file: "02-objectif-depasse", label: "Objectif dépassé", desc: "Valeur au-delà de l'objectif : la barre est pleine et le pourcentage plafonne à 100 %.", spec: { data: "csv:progressionDepassee", viz: "progress", settings: { metrics: ["Ventes"], goalValue: 10000 }, ...SMALL } },
      { file: "03-couleur-et-devise", label: "Couleur + devise", desc: "Couleur de la barre changée et valeurs formatées en euros.", spec: { data: "csv:progression", viz: "progress", settings: { metrics: ["Ventes"], goalValue: 10000, colors: { Ventes: "#88BF4D" }, numberFormat: { style: "currency", currency: "EUR", currencyStyle: "symbol", currencyPlacement: "cell", decimals: 0 } }, ...SMALL } },
    ],
  },
  {
    dir: "12-nuage-de-points",
    title: "Nuage de points",
    intro: "Deux mesures croisées, une ligne = un point. Avec un 3ᵉ champ, les points deviennent des bulles.",
    data: "`Commune, Population, Equipements` — 15 communes du Grand Lyon.",
    shots: [
      { file: "01-defaut", label: "Défaut", desc: "Population en X, équipements en Y, points de taille fixe.", spec: { data: "lyon", viz: "scatter", settings: { metrics: ["Population", "Equipements"] } } },
      { file: "02-avec-etiquettes", label: "Avec étiquettes", desc: "« Afficher les étiquettes des points » : chaque point porte le nom de sa commune.", spec: { data: "lyon", viz: "scatter", settings: { metrics: ["Population", "Equipements"], scatterShowLabels: true } } },
      { file: "03-bulles", label: "Bulles", desc: "« Taille des bulles » branchée sur `Equipements` : le rayon porte une 3ᵉ information.", spec: { data: "lyon", viz: "scatter", settings: { metrics: ["Population", "Equipements"], bubbleField: "Equipements" } } },
      { file: "04-echelle-log", label: "Échelle logarithmique", desc: "Axe Y logarithmique, pour écraser l'écart entre Lyon et les petites communes.", spec: { data: "lyon", viz: "scatter", settings: { metrics: ["Population", "Equipements"], yScale: "log", scatterShowLabels: true } } },
      { file: "05-sans-etiquettes-axes", label: "Sans étiquettes d'axes", desc: "Graduations coupées : il ne reste que le motif du nuage.", spec: { data: "lyon", viz: "scatter", settings: { metrics: ["Population", "Equipements"], xAxisEnabled: false, yAxisEnabled: false, xShowTitle: false, yShowTitle: false } } },
    ],
  },
];

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
  await writeIndexReadme(groups);
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
