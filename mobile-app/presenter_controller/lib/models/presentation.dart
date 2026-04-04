// lib/models/presentation.dart
import 'slide.dart';

class PresentationSettings {
  final int width;
  final int height;
  final String defaultTransition;

  PresentationSettings({
    this.width = 1920,
    this.height = 1080,
    this.defaultTransition = 'fade',
  });

  factory PresentationSettings.fromJson(Map<String, dynamic> json) {
    return PresentationSettings(
      width: json['width'] ?? 1920,
      height: json['height'] ?? 1080,
      defaultTransition: json['defaultTransition'] ?? 'fade',
    );
  }

  Map<String, dynamic> toJson() => {
        'width': width,
        'height': height,
        'defaultTransition': defaultTransition,
      };
}

class Presentation {
  final String id;
  String name;
  final String createdAt;
  String updatedAt;
  List<Slide> slides;
  PresentationSettings settings;

  Presentation({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.updatedAt,
    required this.slides,
    required this.settings,
  });

  factory Presentation.fromJson(Map<String, dynamic> json) {
    return Presentation(
      id: json['id'] ?? '',
      name: json['name'] ?? 'Untitled',
      createdAt: json['createdAt'] ?? '',
      updatedAt: json['updatedAt'] ?? '',
      slides: (json['slides'] as List<dynamic>?)
              ?.map((s) => Slide.fromJson(s))
              .toList() ??
          [],
      settings: PresentationSettings.fromJson(
          json['settings'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
        'slides': slides.map((s) => s.toJson()).toList(),
        'settings': settings.toJson(),
      };
}