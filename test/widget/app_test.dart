import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stepquest/app/app.dart';
import 'package:stepquest/app/providers.dart';
import 'package:stepquest/core/time/local_date.dart';

final fixedNow = DateTime.utc(2026, 10, 18, 5); // 12:00 in Bangkok.

final testOverrides = [
      clockProvider.overrideWithValue(() => fixedNow),
      offsetResolverProvider
      .overrideWithValue(fixedOffset(const Duration(hours: 7))),
];

void main() {
  testWidgets('app starts on the dashboard with demo data flagged',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(400, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
        ProviderScope(overrides: testOverrides, child: const StepQuestApp()));
    await tester.pumpAndSettle();

    expect(find.text('StepQuest'), findsOneWidget);
    expect(find.text('Demo data'), findsWidgets);
    expect(find.text('Sunday, October 18'), findsOneWidget);
  });

  testWidgets('navigation reaches history and settings', (tester) async {
    await tester.binding.setSurfaceSize(const Size(400, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
        ProviderScope(overrides: testOverrides, child: const StepQuestApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('History'));
    await tester.pumpAndSettle();
    expect(find.text('7 d'), findsOneWidget);
    expect(find.text('30 d'), findsOneWidget);

    await tester.tap(find.text('Settings').last);
    await tester.pumpAndSettle();
    expect(find.text('Daily goal'), findsOneWidget);
  });

  group('SettingsNotifier', () {
    test('a new goal applies from today only', () {
      final container = ProviderContainer(overrides: testOverrides);
      addTearDown(container.dispose);

      final today = container.read(todayProvider);
      expect(today, LocalDate(2026, 10, 18));

      container.read(settingsProvider.notifier).setGoal(12000);
      final goals = container.read(settingsProvider).goals;
      expect(goals.goalOn(today).steps, 12000);
      expect(goals.goalOn(today.addDays(-1)).steps, 8000);
    });

    test('a zero goal is refused', () {
      final container = ProviderContainer(overrides: testOverrides);
      addTearDown(container.dispose);
      expect(() => container.read(settingsProvider.notifier).setGoal(0),
          throwsA(anything));
    });
  });

  test('history covers 180 days and ends with today in progress', () async {
    final container = ProviderContainer(overrides: testOverrides);
    addTearDown(container.dispose);
    final history = await container.read(historyProvider.future);
    expect(history.days.length, historyDays);
    expect(history.days.last.date, LocalDate(2026, 10, 18));
    expect(history.isDemo, isTrue);
  });
}
