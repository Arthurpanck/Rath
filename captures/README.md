# Captures de graphiques

Chaque sous-dossier correspond à un type de graphique ; à l'intérieur, un PNG par déclinaison
(avec / sans valeurs, avec / sans légende, empilé, 100 %, formats de nombres…).
Le `README.md` de chaque dossier décrit précisément ce qui change d'une image à l'autre.

Les images ne montrent que le graphique et sa légende : ni barre d'outils, ni panneau de réglages.

| Dossier | Type | Déclinaisons | Ce que couvrent les variations |
| --- | --- | --- | --- |
| [`06-camembert/`](06-camembert/README.md) | Camembert | 13 | Le camembert et sa version anneau (donut). Ici tout se joue sur les étiquettes : pourcentage, valeur absolue, les deux, dans la légende, ou rien du tout. |

**Total : 13 captures.**

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