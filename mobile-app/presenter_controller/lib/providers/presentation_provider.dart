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

  // Subscriptions
  final List<StreamSubscription> _subscriptions = [];

  // Getters
  Presentation? get presentation => _presentation;
  int get currentSlideIndex => _currentSlideIndex;
  bool get isPresenting => _isPresenting;
  bool get isBlackScreen => _isBlackScreen;
  ConnectionStatus get connectionStatus => _connectionStatus;
  List<dynamic> get connectedClients => _connectedClients;
  WebSocketService get wsService => _wsService;

  Slide? get currentSlide {
    if (_presentation == null ||
        _currentSlideIndex >= _presentation!.slides.length) {
      return null;
    }
    return _presentation!.slides[_currentSlideIndex];
  }

  int get totalSlides => _presentation?.slides.length ?? 0;

  void connect(String serverUrl, {String name = 'Mobile Controller'}) {
    _wsService.connect(serverUrl, name: name);
    _setupListeners();
  }

  void _setupListeners() {
    // Cancel existing subscriptions
    for (var sub in _subscriptions) {
      sub.cancel();
    }
    _subscriptions.clear();

    _subscriptions.add(
      _wsService.statusStream.listen((status) {
        _connectionStatus = status;
        notifyListeners();
      }),
    );

    _subscriptions.add(
      _wsService.presentationStream.listen((presentation) {
        _presentation = presentation;
        notifyListeners();
      }),
    );

    _subscriptions.add(
      _wsService.slideChangedStream.listen((data) {
        if (data['index'] != null) {
          _currentSlideIndex = data['index'];
          notifyListeners();
        }
      }),
    );

    _subscriptions.add(
      _wsService.presentationStartedStream.listen((_) {
        _isPresenting = true;
        notifyListeners();
      }),
    );

    _subscriptions.add(
      _wsService.presentationStoppedStream.listen((_) {
        _isPresenting = false;
        notifyListeners();
      }),
    );

    _subscriptions.add(
      _wsService.blackScreenStream.listen((value) {
        _isBlackScreen = value;
        notifyListeners();
      }),
    );

    _subscriptions.add(
      _wsService.clientListStream.listen((clients) {
        _connectedClients = clients;
        notifyListeners();
      }),
    );
  }

  void disconnect() {
    _wsService.disconnect();
    _presentation = null;
    _currentSlideIndex = 0;
    _isPresenting = false;
    _connectionStatus = ConnectionStatus.disconnected;
    notifyListeners();
  }

  void nextSlide() {
    _wsService.nextSlide();
    if (_currentSlideIndex < totalSlides - 1) {
      _currentSlideIndex++;
      notifyListeners();
    }
  }

  void prevSlide() {
    _wsService.prevSlide();
    if (_currentSlideIndex > 0) {
      _currentSlideIndex--;
      notifyListeners();
    }
  }

  void goToSlide(int index) {
    _wsService.goToSlide(index);
    _currentSlideIndex = index;
    notifyListeners();
  }

  void startPresentation() {
    if (_connectionStatus != ConnectionStatus.connected) {
      print('⚠️ Not connected, cannot start');
      return;
    }
    _wsService.startPresentation();
    _isPresenting = true;
    _currentSlideIndex = 0;
    notifyListeners();
  }

  void stopPresentation() {
    if (_connectionStatus != ConnectionStatus.connected) {
      print('⚠️ Not connected, cannot stop');
      return;
    }
    _wsService.stopPresentation();
    _isPresenting = false;
    notifyListeners();
  }

  void toggleBlackScreen() {
    _wsService.toggleBlackScreen();
    _isBlackScreen = !_isBlackScreen;
    notifyListeners();
  }

  @override
  void dispose() {
    for (var sub in _subscriptions) {
      sub.cancel();
    }
    _wsService.dispose();
    super.dispose();
  }
}