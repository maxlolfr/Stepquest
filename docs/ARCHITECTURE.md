# Architecture — StepQuest

## Couches

```
UI (features/*)            écrans, widgets, navigation          — Flutter
  │  lit des providers Riverpod
Application (app/*)        assemblage, providers, routage       — Flutter
  │
Domaine (domain/*)         règles métier, calculs               — Dart pur
  │  dépend uniquement d'interfaces
Données (data/*)           sources de pas, stockage local       — plugins natifs, Drift
```

Règle : une couche ne connaît que celle du dessous. Le domaine ne connaît ni Flutter ni les plugins.

## Structure des dossiers

```
lib/
  main.dart
  app/                      assemblage de l'application
  core/time/                LocalDate, fuseaux horaires
  domain/
    steps/                  échantillons, déduplication, agrégation par jour
    goals/                  objectif, historique des objectifs, progression
    history/                moyennes, tendances 7/30/90 jours
    streaks/                séries avec journées de grâce
    estimates/              distance, calories, unités
  data/
    sources/                StepDataSource (interface), démo, HealthKit/Health Connect (à venir)
    local/                  base Drift (à venir)
  features/                 écrans (à venir : dashboard, history, settings, onboarding)
test/                       même arborescence que lib/
docs/                       décisions, architecture, plan de tests
```

## Modèle de données (V1)

| Entité | Champs | Remarques |
|---|---|---|
| `StepSample` | début, fin (UTC), nombre de pas, source (id, type), id d'enregistrement | Donnée **brute** venant de la plateforme. Jamais modifiée. |
| `DailySteps` | date locale, pas (nullable), statut (`complete`, `inProgress`, `noData`), dernière mise à jour | Résumé **calculé**. Recalculable à tout moment depuis les échantillons. |
| `GoalChange` | date d'effet, objectif | L'historique des objectifs permet d'évaluer chaque jour avec le bon objectif. |
| `UserProfile` | taille (cm, optionnelle), poids (kg, optionnel), longueur de foulée (optionnelle), unités, début de semaine | Stocké localement uniquement. |
| `StreakSettings` | journées de grâce par semaine | 1 par défaut. |

Distinction brut / calculé : les `StepSample` ne sont jamais modifiés ; les `DailySteps` peuvent être effacés et régénérés. Une synchronisation répétée remplace les échantillons par leur id d'enregistrement, ce qui la rend idempotente.

## Fuseaux horaires

- Les instants sont stockés en **UTC**.
- Le rattachement à un jour se fait avec le décalage horaire **au moment de l'échantillon** (`OffsetResolver`), pas le décalage actuel.
- Un échantillon qui chevauche minuit est **réparti au prorata** entre les deux jours.
- Les jours sont des `LocalDate` (année, mois, jour) sans heure : aucune ambiguïté possible.

## Risques techniques

| Risque | Impact | Mitigation |
|---|---|---|
| Limites d'arrière-plan iOS/Android | Données pas à jour hors de l'app | Lecture à l'ouverture + background delivery HealthKit ; afficher « dernière mise à jour ». |
| Health Connect absent sur Android < 14 | Pas de données | Écran d'onboarding qui guide l'installation ; l'app reste utilisable. |
| Validation Google Play des permissions santé | Retard de publication | Déclaration Health Connect et politique de confidentialité prêtes dès la bêta. |
| Revue App Store HealthKit | Rejet | Texte d'usage clair, aucune donnée santé hors appareil, pas de publicité. |
| Double comptage téléphone + montre | Pas gonflés | Agrégats natifs + dédupliqueur par priorité de source (D07). |
| Précision variable selon l'appareil | Confiance utilisateur | Afficher les données de la plateforme telles quelles ; comparaisons sur appareils réels en phase 5. |
| Compilation iOS | Nécessite un Mac + Xcode | Étape à faire sur la machine du porteur du projet. |
