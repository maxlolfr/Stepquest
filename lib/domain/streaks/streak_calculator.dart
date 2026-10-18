import '../../core/time/local_date.dart';
import '../goals/step_goal.dart';
import '../steps/daily_steps.dart';

class StreakSettings {
  const StreakSettings({this.graceDaysPerWeek = 1, this.weekStartsOn = 1})
      : assert(graceDaysPerWeek >= 0 && graceDaysPerWeek <= 6);

  /// Missed days per calendar week that do not break a streak.
  final int graceDaysPerWeek;

  /// ISO weekday the week starts on (1 = Monday).
  final int weekStartsOn;
}

class StreakResult {
  const StreakResult({
    required this.current,
    required this.best,
    required this.graceDaysUsedThisWeek,
    required this.isAlive,
  });

  /// Days with the goal achieved in the ongoing streak (grace days excluded).
  final int current;

  /// Longest streak ever, same counting.
  final int best;

  /// Grace days already used in the current week.
  final int graceDaysUsedThisWeek;

  /// False when the streak is broken (current == 0).
  final bool isAlive;
}

/// Computes streaks of days where the daily goal was reached.
///
/// Rules:
/// - A day counts when its steps reach the goal in force that day.
/// - Today never breaks a streak: it only adds to it once achieved.
/// - A missed day, or a past day without data, uses a grace day if the
///   week still has one; otherwise the streak ends.
/// - Grace days keep a streak alive but do not increase it.
/// - Everything is recomputed from history, so a time-zone change cannot
///   create an artificial streak (spec M04).
class StreakCalculator {
  const StreakCalculator({this.settings = const StreakSettings()});

  final StreakSettings settings;

  StreakResult compute({
    required List<DailySteps> history,
    required GoalHistory goals,
    required LocalDate today,
  }) {
    final byDate = {for (final d in history) d.date: d};
    final dates = byDate.keys.where((d) => !d.isAfter(today)).toList()..sort();
    if (dates.isEmpty) {
      return const StreakResult(
          current: 0, best: 0, graceDaysUsedThisWeek: 0, isAlive: false);
    }

    var run = 0;
    var best = 0;
    final graceUsed = <LocalDate, int>{};

    for (var d = dates.first; !d.isAfter(today); d = d.addDays(1)) {
      final day = byDate[d];
      final steps = day?.steps;
      final achieved = steps != null && steps >= goals.goalOn(d).steps;

      if (achieved) {
        run++;
        if (run > best) best = run;
        continue;
      }
      if (d == today) continue; // Today can still be achieved.
      if (run == 0) continue; // Nothing to protect.

      final week = d.startOfWeek(weekStartsOn: settings.weekStartsOn);
      final used = graceUsed[week] ?? 0;
      if (used < settings.graceDaysPerWeek) {
        graceUsed[week] = used + 1;
      } else {
        run = 0;
      }
    }

    final thisWeek = today.startOfWeek(weekStartsOn: settings.weekStartsOn);
    return StreakResult(
      current: run,
      best: best,
      graceDaysUsedThisWeek: graceUsed[thisWeek] ?? 0,
      isAlive: run > 0,
    );
  }
}
