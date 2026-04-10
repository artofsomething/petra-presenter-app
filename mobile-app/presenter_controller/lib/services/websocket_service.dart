// lib/services/websocket_service.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../models/presentation.dart';

enum ConnectionStatus {
  disconnected,
  connecting,
  connected,
  error,
}

class WebSocketService {
  IO.Socket? _socket;
  ConnectionStatus _status = ConnectionStatus.disconnected;

  // ✅ Our own socket ID — used to filter self-sent events
  String? _mySocketId;

  // ✅ Debounce rapid sync requests
  Timer? _syncDebounceTimer;

  // Stream controllers
  final _statusController              = StreamController<ConnectionStatus>.broadcast();
  final _presentationController        = StreamController<Presentation>.broadcast();
  final _slideChangedController        = StreamController<Map<String, dynamic>>.broadcast();
  final _presentationStartedController = StreamController<void>.broadcast();
  final _presentationStoppedController = StreamController<void>.broadcast();
  final _blackScreenController         = StreamController<bool>.broadcast();
  final _clientListController          = StreamController<List<dynamic>>.broadcast();
  final _assetResolvedController       = StreamController<Map<String, dynamic>>.broadcast();

  // Getters
  Stream<ConnectionStatus>     get statusStream               => _statusController.stream;
  Stream<Presentation>         get presentationStream         => _presentationController.stream;
  Stream<Map<String, dynamic>> get slideChangedStream         => _slideChangedController.stream;
  Stream<void>                 get presentationStartedStream  => _presentationStartedController.stream;
  Stream<void>                 get presentationStoppedStream  => _presentationStoppedController.stream;
  Stream<bool>                 get blackScreenStream          => _blackScreenController.stream;
  Stream<List<dynamic>>        get clientListStream           => _clientListController.stream;
  Stream<Map<String, dynamic>> get assetResolvedStream        => _assetResolvedController.stream;

  ConnectionStatus get status      => _status;
  bool             get isConnected => _status == ConnectionStatus.connected;

  // ✅ Check if an event was triggered by us
  bool _isSelf(dynamic data) {
    if (_mySocketId == null) return false;
    if (data is Map) {
      return data['senderId'] == _mySocketId;
    }
    return false;
  }

  void _requestSyncDebounced({int delayMs = 300}) {
    _syncDebounceTimer?.cancel();
    _syncDebounceTimer = Timer(Duration(milliseconds: delayMs), () {
      if (isConnected) {
        _socket?.emit('request-sync');
        debugPrint('[WS] 📤 request-sync (debounced)');
      }
    });
  }

