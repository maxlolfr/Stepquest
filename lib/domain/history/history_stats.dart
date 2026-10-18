import '../../core/time/local_date.dart';
import '../steps/daily_steps.dart';

/// Statistics over a window of N complete days.
class WindowStats {
  const WindowStats({
    required this.days,
    required this.from,
    required this.to,
    required this.daysWithData,
    required this.totalSteps,
    required this.bestDay,
  });

  /// Window length (7, 30, 90…).
  final int days;
  final LocalDate from;
  final LocalDate to;

  /// Days that actually have data. Days without data are excluded from the
  /// average instead of counting as zero (spec M03).
  final int daysWithData;
  final int totalSteps;
  final DailySteps? bestDay;

  /// Average over days with data only. Null if no day has data.
  double? get average => daysWithData == 0 ? null : totalSteps / daysWithData;

  /// Minimum days with data for the window to be shown:
  /// half the window, rounded up (7 → 4, 30 → 15, 90 → 45).
  int get minDaysWithData => (days + 1) ~/ 2;

  bool get isReliable => daysWithData >= minDaysWithData;
}

/// Comparison of a window with the previous window of the same length.
class Trend {
  const Trend({required this.current, required this.previous});

  final WindowStats current;
  final WindowStats previous;

  /// Relative change of the average, e.g. 0.12 for +12 %.
  /// Null when either window is not reliable, or the previous average is 0.
  double? get change {
    if (!current.isReliable || !previous.isReliable) return null;
    final prev = previous.average!;
    if (prev == 0) return null;
    return (current.average! - prev) / prev;
  }
}

class HistoryStatsCalculator {
  const HistoryStatsCalculator();

  /// Stats for the [days] complete days ending the day before [today].
  /// Today is excluded because its total is still growing.
  WindowStats window({
    required List<DailySteps> history,
    required LocalDate today,
    required int days,
    int offsetWindows = 0,
  }) {
    if (days <= 0) throw ArgumentError('Window must be at least one day');
    final to = today.addDays(-1 - days * offsetWindows);
    final from = to.addDays(-(days - 1));

    var withData = 0;
    var total = 0;
    DailySteps? best;
    for (final d in history) {
      if (d.date.isBefore(from) || d.date.isAfter(to)) continue;
      if (d.status == DayStatus.inProgress) continue;
      final steps = d.steps;
      if (steps == null) continue;
      withData++;
      total += steps;
      // Ties keep the most recent day, for a stable "record" display.
      if (best == null ||
          steps > best.steps! ||
          (steps == best.steps! && d.date.isAfter(best.date))) {
        best = d;
      }
    }
    return WindowStats(
      days: days,
      from: from,
      to: to,
      daysWithData: withData,
      totalSteps: total,
      bestDay: best,
    );
  }

  Trend trend({
    required List<DailySteps> history,
    required LocalDate today,
    required int days,
  }) =>
      Trend(
        current: window(history: history, today: today, days: days),
        previous: window(
            history: history, today: today, days: days, offsetWindows: 1),
      );

  /// All-time personal record among complete days.
  DailySteps? personalRecord(List<DailySteps> history) {
    DailySteps? best;
    for (final d in history) {
      if (d.status != DayStatus.complete) continue;
      if (best == null ||
          d.steps! > best.steps! ||
          (d.steps! == best.steps! && d.date.isAfter(best.date))) {
        best = d;
      }
    }
    return best;
  }
}
