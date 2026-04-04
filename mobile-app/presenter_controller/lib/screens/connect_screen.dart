// lib/screens/connect_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'dart:convert';
import '../providers/presentation_provider.dart';
import '../services/websocket_service.dart';

class ConnectScreen extends StatefulWidget {
  const ConnectScreen({super.key});

  @override
  State<ConnectScreen> createState() => _ConnectScreenState();
}

class _ConnectScreenState extends State<ConnectScreen> {
  final _ipController = TextEditingController();
  final _portController = TextEditingController(text: '8765');
  final _nameController = TextEditingController(text: 'Mobile Controller');
  bool _isScanning = false;

  @override
  void dispose() {
    _ipController.dispose();
    _portController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _connect() {
    final ip = _ipController.text.trim();
    final port = _portController.text.trim();
    final name = _nameController.text.trim();

    if (ip.isEmpty || port.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter IP and Port')),
      );
      return;
    }

    final serverUrl = 'http://$ip:$port';
    final provider =
        Provider.of<PresentationProvider>(context, listen: false);
    provider.connect(serverUrl, name: name);
  }

  void _handleQRCode(String code) {
    try {
      final data = jsonDecode(code);
      if (data['wsUrl'] != null) {
        final url = data['wsUrl'] as String;
        // Parse IP and port from ws://IP:PORT
        final uri = Uri.parse(url);
        setState(() {
          _ipController.text = uri.host;
          _portController.text = uri.port.toString();
          _isScanning = false;
        });
        // Auto-connect
        _connect();
      }
    } catch (e) {
      // Try as plain URL
      if (code.startsWith('ws://') || code.startsWith('http://')) {
        final uri = Uri.parse(code);
        setState(() {
          _ipController.text = uri.host;
          _portController.text = uri.port.toString();
          _isScanning = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<PresentationProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('🎤 Presenter Controller'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Logo / Header
            const Icon(
              Icons.cast_connected,
              size: 80,
              color: Colors.blue,
            ),
            const SizedBox(height: 16),
            const Text(
              'Connect to Presenter',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Enter the server IP or scan QR code',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 32),

            // QR Scanner
            if (_isScanning) ...[
              Container(
                height: 300,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.blue, width: 2),
                ),
                clipBehavior: Clip.hardEdge,
                child: MobileScanner(
                  onDetect: (capture) {
                    final List<Barcode> barcodes = capture.barcodes;
                    for (final barcode in barcodes) {
                      if (barcode.rawValue != null) {
                        _handleQRCode(barcode.rawValue!);
                        break;
                      }
                    }
                  },
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => setState(() => _isScanning = false),
                child: const Text('Cancel Scanning'),
              ),
            ] else ...[
              ElevatedButton.icon(
                onPressed: () => setState(() => _isScanning = true),
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Scan QR Code'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: Colors.blue.shade700,
                ),
              ),
            ],

            const SizedBox(height: 24),

            // Divider
            Row(
              children: [
                Expanded(child: Divider(color: Colors.grey.shade700)),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    'OR ENTER MANUALLY',
                    style: TextStyle(
                      color: Colors.grey,
                      fontSize: 12,
                    ),
                  ),
                ),
                Expanded(child: Divider(color: Colors.grey.shade700)),
              ],
            ),

            const SizedBox(height: 24),

            // Device Name
            TextField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'Device Name',
                prefixIcon: const Icon(Icons.smartphone),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: const Color(0xFF1A1A2E),
              ),
            ),
            const SizedBox(height: 16),

            // IP Address
            TextField(
              controller: _ipController,
              decoration: InputDecoration(
                labelText: 'Server IP Address',
                hintText: '192.168.1.100',
                prefixIcon: const Icon(Icons.wifi),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: const Color(0xFF1A1A2E),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),

            // Port
            TextField(
              controller: _portController,
              decoration: InputDecoration(
                labelText: 'Port',
                hintText: '8765',
                prefixIcon: const Icon(Icons.settings_ethernet),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: const Color(0xFF1A1A2E),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 24),

            // Connect Button
            ElevatedButton(
              onPressed: provider.connectionStatus ==
                      ConnectionStatus.connecting
                  ? null
                  : _connect,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.green.shade700,
              ),
              child: provider.connectionStatus ==
                      ConnectionStatus.connecting
                  ? const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(width: 12),
                        Text('Connecting...'),
                      ],
                    )
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.cast_connected),
                        SizedBox(width: 8),
                        Text(
                          'Connect',
                          style: TextStyle(fontSize: 16),
                        ),
                      ],
                    ),
            ),

            // Error message
            if (provider.connectionStatus == ConnectionStatus.error) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade900.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.shade700),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.error_outline, color: Colors.red),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Connection failed. Make sure you\'re on the '
                        'same WiFi network and the server is running.',
                        style: TextStyle(
                          color: Colors.red,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 32),

            // Help section
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade900.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.blue.shade800.withOpacity(0.5),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.help_outline,
                          color: Colors.blue, size: 18),
                      SizedBox(width: 8),
                      Text(
                        'How to Connect',
                        style: TextStyle(
                          color: Colors.blue,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildHelpStep(
                      '1', 'Open Presenter App on your PC/Laptop'),
                  _buildHelpStep('2',
                      'Click "Connect" button to see QR code & IP'),
                  _buildHelpStep('3',
                      'Make sure both devices are on the same WiFi'),
                  _buildHelpStep(
                      '4', 'Scan QR code or enter IP manually'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHelpStep(String number, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              color: Colors.blue.shade800,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                number,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: Colors.grey.shade300,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
