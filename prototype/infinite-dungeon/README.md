# StepQuest: Infinite Dungeon (prototype)

Roguelite fantasy mobile, nom de travail. Jeu indépendant de Dragonbound II / Ardael :
aucun fichier de `prototype/dragonbound2/`, `prototype/dragonbound/` ni `prototype/dragonbound-tests/` n'est modifié.
Le plan complet (audit, architecture, MVP) est dans le document « Infinite Dungeon — Audit et plan (phase 1) ».

## État

| Étape | Contenu | État |
| --- | --- | --- |
| 1 | Squelette, écran d'accueil, liste des assets, tests, mise en ligne | Fait |
| 2 | Données et moteur de combat sans interface | À faire |
| 3 | Vue de combat, sélection d'équipe | À faire |
| 4 | Boucle minimale : étage 1 → combat → récompense → sauvegarde → étage 2 | À faire |

Les boutons « Nouvelle expédition » et « Le camp » sont volontairement désactivés et indiquent l'étape où ils arrivent.

## Adresse

Publié avec le reste du site : `https://maxlolfr.github.io/<dépôt>/infinite-dungeon/`.
Ajouter `?debug` à l'adresse affiche la taille d'écran et la liste des fichiers manquants.

## Assets

Rien n'est copié. Toutes les images, sons et polices sont lus dans les dossiers voisins
(`../dragonbound2/`, `../dragonbound/`) et listés dans un seul fichier : `js/ui/assets.js`.
Les proportions des sprites viennent de Dragonbound II via `tools/sync-sprite-metrics.mjs`
(lecture seule) qui régénère `js/data/sprite-metrics.js`.

## Sauvegarde

Toutes les clés commencent par `sqid.` (pour l'instant `sqid.settings.v1`, le son).
Les sauvegardes des autres jeux du site ne sont jamais lues ni écrites.

## Tests

Depuis `prototype/infinite-dungeon/` :

```bash
node --test tests/*.test.js                 # chemins d'assets, réglages (Node 22, aucune dépendance)
NODE_PATH=$(npm root -g) node tests/smoke.js   # navigateur, tailles iPhone (Playwright + Chromium)
```

Le workflow `.github/workflows/infinite-dungeon.yml` lance les deux à chaque modification de ce dossier,
et aussi quand Dragonbound II change, pour détecter une image renommée ou supprimée.

## Lancer en local

Les modules JavaScript ne s'ouvrent pas en double-cliquant le fichier. Depuis `prototype/` :

```bash
python3 -m http.server 8000   # puis http://localhost:8000/infinite-dungeon/
```

## Organisation

```
index.html, style.css
js/main.js              démarrage
js/config.js            nom et version (un seul endroit)
js/data/                données pures (sprite-metrics.js généré)
js/save/settings.js     réglages, stockage protégé
js/ui/assets.js         liste unique des fichiers utilisés
js/ui/loader.js         chargement, fichiers manquants
js/ui/sprites.js        dessin des sprites posés au sol
js/ui/audio.js          musique et sons (déverrouillés au premier toucher sur iOS)
js/ui/screens/title.js  écran d'accueil
tests/                  tests Node + test navigateur
tools/                  scripts de maintenance
```
