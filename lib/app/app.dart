import 'package:flutter/material.dart';

/// Placeholder shell. The real screens arrive in phase 2 (visual prototype).
class StepQuestApp extends StatelessWidget {
  const StepQuestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StepQuest',
      theme: ThemeData(colorSchemeSeed: const Color(0xFF2E7D5B)),
      darkTheme: ThemeData(
        colorSchemeSeed: const Color(0xFF2E7D5B),
        brightness: Brightness.dark,
      ),
      home: const Scaffold(
        body: Center(child: Text('StepQuest — fondations')),
      ),
    );
  }
}
