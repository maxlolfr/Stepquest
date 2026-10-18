import '../../core/time/local_date.dart';
import 'step_deduplicator.dart';
import 'step_sample.dart';

/// Turns raw samples into per-day totals in the user's local time.
///
/// Samples are first deduplicated across sources, then assigned to local days
/// using the UTC offset in force at the time of each sample. A segment that
/// crosses local midnight is split proportionally between the two days.
class DailyAggregator {
  DailyAggregator({StepDeduplicator? deduplicator})
      : _deduplicator = deduplicator ?? StepDeduplicator();

  final StepDeduplicator _deduplicator;

  /// Returns rounded totals for every day that has at least one sample.
  /// Days without samples are absent from the map (never zero).
  Map<LocalDate, int> aggregate(
    Iterable<StepSample> samples,
    OffsetResolver offsetAt,
  ) {
    final sums = <LocalDate, double>{};
    for (final seg in _deduplicator.deduplicate(samples)) {
      _addSegment(seg, offsetAt, sums);
    }
    return sums.map((day, value) => MapEntry(day, value.round()));
  }

  void _addSegment(
    StepSegment seg,
    OffsetResolver offsetAt,
    Map<LocalDate, double> sums,
  ) {
    final totalMicros = seg.end.difference(seg.start).inMicroseconds;
    var cursor = seg.start;
    while (cursor.isBefore(seg.end)) {
      final day = localDateOf(cursor, offsetAt);
      final nextMidnight = startOfLocalDayUtc(day.addDays(1), offsetAt);
      final pieceEnd = nextMidnight.isBefore(seg.end) ? nextMidnight : seg.end;
      final pieceMicros = pieceEnd.difference(cursor).inMicroseconds;
      if (pieceMicros <= 0) break; // Defensive: never loop forever.
      sums[day] = (sums[day] ?? 0) + seg.steps * pieceMicros / totalMicros;
      cursor = pieceEnd;
    }
  }
}
