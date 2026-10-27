# StepQuest: Infinite Dungeon (prototype)

Roguelite fantasy mobile, nom de travail. Jeu indépendant de Dragonbound II / Ardael :
aucun fichier de `prototype/dragonbound2/`, `prototype/dragonbound/` ni `prototype/dragonbound-tests/` n'est modifié.
Le plan complet (audit, architecture, MVP) est dans le document « Infinite Dungeon — Audit et plan (phase 1) ».

## État — version 0.2 (prototype jouable)

| Partie | Contenu | État |
| --- | --- | --- |
| Accueil, équipe | 3 héros parmi 5 (Aldric, Séléna, Orin, Lyra, Nyx) | Fait |
| Moteur de combat | Automatique, déterministe, 2 compétences + passif + ultime par héros, éléments, états | Fait |
| Interventions | Ultimes (toucher le portrait), Garde, potion, plume de phénix, pause, vitesse ×1/×2/×4 | Fait |
| Donjon | 10 étages : combats, élites, coffres, repos, marchand, événements, Gardien (5), Roi des Os (10) | Fait |
| Récompenses | 3 cartes : soin, statistique, compétence, élément, équipement (3 raretés), relique (12) | Fait |
| Progression | Éclats, sécurisés à l'étage 5, retraite, camp à 4 améliorations | Fait |
| Sauvegarde | Après chaque étape, copie de secours, erreurs gérées | Fait |
| Mode test | `?debug` : graine, étage, équipe, combat direct, éclats, export/import | Fait |
| Équilibrage | Simulé (`node tools/simulate.mjs`), à confirmer en jouant | À régler |

### Règles de perte

| Ressource | Victoire | Retraite | Défaite |
| --- | --- | --- | --- |
| Or, équipement, reliques, bonus | perdus | perdus | perdus |
| Éclats non sécurisés | 100 % + 20 | 100 % | 50 % |
| Éclats sécurisés (étage 5) | gardés | gardés | gardés |
| Améliorations du camp | gardées | gardées | gardées |

Après une victoire, un héros tombé se relève avec 20 % de vie.

### Adaptations par rapport à Dragonbound II

Noms, rôles, passifs, compétences, ultimes, monstres, faiblesses et icônes viennent de Dragonbound II 1.9.11.
Pour le combat automatique : 2 compétences par héros sur temps de recharge (au lieu de 3-4 sur mana),
une statistique de vitesse pour l'ordre des tours, statistiques de départ au niveau 8.

## Adresse

Publié avec le reste du site : `https://maxlolfr.github.io/<dépôt>/infinite-dungeon/`.
Ajouter `?debug` à l'adresse affiche la taille d'écran et la liste des fichiers manquants.

## Assets

Rien n'est copié. Toutes les images, sons et polices sont lus dans les dossiers voisins
(`../dragonbound2/`, `../dragonbound/`) et listés dans un seul fichier : `js/ui/assets.js`.
Les proportions des sprites viennent de Dragonbound II via `tools/sync-sprite-metrics.mjs`
(lecture seule) qui régénère `js/data/sprite-metrics.js`.

## Sauvegarde

Toutes les clés commencent par `sqid.` : `sqid.save.v1` (partie), `sqid.save.bak` (copie de secours), `sqid.settings.v1` (son, vitesse).
Les sauvegardes des autres jeux du site ne sont jamais lues ni écrites.

## Tests

Depuis `prototype/infinite-dungeon/` :

```bash
node --test tests/*.test.js                 # moteur, donjon, récompenses, sauvegarde, assets (Node 22)
node tools/simulate.mjs 300                 # équilibrage : 300 expéditions simulées
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
js/save/settings.js     réglages (son, vitesse)
js/save/storage.js      sauvegarde versionnée + copie de secours
js/core/rng.js          hasard à graine (reproductible)
js/data/                héros, monstres, objets, équilibrage
js/engine/combat.js     moteur de combat pur (testable sans navigateur)
js/run/                 donjon, expédition, récompenses, camp
js/ui/app.js            enchaînement des écrans
js/ui/battle-view.js    dessin du combat
js/ui/screens/          écrans
js/ui/debug.js          mode test (?debug)
js/ui/assets.js         liste unique des fichiers utilisés
js/ui/loader.js         chargement, fichiers manquants
js/ui/sprites.js        dessin des sprites posés au sol
js/ui/audio.js          musique et sons (déverrouillés au premier toucher sur iOS)
js/ui/screens/title.js  écran d'accueil
tests/                  tests Node + test navigateur
tools/                  scripts de maintenance
```