  void connect(String serverUrl, {String name = 'Mobile Controller'}) {
    _updateStatus(ConnectionStatus.connecting);

    _socket = IO.io(
      serverUrl,
      IO.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .disableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(2000)
          .build(),
    );

    // ── Connection lifecycle ──────────────────────────────────────────────────
    _socket!.onConnect((_) {
      // ✅ Store our socket ID immediately on connect
      _mySocketId = _socket!.id;
      debugPrint('[WS] ✅ Connected: $_mySocketId');
      _updateStatus(ConnectionStatus.connected);

      _socket!.emit('register', {
        'name': name,
        'role': 'controller',
      });

      _requestSyncDebounced(delayMs: 300);
    });

    _socket!.onDisconnect((_) {
      debugPrint('[WS] ❌ Disconnected');
      _mySocketId = null; // ✅ Clear socket ID on disconnect
      _syncDebounceTimer?.cancel();
      _updateStatus(ConnectionStatus.disconnected);
    });

    _socket!.onConnectError((error) {
      debugPrint('[WS] ❌ Connect error: $error');
      _updateStatus(ConnectionStatus.error);
    });

    _socket!.onError((error) {
      debugPrint('[WS] ❌ Socket error: $error');
      _updateStatus(ConnectionStatus.error);
    });

    // ── asset-resolved ────────────────────────────────────────────────────────
    _socket!.on('asset-resolved', (data) {
      _assetResolvedController.add(Map<String, dynamic>.from(data));
    });

    // ── sync-state ────────────────────────────────────────────────────────────
    _socket!.on('sync-state', (data) {
      debugPrint('[WS] sync-state received');
      try {
        if (data['presentation'] != null) {
          final presentation = Presentation.fromJson(
            Map<String, dynamic>.from(data['presentation']),
          );
          _presentationController.add(presentation);
          debugPrint('[WS] sync-state: ${presentation.slides.length} slides');
        }

        // ✅ Only update slide index from sync-state if NOT currently navigating
        // sync-state is for initial load, not for navigation updates
        if (data['currentSlideIndex'] != null) {
          _slideChangedController.add({
            'index':    data['currentSlideIndex'],
            'senderId': 'sync', // ← mark as sync source, not navigation
          });
        }

        if (data['isBlackScreen'] != null) {
          _blackScreenController.add(data['isBlackScreen'] as bool);
        }
      } catch (e) {
        debugPrint('[WS] ❌ sync-state parse error: $e');
      }
    });

    // ── slide-changed ─────────────────────────────────────────────────────────
    _socket!.on('slide-changed', (data) {
      final map = Map<String, dynamic>.from(data);
      final senderId = map['senderId'];

      debugPrint('[WS] slide-changed: index=${map['index']} senderId=$senderId myId=$_mySocketId');

      // ✅ Ignore events WE triggered — server now tags senderId
      if (_isSelf(map)) {
        debugPrint('[WS] slide-changed: ignoring own echo (senderId=$senderId)');
        // ✅ But still update OUR local index silently
        _slideChangedController.add({...map, 'silent': true});
        return;
      }

      _slideChangedController.add(map);
    });

    // ── presentation-updated ──────────────────────────────────────────────────
    _socket!.on('presentation-updated', (data) {
      debugPrint('[WS] presentation-updated received');
      try {
        final raw = Map<String, dynamic>.from(data);

        if (raw['presentation'] != null) {
          final presentation = Presentation.fromJson(
            Map<String, dynamic>.from(raw['presentation']),
          );
          _presentationController.add(presentation);
          debugPrint('[WS] presentation-updated: ${presentation.slides.length} slides');
        }

        if (raw['currentSlideIndex'] != null) {
          _slideChangedController.add({
            'index':    raw['currentSlideIndex'],
            'senderId': 'server',
          });
        }
      } catch (e) {
        debugPrint('[WS] ❌ presentation-updated parse error: $e');
      }
    });

    // ── presentation-started ──────────────────────────────────────────────────
    _socket!.on('presentation-started', (data) {
      debugPrint('[WS] presentation-started');

      // ✅ If WE triggered this, ignore — we'll handle via ack if needed
      if (data != null && _isSelf(data)) {
        debugPrint('[WS] presentation-started: ignoring self-trigger');
        return;
      }

      _presentationStartedController.add(null);

      if (data != null) {
        final raw = Map<String, dynamic>.from(data);
        if (raw['index'] != null) {
          _slideChangedController.add({
            'index':    raw['index'],
            'senderId': 'server',
          });
        }
        if (raw['presentation'] != null) {
          try {
            final presentation = Presentation.fromJson(
              Map<String, dynamic>.from(raw['presentation']),
            );
            _presentationController.add(presentation);
          } catch (e) {
            debugPrint('[WS] ❌ presentation-started parse error: $e');
          }
        }
      }

      if (data == null || data['presentation'] == null) {
        _requestSyncDebounced(delayMs: 200);
      }
    });

    // ── presentation-stopped ──────────────────────────────────────────────────
    _socket!.on('presentation-stopped', (data) {
      debugPrint('[WS] presentation-stopped');

      // ✅ Ignore self-triggered
      if (data != null && _isSelf(data)) {
        debugPrint('[WS] presentation-stopped: ignoring self-trigger');
        return;
      }

      _presentationStoppedController.add(null);
    });

    // ── black-screen-toggled ──────────────────────────────────────────────────
    _socket!.on('black-screen-toggled', (data) {
      debugPrint('[WS] black-screen-toggled');

      // ✅ Handle both old format (bool) and new format ({value, senderId})
      if (data is bool) {
        _blackScreenController.add(data);
        return;
      }

      if (data is Map) {
        final map = Map<String, dynamic>.from(data);

        // ✅ Ignore self-triggered
        if (_isSelf(map)) {
          debugPrint('[WS] black-screen-toggled: ignoring self-trigger');
          // Still update local state silently
          if (map['value'] != null) {
            _blackScreenController.add(map['value'] as bool);
          }
          return;
        }

        if (map['value'] != null) {
          _blackScreenController.add(map['value'] as bool);
        }
      }
    });

    // ── client-list ───────────────────────────────────────────────────────────
    _socket!.on('client-list', (data) {
      _clientListController.add(data as List<dynamic>);
    });

    // ── slide-added / duplicated → debounced sync ─────────────────────────────
    _socket!.on('slide-added', (_) {
      debugPrint('[WS] slide-added → request-sync');
      _requestSyncDebounced();
    });

    _socket!.on('slide-duplicated', (_) {
      debugPrint('[WS] slide-duplicated → request-sync');
      _requestSyncDebounced();
    });

    // ── slide-deleted ─────────────────────────────────────────────────────────
    _socket!.on('slide-deleted', (data) {
      debugPrint('[WS] slide-deleted');
      if (data != null && data['currentSlideIndex'] != null) {
        _slideChangedController.add({
          'index':    data['currentSlideIndex'],
          'senderId': 'server',
        });
      }
      _requestSyncDebounced();
    });

    // ── slide-updated ─────────────────────────────────────────────────────────
    _socket!.on('slide-updated', (data) {
      debugPrint('[WS] slide-updated');
      if (data != null) {
        _slideChangedController.add(Map<String, dynamic>.from(data));
      }
    });

    _socket!.connect();
  }

