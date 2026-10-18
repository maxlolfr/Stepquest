import '../core/time/local_date.dart';
import '../domain/estimates/units.dart';
import '../domain/goals/step_goal.dart';

/// User settings. Kept in memory in the prototype; stored locally (Drift)
/// in a later module.
class AppSettings {
  AppSettings({
    required this.goals,
    this.units = UnitSystem.metric,
    this.weekStartsOn = DateTime.monday,
    this.graceDaysPerWeek = 1,
    this.heightCm,
    this.weightKg,
    this.languageCode,
  });

  factory AppSettings.initial() => AppSettings(goals: GoalHistory([]));

  final GoalHistory goals;
  final UnitSystem units;
  final int weekStartsOn;
  final int graceDaysPerWeek;
  final double? heightCm;
  final double? weightKg;

  /// 'fr', 'en', or null to follow the phone.
  final String? languageCode;

  StepGoal goalToday(LocalDate today) => goals.goalOn(today);

  AppSettings copyWith({
    GoalHistory? goals,
    UnitSystem? units,
    int? weekStartsOn,
    int? graceDaysPerWeek,
    double? Function()? heightCm,
    double? Function()? weightKg,
    String? Function()? languageCode,
  }) =>
      AppSettings(
        goals: goals ?? this.goals,
        units: units ?? this.units,
        weekStartsOn: weekStartsOn ?? this.weekStartsOn,
        graceDaysPerWeek: graceDaysPerWeek ?? this.graceDaysPerWeek,
        heightCm: heightCm != null ? heightCm() : this.heightCm,
        weightKg: weightKg != null ? weightKg() : this.weightKg,
        languageCode: languageCode != null ? languageCode() : this.languageCode,
      );
}
