import 'package:flutter_test/flutter_test.dart';
import 'package:stepquest/domain/steps/step_deduplicator.dart';
import 'package:stepquest/domain/steps/step_sample.dart';

const phone = StepSource(id: 'iphone', kind: StepSourceKind.phone);
const watch = StepSource(id: 'watch', kind: StepSourceKind.watch);

StepSample sample(String id, int h1, int m1, int h2, int m2, int steps,
        StepSource source) =>
    StepSample(
      recordId: id,
      start: DateTime.utc(2026, 10, 18, h1, m1),
      end: DateTime.utc(2026, 10, 18, h2, m2),
      steps: steps,
      source: source,
    );

double total(List<StepSegment> segs) =>
    segs.fold(0.0, (sum, s) => sum + s.steps);

void main() {
  final dedup = StepDeduplicator();

  test('empty input gives no segments', () {
    expect(dedup.deduplicate([]), isEmpty);
  });

  test('a single source keeps all its steps', () {
    final result = dedup.deduplicate([
      sample('a', 8, 0, 9, 0, 1000, phone),
      sample('b', 9, 0, 10, 0, 500, phone),
      sample('c', 14, 0, 14, 30, 300, phone),
    ]);
    expect(total(result), closeTo(1800, 1e-9));
  });

  test('phone and watch on the same hour are not added (watch wins)', () {
    final result = dedup.deduplicate([
      sample('p', 8, 0, 9, 0, 1000, phone),
      sample('w', 8, 0, 9, 0, 1200, watch),
    ]);
    expect(total(result), closeTo(1200, 1e-9));
    expect(result.every((s) => s.source == watch), isTrue);
  });

  test('partial overlap: only the overlapped share is replaced', () {
    // Phone: 2000 steps over 2 h. Watch covers the second hour with 600.
    final result = dedup.deduplicate([
      sample('p', 10, 0, 12, 0, 2000, phone),
      sample('w', 11, 0, 12, 0, 600, watch),
    ]);
    expect(total(result), closeTo(1000 + 600, 1e-9));
  });

  test('the same record read twice is counted once', () {
    final result = dedup.deduplicate([
      sample('same', 8, 0, 9, 0, 1000, phone),
      sample('same', 8, 0, 9, 0, 1000, phone),
    ]);
    expect(total(result), closeTo(1000, 1e-9));
  });

  test('invalid samples are ignored', () {
    final result = dedup.deduplicate([
      sample('neg', 8, 0, 9, 0, -50, phone),
      sample('backwards', 10, 0, 9, 0, 300, phone),
      sample('ok', 11, 0, 12, 0, 400, phone),
    ]);
    expect(total(result), closeTo(400, 1e-9));
  });

  test('ties between sources of the same kind are deterministic', () {
    const phoneA = StepSource(id: 'a-phone', kind: StepSourceKind.phone);
    const phoneB = StepSource(id: 'b-phone', kind: StepSourceKind.phone);
    final s1 = sample('1', 8, 0, 9, 0, 500, phoneA);
    final s2 = sample('2', 8, 0, 9, 0, 700, phoneB);
    expect(total(dedup.deduplicate([s1, s2])), closeTo(500, 1e-9));
    expect(total(dedup.deduplicate([s2, s1])), closeTo(500, 1e-9));
  });

  test('zero-length samples are kept', () {
    final result = dedup.deduplicate([sample('i', 8, 0, 8, 0, 20, phone)]);
    expect(total(result), closeTo(20, 1e-9));
  });

  test('custom priorities can prefer the phone', () {
    final phoneFirst = StepDeduplicator(priorities: {
      StepSourceKind.phone: 3,
      StepSourceKind.watch: 2,
      StepSourceKind.other: 1,
    });
    final result = phoneFirst.deduplicate([
      sample('p', 8, 0, 9, 0, 1000, phone),
      sample('w', 8, 0, 9, 0, 1200, watch),
    ]);
    expect(total(result), closeTo(1000, 1e-9));
  });
}
