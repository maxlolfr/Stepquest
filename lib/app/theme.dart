import 'package:flutter/material.dart';

/// Visual identity: calm forest green for progress, warm coral for
/// achievements and streaks, soft paper background. Encouraging, not
/// aggressive (no red, no "failure" colors).
class AppColors {
  static const forest = Color(0xFF1E5B45);
  static const coral = Color(0xFFFF7A59);
  static const paper = Color(0xFFF6F3EC);
  static const night = Color(0xFF0F1713);
}

/// Extra colors not covered by Material's ColorScheme.
@immutable
class StepColors extends ThemeExtension<StepColors> {
  const StepColors({
    required this.progress,
    required this.achieved,
    required this.track,
    required this.noData,
  });

  final Color progress;
  final Color achieved;
  final Color track;
  final Color noData;

  static StepColors of(BuildContext context) =>
      Theme.of(context).extension<StepColors>()!;

  @override
  StepColors copyWith(
          {Color? progress, Color? achieved, Color? track, Color? noData}) =>
      StepColors(
        progress: progress ?? this.progress,
        achieved: achieved ?? this.achieved,
        track: track ?? this.track,
        noData: noData ?? this.noData,
      );

  @override
  StepColors lerp(ThemeExtension<StepColors>? other, double t) {
    if (other is! StepColors) return this;
    return StepColors(
      progress: Color.lerp(progress, other.progress, t)!,
      achieved: Color.lerp(achieved, other.achieved, t)!,
      track: Color.lerp(track, other.track, t)!,
      noData: Color.lerp(noData, other.noData, t)!,
    );
  }
}

ThemeData buildTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: AppColors.forest,
    brightness: brightness,
  ).copyWith(
    surface: dark ? AppColors.night : AppColors.paper,
    primary: dark ? const Color(0xFF7FD3AE) : AppColors.forest,
    tertiary: AppColors.coral,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: scheme.surface,
    cardTheme: CardThemeData(
      elevation: 0,
      color: dark ? const Color(0xFF18231D) : Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      margin: EdgeInsets.zero,
    ),
    textTheme: Typography.material2021(platform: TargetPlatform.iOS)
        .black
        .apply(
          bodyColor: dark ? Colors.white : const Color(0xFF16231C),
          displayColor: dark ? Colors.white : const Color(0xFF16231C),
        ),
    extensions: [
      StepColors(
        progress: scheme.primary,
        achieved: AppColors.coral,
        track: dark ? const Color(0xFF26352D) : const Color(0xFFE7E2D6),
        noData: dark ? const Color(0xFF3A4A41) : const Color(0xFFCFC8B8),
      ),
    ],
  );
}
