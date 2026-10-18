import 'package:flutter/material.dart';

/// One bar of a [StepBarChart].
class BarData {
  const BarData({
    required this.steps,
    required this.goal,
    this.label,
    this.future = false,
  });

  /// Future day: only the label is drawn.
  final bool future;

  /// Null when the day has no data: drawn as a dashed outline, never as 0.
  final int? steps;
  final int goal;
  final String? label;

  bool get achieved => steps != null && steps! >= goal;
}

/// Simple bar chart with a goal line, drawn without any chart library.
class StepBarChart extends StatelessWidget {
  const StepBarChart({
    super.key,
    required this.bars,
    required this.height,
    required this.barColor,
    required this.achievedColor,
    required this.noDataColor,
    required this.goalLineColor,
    required this.labelStyle,
    this.highlightLast = false,
  });

  final List<BarData> bars;
  final double height;
  final Color barColor;
  final Color achievedColor;
  final Color noDataColor;
  final Color goalLineColor;
  final TextStyle labelStyle;

  /// Lighter last bar, for "today" (still in progress).
  final bool highlightLast;

  @override
  Widget build(BuildContext context) {
    final hasLabels = bars.any((b) => b.label != null);
    return SizedBox(
      height: height + (hasLabels ? 22 : 0),
      child: CustomPaint(
        size: Size.infinite,
        painter: _BarPainter(
          bars: bars,
          chartHeight: height,
          barColor: barColor,
          achievedColor: achievedColor,
          noDataColor: noDataColor,
          goalLineColor: goalLineColor,
          labelStyle: labelStyle,
          highlightLast: highlightLast,
        ),
      ),
    );
  }
}

class _BarPainter extends CustomPainter {
  _BarPainter({
    required this.bars,
    required this.chartHeight,
    required this.barColor,
    required this.achievedColor,
    required this.noDataColor,
    required this.goalLineColor,
    required this.labelStyle,
    required this.highlightLast,
  });

  final List<BarData> bars;
  final double chartHeight;
  final Color barColor;
  final Color achievedColor;
  final Color noDataColor;
  final Color goalLineColor;
  final TextStyle labelStyle;
  final bool highlightLast;

  @override
  void paint(Canvas canvas, Size size) {
    if (bars.isEmpty) return;
    var maxValue = 1;
    for (final b in bars) {
      if (b.goal > maxValue) maxValue = b.goal;
      if ((b.steps ?? 0) > maxValue) maxValue = b.steps!;
    }
    final top = maxValue * 1.1;
    final slot = size.width / bars.length;
    final gap = (slot * 0.28).clamp(1.0, 10.0).toDouble();
    final barWidth = (slot - gap).clamp(1.0, 36.0).toDouble();
    final radius = Radius.circular((barWidth / 2).clamp(1.0, 6.0).toDouble());

    double y(num v) => chartHeight - (v / top) * chartHeight;

    for (var i = 0; i < bars.length; i++) {
      final b = bars[i];
      final cx = slot * i + slot / 2;
      final left = cx - barWidth / 2;
      if (b.future) {
        // Nothing to draw yet.
      } else if (b.steps == null) {
        // No data: small dashed outline at the bottom, distinct from zero.
        final rect = RRect.fromLTRBR(
            left, chartHeight - 14, left + barWidth, chartHeight, radius);
        canvas.drawRRect(
            rect,
            Paint()
              ..color = noDataColor
              ..style = PaintingStyle.stroke
              ..strokeWidth = 1.2);
      } else {
        final h = (chartHeight - y(b.steps!)).clamp(2.0, chartHeight).toDouble();
        var color = b.achieved ? achievedColor : barColor;
        if (highlightLast && i == bars.length - 1) {
          color = color.withValues(alpha: 0.55);
        }
        canvas.drawRRect(
          RRect.fromLTRBAndCorners(
              left, chartHeight - h, left + barWidth, chartHeight,
              topLeft: radius, topRight: radius),
          Paint()..color = color,
        );
      }
      if (b.label != null) {
        final tp = TextPainter(
          text: TextSpan(text: b.label, style: labelStyle),
          textDirection: TextDirection.ltr,
        )..layout();
        tp.paint(canvas, Offset(cx - tp.width / 2, chartHeight + 6));
      }
    }

    // Goal line, following goal changes over time.
    final dash = Paint()
      ..color = goalLineColor
      ..strokeWidth = 1.4;
    for (var i = 0; i < bars.length; i++) {
      final gy = y(bars[i].goal);
      final x0 = slot * i;
      for (var x = x0; x < x0 + slot; x += 6) {
        canvas.drawLine(Offset(x, gy), Offset((x + 3).clamp(x0, x0 + slot).toDouble(), gy),
            dash);
      }
    }
  }

  @override
  bool shouldRepaint(_BarPainter old) => true;
}
