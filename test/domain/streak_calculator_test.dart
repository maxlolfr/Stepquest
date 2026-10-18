import 'package:flutter_test/flutter_test.dart';
import 'package:stepquest/core/time/local_date.dart';
import 'package:stepquest/domain/goals/step_goal.dart';
import 'package:stepquest/domain/steps/daily_steps.dart';
import 'package:stepquest/domain/streaks/streak_calculator.dart';

// Sunday 18 October 2026. Week (Monday start) = 12–18 October.
final today = LocalDate(2026, 10, 18);
final goals = GoalHistory([], initial: StepGoal(1000));

DailySteps d(int dayOfOctober, int? steps) {
  final date = LocalDate(2026, 10, dayOfOctober);
  final status = date == today
      ? DayStatus.inProgress
      : (steps == null ? DayStatus.noData : DayStatus.complete);
  return DailySteps(
      date: date,
      steps: date == today ? (steps ?? 0) : steps,
      status: status);
}

void main() {
  const calc = StreakCalculator();

  test('no history, no streak', () {
    final r = calc.compute(history: [], goals: goals, today: today);
    expect(r.current, 0);
    expect(r.isAlive, isFalse);
  });

  test('today not yet achieved does not break the streak', () {
    final r = calc.compute(
        history: [d(15, 1500), d(16, 1200), d(17, 1000), d(18, 200)],
        goals: goals,
        today: today);
    expect(r.current, 3);
    expect(r.isAlive, isTrue);
  });

  test('today achieved adds to the streak', () {
    final r = calc.compute(
        history: [d(17, 1500), d(18, 1000)], goals: goals, today: today);
    expect(r.current, 2);
  });

  test('one missed day uses the weekly grace day', () {
    final r = calc.compute(
        history: [d(14, 1500), d(15, 300), d(16, 1500), d(17, 1500)],
        goals: goals,
        today: today);
    expect(r.current, 3); // Grace day kept it alive but does not count.
    expect(r.graceDaysUsedThisWeek, 1);
  });

  test('a day without data is a missed day (eligible for grace)', () {
    final r = calc.compute(
        history: [d(15, 1500), d(16, null), d(17, 1500)],
        goals: goals,
        today: today);
    expect(r.current, 2);
  });

  test('a second miss in the same week breaks the streak', () {
    final r = calc.compute(
        history: [
          d(13, 1500),
          d(14, 0),
          d(15, 0),
          d(16, 1500),
          d(17, 1500),
        ],
        goals: goals,
        today: today);
    expect(r.current, 2);
    expect(r.best, 2);
  });

  test('without grace days, any miss breaks the streak', () {
    const strict = StreakCalculator(
        settings: StreakSettings(graceDaysPerWeek: 0));
    final r = strict.compute(
        history: [d(14, 1500), d(15, 1500), d(16, 0), d(17, 1500)],
        goals: goals,
        today: today);
    expect(r.current, 1);
    expect(r.best, 2);
  });

  test('grace days reset every week', () {
    // Week of 5–11: one miss on the 8th. Week of 12–18: one miss on the 14th.
    final history = [
      for (var i = 5; i <= 17; i++) d(i, (i == 8 || i == 14) ? 0 : 1500),
    ];
    final r = calc.compute(history: history, goals: goals, today: today);
    expect(r.current, 11); // 13 days minus 2 grace days.
  });

  test('each day is judged against the goal in force that day', () {
    final changing = GoalHistory([
      GoalChange(LocalDate(2026, 10, 17), StepGoal(5000)),
    ], initial: StepGoal(1000));
    final r = calc.compute(
        history: [d(15, 1500), d(16, 1500), d(17, 1500)],
        goals: changing,
        today: today);
    // The 17th misses its 5000 goal → grace day, streak = 2.
    expect(r.current, 2);
    expect(r.graceDaysUsedThisWeek, 1);
  });
}
