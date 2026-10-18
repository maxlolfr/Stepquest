/// Kind of device that produced a step sample.
enum StepSourceKind { watch, phone, other }

/// Where a sample comes from (e.g. "Apple Watch de Marc", "iPhone").
class StepSource {
  const StepSource({required this.id, required this.kind});

  /// Stable identifier given by the platform (bundle id, device id, package).
  final String id;
  final StepSourceKind kind;

  @override
  bool operator ==(Object other) =>
      other is StepSource && other.id == id && other.kind == kind;

  @override
  int get hashCode => Object.hash(id, kind);

  @override
  String toString() => 'StepSource($id, ${kind.name})';
}

/// Raw step data as read from HealthKit or Health Connect.
///
/// Raw samples are never modified by the app; daily totals are derived from
/// them and can be recomputed at any time.
class StepSample {
  StepSample({
    required this.recordId,
    required DateTime start,
    required DateTime end,
    required this.steps,
    required this.source,
  })  : start = start.toUtc(),
        end = end.toUtc();

  /// Platform record identifier. Re-syncing the same record replaces it,
  /// which makes repeated synchronisations idempotent.
  final String recordId;
  final DateTime start;
  final DateTime end;
  final int steps;
  final StepSource source;

  bool get isValid => steps >= 0 && !end.isBefore(start);

  @override
  String toString() =>
      'StepSample($recordId, $start → $end, $steps, ${source.id})';
}
