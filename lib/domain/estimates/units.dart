enum UnitSystem { metric, imperial }

/// A distance ready to display, e.g. (3.2, "km").
class DisplayDistance {
  const DisplayDistance(this.value, this.unit);
  final double value;
  final String unit;
  @override
  String toString() => '${value.toStringAsFixed(unit == 'm' ? 0 : 1)} $unit';
}

class Units {
  const Units._();

  static const metersPerMile = 1609.344;
  static const metersPerFoot = 0.3048;
  static const kgPerPound = 0.45359237;
  static const cmPerInch = 2.54;

  /// Meters below 1 km, kilometers above (metric); miles (imperial).
  static DisplayDistance distance(double meters, UnitSystem system) {
    switch (system) {
      case UnitSystem.metric:
        return meters < 1000
            ? DisplayDistance(meters, 'm')
            : DisplayDistance(meters / 1000, 'km');
      case UnitSystem.imperial:
        return DisplayDistance(meters / metersPerMile, 'mi');
    }
  }

  static double poundsToKg(double lb) => lb * kgPerPound;
  static double kgToPounds(double kg) => kg / kgPerPound;
  static double inchesToCm(double inches) => inches * cmPerInch;
  static double cmToInches(double cm) => cm / cmPerInch;
}
