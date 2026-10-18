import '../../core/time/local_date.dart';

/// Thrown when a goal value is refused (spec M02: zero or negative refused).
class InvalidGoalException implements Exception {
  InvalidGoalException(this.message);
  final String message;
  @override
  String toString() => 'InvalidGoalException: $message';
}

/// A validated daily step goal.
class StepGoal {
  StepGoal(this.steps) {
    if (steps < minSteps || steps > maxSteps) {
      throw InvalidGoalException(
          'Goal must be between $minSteps and $maxSteps steps (got $steps)');
    }
  }

  static const minSteps = 1;
  static const maxSteps = 100000;
  static const defaultSteps = 8000;

  final int steps;

  @override
  bool operator ==(Object other) => other is StepGoal && other.steps == steps;
  @override
  int get hashCode => steps.hashCode;
  @override
  String toString() => 'StepGoal($steps)';
}

/// One change of goal, effective from [effectiveFrom] onwards.
class GoalChange {
  const GoalChange(this.effectiveFrom, this.goal);
  final LocalDate effectiveFrom;
  final StepGoal goal;
}

/// History of goal changes, so each past day is judged against the goal that
/// was in force that day (docs/DECISIONS.md D09).
class GoalHistory {
  GoalHistory(Iterable<GoalChange> changes, {StepGoal? initial})
      : _initial = initial ?? StepGoal(StepGoal.defaultSteps),
        _changes = _normalize(changes);

  final StepGoal _initial;
  final List<GoalChange> _changes;

  /// Sorted by date; several changes on the same day keep the last one.
  static List<GoalChange> _normalize(Iterable<GoalChange> changes) {
    final byDay = <LocalDate, GoalChange>{};
    for (final c in changes) {
      byDay[c.effectiveFrom] = c;
    }
    return byDay.values.toList()
      ..sort((a, b) => a.effectiveFrom.compareTo(b.effectiveFrom));
  }

  List<GoalChange> get changes => List.unmodifiable(_changes);

  StepGoal goalOn(LocalDate date) {
    var goal = _initial;
    for (final c in _changes) {
      if (c.effectiveFrom.isAfter(date)) break;
      goal = c.goal;
    }
    return goal;
  }

  /// Returns a new history with [goal] effective from [from].
  GoalHistory withChange(LocalDate from, StepGoal goal) =>
      GoalHistory([..._changes, GoalChange(from, goal)], initial: _initial);
}
