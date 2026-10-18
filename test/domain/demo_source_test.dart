import 'package:flutter_test/flutter_test.dart';
import 'package:stepquest/data/sources/demo_step_data_source.dart';

void main() {
  final clock = DateTime.utc(2026, 10, 18, 12);

  test('demo source is flagged as demo', () {
    expect(DemoStepDataSource(clock: () => clock).isDemo, isTrue);
  });

  test('demo data is deterministic', () async {
    final start = DateTime.utc(2026, 10, 1);
    final a = await DemoStepDataSource(clock: () => clock)
        .readSamples(start, clock);
    final b = await DemoStepDataSource(clock: () => clock)
        .readSamples(start, clock);
    expect(a.map((s) => '${s.recordId}:${s.steps}').toList(),
        b.map((s) => '${s.recordId}:${s.steps}').toList());
    expect(a, isNotEmpty);
  });

  test('demo data never goes beyond "now"', () async {
    final samples = await DemoStepDataSource(clock: () => clock)
        .readSamples(DateTime.utc(2026, 10, 18), DateTime.utc(2026, 10, 19));
    expect(samples.every((s) => !s.end.isAfter(clock)), isTrue);
  });
}
