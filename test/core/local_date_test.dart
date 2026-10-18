import 'package:flutter_test/flutter_test.dart';
import 'package:stepquest/core/time/local_date.dart';

void main() {
  group('LocalDate', () {
    test('refuses impossible dates', () {
      expect(() => LocalDate(2026, 2, 30), throwsArgumentError);
      expect(() => LocalDate(2026, 13, 1), throwsArgumentError);
      expect(() => LocalDate(2025, 2, 29), throwsArgumentError);
      expect(LocalDate(2028, 2, 29).toString(), '2028-02-29');
    });

    test('adds days across months, years and leap days', () {
      expect(LocalDate(2026, 10, 31).addDays(1), LocalDate(2026, 11, 1));
      expect(LocalDate(2026, 12, 31).addDays(1), LocalDate(2027, 1, 1));
      expect(LocalDate(2028, 2, 28).addDays(1), LocalDate(2028, 2, 29));
      expect(LocalDate(2026, 3, 1).addDays(-1), LocalDate(2026, 2, 28));
    });

    test('daysSince and comparison', () {
      final a = LocalDate(2026, 10, 1);
      final b = LocalDate(2026, 10, 18);
      expect(b.daysSince(a), 17);
      expect(a.daysSince(b), -17);
      expect(a.isBefore(b), isTrue);
      expect(b.isAfter(a), isTrue);
      expect(LocalDate.parse('2026-10-18'), b);
    });

    test('start of week (Monday or Sunday)', () {
      final sunday = LocalDate(2026, 10, 18); // Sunday
      expect(sunday.weekday, DateTime.sunday);
      expect(sunday.startOfWeek(), LocalDate(2026, 10, 12));
      expect(sunday.startOfWeek(weekStartsOn: DateTime.sunday), sunday);
      final monday = LocalDate(2026, 10, 12);
      expect(monday.startOfWeek(), monday);
    });
  });

  group('time zones', () {
    final bangkok = fixedOffset(const Duration(hours: 7));

    test('local date of a UTC instant uses the offset', () {
      // 2026-10-17 18:30 UTC = 2026-10-18 01:30 in Bangkok.
      final instant = DateTime.utc(2026, 10, 17, 18, 30);
      expect(localDateOf(instant, bangkok), LocalDate(2026, 10, 18));
      expect(localDateOf(instant, fixedOffset(Duration.zero)),
          LocalDate(2026, 10, 17));
    });

    test('start of local day in UTC', () {
      expect(startOfLocalDayUtc(LocalDate(2026, 10, 18), bangkok),
          DateTime.utc(2026, 10, 17, 17));
    });

    test('start of local day around a daylight-saving change', () {
      // Paris: +1 before 2026-03-29 01:00 UTC, +2 after.
      Duration paris(DateTime utc) =>
          utc.isBefore(DateTime.utc(2026, 3, 29, 1))
              ? const Duration(hours: 1)
              : const Duration(hours: 2);
      expect(startOfLocalDayUtc(LocalDate(2026, 3, 29), paris),
          DateTime.utc(2026, 3, 28, 23));
      expect(startOfLocalDayUtc(LocalDate(2026, 3, 30), paris),
          DateTime.utc(2026, 3, 29, 22));
    });
  });
}
