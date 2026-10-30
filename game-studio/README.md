# Game Studio AI — Infinite Dungeon

Prototype v0.1 du studio multi-agents, isolé du jeu existant.

## Architecture
- `web/`: tableau de bord mobile, statuts des agents, missions.
- `server/`: orchestrateur Node.js, API de missions et adaptateurs IA.
- `agents/`: rôles et règles de collaboration.
- `docs/`: architecture, sécurité et jalons.

## Démarrage local
```bash
cd game-studio/server
npm start
```
Ouvrir http://localhost:3000

## Statut réel
Le prototype permet de créer et suivre des missions locales en mémoire. Les appels aux modèles, la modification de code, les tests et la publication GitHub ne sont **pas encore branchés**. Aucun agent n'est présenté comme autonome avant la connexion de ses outils.

## Sécurité
Pas de clés API dans le navigateur ni dans Git. Ne pas publier ni fusionner sans validation humaine. Limiter les chemins modifiables, les commandes exécutables et les budgets par mission.
