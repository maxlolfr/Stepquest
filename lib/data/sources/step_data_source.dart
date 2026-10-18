import '../../domain/steps/step_sample.dart';

enum HealthAvailability {
  available,

  /// Android: Health Connect must be installed or updated from the Play Store.
  needsInstall,

  /// Device or OS cannot provide step data.
  unsupported,
}

enum HealthPermission {
  granted,
  denied,
  notRequested,

  /// iOS never tells an app whether READ access was granted (privacy).
  /// The app must try to read and treat "no data" carefully.
  unknown,
}

/// Access to step data on the device. Implemented by HealthKit (iOS),
/// Health Connect (Android) and a demo source for the visual prototype.
///
/// The app must stay usable whatever this returns (spec M06).
abstract interface class StepDataSource {
  /// True for fake data. The UI must show a visible "démo" label.
  bool get isDemo;

  Future<HealthAvailability> availability();
  Future<HealthPermission> permission();
  Future<HealthPermission> requestPermission();

  /// Raw samples whose time range overlaps [startUtc, endUtc).
  Future<List<StepSample>> readSamples(DateTime startUtc, DateTime endUtc);
}
