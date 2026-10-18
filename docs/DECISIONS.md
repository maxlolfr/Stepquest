# Journal des décisions — StepQuest

Chaque décision est datée. On ne revient pas dessus sans nouvelle entrée expliquant pourquoi.

| # | Date | Décision | Raison |
|---|------|----------|--------|
| D01 | 2026-10-18 | Application **séparée** (pas intégrée à Pépin pour l'instant). | Choix par défaut en attendant l'arbitrage du porteur du projet. Le domaine est isolé pour pouvoir être réutilisé dans Pépin plus tard. |
| D02 | 2026-10-18 | **iOS 16+**, **Android 8 (API 26)+**. | Couvre l'essentiel du parc. Health Connect est intégré au système à partir d'Android 14 ; en dessous, l'application Health Connect doit être installée depuis le Play Store. |
| D03 | 2026-10-18 | Gestion d'état : **Riverpod**. Base locale : **Drift (SQLite)**. | Testables, typés, largement utilisés. Versions exactes à vérifier sur pub.dev avant ajout (non accessible depuis l'environnement de développement actuel). |
| D04 | 2026-10-18 | Langues : **français et anglais** dès la V1. | Ajouter l'internationalisation plus tard coûte beaucoup plus cher. |
| D05 | 2026-10-18 | Périmètre V1 : M01, M02, M03, M05, M06 + **séries simples**. Badges complets (M04) et Premium (M07) reportés. Widget d'écran d'accueil reporté en V1.1. | Valider la rétention avant d'investir dans la gamification et le paiement. Le widget exige du code natif séparé. |
| D06 | 2026-10-18 | Le **domaine métier est en Dart pur**, sans dépendance à Flutter ni aux plugins. | Calculs testables et reproductibles, indépendants de l'interface et des plateformes. |
| D07 | 2026-10-18 | Source principale des pas : **les agrégats de la plateforme** (HealthKit statistics / Health Connect aggregate), qui dédupliquent déjà téléphone et montre. Le dédupliqueur interne sert de **filet de sécurité** quand on ne dispose que d'échantillons bruts. | Ne pas réinventer ce que le système fait mieux, tout en garantissant qu'on n'additionne jamais naïvement plusieurs sources. |
| D08 | 2026-10-18 | Un jour sans données est **« sans données »**, jamais « 0 pas ». Le jour en cours est **« en cours »**. | Critère d'acceptation M03. |
| D09 | 2026-10-18 | Les objectifs sont **historisés** : un jour passé est évalué avec l'objectif en vigueur ce jour-là. | Reproductibilité : changer son objectif aujourd'hui ne réécrit pas le passé. |
| D10 | 2026-10-18 | Semaine : **lundi → dimanche** (ISO) par défaut, configurable. | Norme en France ; les utilisateurs américains préfèrent le dimanche. |
