import 'package:flutter_test/flutter_test.dart';
import 'package:stepquest/core/time/local_date.dart';
import 'package:stepquest/domain/goals/goal_progress.dart';
import 'package:stepquest/domain/goals/step_goal.dart';
import 'package:stepquest/domain/steps/daily_steps.dart';

DailySteps day(LocalDate date, int? steps,
        [DayStatus status = DayStatus.complete]) =>
    DailySteps(
        date: date,
        steps: steps,
        status: steps == null ? DayStatus.noData : status);

void main() {
  group('StepGoal', () {
    test('zero, negative and absurd goals are refused', () {
      expect(() => StepGoal(0), throwsA(isA<InvalidGoalException>()));
      expect(() => StepGoal(-500), throwsA(isA<InvalidGoalException>()));
      expect(() => StepGoal(100001), throwsA(isA<InvalidGoalException>()));
      expect(StepGoal(10000).steps, 10000);
    });
  });

  group('GoalHistory', () {
    final oct10 = LocalDate(2026, 10, 10);
    final oct15 = LocalDate(2026, 10, 15);

    test('each day uses the goal in force that day', () {
      final history = GoalHistory([
        GoalChange(oct10, StepGoal(6000)),
        GoalChange(oct15, StepGoal(9000)),
      ]);
      expect(history.goalOn(LocalDate(2026, 10, 1)).steps,
          StepGoal.defaultSteps);
      expect(history.goalOn(oct10).steps, 6000);
      expect(history.goalOn(LocalDate(2026, 10, 14)).steps, 6000);
      expect(history.goalOn(oct15).steps, 9000);
      expect(history.goalOn(LocalDate(2026, 12, 1)).steps, 9000);
    });

    test('several changes on the same day keep the last one', () {
      final history = GoalHistory([
        GoalChange(oct10, StepGoal(6000)),
        GoalChange(oct10, StepGoal(7000)),
      ]);
      expect(history.goalOn(oct10).steps, 7000);
      expect(history.changes.length, 1);
    });

    test('changing the goal today does not rewrite the past', () {
      final history = GoalHistory([GoalChange(oct10, StepGoal(6000))])
          .withChange(oct15, StepGoal(12000));
      expect(history.goalOn(LocalDate(2026, 10, 12)).steps, 6000);
      expect(history.goalOn(oct15).steps, 12000);
    });
  });

  group('DayProgress', () {
    const calc = GoalProgressCalculator();
    final goals = GoalHistory([], initial: StepGoal(8000));
    final d = LocalDate(2026, 10, 17);

    test('percentage is correct and never rounds up to 100 %', () {
      expect(calc.day(day(d, 4000), goals).percent, 50);
      expect(calc.day(day(d, 7999), goals).percent, 99);
      expect(calc.day(day(d, 7999), goals).achieved, isFalse);
      expect(calc.day(day(d, 8000), goals).percent, 100);
      expect(calc.day(day(d, 8000), goals).achieved, isTrue);
    });

    test('going over the goal keeps the real ratio', () {
      final p = calc.day(day(d, 12000), goals);
      expect(p.ratio, closeTo(1.5, 1e-9));
      expect(p.percent, 150);
      expect(p.displayRatio, 1.0);
    });

    test('a day without data has no percentage', () {
      final p = calc.day(day(d, null), goals);
      expect(p.percent, isNull);
      expect(p.ratio, isNull);
      expect(p.displayRatio, 0.0);
      expect(p.achieved, isFalse);
    });
  });

  group('WeekProgress', () {
    const calc = GoalProgressCalculator();
    final goals = GoalHistory([], initial: StepGoal(5000));
    final today = LocalDate(2026, 10, 15); // Thursday

    final history = [
      day(LocalDate(2026, 10, 11), 9000), // Sunday, previous week
      day(LocalDate(2026, 10, 12), 6000), // Monday
      day(LocalDate(2026, 10, 13), null), // Tuesday, no data
      day(LocalDate(2026, 10, 14), 3000), // Wednesday
      day(today, 1000, DayStatus.inProgress),
    ];

    test('only days of the current week are used', () {
      final week =
          calc.week(anyDayInWeek: today, history: history, goals: goals);
      expect(week.weekStart, LocalDate(2026, 10, 12));
      expect(week.days.length, 4);
      expect(week.totalSteps, 10000);
      expect(week.goalSoFar, 20000);
      expect(week.daysAchieved, 1);
      expect(week.daysWithData, 3);
    });

    test('weeks can start on Sunday', () {
      final week = calc.week(
          anyDayInWeek: today,
          history: history,
          goals: goals,
          weekStartsOn: DateTime.sunday);
      expect(week.weekStart, LocalDate(2026, 10, 11));
      expect(week.totalSteps, 19000);
    });
  });
}
