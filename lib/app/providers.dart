import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/time/local_date.dart';
import '../data/sources/demo_step_data_source.dart';
import '../data/sources/step_data_source.dart';
import '../domain/estimates/units.dart';
import '../domain/goals/step_goal.dart';
import '../domain/steps/daily_aggregator.dart';
import '../domain/steps/daily_steps.dart';
import 'settings.dart';

/// Current time. Overridden in tests.
final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

/// Device time-zone rules. Overridden in tests.
final offsetResolverProvider =
    Provider<OffsetResolver>((ref) => deviceOffsetResolver);

/// Where steps come from. Demo data until the HealthKit / Health Connect
/// module (step 3).
final stepDataSourceProvider = Provider<StepDataSource>(
    (ref) => DemoStepDataSource(clock: ref.watch(clockProvider)));

final todayProvider = Provider<LocalDate>((ref) {
  final now = ref.watch(clockProvider)().toUtc();
  return localDateOf(now, ref.watch(offsetResolverProvider));
});

class SettingsNotifier extends Notifier<AppSettings> {
  @override
  AppSettings build() => AppSettings.initial();

  /// New goal from today; past days keep the goal they had (D09).
  void setGoal(int steps) {
    final today = ref.read(todayProvider);
    state = state.copyWith(
        goals: state.goals.withChange(today, StepGoal(steps)));
  }

  void setUnits(UnitSystem units) => state = state.copyWith(units: units);
  void setWeekStart(int weekday) =>
      state = state.copyWith(weekStartsOn: weekday);
  void setGraceDays(int days) =>
      state = state.copyWith(graceDaysPerWeek: days);
  void setHeight(double? cm) => state = state.copyWith(heightCm: () => cm);
  void setWeight(double? kg) => state = state.copyWith(weightKg: () => kg);
  void setLanguage(String? code) =>
      state = state.copyWith(languageCode: () => code);
}

final settingsProvider =
    NotifierProvider<SettingsNotifier, AppSettings>(SettingsNotifier.new);

/// Days of history loaded (enough for the 90-day trend).
const historyDays = 180;

class StepHistory {
  const StepHistory({
    required this.days,
    required this.isDemo,
    required this.lastUpdated,
  });

  final List<DailySteps> days;
  final bool isDemo;
  final DateTime lastUpdated;
}

final historyProvider = FutureProvider<StepHistory>((ref) async {
  final source = ref.watch(stepDataSourceProvider);
  final offsetAt = ref.watch(offsetResolverProvider);
  final today = ref.watch(todayProvider);
  final now = ref.watch(clockProvider)();

  final from = today.addDays(-(historyDays - 1));
  final samples = await source.readSamples(
    startOfLocalDayUtc(from, offsetAt),
    startOfLocalDayUtc(today.addDays(1), offsetAt),
  );
  final totals = DailyAggregator().aggregate(samples, offsetAt);
  return StepHistory(
    days: buildDailySteps(
      from: from,
      to: today,
      today: today,
      totals: totals,
      lastUpdated: now,
    ),
    isDemo: source.isDemo,
    lastUpdated: now,
  );
});
