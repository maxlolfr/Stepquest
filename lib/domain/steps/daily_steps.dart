import '../../core/time/local_date.dart';

/// Whether a day's total can be trusted.
enum DayStatus {
  /// Past day with data.
  complete,

  /// Today: the total is still growing.
  inProgress,

  /// No data at all for this day. NOT the same as zero steps (spec M03).
  noData,
}

/// Step total for one local calendar day. Derived data, recomputable.
class DailySteps {
  const DailySteps({
    required this.date,
    required this.steps,
    required this.status,
    this.lastUpdated,
  }) : assert(status != DayStatus.noData || steps == null,
            'A day without data cannot have a step count');

  final LocalDate date;

  /// Null when [status] is [DayStatus.noData].
  final int? steps;
  final DayStatus status;

  /// When the source data was last read (shown as "dernière mise à jour").
  final DateTime? lastUpdated;

  bool get hasData => steps != null;

  @override
  bool operator ==(Object other) =>
      other is DailySteps &&
      other.date == date &&
      other.steps == steps &&
      other.status == status &&
      other.lastUpdated == lastUpdated;

  @override
  int get hashCode => Object.hash(date, steps, status, lastUpdated);

  @override
  String toString() => 'DailySteps($date, $steps, ${status.name})';
}

/// Builds one [DailySteps] per day from [from] to [to] (inclusive) out of
/// per-day totals, whatever produced them (platform aggregates or
/// [DailyAggregator]).
///
/// - Days after [today] are not returned.
/// - [today] is [DayStatus.inProgress], with 0 steps if nothing yet.
/// - A past day missing from [totals] is [DayStatus.noData], never zero.
List<DailySteps> buildDailySteps({
  required LocalDate from,
  required LocalDate to,
  required LocalDate today,
  required Map<LocalDate, int> totals,
  DateTime? lastUpdated,
}) {
  if (to.isBefore(from)) {
    throw ArgumentError('Range end $to is before start $from');
  }
  final last = to.isAfter(today) ? today : to;
  final days = <DailySteps>[];
  for (var d = from; !d.isAfter(last); d = d.addDays(1)) {
    final steps = totals[d];
    if (d == today) {
      days.add(DailySteps(
        date: d,
        steps: steps ?? 0,
        status: DayStatus.inProgress,
        lastUpdated: lastUpdated,
      ));
    } else if (steps != null) {
      days.add(DailySteps(
        date: d,
        steps: steps,
        status: DayStatus.complete,
        lastUpdated: lastUpdated,
      ));
    } else {
      days.add(DailySteps(date: d, steps: null, status: DayStatus.noData));
    }
  }
  return days;
}
