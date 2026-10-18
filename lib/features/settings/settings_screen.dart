import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/l10n.dart';
import '../../app/providers.dart';
import '../../domain/estimates/units.dart';
import '../common/format.dart';
import '../common/widgets.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  /// Slider value while dragging; saved as a goal change on release.
  double? _draftGoal;

  static const _minGoal = 1000.0;
  static const _maxGoal = 30000.0;

  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context);
    final fmt = Fmt(l.lang);
    final theme = Theme.of(context);
    final settings = ref.watch(settingsProvider);
    final notifier = ref.read(settingsProvider.notifier);
    final today = ref.watch(todayProvider);
    final goal = settings.goalToday(today).steps;
    final shownGoal = (_draftGoal ?? goal.toDouble())
        .clamp(_minGoal, _maxGoal)
        .toDouble();
    final muted = theme.textTheme.bodySmall
        ?.copyWith(color: theme.colorScheme.onSurfaceVariant);
    final imperial = settings.units == UnitSystem.imperial;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        SectionCard(
          title: l.dailyGoal,
          trailing: Text('${fmt.integer(shownGoal.round())} ${l.steps}',
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Slider(
                value: shownGoal,
                min: _minGoal,
                max: _maxGoal,
                divisions: ((_maxGoal - _minGoal) / 500).round(),
                onChanged: (v) => setState(() => _draftGoal = v),
                onChangeEnd: (v) {
                  notifier.setGoal(v.round());
                  setState(() => _draftGoal = null);
                },
              ),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  for (final preset in const [5000, 6000, 8000, 10000, 12000])
                    ChoiceChip(
                      label: Text(fmt.integer(preset)),
                      selected: goal == preset,
                      onSelected: (_) => notifier.setGoal(preset),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(l.dailyGoalHelp, style: muted),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: l.units,
          child: SegmentedButton<UnitSystem>(
            segments: [
              ButtonSegment(value: UnitSystem.metric, label: Text(l.metric)),
              ButtonSegment(
                  value: UnitSystem.imperial, label: Text(l.imperial)),
            ],
            selected: {settings.units},
            showSelectedIcon: false,
            onSelectionChanged: (s) => notifier.setUnits(s.first),
          ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: l.weekStart,
          child: SegmentedButton<int>(
            segments: [
              ButtonSegment(value: DateTime.monday, label: Text(l.monday)),
              ButtonSegment(value: DateTime.sunday, label: Text(l.sunday)),
            ],
            selected: {settings.weekStartsOn},
            showSelectedIcon: false,
            onSelectionChanged: (s) => notifier.setWeekStart(s.first),
          ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: l.graceDays,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SegmentedButton<int>(
                segments: [
                  for (final n in const [0, 1, 2])
                    ButtonSegment(value: n, label: Text('$n')),
                ],
                selected: {settings.graceDaysPerWeek},
                showSelectedIcon: false,
                onSelectionChanged: (s) => notifier.setGraceDays(s.first),
              ),
              const SizedBox(height: 8),
              Text(l.graceDaysHelp, style: muted),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: l.profile,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _ProfileRow(
                label: l.height,
                value: settings.heightCm == null
                    ? l.notSet
                    : (imperial
                        ? '${fmt.decimal(Units.cmToInches(settings.heightCm!), digits: 0)} in'
                        : '${settings.heightCm!.round()} cm'),
                onTap: () => _editNumber(
                  title: l.height,
                  unit: imperial ? 'in' : 'cm',
                  initial: settings.heightCm == null
                      ? null
                      : (imperial
                          ? Units.cmToInches(settings.heightCm!)
                          : settings.heightCm!),
                  toCanonical: (v) => imperial ? Units.inchesToCm(v) : v,
                  isValid: (cm) => cm >= 50 && cm <= 260,
                  onSave: notifier.setHeight,
                ),
              ),
              _ProfileRow(
                label: l.weight,
                value: settings.weightKg == null
                    ? l.notSet
                    : (imperial
                        ? '${Units.kgToPounds(settings.weightKg!).round()} lb'
                        : '${fmt.decimal(settings.weightKg!, digits: settings.weightKg! % 1 == 0 ? 0 : 1)} kg'),
                onTap: () => _editNumber(
                  title: l.weight,
                  unit: imperial ? 'lb' : 'kg',
                  initial: settings.weightKg == null
                      ? null
                      : (imperial
                          ? Units.kgToPounds(settings.weightKg!)
                          : settings.weightKg!),
                  toCanonical: (v) => imperial ? Units.poundsToKg(v) : v,
                  isValid: (kg) => kg >= 20 && kg <= 400,
                  onSave: notifier.setWeight,
                ),
              ),
              const SizedBox(height: 6),
              Text(l.profileHelp, style: muted),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: l.language,
          child: SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'system', label: Text(l.system)),
              const ButtonSegment(value: 'fr', label: Text('Français')),
              const ButtonSegment(value: 'en', label: Text('English')),
            ],
            selected: {settings.languageCode ?? 'system'},
            showSelectedIcon: false,
            onSelectionChanged: (s) =>
                notifier.setLanguage(s.first == 'system' ? null : s.first),
          ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: l.about,
          child: Text(l.aboutText, style: theme.textTheme.bodyMedium),
        ),
        const SizedBox(height: 12),
        SectionCard(
          title: l.demoBadge,
          child: Text(l.demoExplain, style: theme.textTheme.bodyMedium),
        ),
      ],
    );
  }

  Future<void> _editNumber({
    required String title,
    required String unit,
    required double? initial,
    required double Function(double) toCanonical,
    required bool Function(double) isValid,
    required void Function(double?) onSave,
  }) async {
    final l = L10n.of(context);
    final controller = TextEditingController(
        text: initial == null ? '' : initial.round().toString());
    final result = await showDialog<_EditResult>(
      context: context,
      builder: (ctx) {
        String? error;
        return StatefulBuilder(
          builder: (ctx, setDialogState) => AlertDialog(
            title: Text(title),
            content: TextField(
              controller: controller,
              autofocus: true,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
              ],
              decoration: InputDecoration(suffixText: unit, errorText: error),
            ),
            actions: [
              TextButton(
                onPressed: () =>
                    Navigator.pop(ctx, const _EditResult.clear()),
                child: Text(l.clear),
              ),
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(l.cancel),
              ),
              FilledButton(
                onPressed: () {
                  final v = double.tryParse(
                      controller.text.trim().replaceAll(',', '.'));
                  if (v == null || !isValid(toCanonical(v))) {
                    setDialogState(() => error = l.invalidValue);
                    return;
                  }
                  Navigator.pop(ctx, _EditResult(toCanonical(v)));
                },
                child: Text(l.save),
              ),
            ],
          ),
        );
      },
    );
    controller.dispose();
    if (result != null) onSave(result.value);
  }
}

class _EditResult {
  const _EditResult(this.value);
  const _EditResult.clear() : value = null;
  final double? value;
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow(
      {required this.label, required this.value, required this.onTap});
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Expanded(child: Text(label, style: theme.textTheme.bodyLarge)),
            Text(value,
                style: theme.textTheme.bodyLarge
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right_rounded,
                color: theme.colorScheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}
