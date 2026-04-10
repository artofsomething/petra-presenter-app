// lib/providers/presentation_provider.dart
import 'package:flutter/material.dart';
import '../models/presentation.dart';
import '../models/slide.dart';
import '../services/websocket_service.dart';
import 'dart:async';

class PresentationProvider extends ChangeNotifier {
  final WebSocketService _wsService = WebSocketService();

  Presentation? _presentation;
  int _currentSlideIndex = 0;
  bool _isPresenting = false;
  bool _isBlackScreen = false;
  ConnectionStatus _connectionStatus = ConnectionStatus.disconnected;
  List<dynamic> _connectedClients = [];

  // ✅ Track pending local index to avoid double-update
  // When WE navigate, we update locally immediately (optimistic update)
  // and ignore the server echo that comes back
  int? _pendingIndex;
  Timer? _pendingIndexTimer;

  final List<StreamSubscription> _subscriptions = [];

  // Getters
  Presentation? get presentation       => _presentation;
  int           get currentSlideIndex  => _currentSlideIndex;
  bool          get isPresenting       => _isPresenting;
  bool          get isBlackScreen      => _isBlackScreen;
  ConnectionStatus get connectionStatus => _connectionStatus;
  List<dynamic> get connectedClients   => _connectedClients;
  WebSocketService get wsService       => _wsService;

  Slide? get currentSlide {
    if (_presentation == null ||
        _currentSlideIndex >= _presentation!.slides.length) return null;
    return _presentation!.slides[_currentSlideIndex];
  }

  int get totalSlides => _presentation?.slides.length ?? 0;

  void connect(String serverUrl, {String name = 'Mobile Controller'}) {
    _wsService.connect(serverUrl, name: name);
    _setupListeners();
  }

  void _setupListeners() {
    for (var sub in _subscriptions) sub.cancel();
    _subscriptions.clear();

    // ── Connection status ───────────────────────────────────────────────────
    _subscriptions.add(
      _wsService.statusStream.listen((status) {
        _connectionStatus = status;
        notifyListeners();
      }),
    );

    // ── Presentation data ───────────────────────────────────────────────────
    _subscriptions.add(
      _wsService.presentationStream.listen((presentation) {
        _presentation = presentation;

        // ✅ Clamp index in case new presentation has fewer slides
        if (_currentSlideIndex >= presentation.slides.length) {
          _currentSlideIndex = presentation.slides.length - 1;
        }

        notifyListeners();
      }),
    );

    // ── Slide changed ───────────────────────────────────────────────────────
    _subscriptions.add(
      _wsService.slideChangedStream.listen((data) {
        if (data['index'] == null) return;

        final incomingIndex = data['index'] as int;
        final isSilent      = data['silent'] == true;
        final senderId      = data['senderId'] as String?;

        // ✅ If this is our own echo (senderId == our socket ID)
        // AND the index matches what we already set locally → skip
        // The websocket_service already tags self-events with silent:true
        if (isSilent) {
          debugPrint('[Provider] slide-changed silent (own echo) → skip transition');
          // Index should already match since we set it optimistically
          // but sync just in case
          if (_currentSlideIndex != incomingIndex) {
            _currentSlideIndex = incomingIndex;
            notifyListeners();
          }
          return;
        }

        // ✅ If we have a pending index from our own navigation
        // and it matches → this is the server confirming our action → skip
        if (_pendingIndex != null && _pendingIndex == incomingIndex) {
          debugPrint('[Provider] slide-changed matches pending ($incomingIndex) → skip double update');
          _pendingIndex = null;
          _pendingIndexTimer?.cancel();
          return;
        }

        // ✅ Genuine change from another client (desktop/keyboard/other mobile)
        debugPrint('[Provider] slide-changed from $senderId → index $incomingIndex');
        _currentSlideIndex = incomingIndex;
        _pendingIndex      = null;
        _pendingIndexTimer?.cancel();
        notifyListeners();
      }),
    );

    // ── Presentation started ────────────────────────────────────────────────
    _subscriptions.add(
      _wsService.presentationStartedStream.listen((_) {
        _isPresenting = true;
        notifyListeners();
      }),
    );

    // ── Presentation stopped ────────────────────────────────────────────────
    _subscriptions.add(
      _wsService.presentationStoppedStream.listen((_) {
        _isPresenting = false;
        notifyListeners();
      }),
    );

    // ── Black screen ────────────────────────────────────────────────────────
    _subscriptions.add(
      _wsService.blackScreenStream.listen((value) {
        _isBlackScreen = value;
        notifyListeners();
      }),
    );

    // ── Client list ─────────────────────────────────────────────────────────
    _subscriptions.add(
      _wsService.clientListStream.listen((clients) {
        _connectedClients = clients;
        notifyListeners();
      }),
    );
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  void nextSlide() {
    if (_currentSlideIndex >= totalSlides - 1) return;

    // ✅ Optimistic update: set locally first
    _currentSlideIndex++;

    // ✅ Mark as pending so we can ignore the server echo
    _setPendingIndex(_currentSlideIndex);

    notifyListeners();

    // ✅ Then tell the server (server will broadcast to others, echo back to us)
    _wsService.nextSlide();
  }

  void prevSlide() {
    if (_currentSlideIndex <= 0) return;

    _currentSlideIndex--;
    _setPendingIndex(_currentSlideIndex);
    notifyListeners();

    _wsService.prevSlide();
  }

  void goToSlide(int index) {
    if (index < 0 || index >= totalSlides) return;
    if (_currentSlideIndex == index) return; // ✅ No-op if already there

    _currentSlideIndex = index;
    _setPendingIndex(_currentSlideIndex);
    notifyListeners();

    _wsService.goToSlide(index);
  }

  // ✅ Track pending index with timeout fallback
  // If server doesn't echo back within 2s, clear pending
  void _setPendingIndex(int index) {
    _pendingIndex = index;
    _pendingIndexTimer?.cancel();
    _pendingIndexTimer = Timer(const Duration(seconds: 2), () {
      _pendingIndex = null;
    });
  }

  // ── Presentation control ────────────────────────────────────────────────────

  void startPresentation() {
    if (_connectionStatus != ConnectionStatus.connected) {
      debugPrint('⚠️ Not connected, cannot start');
      return;
    }

    // ✅ Optimistic update
    _isPresenting      = true;
    _currentSlideIndex = 0;
    _setPendingIndex(0);
    notifyListeners();

    _wsService.startPresentation();
  }

  void stopPresentation() {
    if (_connectionStatus != ConnectionStatus.connected) {
      debugPrint('⚠️ Not connected, cannot stop');
      return;
    }

    // ✅ Optimistic update
    _isPresenting = false;
    notifyListeners();

    _wsService.stopPresentation();
  }

  void toggleBlackScreen() {
    // ✅ Optimistic update
    _isBlackScreen = !_isBlackScreen;
    notifyListeners();

    _wsService.toggleBlackScreen();
  }

  void disconnect() {
    _pendingIndexTimer?.cancel();
    _pendingIndex = null;
    _wsService.disconnect();
    _presentation      = null;
    _currentSlideIndex = 0;
    _isPresenting      = false;
    _connectionStatus  = ConnectionStatus.disconnected;
    notifyListeners();
  }

  @override
  void dispose() {
    _pendingIndexTimer?.cancel();
    for (var sub in _subscriptions) sub.cancel();
    _wsService.dispose();
    super.dispose();
  }
}