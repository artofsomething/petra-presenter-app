// lib/models/slide.dart
import 'slide_element.dart';

class Slide {
  final String id;
  int order;
  String backgroundColor;
  String? backgroundImage;
  List<SlideElement> elements;
  String? thumbnail;
  String? notes;
  int? duration;
  Map<String, dynamic>? backgroundGradient;
  Map<String, dynamic>? animatedBackground;

  Slide({required this.id, required this.order, this.backgroundColor = '#ffffff', this.backgroundImage, this.elements = const [], this.thumbnail, this.notes, this.duration, this.backgroundGradient,this.animatedBackground});

  factory Slide.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? gradient;
    final rawGradient = json['backgroundGradient'];
    if (rawGradient is Map<String, dynamic>) {
      gradient = rawGradient;
    } else if (rawGradient is Map) {
      gradient = Map<String, dynamic>.from(rawGradient);
    }
    Map<String, dynamic>? animBg;
    final rawAnimBg = json['animatedBackground'];
    if (rawAnimBg is Map<String, dynamic>) {
      animBg = rawAnimBg;
    } else if (rawAnimBg is Map) {
      animBg = Map<String, dynamic>.from(rawAnimBg);
    }
    return Slide(
      id: json['id'] ?? '',
      order: json['order'] ?? 0,
      backgroundColor: json['backgroundColor'] ?? '#ffffff',
      backgroundImage: json['backgroundImage'],
      elements: (json['elements'] as List<dynamic>?)?.map((e) => SlideElement.fromJson(e)).toList() ?? [],
      thumbnail: json['thumbnail'],
      notes: json['notes'],
      duration: json['duration'],
      backgroundGradient: gradient,
      animatedBackground: animBg
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'order': order,
      'backgroundColor': backgroundColor,
      if (backgroundImage != null) 'backgroundImage': backgroundImage,
      'elements': elements.map((e) => e.toJson()).toList(),
      if (thumbnail != null) 'thumbnail': thumbnail,
      if (notes != null) 'notes': notes,
      if (duration != null) 'duration': duration,
    };
  }

  @override
  String toString() =>
      'Slide($id, order=$order, '
      'gradient=${backgroundGradient != null}, '
      'elements=${elements.length})';
}
