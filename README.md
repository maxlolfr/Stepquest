# StepQuest

Podomètre motivant pour iOS et Android (Flutter). Nom de travail.

## État actuel — Étape 1 : fondations

| Élément | État |
|---|---|
| Décisions et architecture | `docs/DECISIONS.md`, `docs/ARCHITECTURE.md` |
| Cœur métier (Dart pur) | Écrit : dates locales, déduplication téléphone/montre, agrégation par jour, objectifs historisés, progression, historique 7/30/90 j, séries avec journées de grâce, distance/calories |
| Source de données de démo | Écrite, clairement marquée « démo » |
| Tests unitaires | 7 fichiers. **Exécutés sur GitHub Actions le 2026-10-18 : analyse statique et tests réussis** (run 39103236034) |
| Écrans | Coquille vide. Arrive à l'étape 2 (prototype visuel) |
| HealthKit / Health Connect | Interface définie, implémentation à l'étape 3 |

Les calculs de déduplication et de découpage par jour ont été contre-vérifiés par une réimplémentation indépendante. Cela ne remplace pas l'exécution des tests Dart.

## Lancer les tests (à faire en premier)

Prérequis : Flutter stable installé (`flutter doctor` sans erreur).

```bash
cd stepquest
flutter create . --platforms=ios,android --org com.stepquest   # génère les dossiers ios/ et android/
flutter pub get
flutter analyze
flutter test
```

`flutter create .` ne remplace pas les fichiers existants ; il ajoute seulement ce qui manque.

Merci de renvoyer la sortie complète de `flutter analyze` et `flutter test`. Tant qu'elle n'a pas été vue, aucun test n'est considéré comme réussi.

## Plan de tests

| Module | Ce qui est vérifié | Fichier |
|---|---|---|
| Dates | Dates invalides refusées, passage de mois/année/29 février, semaine lundi ou dimanche, fuseau horaire, changement d'heure | `test/core/local_date_test.dart` |
| M01 Déduplication | Téléphone + montre jamais additionnés, chevauchement partiel, même enregistrement lu deux fois, échantillons invalides, égalités déterministes | `test/domain/step_deduplicator_test.dart` |
| M01/M03 Agrégation | Regroupement par jour LOCAL, découpage à minuit, synchronisation répétée identique, changement d'heure, jour sans données ≠ 0, jour en cours | `test/domain/daily_aggregator_test.dart` |
| M02 Objectifs | Objectif nul/négatif refusé, historique des objectifs, pourcentage jamais arrondi à 100 % trop tôt, dépassement, semaine | `test/domain/goals_test.dart` |
| M03 Historique | Moyenne sans les jours vides ni aujourd'hui, seuils de fiabilité 7/30/90 j, tendance, record | `test/domain/history_stats_test.dart` |
| Séries | Aujourd'hui ne casse pas la série, journée de grâce hebdomadaire, jour sans données, objectif qui change | `test/domain/streak_calculator_test.dart` |
| M05 Estimations | Foulée, distance, calories, unités | `test/domain/estimates_test.dart` |

À venir : tests de widgets (étape 2), tests d'intégration sur appareils réels (étape 3), batterie et arrière-plan (étape 5).

## Limites connues

- Les tests s'exécutent automatiquement sur GitHub à chaque envoi de code (`.github/workflows/ci.yml`).
- Riverpod, Drift et le plugin santé ne sont pas encore ajoutés : leurs versions doivent être vérifiées sur pub.dev.
- La compilation iOS nécessite un Mac avec Xcode.
- Calories et distance sont des estimations, pas des mesures.

## Prochaine étape

Étape 2 : prototype visuel (tableau de bord, historique, réglages) sur les données de démo, en français et anglais.
