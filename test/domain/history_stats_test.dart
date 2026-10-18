import 'package:flutter_test/flutter_test.dart';
import 'package:stepquest/core/time/local_date.dart';
import 'package:stepquest/domain/history/history_stats.dart';
import 'package:stepquest/domain/steps/daily_steps.dart';

final today = LocalDate(2026, 10, 18);

DailySteps past(int daysAgo, int? steps) => DailySteps(
      date: today.addDays(-daysAgo),
      steps: steps,
      status: steps == null ? DayStatus.noData : DayStatus.complete,
    );

void main() {
  const calc = HistoryStatsCalculator();

  test('average ignores days without data and today', () {
    final history = [
      DailySteps(date: today, steps: 50000, status: DayStatus.inProgress),
      past(1, 6000),
      past(2, null),
      past(3, 4000),
      past(4, 8000),
      past(5, 2000),
      past(8, 99999), // Outside the 7-day window.
    ];
    final w = calc.window(history: history, today: today, days: 7);
    expect(w.from, today.addDays(-7));
    expect(w.to, today.addDays(-1));
    expect(w.daysWithData, 4);
    expect(w.totalSteps, 20000);
    expect(w.average, closeTo(5000, 1e-9));
    expect(w.bestDay!.steps, 8000);
    expect(w.isReliable, isTrue); // 4 of 7 days.
  });

  test('a window is unreliable with too little data', () {
    final w = calc.window(
        history: [past(1, 6000), past(2, 6000), past(3, 6000)],
        today: today,
        days: 7);
    expect(w.minDaysWithData, 4);
    expect(w.isReliable, isFalse);
  });

  test('90-day window needs 45 days with data', () {
    final history = [for (var i = 1; i <= 44; i++) past(i, 5000)];
    expect(calc.window(history: history, today: today, days: 90).isReliable,
        isFalse);
    history.add(past(45, 5000));
    expect(calc.window(history: history, today: today, days: 90).isReliable,
        isTrue);
  });

  test('empty window has no average', () {
    final w = calc.window(history: [], today: today, days: 30);
    expect(w.average, isNull);
    expect(w.bestDay, isNull);
  });

  test('trend compares with the previous window', () {
    final history = [
      for (var i = 1; i <= 7; i++) past(i, 6000), // this week
      for (var i = 8; i <= 14; i++) past(i, 5000), // previous week
    ];
    final t = calc.trend(history: history, today: today, days: 7);
    expect(t.change, closeTo(0.2, 1e-9)); // +20 %
  });

  test('no trend when the previous window lacks data', () {
    final history = [for (var i = 1; i <= 7; i++) past(i, 6000)];
    final t = calc.trend(history: history, today: today, days: 7);
    expect(t.change, isNull);
  });

  test('personal record keeps the most recent day on ties', () {
    final record = calc.personalRecord([
      past(10, 12000),
      past(3, 12000),
      past(5, 9000),
      DailySteps(date: today, steps: 20000, status: DayStatus.inProgress),
    ]);
    expect(record!.date, today.addDays(-3));
  });
}
