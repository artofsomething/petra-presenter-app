// lib/services/websocket_service.dart
import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../models/presentation.dart';
import '../models/slide.dart';

enum ConnectionStatus {
  disconnected,
  connecting,
  connected,
  error,
}

class WebSocketService {
  IO.Socket? _socket;
  ConnectionStatus _status = ConnectionStatus.disconnected;
  
  // Stream controllers
  final _statusController = StreamController<ConnectionStatus>.broadcast();
  final _presentationController = StreamController<Presentation>.broadcast();
  final _slideChangedController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _presentationStartedController = StreamController<void>.broadcast();
  final _presentationStoppedController = StreamController<void>.broadcast();
  final _blackScreenController = StreamController<bool>.broadcast();
  final _clientListController =
      StreamController<List<dynamic>>.broadcast();

  // Getters
  Stream<ConnectionStatus> get statusStream => _statusController.stream;
  Stream<Presentation> get presentationStream =>
      _presentationController.stream;
  Stream<Map<String, dynamic>> get slideChangedStream =>
      _slideChangedController.stream;
  Stream<void> get presentationStartedStream =>
      _presentationStartedController.stream;
  Stream<void> get presentationStoppedStream =>
      _presentationStoppedController.stream;
  Stream<bool> get blackScreenStream => _blackScreenController.stream;
  Stream<List<dynamic>> get clientListStream =>
      _clientListController.stream;

  ConnectionStatus get status => _status;
  bool get isConnected => _status == ConnectionStatus.connected;

  void connect(String serverUrl, {String name = 'Mobile Controller'}) {
    _updateStatus(ConnectionStatus.connecting);

    _socket = IO.io(
      serverUrl,
      IO.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .disableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(2000)
          .build(),
    );

    _socket!.onConnect((_) {
      print('Connected to server');
      _updateStatus(ConnectionStatus.connected);
      
      // Register as controller
      _socket!.emit('register', {
        'name': name,
        'role': 'controller',
      });
    });

    _socket!.onDisconnect((_) {
      print('Disconnected from server');
      _updateStatus(ConnectionStatus.disconnected);
    });

    _socket!.onConnectError((error) {
      print('Connection error: $error');
      _updateStatus(ConnectionStatus.error);
    });

    _socket!.onError((error) {
      print('Socket error: $error');
      _updateStatus(ConnectionStatus.error);
    });

    // Listen for events
    _socket!.on('sync-state', (data) {
      print('Received sync-state');
      if (data['presentation'] != null) {
        final presentation =
            Presentation.fromJson(data['presentation']);
        _presentationController.add(presentation);
      }
      if (data['currentSlideIndex'] != null) {
        _slideChangedController.add({
          'index': data['currentSlideIndex'],
        });
      }
    });

    _socket!.on('slide-changed', (data) {
      _slideChangedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('presentation-updated', (data) {
      final presentation = Presentation.fromJson(data);
      _presentationController.add(presentation);
    });

    _socket!.on('slide-updated', (data) {
      // Handle individual slide update
      _slideChangedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('presentation-started', (data) {
      _presentationStartedController.add(null);
      if (data != null && data['index'] != null) {
        _slideChangedController.add({
          'index': data['index'],
        });
      }
    });

    _socket!.on('presentation-stopped', (_) {
      _presentationStoppedController.add(null);
    });

    _socket!.on('black-screen-toggled', (value) {
      _blackScreenController.add(value as bool);
    });

    _socket!.on('client-list', (data) {
      _clientListController.add(data as List<dynamic>);
    });

    _socket!.on('slide-added', (data) {
      // Trigger full sync
      _socket!.emit('ping-server');
    });

    _socket!.on('slide-deleted', (data) {
      if (data['currentSlideIndex'] != null) {
        _slideChangedController.add({
          'index': data['currentSlideIndex'],
        });
      }
    });

    _socket!.on('slide-duplicated', (data) {
      // Trigger full sync
      _socket!.emit('ping-server');
    });

    // Connect
    _socket!.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _updateStatus(ConnectionStatus.disconnected);
  }

  // Navigation commands
  void nextSlide() {
    _socket?.emit('next-slide');
  }

  void prevSlide() {
    _socket?.emit('prev-slide');
  }

  void goToSlide(int index) {
    _socket?.emit('go-to-slide', index);
  }

  // Presentation control
 void startPresentation() {
    if (_socket == null || !isConnected) {
      print('⚠️ Cannot start presentation: not connected');
      return;
    }
    print('📤 Emitting start-presentation');
    _socket!.emit('start-presentation');
  }

  void stopPresentation() {
    if (_socket == null || !isConnected) {
      print('⚠️ Cannot stop presentation: not connected');
      return;
    }
    print('📤 Emitting stop-presentation');
    _socket!.emit('stop-presentation');
  }


  void toggleBlackScreen() {
    _socket?.emit('toggle-black-screen');
  }

  void _updateStatus(ConnectionStatus newStatus) {
    _status = newStatus;
    _statusController.add(newStatus);
  }

  void dispose() {
    disconnect();
    _statusController.close();
    _presentationController.close();
    _slideChangedController.close();
    _presentationStartedController.close();
    _presentationStoppedController.close();
    _blackScreenController.close();
    _clientListController.close();
  }
}