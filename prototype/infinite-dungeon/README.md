# StepQuest: Infinite Dungeon (prototype)

Roguelite fantasy mobile, nom de travail. Jeu indépendant de Dragonbound II / Ardael :
aucun fichier de `prototype/dragonbound2/`, `prototype/dragonbound/` ni `prototype/dragonbound-tests/` n'est modifié.
Le plan complet (audit, architecture, MVP) est dans le document « Infinite Dungeon — Audit et plan (phase 1) ».

## État — version 0.3.1 « La Tour »

| Partie | Contenu | État |
| --- | --- | --- |
| Accueil, équipe | 3 héros parmi 5 (Aldric, Séléna, Orin, Lyra, Nyx), choix du point de départ | Fait |
| Moteur de combat | Automatique, déterministe, 2 compétences + passif + ultime par héros, éléments, états | Fait |
| Interventions | Ultimes (toucher le portrait), Garde, potion, plume de phénix, pause, vitesse ×1/×2/×4, mode AUTO (activé par défaut) | Fait |
| La Tour | 100 étages, 10 zones de 10 étages = les 10 chapitres de Dragonbound II (monstres, musique ; chaque niveau sert de décor à 2 étages) | Fait |
| Boss | 10 boss : une attaque annoncée un tour avant + un changement à mi-vie (muraille, ronces, rage, régénération, invocations protectrices, résurrection, intangibilité, double action) | Fait |
| Étages | 1 : deux combats · 5 et 9 : repos + marchand (+ élite) · autres : combat + coffre/événement/élite/marchand · 10 : boss | Fait |
| Élites | 8 affixes : enragé, épineux, spectral, doré, régénérant, vampirique, blindé, explosif | Fait |
| Événements | 11 (dont 6 nouveaux : forge, obélisque, parieur, aventurier gelé, autel de sang, bibliothèque) | Fait |
| Niveaux des héros | XP à chaque victoire, statistiques selon les courbes de Dragonbound II (niveau max 80) | Fait |
| Progression | Éclats sécurisés après chaque boss, retraite, départs aux étages 11, 21… 91 débloqués par les boss | Fait |
| Camp | 7 améliorations : vie, attaque/magie, défense, niveau de départ (10 niveaux chacune), or, potions, relances | Fait |
| Sauvegarde | Après chaque étape, copie de secours ; une expédition v0.2 ou v0.3.0 continue dans la Tour | Fait |
| Mode test | `?debug` : graine, étage 1-100, équipe, combat/élite/boss direct, éclats, export/import | Fait |
| Équilibrage | Simulé (`tools/simulate.mjs`), à confirmer en jouant | À régler |

### Règles de perte

| Ressource | Victoire (étage 100) | Retraite | Défaite |
| --- | --- | --- | --- |
| Or, équipement, reliques, niveaux, bonus | perdus | perdus | perdus |
| Éclats non sécurisés | 100 % + 100 | 100 % | 50 % |
| Éclats sécurisés (après chaque boss) | gardés | gardés | gardés |
| Améliorations du camp, départs débloqués | gardés | gardés | gardés |

Après une victoire, un héros tombé se relève avec 20 % de vie, les autres récupèrent 10 %.

### Points de départ

Battre le boss de l'étage 10 (20, 30… 90) permet de commencer les expéditions suivantes à l'étage 11 (21, 31… 91).
Pour compenser les étages sautés, l'équipe part avec des niveaux, de l'or, des potions, une arme rare,
une armure et une relique par zone sautée (4 au plus).

### Équilibrage simulé (v0.3.1, mode AUTO, à confirmer en jouant)

- Camp vide, départ à l'étage 1 : étage médian 30 ; le 1er boss (étage 10) tombe environ 9 fois sur 10.
- Joueur qui enchaîne les expéditions et améliore le camp : tour terminée en 25 expéditions environ (simulateur), plus en vrai.
- Sans mode AUTO ni intervention, la plupart des expéditions s'arrêtent au 1er boss.
- Soin de Séléna réduit (×1,3 au lieu de ×1,9), soin de groupe du Châtiment réduit, ultime 30 % sans bouclier.
  Les équipes avec Séléna restent les plus solides (étage médian ≈ 30 contre ≈ 22).

### Adaptations par rapport à Dragonbound II

Noms, rôles, passifs, compétences, ultimes, monstres (statistiques, traits, faiblesses), noms des zones et des niveaux,
décors et musiques viennent de Dragonbound II (`tools/sync-db2-data.mjs` régénère `js/data/db2-data.js`, en lecture seule).
Pour le combat automatique : 2 compétences par héros sur temps de recharge (au lieu de 3-4 sur mana),
une statistique de vitesse pour l'ordre des tours ; le niveau 1 ici correspond au niveau 8 de Dragonbound II.
Les statistiques et mécaniques des boss sont propres à ce jeu. Le niveau « Le pont d'étoiles » utilise un décor de Dragonbound 1.

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
node tools/simulate.mjs 300                 # équilibrage : 300 expéditions simulées (HEROES=1 : par héros)
CAMPAIGN=1 node tools/simulate.mjs 40       # 40 joueurs qui enchaînent les expéditions
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
