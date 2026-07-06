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
cd apps/metabase-viz
yarn        # ou npm install
yarn dev    # http://localhost:5175
```

## Panneau de réglages (clic sur l'engrenage)

Comme dans Metabase, sélectionner un type puis cliquer sur l'engrenage ouvre le
panneau de réglages (sections **Données** / **Affichage** / **Couleurs**) :

- **Données** : colonne de l'axe X (dimension), séries (colonnes de valeurs).
- **Affichage** : empilement (aucun / empilé / 100 %), afficher les valeurs,
  afficher la légende, objectif (ligne d'objectif), titres des axes.
- **Couleurs** : couleur par série (palette d'accents Metabase).

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
Boîte à moustaches.
Rendus en React : Nombre, Tendance, Table, Visualisation détaillée.
Placeholders (non implémentés) : Carte, Tableau croisé dynamique, Sankey.

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
