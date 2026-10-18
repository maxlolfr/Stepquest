import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/l10n.dart';
import '../../app/providers.dart';
import '../../app/theme.dart';
import '../../domain/history/history_stats.dart';
import '../../domain/steps/daily_steps.dart';
import '../common/bar_chart.dart';
import '../common/format.dart';
import '../common/widgets.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  int _window = 7;

  @override
  Widget build(BuildContext context) {
    final history = ref.watch(historyProvider);
    return history.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => ErrorMessage(error: e),
      data: _body,
    );
  }

  Widget _body(StepHistory h) {
    final l = L10n.of(context);
    final fmt = Fmt(l.lang);
    final theme = Theme.of(context);
    final colors = StepColors.of(context);
    final settings = ref.watch(settingsProvider);
    final today = ref.watch(todayProvider);
    const calc = HistoryStatsCalculator();

    final trend = calc.trend(history: h.days, today: today, days: _window);
    final w = trend.current;
    final change = trend.change;

    final windowDays = h.days
        .where((d) => !d.date.isBefore(w.from) && !d.date.isAfter(today))
        .toList();
    final labelEvery = _window == 7 ? 1 : (_window == 30 ? 7 : 30);
    final bars = [
      for (var i = 0; i < windowDays.length; i++)
        BarData(
          steps: windowDays[i].steps,
          goal: settings.goals.goalOn(windowDays[i].date).steps,
          label: _window == 7
              ? l.weekdayShort(windowDays[i].date.weekday)
              : ((windowDays.length - 1 - i) % labelEvery == 0
                  ? l.shortDate(windowDays[i].date)
                  : null),
        ),
    ];

    final muted = theme.textTheme.bodySmall
        ?.copyWith(color: theme.colorScheme.onSurfaceVariant);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        Row(
          children: [
            Expanded(
              child: SegmentedButton<int>(
                segments: [
                  for (final n in const [7, 30, 90])
                    ButtonSegment(value: n, label: Text(l.daysWindow(n))),
                ],
                selected: {_window},
                showSelectedIcon: false,
                onSelectionChanged: (s) => setState(() => _window = s.first),
              ),
            ),
            if (h.isDemo) ...[const SizedBox(width: 10), const DemoBadge()],
          ],
        ),
        const SizedBox(height: 16),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              StepBarChart(
                bars: bars,
                height: 150,
                barColor: colors.progress,
                achievedColor: colors.achieved,
                noDataColor: colors.noData,
                goalLineColor:
                    theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.6),
                labelStyle: muted!,
                highlightLast: true,
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 14,
                runSpacing: 6,
                children: [
                  _Legend(color: colors.progress, text: l.steps),
                  _Legend(color: colors.achieved, text: l.goalReached),
                  _Legend(
                      color: colors.noData, text: l.noDataDay, outline: true),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (!w.isReliable)
          SectionCard(
            child: Row(
              children: [
                Icon(Icons.hourglass_empty_rounded,
                    color: theme.colorScheme.onSurfaceVariant),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l.notEnoughData,
                          style: theme.textTheme.titleSmall),
                      Text(l.daysWithData(w.daysWithData, _window),
                          style: muted),
                    ],
                  ),
                ),
              ],
            ),
          )
        else ...[
          Row(
            children: [
              Expanded(
                child: StatTile(
                  icon: Icons.show_chart_rounded,
                  value: fmt.integer(w.average!.round()),
                  label: '${l.average} · ${l.perDay}',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatTile(
                  icon: change == null
                      ? Icons.trending_flat_rounded
                      : (change >= 0
                          ? Icons.trending_up_rounded
                          : Icons.trending_down_rounded),
                  value: change == null ? '—' : fmt.signedPercent(change),
                  label: change == null
                      ? l.notEnoughData
                      : '${l.trend} · ${l.vsPrevious(_window)}',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: StatTile(
                  icon: Icons.directions_walk_rounded,
                  value: fmt.integer(w.totalSteps),
                  label: '${l.total} · ${l.daysWithData(w.daysWithData, _window)}',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatTile(
                  icon: Icons.emoji_events_outlined,
                  value: fmt.integer(w.bestDay!.steps!),
                  label: '${l.bestDay} · ${l.shortDate(w.bestDay!.date)}',
                ),
              ),
            ],
          ),
        ],
        const SizedBox(height: 12),
        SectionCard(
          title: l.recentDays,
          child: Column(
            children: [
              for (final d in h.days.reversed.take(7)) _DayRow(day: d),
            ],
          ),
        ),
      ],
    );
  }
}

class _DayRow extends ConsumerWidget {
  const _DayRow({required this.day});
  final DailySteps day;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context);
    final fmt = Fmt(l.lang);
    final theme = Theme.of(context);
    final colors = StepColors.of(context);
    final goal = ref.watch(settingsProvider).goals.goalOn(day.date).steps;
    final steps = day.steps;
    final achieved = steps != null && steps >= goal;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        children: [
          Expanded(
            child: Text(
              day.status == DayStatus.inProgress
                  ? l.today
                  : l.longDate(day.date),
              style: theme.textTheme.bodyMedium,
            ),
          ),
          if (steps == null)
            Text(l.noDataDay,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant))
          else ...[
            Text(fmt.integer(steps),
                style: theme.textTheme.bodyMedium
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(width: 8),
            Icon(
              achieved
                  ? Icons.check_circle_rounded
                  : Icons.radio_button_unchecked_rounded,
              size: 18,
              color: achieved ? colors.achieved : colors.noData,
            ),
          ],
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.text, this.outline = false});
  final Color color;
  final String text;
  final bool outline;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: outline ? null : color,
            border: outline ? Border.all(color: color, width: 1.2) : null,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 6),
        Text(text,
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
      ],
    );
  }
}
