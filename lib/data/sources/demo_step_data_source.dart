import 'dart:math';

import '../../domain/steps/step_sample.dart';
import 'step_data_source.dart';

/// FAKE step data for the visual prototype (phase 2). Never used in release.
///
/// Deterministic: the same seed and dates always give the same samples.
/// Includes overlapping phone and watch samples to exercise deduplication,
/// and some days without any data.
class DemoStepDataSource implements StepDataSource {
  DemoStepDataSource({this.seed = 42, DateTime Function()? clock})
      : _clock = clock ?? DateTime.now;

  final int seed;
  final DateTime Function() _clock;

  static const _phone = StepSource(id: 'demo.phone', kind: StepSourceKind.phone);
  static const _watch = StepSource(id: 'demo.watch', kind: StepSourceKind.watch);

  @override
  bool get isDemo => true;

  @override
  Future<HealthAvailability> availability() async =>
      HealthAvailability.available;

  @override
  Future<HealthPermission> permission() async => HealthPermission.granted;

  @override
  Future<HealthPermission> requestPermission() async =>
      HealthPermission.granted;

  @override
  Future<List<StepSample>> readSamples(
      DateTime startUtc, DateTime endUtc) async {
    final now = _clock().toUtc();
    final end = endUtc.isAfter(now) ? now : endUtc.toUtc();
    final samples = <StepSample>[];
    final s = startUtc.toUtc();
    var hour = DateTime.utc(s.year, s.month, s.day, s.hour);
    while (hour.isBefore(end)) {
      final dayKey = hour.year * 10000 + hour.month * 100 + hour.day;
      final dayRandom = Random(seed ^ dayKey);
      final noDataDay = dayRandom.nextInt(12) == 0; // ~1 day in 12
      final r = Random(seed ^ (dayKey * 31 + hour.hour));
      final active = hour.hour >= 6 && hour.hour <= 21;
      if (!noDataDay && active) {
        final steps = 150 + r.nextInt(900);
        final next = hour.add(const Duration(hours: 1));
        samples.add(StepSample(
          recordId: 'demo-p-${hour.toIso8601String()}',
          start: hour,
          end: next.isAfter(end) ? end : next,
          steps: steps,
          source: _phone,
        ));
        // The watch also records ~40 % of hours, with slightly more steps.
        if (r.nextInt(10) < 4) {
          samples.add(StepSample(
            recordId: 'demo-w-${hour.toIso8601String()}',
            start: hour,
            end: next.isAfter(end) ? end : next,
            steps: (steps * 1.05).round(),
            source: _watch,
          ));
        }
      }
      hour = hour.add(const Duration(hours: 1));
    }
    return samples
        .where((s) => s.end.isAfter(startUtc) && s.start.isBefore(endUtc))
        .toList();
  }
}
