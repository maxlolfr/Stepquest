import 'package:flutter/widgets.dart';

import '../core/time/local_date.dart';

/// App texts in French and English.
///
/// Hand-written on purpose: small, no code generation, easy to review.
class L10n {
  const L10n._(this.lang);

  final String lang;

  static const supported = ['fr', 'en'];

  static L10n of(BuildContext context) {
    final code = Localizations.localeOf(context).languageCode;
    return L10n._(supported.contains(code) ? code : 'en');
  }

  static L10n forCode(String code) => L10n._(code);

  bool get fr => lang == 'fr';

  String _t(String fr, String en) => this.fr ? fr : en;

  // Navigation
  String get today => _t("Aujourd'hui", 'Today');
  String get history => _t('Historique', 'History');
  String get settings => _t('Réglages', 'Settings');

  // Dashboard
  String get demoBadge => _t('Données de démo', 'Demo data');
  String get demoExplain => _t(
      'Ces chiffres sont fictifs. Les vrais pas de ton téléphone arriveront à la prochaine étape.',
      'These numbers are fake. Real steps from your phone come in the next step.');
  String get steps => _t('pas', 'steps');
  String goalOf(String goal) => _t('sur $goal', 'of $goal');
  String get distance => _t('Distance', 'Distance');
  String get calories => _t('Calories', 'Calories');
  String get estimated => _t('estimation', 'estimate');
  String get streak => _t('Série', 'Streak');
  String streakDays(int n) => _t(
      n <= 1 ? '$n jour' : '$n jours', n == 1 ? '$n day' : '$n days');
  String get streakNone =>
      _t('Atteins ton objectif aujourd\'hui pour lancer une série.',
          'Reach your goal today to start a streak.');
  String graceLeft(int n) => _t(
      n == 0
          ? 'Plus de journée de grâce cette semaine.'
          : (n == 1
              ? '1 journée de grâce disponible cette semaine.'
              : '$n journées de grâce disponibles cette semaine.'),
      n == 0
          ? 'No grace day left this week.'
          : (n == 1
              ? '1 grace day left this week.'
              : '$n grace days left this week.'));
  String bestStreak(int n) =>
      _t('Record : ${streakDays(n)}', 'Best: ${streakDays(n)}');
  String get thisWeek => _t('Cette semaine', 'This week');
  String daysAchieved(int done, int total) =>
      _t('$done / $total jours réussis', '$done / $total days achieved');
  String lastUpdated(String time) =>
      _t('Dernière mise à jour : $time', 'Last updated: $time');

  String encouragement(int percent, int remaining, String remainingText) {
    if (percent >= 100) {
      return _t('Objectif atteint. Bravo !', 'Goal reached. Well done!');
    }
    if (percent >= 75) {
      return _t('Presque ! Encore $remainingText pas.',
          'Almost there! $remainingText steps to go.');
    }
    if (percent >= 25) {
      return _t('Belle avancée. Continue à ton rythme.',
          'Good progress. Keep going at your pace.');
    }
    return _t('Chaque pas compte. Une petite marche suffit pour démarrer.',
        'Every step counts. A short walk is enough to start.');
  }

  // History
  String daysWindow(int n) => _t('$n j', '$n d');
  String get average => _t('Moyenne', 'Average');
  String get perDay => _t('par jour', 'per day');
  String get total => _t('Total', 'Total');
  String get bestDay => _t('Meilleur jour', 'Best day');
  String get trend => _t('Tendance', 'Trend');
  String vsPrevious(int n) =>
      _t('vs les $n jours précédents', 'vs previous $n days');
  String get notEnoughData =>
      _t('Pas encore assez de données', 'Not enough data yet');
  String daysWithData(int n, int of) =>
      _t('$n jours avec données sur $of', '$n days with data out of $of');
  String get noDataDay => _t('Pas de données', 'No data');
  String get goalLine => _t('Objectif', 'Goal');
  String get goalReached => _t('Objectif atteint', 'Goal reached');
  String get recentDays => _t('Derniers jours', 'Recent days');

  // Settings
  String get dailyGoal => _t('Objectif quotidien', 'Daily goal');
  String get dailyGoalHelp => _t(
      'Le nouvel objectif s\'applique à partir d\'aujourd\'hui. Les jours passés gardent le leur.',
      'The new goal applies from today. Past days keep theirs.');
  String get units => _t('Unités', 'Units');
  String get metric => _t('Métrique (km, kg)', 'Metric (km, kg)');
  String get imperial => _t('Impérial (mi, lb)', 'Imperial (mi, lb)');
  String get weekStart => _t('Début de semaine', 'Week starts on');
  String get monday => _t('Lundi', 'Monday');
  String get sunday => _t('Dimanche', 'Sunday');
  String get graceDays => _t('Journées de grâce', 'Grace days');
  String get graceDaysHelp => _t(
      'Jours manqués par semaine qui ne cassent pas ta série.',
      'Missed days per week that don\'t break your streak.');
  String get profile => _t('Profil (facultatif)', 'Profile (optional)');
  String get profileHelp => _t(
      'Sert uniquement à estimer la distance et les calories. Reste sur ton téléphone.',
      'Only used to estimate distance and calories. Stays on your phone.');
  String get height => _t('Taille', 'Height');
  String get weight => _t('Poids', 'Weight');
  String get notSet => _t('Non renseigné', 'Not set');
  String get clear => _t('Effacer', 'Clear');
  String get save => _t('Enregistrer', 'Save');
  String get cancel => _t('Annuler', 'Cancel');
  String get invalidValue => _t('Valeur non valide', 'Invalid value');
  String get language => _t('Langue', 'Language');
  String get system => _t('Système', 'System');
  String get about => _t('À propos des estimations', 'About estimates');
  String get aboutText => _t(
      'Distance et calories sont des estimations calculées à partir de tes pas, de ta taille et de ton poids. Ce ne sont pas des mesures médicales.',
      'Distance and calories are estimates based on your steps, height and weight. They are not medical measurements.');

  // Dates
  static const _daysFr = [
    'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'
  ];
  static const _daysEn = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
    'Sunday'
  ];
  static const _monthsFr = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
    'septembre', 'octobre', 'novembre', 'décembre'
  ];
  static const _monthsEn = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];

  String weekdayShort(int isoWeekday) {
    final name = (fr ? _daysFr : _daysEn)[isoWeekday - 1];
    return name.substring(0, 1).toUpperCase();
  }

  String longDate(LocalDate d) {
    if (fr) {
      final day = _daysFr[d.weekday - 1];
      return '${day[0].toUpperCase()}${day.substring(1)} ${d.day} ${_monthsFr[d.month - 1]}';
    }
    return '${_daysEn[d.weekday - 1]}, ${_monthsEn[d.month - 1]} ${d.day}';
  }

  String shortDate(LocalDate d) => fr
      ? '${d.day} ${_monthsFr[d.month - 1].substring(0, 3)}.'
      : '${_monthsEn[d.month - 1].substring(0, 3)} ${d.day}';
}
