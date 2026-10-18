import 'dart:math';

import 'package:flutter/material.dart';

/// Circular progress. Turns coral once the goal is reached.
class ProgressRing extends StatelessWidget {
  const ProgressRing({
    super.key,
    required this.ratio,
    required this.size,
    required this.color,
    required this.achievedColor,
    required this.trackColor,
    this.strokeWidth = 18,
    this.child,
  });

  /// Real ratio; values above 1 draw a second lap, up to 2.
  final double ratio;
  final double size;
  final Color color;
  final Color achievedColor;
  final Color trackColor;
  final double strokeWidth;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: ratio.clamp(0.0, 2.0).toDouble()),
      duration: const Duration(milliseconds: 900),
      curve: Curves.easeOutCubic,
      builder: (context, value, _) => SizedBox.square(
        dimension: size,
        child: CustomPaint(
          painter: _RingPainter(
            value: value,
            color: ratio >= 1 ? achievedColor : color,
            trackColor: trackColor,
            strokeWidth: strokeWidth,
          ),
          child: Center(child: child),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.value,
    required this.color,
    required this.trackColor,
    required this.strokeWidth,
  });

  final double value;
  final Color color;
  final Color trackColor;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final arcRect = rect.deflate(strokeWidth / 2);
    final track = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawArc(arcRect, 0, 2 * pi, false, track);

    if (value <= 0) return;
    final arc = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = strokeWidth;
    final firstLap = value.clamp(0.0, 1.0).toDouble();
    canvas.drawArc(arcRect, -pi / 2, 2 * pi * firstLap, false, arc);
    if (value > 1) {
      final secondLap = Paint()
        ..color = Color.lerp(color, Colors.white, 0.35)!
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = strokeWidth * 0.55;
      canvas.drawArc(
          arcRect, -pi / 2, 2 * pi * (value - 1), false, secondLap);
    }
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.value != value ||
      old.color != color ||
      old.trackColor != trackColor ||
      old.strokeWidth != strokeWidth;
}
