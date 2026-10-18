import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/dashboard/dashboard_screen.dart';
import '../features/history/history_screen.dart';
import '../features/settings/settings_screen.dart';
import 'l10n.dart';
import 'providers.dart';
import 'theme.dart';

class StepQuestApp extends ConsumerWidget {
  const StepQuestApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final language = ref.watch(settingsProvider.select((s) => s.languageCode));
    return MaterialApp(
      title: 'StepQuest',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      locale: language == null ? null : Locale(language),
      supportedLocales: [for (final code in L10n.supported) Locale(code)],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      localeResolutionCallback: (device, supported) {
        for (final s in supported) {
          if (s.languageCode == device?.languageCode) return s;
        }
        return const Locale('en');
      },
      home: const HomeShell(),
    );
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _tab = 0;

  static const _screens = [
    DashboardScreen(),
    HistoryScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context);
    final titles = [l.today, l.history, l.settings];
    return Scaffold(
      appBar: AppBar(
        title: Text(_tab == 0 ? 'StepQuest' : titles[_tab],
            style: const TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
      ),
      body: SafeArea(
        top: false,
        child: IndexedStack(index: _tab, children: _screens),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: [
          NavigationDestination(
              icon: const Icon(Icons.directions_walk_outlined),
              selectedIcon: const Icon(Icons.directions_walk_rounded),
              label: l.today),
          NavigationDestination(
              icon: const Icon(Icons.bar_chart_outlined),
              selectedIcon: const Icon(Icons.bar_chart_rounded),
              label: l.history),
          NavigationDestination(
              icon: const Icon(Icons.tune_outlined),
              selectedIcon: const Icon(Icons.tune_rounded),
              label: l.settings),
        ],
      ),
    );
  }
}
