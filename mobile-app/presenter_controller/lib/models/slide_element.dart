// lib/models/slide_element.dart
class SlideElement {
  final String id;
  final String type; // 'text', 'shape', 'image', 'video'
  double x;
  double y;
  double width;
  double height;
  double rotation;
  double opacity;
  int? cornerRadius;

  // Text
  String? text;
  double? fontSize;
  String? fontFamily;
  String? fontColor;
  String? fontWeight;
  String? fontStyle;
  String? textAlign;
  String? strokeColor;
  double? strokeWidth;
  String? shadowColor;
  double? shadowBlur;
  double? shadowOffsetX;
  double? shadowOffsetY;
  String? textDecoration;

  // Shape
  String? shapeType;
  String? fill;
  Map<String, dynamic>? fillGradient;
  String? stroke;

  // Image
  String? src;

  SlideElement({
    required this.id,
    required this.type,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    this.rotation = 0,
    this.opacity = 1,
    this.text,
    this.fontSize,
    this.fontFamily,
    this.fontColor,
    this.fontWeight,
    this.fontStyle,
    this.textAlign,
    this.strokeColor,
    this.strokeWidth,
    this.shadowColor,
    this.shadowBlur,
    this.shadowOffsetX,
    this.shadowOffsetY,
    this.shapeType,
    this.fill,
    this.stroke,
    this.src,
    this.cornerRadius,
    this.fillGradient,
    this.textDecoration,
  });

  factory SlideElement.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? fillGradient;
    final rawFill = json['fillGradient'];
    if (rawFill is Map<String, dynamic>) {
      fillGradient = rawFill;
    } else if (rawFill is Map) {
      fillGradient = Map<String, dynamic>.from(rawFill);
    }
    return SlideElement(
      id: json['id'] ?? '',
      type: json['type'] ?? 'text',
      x: (json['x'] ?? 0).toDouble(),
      y: (json['y'] ?? 0).toDouble(),
      width: (json['width'] ?? 100).toDouble(),
      height: (json['height'] ?? 100).toDouble(),
      rotation: (json['rotation'] ?? 0).toDouble(),
      opacity: (json['opacity'] ?? 1).toDouble(),
      text: json['text'],
      fontSize: json['fontSize']?.toDouble(),
      fontFamily: json['fontFamily'],
      fontColor: json['fontColor'],
      fontWeight: json['fontWeight'],
      fontStyle: json['fontStyle'],
      textAlign: json['textAlign'],
      strokeColor: json['strokeColor'],
      strokeWidth: json['strokeWidth']?.toDouble(),
      shadowColor: json['shadowColor'],
      shadowBlur: json['shadowBlur']?.toDouble(),
      shadowOffsetX: json['shadowOffsetX']?.toDouble(),
      shadowOffsetY: json['shadowOffsetY']?.toDouble(),
      shapeType: json['shapeType'],
      cornerRadius: json['cornerRadius'],
      fill: json['fill'],
      fillGradient: fillGradient,
      stroke: json['stroke'],
      textDecoration: json['textDecoration'],
      src: json['src'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'x': x,
      'y': y,
      'width': width,
      'height': height,
      'rotation': rotation,
      'opacity': opacity,
      if (text != null) 'text': text,
      if (fontSize != null) 'fontSize': fontSize,
      if (fontFamily != null) 'fontFamily': fontFamily,
      if (fontColor != null) 'fontColor': fontColor,
      if (fontWeight != null) 'fontWeight': fontWeight,
      if (fontStyle != null) 'fontStyle': fontStyle,
      if (textAlign != null) 'textAlign': textAlign,
      if (strokeColor != null) 'strokeColor': strokeColor,
      if (strokeWidth != null) 'strokeWidth': strokeWidth,
      if (shadowColor != null) 'shadowColor': shadowColor,
      if (shadowBlur != null) 'shadowBlur': shadowBlur,
      if (shadowOffsetX != null) 'shadowOffsetX': shadowOffsetX,
      if (shadowOffsetY != null) 'shadowOffsetY': shadowOffsetY,
      if (shapeType != null) 'shapeType': shapeType,
      if (fill != null) 'fill': fill,
      if (stroke != null) 'stroke': stroke,
      if (src != null) 'src': src,
    };
  }
}
