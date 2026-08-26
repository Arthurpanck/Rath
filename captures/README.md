# Captures de graphiques

Chaque sous-dossier correspond à un type de graphique ; à l'intérieur, un PNG par déclinaison
(avec / sans valeurs, avec / sans légende, empilé, 100 %, formats de nombres…).
Le `README.md` de chaque dossier décrit précisément ce qui change d'une image à l'autre.

Les images ne montrent que le graphique et sa légende : ni barre d'outils, ni panneau de réglages.

| Dossier | Type | Déclinaisons | Ce que couvrent les variations |
| --- | --- | --- | --- |
| [`01-barres/`](01-barres/README.md) | Barres | 19 | Le graphique en barres verticales. Les variations couvrent l'empilement (aucun / empilé / 100 %), l'affichage des valeurs, la légende, les étiquettes d'axes, le tri, l'objectif et la courbe de tendance. |
| [`02-barres-horizontales/`](02-barres-horizontales/README.md) | Barres horizontales | 9 | Le même graphique couché : les catégories descendent le long de l'axe Y, ce qui laisse la place à des libellés longs. |
| [`03-courbe/`](03-courbe/README.md) | Courbe | 14 | La courbe, sur un vrai axe temporel. Les variations portent surtout sur la forme du trait, les points, les axes et les repères (objectif, tendance). |
| [`04-aire/`](04-aire/README.md) | Aire | 10 | L'aire est une courbe remplie : elle sert surtout à montrer une composition dans le temps. C'est là que l'empilement 100 % prend tout son sens. |
| [`05-combine/`](05-combine/README.md) | Combiné (barres + courbe) | 10 | Le graphique composé : la première mesure en barres, les suivantes en courbe. C'est le format « réalisé vs objectif » ou « volume vs taux ». |
| [`06-camembert/`](06-camembert/README.md) | Camembert | 13 | Le camembert et sa version anneau (donut). Ici tout se joue sur les étiquettes : pourcentage, valeur absolue, les deux, dans la légende, ou rien du tout. |
| [`07-nombre/`](07-nombre/README.md) | Nombre (chiffre clé) | 11 | Le « Nombre » n'affiche qu'une valeur : tout se joue dans sa mise en forme (devise, pourcentage, décimales, préfixe/suffixe, couleur conditionnelle). |
| [`08-tendance/`](08-tendance/README.md) | Tendance (smart scalar) | 7 | La dernière valeur d'une série, comparée à quelque chose : la valeur précédente, la première, la moyenne — ou les trois à la fois. |
| [`09-cascade/`](09-cascade/README.md) | Cascade (waterfall) | 5 | La cascade décompose un écart : chaque barre part de là où la précédente s'est arrêtée, en vert si elle ajoute, en rouge si elle retire. |
| [`10-jauge/`](10-jauge/README.md) | Jauge | 3 | Une valeur unique replacée sur une échelle : soit un simple arc de progression vers un objectif, soit des plages colorées avec aiguille. |
| [`11-progression/`](11-progression/README.md) | Progression | 3 | Une barre valeur / objectif avec le pourcentage d'atteinte écrit au-dessus. |
| [`12-nuage-de-points/`](12-nuage-de-points/README.md) | Nuage de points | 5 | Deux mesures croisées, une ligne = un point. Avec un 3ᵉ champ, les points deviennent des bulles. |

**Total : 109 captures.**

## Régénérer

```bash
npm install
npm run dev            # sert l'application ET /shot.html sur le port 5175
node scripts/shots.mjs # relance toutes les captures
```

`SHOT_ONLY=06-camembert node scripts/shots.mjs` ne régénère qu'un dossier.

## Comment les captures sont produites

`shot.html` monte le composant `ChartCanvas` de l'application — même pipeline de données
(`data/csv.ts` → `data/query.ts` → `viz/frame.ts`) et mêmes options ECharts que dans l'écran
de création — sur une page nue. Le jeu de données, le type de graphique et les réglages
sont passés dans l'URL, et Playwright capture le seul cadre du graphique.
Le catalogue des variations est en tête de `scripts/shots.mjs`.

## Jeux de données utilisés

| Nom | Colonnes | Sert à |
| --- | --- | --- |
| `annee` | Année, Commandes, Revenu (5 lignes) | barres, combiné, chiffre clé |
| `dates` | Date, Visiteurs, Conversions (12 mois) | courbe, aire, tendance |
| `multi` | Pays, Catégorie, Ventes (15 lignes) | empilements, camembert |
| `lyon` | Commune, Population, Equipements (15 lignes) | tris, échelle log, nuage de points |
| CSV en ligne | cascade, trimestres, taux, jauge, progression… | cascade, jauge, progression, tendance |

Les quatre premiers sont les échantillons livrés avec l'application (`src/data/sample.ts`).