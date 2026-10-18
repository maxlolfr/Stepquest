/// A calendar date without time or time zone (e.g. 2026-10-18).
///
/// Used as the key for daily step totals so that a day is never ambiguous.
class LocalDate implements Comparable<LocalDate> {
  LocalDate(this.year, this.month, this.day) {
    final normalized = DateTime.utc(year, month, day);
    if (normalized.year != year ||
        normalized.month != month ||
        normalized.day != day) {
      throw ArgumentError('Invalid date: $year-$month-$day');
    }
  }

  /// Calendar date of a wall-clock DateTime (its year/month/day fields).
  factory LocalDate.fromDateTime(DateTime dt) =>
      LocalDate(dt.year, dt.month, dt.day);

  /// Parses `YYYY-MM-DD`.
  factory LocalDate.parse(String iso) {
    final parts = iso.split('-');
    if (parts.length != 3) throw FormatException('Invalid date: $iso');
    return LocalDate(
        int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
  }

  final int year;
  final int month;
  final int day;

  DateTime get _utcMidnight => DateTime.utc(year, month, day);

  LocalDate addDays(int days) {
    // UTC arithmetic: no daylight-saving surprises.
    final dt = _utcMidnight.add(Duration(days: days));
    return LocalDate(dt.year, dt.month, dt.day);
  }

  /// Number of days from [other] to this date (positive if this is later).
  int daysSince(LocalDate other) =>
      _utcMidnight.difference(other._utcMidnight).inDays;

  /// ISO weekday: Monday = 1 … Sunday = 7.
  int get weekday => _utcMidnight.weekday;

  /// First day of the week containing this date.
  /// [weekStartsOn] uses ISO numbering (1 = Monday, 7 = Sunday).
  LocalDate startOfWeek({int weekStartsOn = DateTime.monday}) {
    final offset = (weekday - weekStartsOn + 7) % 7;
    return addDays(-offset);
  }

  bool isBefore(LocalDate other) => compareTo(other) < 0;
  bool isAfter(LocalDate other) => compareTo(other) > 0;

  @override
  int compareTo(LocalDate other) {
    if (year != other.year) return year.compareTo(other.year);
    if (month != other.month) return month.compareTo(other.month);
    return day.compareTo(other.day);
  }

  @override
  bool operator ==(Object other) =>
      other is LocalDate &&
      other.year == year &&
      other.month == month &&
      other.day == day;

  @override
  int get hashCode => Object.hash(year, month, day);

  @override
  String toString() =>
      '${year.toString().padLeft(4, '0')}-${month.toString().padLeft(2, '0')}'
      '-${day.toString().padLeft(2, '0')}';
}

/// Returns the UTC offset in force at a given instant.
///
/// In the app this is backed by the device time zone
/// (`instant.toLocal().timeZoneOffset`). In tests it is a fixed or scripted
/// function, which makes day grouping reproducible.
typedef OffsetResolver = Duration Function(DateTime utcInstant);

/// Offset resolver using the device's current time zone rules.
Duration deviceOffsetResolver(DateTime utcInstant) =>
    utcInstant.toLocal().timeZoneOffset;

/// Offset resolver for a fixed offset (tests, or a user-pinned zone).
OffsetResolver fixedOffset(Duration offset) => (_) => offset;

/// Local calendar date of a UTC instant, given the offset rules.
LocalDate localDateOf(DateTime utcInstant, OffsetResolver offsetAt) {
  final utc = utcInstant.toUtc();
  final wall = utc.add(offsetAt(utc));
  return LocalDate(wall.year, wall.month, wall.day);
}

/// UTC instant of local midnight starting [date].
///
/// Resolves the offset iteratively so it stays correct around offset changes.
DateTime startOfLocalDayUtc(LocalDate date, OffsetResolver offsetAt) {
  final wallMidnight = DateTime.utc(date.year, date.month, date.day);
  var guess = wallMidnight.subtract(offsetAt(wallMidnight));
  for (var i = 0; i < 3; i++) {
    final next = wallMidnight.subtract(offsetAt(guess));
    if (next == guess) break;
    guess = next;
  }
  return guess;
}
