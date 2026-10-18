import 'package:flutter_test/flutter_test.dart';
import 'package:stepquest/core/time/local_date.dart';
import 'package:stepquest/domain/steps/daily_aggregator.dart';
import 'package:stepquest/domain/steps/daily_steps.dart';
import 'package:stepquest/domain/steps/step_sample.dart';

const phone = StepSource(id: 'iphone', kind: StepSourceKind.phone);
const watch = StepSource(id: 'watch', kind: StepSourceKind.watch);

StepSample utcSample(String id, DateTime start, DateTime end, int steps,
        [StepSource source = phone]) =>
    StepSample(
        recordId: id, start: start, end: end, steps: steps, source: source);

void main() {
  final aggregator = DailyAggregator();
  final bangkok = fixedOffset(const Duration(hours: 7));

  test('no samples means no days, not zero-step days', () {
    expect(aggregator.aggregate([], bangkok), isEmpty);
  });

  test('samples are grouped by LOCAL day, not UTC day', () {
    // 17:30–18:30 UTC on the 17th = 00:30–01:30 on the 18th in Bangkok.
    final totals = aggregator.aggregate([
      utcSample('a', DateTime.utc(2026, 10, 17, 17, 30),
          DateTime.utc(2026, 10, 17, 18, 30), 400),
    ], bangkok);
    expect(totals, {LocalDate(2026, 10, 18): 400});
  });

  test('a sample crossing local midnight is split proportionally', () {
    // Local 23:00–01:00 (16:00–18:00 UTC), 1200 steps → 600 + 600.
    final totals = aggregator.aggregate([
      utcSample('a', DateTime.utc(2026, 10, 17, 16),
          DateTime.utc(2026, 10, 17, 18), 1200),
    ], bangkok);
    expect(totals, {
      LocalDate(2026, 10, 17): 600,
      LocalDate(2026, 10, 18): 600,
    });
  });

  test('phone + watch on the same day are deduplicated', () {
    final totals = aggregator.aggregate([
      utcSample('p', DateTime.utc(2026, 10, 18, 2),
          DateTime.utc(2026, 10, 18, 3), 1000, phone),
      utcSample('w', DateTime.utc(2026, 10, 18, 2),
          DateTime.utc(2026, 10, 18, 3), 1100, watch),
    ], bangkok);
    expect(totals, {LocalDate(2026, 10, 18): 1100});
  });

  test('repeated synchronisation gives identical totals', () {
    final samples = [
      utcSample('a', DateTime.utc(2026, 10, 18, 1),
          DateTime.utc(2026, 10, 18, 2), 700),
      utcSample('b', DateTime.utc(2026, 10, 18, 5),
          DateTime.utc(2026, 10, 18, 6), 300),
    ];
    final once = aggregator.aggregate(samples, bangkok);
    final twice = aggregator.aggregate([...samples, ...samples], bangkok);
    expect(twice, once);
    expect(once, {LocalDate(2026, 10, 18): 1000});
  });

  test('uses the offset in force at the time of each sample (DST)', () {
    // Paris: +1 before 2026-03-29 01:00 UTC, +2 after.
    Duration paris(DateTime utc) =>
        utc.isBefore(DateTime.utc(2026, 3, 29, 1))
            ? const Duration(hours: 1)
            : const Duration(hours: 2);
    final totals = aggregator.aggregate([
      // Local 23:00–23:30 on the 28th (+1).
      utcSample('a', DateTime.utc(2026, 3, 28, 22),
          DateTime.utc(2026, 3, 28, 22, 30), 100),
      // Local 00:30–00:45 on the 29th (+1).
      utcSample('b', DateTime.utc(2026, 3, 28, 23, 30),
          DateTime.utc(2026, 3, 28, 23, 45), 200),
      // Local 00:30–00:45 on the 30th (+2).
      utcSample('c', DateTime.utc(2026, 3, 29, 22, 30),
          DateTime.utc(2026, 3, 29, 22, 45), 300),
    ], paris);
    expect(totals, {
      LocalDate(2026, 3, 28): 100,
      LocalDate(2026, 3, 29): 200,
      LocalDate(2026, 3, 30): 300,
    });
  });

  group('buildDailySteps', () {
    final today = LocalDate(2026, 10, 18);

    test('missing past days are noData, today is in progress', () {
      final days = buildDailySteps(
        from: LocalDate(2026, 10, 15),
        to: today,
        today: today,
        totals: {
          LocalDate(2026, 10, 15): 5000,
          LocalDate(2026, 10, 17): 0,
        },
      );
      expect(days.map((d) => d.status).toList(), [
        DayStatus.complete,
        DayStatus.noData,
        DayStatus.complete,
        DayStatus.inProgress,
      ]);
      expect(days[1].steps, isNull); // No data is NOT zero.
      expect(days[2].steps, 0); // Real zero stays zero.
      expect(days[3].steps, 0);
    });

    test('future days are not returned', () {
      final days = buildDailySteps(
          from: today, to: today.addDays(3), today: today, totals: {});
      expect(days.length, 1);
    });

    test('reversed range is refused', () {
      expect(
          () => buildDailySteps(
              from: today, to: today.addDays(-1), today: today, totals: {}),
          throwsArgumentError);
    });
  });
}
