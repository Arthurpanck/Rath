# metabase-viz

Reproduction autonome du **module de création de visualisation de Metabase** :
import CSV → sélection du type de graphique → rendu.

- **Zéro dépendance à Metabase.** Les paramètres visuels (palette de couleurs
  `accent0..7`, bleu de marque `#509EE3`, constantes `CHART_STYLE`, mise en page
  du sélecteur de graphiques) sont **reproduits** à partir du code source
  Metabase, puis réimplémentés ici sur **Apache ECharts**.
- **UI** : [Mantine](https://mantine.dev) (la librairie de composants qu'utilise
  Metabase), React 18, Vite.
- **Rendu des graphiques** : Apache ECharts (SVG).

## Lancer

```bash
npm install   # ou yarn
npm run dev   # http://localhost:5173
```

## Développement

```bash
npm test            # Vitest — la logique portée de Metabase (voir plus bas)
npm run lint        # ESLint
npm run format      # Prettier
npm run build       # typecheck + build de production
```

Les **tests** couvrent en priorité ce qui a été transféré de Metabase, parce que
ce sont des constantes empruntées : une mauvaise valeur ne lève aucune erreur,
le graphique cesse simplement de ressembler à celui de Metabase. Sont couverts
la rotation des libellés d'axe X, l'étiquetage deux passes du treemap, le
dimensionnement du camembert, le pipeline `buildFrame` et la matrice de
capacités. La suite est validée par mutation : modifier l'une des 14 constantes
reprises de Metabase la fait échouer.

## Panneau de réglages (clic sur l'engrenage)

Comme dans Metabase, sélectionner un type puis cliquer sur l'engrenage ouvre le
panneau de réglages (sections **Données** / **Affichage** / **Couleurs**) :

- **Données** : colonne de l'axe X (dimension), **éclatement par une 2ᵉ
  dimension** (breakout → une série par valeur), séries (colonnes de valeurs),
  **agrégation** (somme / moyenne / count / distinct / min / max) et **tri**
  (par dimension ou par valeur). Pour Sankey / Pivot / Carte : sélecteurs de
  champs dédiés (source-cible / lignes-colonnes / localisation).
- **Affichage** : empilement (aucun / empilé / 100 %), afficher les valeurs,
  afficher la légende, objectif (ligne d'objectif), titres des axes.
- **Couleurs** : couleur par série (palette d'accents Metabase).

## Agrégation & données

À l'import, les lignes partageant une même valeur de dimension sont regroupées
et agrégées (somme par défaut) — comme l'étape « Résumer » de Metabase. Le tri
et l'éclatement (breakout) sont appliqués dans le même pipeline (`viz/frame.ts`).

## Export

Le bouton de téléchargement (barre inférieure) exporte le graphique en **PNG**
ou **SVG** (vectoriel, via le moteur SVG d'ECharts) et les données en **CSV**.

## Axe temporel

Les colonnes de type date sont détectées à l'import et rendues sur un **vrai axe
temporel** ECharts, avec un pas de graduation choisi selon l'amplitude
(année / mois / jour / heure) et des libellés formatés en français.

## Types de graphiques

Le sélecteur reprend la liste et l'ordre de Metabase (`register.js`), avec la
séparation « graphiques pertinents » / « Autres graphiques » calculée par une
heuristique `isSensible` inspirée de Metabase.

Rendus via ECharts : Barres, Courbe, Aire, Combiné, Barres horizontales,
Nuage de points, Cascade, Camembert, Jauge, Progression, Entonnoir,
Boîte à moustaches, **Sankey**, **Carte** (choroplèthe monde).
Rendus en React : Nombre, Tendance, Table, Visualisation détaillée,
**Tableau croisé dynamique**.

La **Carte** utilise le GeoJSON `world.json` (fond de carte mondial issu de
Metabase) et colore les pays selon une métrique, avec correspondance par nom de
pays ou code ISO-A2.

## Structure

```
src/
  data/        parsing CSV + modèle de données (cols/rows façon Metabase)
  viz/
    registry.ts        liste des visualisations (id, nom FR, icône, isSensible)
    icons.tsx          icônes SVG façon Metabase
    options/           générateurs d'options ECharts (params dérivés de Metabase)
  components/  écran d'import, sélecteur, canvas, barre inférieure, layout
```
