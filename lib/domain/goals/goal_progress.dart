import '../../core/time/local_date.dart';
import '../steps/daily_steps.dart';
import 'step_goal.dart';

/// Progress of one day toward its goal.
class DayProgress {
  const DayProgress({
    required this.date,
    required this.goal,
    required this.steps,
    required this.status,
  });

  final LocalDate date;
  final StepGoal goal;
  final int? steps;
  final DayStatus status;

  /// Real ratio (can exceed 1.0). Null when there is no data.
  double? get ratio => steps == null ? null : steps! / goal.steps;

  /// Whole percentage, rounded down, so 99.9 % never shows as 100 %.
  int? get percent => steps == null ? null : (steps! * 100) ~/ goal.steps;

  /// Ratio limited to 0–1, for progress rings and bars.
  double get displayRatio => (ratio ?? 0.0).clamp(0.0, 1.0).toDouble();

  bool get achieved => steps != null && steps! >= goal.steps;
}

/// Progress of one week.
class WeekProgress {
  const WeekProgress({
    required this.weekStart,
    required this.days,
  });

  final LocalDate weekStart;

  /// Days of the week up to today (future days are not included).
  final List<DayProgress> days;

  int get totalSteps => days.fold(0, (sum, d) => sum + (d.steps ?? 0));

  /// Sum of the goals of the days elapsed so far (including today).
  int get goalSoFar => days.fold(0, (sum, d) => sum + d.goal.steps);

  int get daysAchieved => days.where((d) => d.achieved).length;
  int get daysWithData => days.where((d) => d.steps != null).length;
}

class GoalProgressCalculator {
  const GoalProgressCalculator();

  DayProgress day(DailySteps day, GoalHistory goals) => DayProgress(
        date: day.date,
        goal: goals.goalOn(day.date),
        steps: day.steps,
        status: day.status,
      );

  /// Progress of the week containing [anyDayInWeek].
  /// [history] can contain any days; only those in that week are used.
  WeekProgress week({
    required LocalDate anyDayInWeek,
    required List<DailySteps> history,
    required GoalHistory goals,
    int weekStartsOn = DateTime.monday,
  }) {
    final start = anyDayInWeek.startOfWeek(weekStartsOn: weekStartsOn);
    final end = start.addDays(6);
    final days = history
        .where((d) => !d.date.isBefore(start) && !d.date.isAfter(end))
        .map((d) => day(d, goals))
        .toList()
      ..sort((a, b) => a.date.compareTo(b.date));
    return WeekProgress(weekStart: start, days: days);
  }
}
