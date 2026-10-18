import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/l10n.dart';
import '../../app/providers.dart';
import '../../app/theme.dart';
import '../../domain/estimates/activity_estimator.dart';
import '../../domain/estimates/units.dart';
import '../../domain/goals/goal_progress.dart';
import '../../domain/streaks/streak_calculator.dart';
import '../common/bar_chart.dart';
import '../common/format.dart';
import '../common/progress_ring.dart';
import '../common/widgets.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(historyProvider);
    return history.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorMessage(error: e),
      data: (h) => _DashboardBody(history: h),
    );
  }
}

class _DashboardBody extends ConsumerWidget {
  const _DashboardBody({required this.history});

  final StepHistory history;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context);
    final fmt = Fmt(l.lang);
    final theme = Theme.of(context);
    final colors = StepColors.of(context);
    final settings = ref.watch(settingsProvider);
    final today = ref.watch(todayProvider);

    const progressCalc = GoalProgressCalculator();
    final todayDay = history.days.last;
    final progress = progressCalc.day(todayDay, settings.goals);
    final steps = todayDay.steps ?? 0;
    final goal = progress.goal.steps;
    final percent = progress.percent ?? 0;

    const estimator = ActivityEstimator();
    final stride = estimator.strideMeters(heightCm: settings.heightCm);
    final meters = estimator.distanceMeters(steps, strideMeters: stride);
    final distance = Units.distance(meters, settings.units);
    final kcal = estimator.caloriesKcal(steps, weightKg: settings.weightKg);

    final streak = StreakCalculator(
      settings: StreakSettings(
        graceDaysPerWeek: settings.graceDaysPerWeek,
        weekStartsOn: settings.weekStartsOn,
      ),
    ).compute(history: history.days, goals: settings.goals, today: today);

    final week = progressCalc.week(
      anyDayInWeek: today,
      history: history.days,
      goals: settings.goals,
      weekStartsOn: settings.weekStartsOn,
    );

    final weekStart = week.weekStart;
    final weekBars = [
      for (var i = 0; i < 7; i++)
        () {
          final date = weekStart.addDays(i);
          final match = week.days.where((d) => d.date == date);
          final dp = match.isEmpty ? null : match.first;
          return BarData(
            steps: dp?.steps,
            future: date.isAfter(today),
            goal: settings.goals.goalOn(date).steps,
            label: l.weekdayShort(date.weekday),
          );
        }(),
    ];
    final daysElapsed = today.daysSince(weekStart) + 1;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(l.longDate(today),
                  style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant)),
            ),
            if (history.isDemo) const DemoBadge(),
          ],
        ),
        const SizedBox(height: 20),
        Center(
          child: ProgressRing(
            ratio: progress.ratio ?? 0,
            size: 240,
            color: colors.progress,
            achievedColor: colors.achieved,
            trackColor: colors.track,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(fmt.integer(steps),
                    style: theme.textTheme.displaySmall
                        ?.copyWith(fontWeight: FontWeight.w800)),
                Text('${l.steps} · ${l.goalOf(fmt.integer(goal))}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant)),
                const SizedBox(height: 6),
                Text(fr(l, percent),
                    style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: progress.achieved
                            ? colors.achieved
                            : colors.progress)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          l.encouragement(percent, goal - steps, fmt.integer(goal - steps)),
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyLarge,
        ),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: StatTile(
                icon: Icons.route_outlined,
                value:
                    '${distance.unit == 'm' ? fmt.integer(distance.value.round()) : fmt.decimal(distance.value)} ${distance.unit}',
                label: '${l.distance} · ${l.estimated}',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: StatTile(
                icon: Icons.local_fire_department_outlined,
                value: '≈ ${fmt.integer(kcal.round())} kcal',
                label: '${l.calories} · ${l.estimated}',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: l.streak,
          trailing: streak.best > 0
              ? Text(l.bestStreak(streak.best),
                  style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant))
              : null,
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: (streak.isAlive ? colors.achieved : colors.track)
                      .withValues(alpha: streak.isAlive ? 0.15 : 1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(Icons.local_fire_department_rounded,
                    size: 30,
                    color: streak.isAlive
                        ? colors.achieved
                        : theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                        streak.isAlive
                            ? l.streakDays(streak.current)
                            : l.streakNone,
                        style: streak.isAlive
                            ? theme.textTheme.titleLarge
                                ?.copyWith(fontWeight: FontWeight.w700)
                            : theme.textTheme.bodyMedium),
                    if (streak.isAlive && settings.graceDaysPerWeek > 0)
                      Text(
                        l.graceLeft(settings.graceDaysPerWeek -
                            streak.graceDaysUsedThisWeek),
                        style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: l.thisWeek,
          trailing: Text(l.daysAchieved(week.daysAchieved, daysElapsed),
              style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant)),
          child: StepBarChart(
            bars: weekBars,
            height: 110,
            barColor: colors.progress,
            achievedColor: colors.achieved,
            noDataColor: colors.noData,
            goalLineColor: theme.colorScheme.onSurfaceVariant
                .withValues(alpha: 0.6),
            labelStyle: theme.textTheme.bodySmall!
                .copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          l.lastUpdated(fmt.time(history.lastUpdated)),
          textAlign: TextAlign.center,
          style: theme.textTheme.bodySmall
              ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
      ],
    );
  }

  static String fr(L10n l, int percent) =>
      l.fr ? '$percent %' : '$percent%';
}
