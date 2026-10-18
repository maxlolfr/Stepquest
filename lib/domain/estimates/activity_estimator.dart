/// Distance and calorie ESTIMATES from a step count (spec M05).
///
/// These are approximations for motivation, not medical measurements.
/// Assumptions (documented for users in the app and in docs/ESTIMATES.md):
/// - Stride length = 0.414 × height when height is known, otherwise 0.75 m,
///   unless the user sets their own stride.
/// - Calories ≈ 0.0005 kcal per step per kg of body weight
///   (≈ 0.04 kcal/step at 80 kg), otherwise 70 kg is assumed.
class ActivityEstimator {
  const ActivityEstimator();

  static const defaultStrideMeters = 0.75;
  static const strideToHeightRatio = 0.414;
  static const defaultWeightKg = 70.0;
  static const kcalPerStepPerKg = 0.0005;

  /// Stride length in meters, from the most precise information available.
  double strideMeters({double? customStrideMeters, double? heightCm}) {
    if (customStrideMeters != null) {
      if (customStrideMeters < 0.2 || customStrideMeters > 2.0) {
        throw ArgumentError('Stride must be between 0.2 and 2.0 m');
      }
      return customStrideMeters;
    }
    if (heightCm != null) {
      if (heightCm < 50 || heightCm > 260) {
        throw ArgumentError('Height must be between 50 and 260 cm');
      }
      return heightCm / 100 * strideToHeightRatio;
    }
    return defaultStrideMeters;
  }

  double distanceMeters(int steps, {required double strideMeters}) {
    if (steps < 0) throw ArgumentError('Steps cannot be negative');
    return steps * strideMeters;
  }

  double caloriesKcal(int steps, {double? weightKg}) {
    if (steps < 0) throw ArgumentError('Steps cannot be negative');
    final w = weightKg ?? defaultWeightKg;
    if (w < 20 || w > 400) {
      throw ArgumentError('Weight must be between 20 and 400 kg');
    }
    return steps * w * kcalPerStepPerKg;
  }
}
