// lib/widgets/connection_status.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/presentation_provider.dart';
import '../services/websocket_service.dart';

class ConnectionStatusWidget extends StatelessWidget {
  const ConnectionStatusWidget({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<PresentationProvider>(context);

    Color statusColor;
    IconData statusIcon;
    String statusText;

    switch (provider.connectionStatus) {
      case ConnectionStatus.connected:
        statusColor = Colors.green;
        statusIcon = Icons.wifi;
        statusText = 'Connected';
        break;
      case ConnectionStatus.connecting:
        statusColor = Colors.orange;
        statusIcon = Icons.wifi_find;
        statusText = 'Connecting';
        break;
      case ConnectionStatus.error:
        statusColor = Colors.red;
        statusIcon = Icons.wifi_off;
        statusText = 'Error';
        break;
      case ConnectionStatus.disconnected:
        statusColor = Colors.grey;
        statusIcon = Icons.wifi_off;
        statusText = 'Disconnected';
        break;
    }

    return Tooltip(
      message: statusText,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: statusColor.withOpacity(0.15),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: statusColor.withOpacity(0.3),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(statusIcon, color: statusColor, size: 14),
            const SizedBox(width: 4),
            if (provider.connectionStatus == ConnectionStatus.connecting)
              SizedBox(
                width: 10,
                height: 10,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: statusColor,
                ),
              )
            else
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: statusColor,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}