import 'step_sample.dart';

/// A stretch of time with a step count attributed to a single source.
class StepSegment {
  const StepSegment(this.start, this.end, this.steps, this.source);

  final DateTime start;
  final DateTime end;

  /// Fractional, because samples are split proportionally to time.
  final double steps;
  final StepSource source;

  @override
  String toString() => 'StepSegment($start → $end, $steps, ${source.id})';
}

/// Merges samples from several sources without double counting.
///
/// The timeline is cut at every sample boundary. On each elementary interval,
/// only the highest-priority source that has data is kept. A sample's steps
/// are spread evenly over its duration, so a partially overlapped sample
/// contributes only its share.
///
/// Default priority: watch > phone > other. Ties are broken by source id, so
/// the result is deterministic.
///
/// This is a safety net (docs/DECISIONS.md D07): when the platform provides
/// already-deduplicated aggregates, those are preferred.
class StepDeduplicator {
  StepDeduplicator({Map<StepSourceKind, int>? priorities})
      : _priorities = priorities ?? defaultPriorities;

  static const defaultPriorities = {
    StepSourceKind.watch: 3,
    StepSourceKind.phone: 2,
    StepSourceKind.other: 1,
  };

  /// Zero-length samples are widened to this duration so they are not lost.
  static const instantSampleDuration = Duration(seconds: 1);

  final Map<StepSourceKind, int> _priorities;

  List<StepSegment> deduplicate(Iterable<StepSample> samples) {
    // 1. One entry per record id (the last one read wins), invalid ones dropped.
    final byRecord = <String, StepSample>{};
    for (final s in samples) {
      if (s.isValid) byRecord[s.recordId] = s;
    }
    final items = byRecord.values.map(_widenInstant).toList()
      ..sort((a, b) => a.start.compareTo(b.start));
    if (items.isEmpty) return const [];

    // 2. All boundaries, sorted and unique.
    final boundarySet = <DateTime>{};
    for (final s in items) {
      boundarySet
        ..add(s.start)
        ..add(s.end);
    }
    final boundaries = boundarySet.toList()..sort();

    // 3. Sweep: keep the samples active on each elementary interval.
    final result = <StepSegment>[];
    final active = <StepSample>[];
    var next = 0;
    for (var i = 0; i < boundaries.length - 1; i++) {
      final a = boundaries[i];
      final b = boundaries[i + 1];
      while (next < items.length && !items[next].start.isAfter(a)) {
        active.add(items[next++]);
      }
      active.removeWhere((s) => !s.end.isAfter(a));
      if (active.isEmpty) continue;

      final winner = _bestSource(active);
      final interval = b.difference(a).inMicroseconds;
      var steps = 0.0;
      for (final s in active) {
        if (s.source != winner) continue;
        final total = s.end.difference(s.start).inMicroseconds;
        steps += s.steps * interval / total;
      }
      // Segments are intentionally not merged: merging two segments with
      // different step rates would distort a later split at midnight.
      result.add(StepSegment(a, b, steps, winner));
    }
    return result;
  }

  StepSample _widenInstant(StepSample s) {
    if (s.end.isAfter(s.start)) return s;
    return StepSample(
      recordId: s.recordId,
      start: s.start,
      end: s.start.add(instantSampleDuration),
      steps: s.steps,
      source: s.source,
    );
  }

  StepSource _bestSource(List<StepSample> active) {
    var best = active.first.source;
    for (final s in active.skip(1)) {
      final p = _priorities[s.source.kind] ?? 0;
      final bp = _priorities[best.kind] ?? 0;
      if (p > bp || (p == bp && s.source.id.compareTo(best.id) < 0)) {
        best = s.source;
      }
    }
    return best;
  }
}
