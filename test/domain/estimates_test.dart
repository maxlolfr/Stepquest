import 'package:flutter_test/flutter_test.dart';
import 'package:stepquest/domain/estimates/activity_estimator.dart';
import 'package:stepquest/domain/estimates/units.dart';

void main() {
  const est = ActivityEstimator();

  group('stride', () {
    test('custom stride wins, then height, then default', () {
      expect(est.strideMeters(customStrideMeters: 0.8, heightCm: 180), 0.8);
      expect(est.strideMeters(heightCm: 180), closeTo(0.7452, 1e-9));
      expect(est.strideMeters(), 0.75);
    });

    test('absurd values are refused', () {
      expect(() => est.strideMeters(customStrideMeters: 5), throwsArgumentError);
      expect(() => est.strideMeters(heightCm: 20), throwsArgumentError);
    });
  });

  test('distance from steps', () {
    expect(est.distanceMeters(10000, strideMeters: 0.75), closeTo(7500, 1e-9));
    expect(() => est.distanceMeters(-1, strideMeters: 0.75),
        throwsArgumentError);
  });

  test('calories are a weight-based estimate', () {
    expect(est.caloriesKcal(10000, weightKg: 80), closeTo(400, 1e-9));
    expect(est.caloriesKcal(10000), closeTo(350, 1e-9)); // Default 70 kg.
    expect(() => est.caloriesKcal(1000, weightKg: 5), throwsArgumentError);
  });

  group('units', () {
    test('metric switches from m to km', () {
      expect(Units.distance(500, UnitSystem.metric).toString(), '500 m');
      expect(Units.distance(7500, UnitSystem.metric).toString(), '7.5 km');
    });

    test('imperial uses miles', () {
      final d = Units.distance(Units.metersPerMile, UnitSystem.imperial);
      expect(d.unit, 'mi');
      expect(d.value, closeTo(1.0, 1e-9));
    });

    test('conversions round-trip', () {
      expect(Units.kgToPounds(Units.poundsToKg(180)), closeTo(180, 1e-9));
      expect(Units.cmToInches(Units.inchesToCm(70)), closeTo(70, 1e-9));
    });
  });
}