  void disconnect() {
    _syncDebounceTimer?.cancel();
    _mySocketId = null;
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _updateStatus(ConnectionStatus.disconnected);
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  void nextSlide()      => _socket?.emit('next-slide');
  void prevSlide()      => _socket?.emit('prev-slide');
  void goToSlide(int i) {
    debugPrint('[WS] 📤 go-to-slide: $i');
    _socket?.emit('go-to-slide', i);
  }

  // ── Presentation control ────────────────────────────────────────────────────
  void startPresentation() {
    if (!isConnected) return;
    debugPrint('[WS] 📤 start-presentation');
    _socket!.emit('start-presentation');
  }

  void stopPresentation() {
    if (!isConnected) return;
    debugPrint('[WS] 📤 stop-presentation');
    _socket!.emit('stop-presentation');
  }

  void toggleBlackScreen() => _socket?.emit('toggle-black-screen');

  void requestAssetResolution(String elementId, String blobUrl) {
    _socket?.emit('resolve-asset', {
      'elementId': elementId,
      'url':       blobUrl,
    });
  }

  void requestSync() {
    debugPrint('[WS] 📤 request-sync (manual)');
    _requestSyncDebounced(delayMs: 0);
  }

  void _updateStatus(ConnectionStatus newStatus) {
    _status = newStatus;
    _statusController.add(newStatus);
  }

  void dispose() {
    _syncDebounceTimer?.cancel();
    disconnect();
    _statusController.close();
    _presentationController.close();
    _slideChangedController.close();
    _presentationStartedController.close();
    _presentationStoppedController.close();
    _blackScreenController.close();
    _clientListController.close();
    _assetResolvedController.close();
  }
}