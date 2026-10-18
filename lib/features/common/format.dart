/// Number formatting without extra dependencies.
class Fmt {
  const Fmt(this.lang);

  final String lang;

  bool get _fr => lang == 'fr';

  /// 12345 → "12 345" (fr, narrow no-break space) or "12,345" (en).
  String integer(int n) {
    final negative = n < 0;
    final digits = n.abs().toString();
    final buf = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) {
        buf.write(_fr ? ' ' : ',');
      }
      buf.write(digits[i]);
    }
    return '${negative ? '-' : ''}$buf';
  }

  /// 7.5 → "7,5" (fr) or "7.5" (en).
  String decimal(double v, {int digits = 1}) {
    final s = v.toStringAsFixed(digits);
    return _fr ? s.replaceAll('.', ',') : s;
  }

  /// 0.123 → "+12 %" (fr) or "+12%" (en).
  String signedPercent(double ratio) {
    final p = (ratio * 100).round();
    final sign = p > 0 ? '+' : (p < 0 ? '−' : '');
    return _fr ? '$sign${p.abs()} %' : '$sign${p.abs()}%';
  }

  String time(DateTime t) {
    final local = t.toLocal();
    final h = local.hour.toString().padLeft(2, '0');
    final m = local.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}
