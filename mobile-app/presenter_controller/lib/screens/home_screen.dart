// lib/screens/home_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/presentation_provider.dart';
import '../services/websocket_service.dart';
import 'connect_screen.dart';
import 'controller_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<PresentationProvider>(
      builder: (context, provider, child) {
        if (provider.connectionStatus == ConnectionStatus.connected) {
          return const ControllerScreen();
        }
        return const ConnectScreen();
      },
    );
  }
}