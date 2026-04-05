import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'dart:convert';
import '../models/slide.dart';
import '../models/slide_element.dart';

class SlidePreview extends StatelessWidget {
  final Slide slide;
  final bool isActive;
  final int slideNumber;

  const SlidePreview({super.key, required this.slide, required this.isActive, required this.slideNumber});

  // ── Color parser ────────────────────────────────────────────────────────────
  static Color parseColor(String? colorStr, {Color fallback = Colors.transparent}) {
    if (colorStr == null || colorStr.isEmpty) return fallback;
    try {
      String hex = colorStr.replaceFirst('#', '');
      if (hex.length == 6) hex = 'FF$hex';
      if (hex.length == 8) return Color(int.parse(hex, radix: 16));
    } catch (_) {}
    return fallback;
  }

  // ── Gradient builder ────────────────────────────────────────────────────────
  /// Converts the backgroundGradient map coming from the server into a
  /// Flutter [Gradient].
  ///
  /// Expected shape (mirrors GradientConfig in types.ts):
  /// ```json
  /// {
  ///   "type":  "linear" | "radial",
  ///   "angle": 135,
  ///   "stops": [
  ///     { "offset": 0.0, "color": "#ff0000" },
  ///     { "offset": 1.0, "color": "#0000ff" }
  ///   ]
  /// }
  /// ```
  Gradient? _buildGradient(Map<String, dynamic>? gradientData) {
    if (gradientData == null) return null;

    try {
      final type = gradientData['type'] as String? ?? 'linear';
      final angle = (gradientData['angle'] as num?)?.toDouble() ?? 135.0;
      final rawStops = gradientData['stops'] as List<dynamic>? ?? [];

      if (rawStops.isEmpty) return null;

      // Sort stops by offset, then build parallel lists
      final sortedStops = [...rawStops]..sort((a, b) => ((a['offset'] as num?) ?? 0).compareTo((b['offset'] as num?) ?? 0));

      final colors = sortedStops.map((s) => parseColor(s['color'] as String?, fallback: Colors.transparent)).toList();

      final stops = sortedStops.map((s) => ((s['offset'] as num?) ?? 0).toDouble()).toList();

      // ── Radial gradient ──────────────────────────────────────────────────
      if (type == 'radial') {
        return RadialGradient(
          center: Alignment.center,
          radius: 0.85, // roughly matches the Konva radial spread
          colors: colors,
          stops: stops,
        );
      }

      // ── Linear gradient ──────────────────────────────────────────────────
      // Convert CSS angle (degrees, 0° = top→bottom, clockwise) to Flutter
      // Alignment pair.
      //
      // CSS angle convention:
      //   0°   → bottom-to-top  (begin=bottomCenter, end=topCenter)
      //   90°  → left-to-right  (begin=centerLeft,   end=centerRight)
      //   135° → top-left → bottom-right
      //   180° → top-to-bottom
      //
      // Flutter uses begin/end Alignment, so we compute unit-circle
      // coordinates and map them to [-1, 1] alignment space.
      final rad = angle * (3.141592653589793 / 180.0);
      // CSS 0° means "upward", and rotates clockwise, so:
      //   dx = sin(angle), dy = -cos(angle)
      final dx = _precise(math.sin(rad));
      final dy = -_precise(math.cos(rad));

      return LinearGradient(
        begin: Alignment(-dx, -dy), // start point
        end: Alignment(dx, dy), // end point
        colors: colors,
        stops: stops,
      );
    } catch (e) {
      debugPrint('[SlidePreview] gradient parse error: $e');
      return null;
    }
  }

  /// Clamp tiny floating-point noise to zero so gradients look clean.
  static double _precise(double v) => v.abs() < 1e-10 ? 0.0 : double.parse(v.toStringAsFixed(6));

  // ── Resolve full slide background decoration ────────────────────────────────
  BoxDecoration _slideBackground() {
    // 1. Gradient takes highest priority
    final gradient = _buildGradient(slide.backgroundGradient as Map<String, dynamic>?);
    if (gradient != null) {
      return BoxDecoration(gradient: gradient);
    }

    // 2. Background image (data: URI only — blob: URLs are Electron-local)
    if (slide.backgroundImage != null && slide.backgroundImage!.isNotEmpty && !slide.backgroundImage!.startsWith('blob:')) {
      return const BoxDecoration(); // image is painted as a child widget
    }

    // 3. Solid color fallback
    return BoxDecoration(color: parseColor(slide.backgroundColor, fallback: Colors.white));
  }

  @override
  Widget build(BuildContext context) {
    final bgDecoration = _slideBackground();
    final hasImage = slide.backgroundImage != null && slide.backgroundImage!.isNotEmpty && !slide.backgroundImage!.startsWith('blob:');

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isActive ? Colors.blue : Colors.grey.shade800, width: isActive ? 3 : 1),
        boxShadow: isActive ? [BoxShadow(color: Colors.blue.withOpacity(0.3), blurRadius: 12, spreadRadius: 2)] : [],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Container(
            // ✅ Apply gradient or solid color via BoxDecoration
            decoration: bgDecoration,
            child: Stack(
              children: [

                if (slide.animatedBackground != null)
                  Positioned.fill(
                    child: _buildAnimatedBgPlaceholder(slide.animatedBackground!),
                  ),
                // ── Background image (rendered as child when no gradient) ──
                if (hasImage) Positioned.fill(child: _buildBackgroundImage(slide.backgroundImage!)),

                // ── Slide elements ──────────────────────────────────────────
                ...slide.elements.map((element) => _buildElement(element, context)),

                // ── Slide number badge ──────────────────────────────────────
                Positioned(
                  bottom: 4,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(8)),
                    child: Text(
                      '$slideNumber',
                      style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── Background image ──────────────────────────────────────────────────────
  Widget _buildBackgroundImage(String src) {
    if (src.startsWith('data:image')) {
      try {
        final base64Str = src.split(',').last;
        return Image.memory(base64Decode(base64Str), fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox.shrink());
      } catch (_) {
        return const SizedBox.shrink();
      }
    }
    // http/https URL (if you ever support remote images)
    if (src.startsWith('http')) {
      return Image.network(src, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox.shrink());
    }
    return const SizedBox.shrink();
  }

  Widget _buildAnimatedBgPlaceholder(Map<String, dynamic> config) {
  final type   = config['type'] as String? ?? '';
  final color1 = config['color1'] as String?;
  final color2 = config['color2'] as String?;

  // Map animated bg types to representative gradient colors
  final Map<String, List<String>> typeColors = {
    'aurora':     ['#7c3aed', '#2563eb', '#06b6d4'],
    'waves':      ['#1e40af', '#7c3aed', '#0891b2'],
    'neon-pulse': ['#f0abfc', '#818cf8', '#34d399'],
    'geometric':  ['#6366f1', '#8b5cf6', '#ec4899'],
    'starfield':  ['#0d1b4b', '#1a3a7a', '#ffffff'],
    'bubbles':    ['#020b18', '#3b82f6', '#8b5cf6'],
    'matrix':     ['#000000', '#003b00', '#00ff41'],
    'fire':       ['#1a0000', '#ef4444', '#f97316'],
    'snowfall':   ['#0a1628', '#162040', '#ffffff'],
    'particles':  ['#050510', '#6366f1', '#06b6d4'],
    'lava-lamp':  ['#ff6b6b', '#ffd93d'],
    'lightning':  ['#a78bfa', '#38bdf8'],
    'galaxy':     ['#818cf8', '#f472b6'],
    'cyberpunk-grid':  ['#00ffff','#ff00ff'],
    'dna-helix':   ['#22d3ee', '#a78bfa'],
    'confetti':    ['#f43f5e', '#facc15'] ,
    'plasma':      ['#ff0080', '#7928ca'],
    'vortex':      ['#6366f1', '#ec4899'],
    'glitch':      ['#00ff9f','#ff003c'] ,
    'underwater':  ['#0ea5e9', '#06b6d4'] ,
    'northen-lights':['#00ff87','#60efff'],
    'meteor-shower': ['#93f5fd','#fde68a'],
    'sand-storm':   ['#d97706','#92400e'],
    'neon-rain':    ['#ff00ff','#00ffff'],
    'bokeh': ['#ff9ff3','#ffeaa7']
  };

  final defaults  = typeColors[type] ?? ['#1a1a2e', '#2a2a4e'];
  final c1Str     = color1 ?? defaults[0];
  final c2Str     = color2 ?? (defaults.length > 1 ? defaults[1] : defaults[0]);

  final emoji = {
    'aurora':     '🌌',
    'waves':      '🌊',
    'neon-pulse': '💜',
    'geometric':  '🔷',
    'starfield':  '✨',
    'bubbles':    '🫧',
    'matrix':     '💻',
    'fire':       '🔥',
    'snowfall':   '❄️',
    'particles':  '🔵',
    'lava-lamp':  '🫠',
    'lightning':  '⚡',
    'galaxy':     '🌀',
    'cyberpunk-grid': '🕹️',
    'dna-helix':  '🧬',
    'confetti':   '🎊',
    'plasma':     '🌈',
    'vortex':     '🌪️',
    'glitch':     '📺',
    'underwater': '🌊',
    'northen-lights':'🌠',
    'meteor-shower':'☄️',
    'sand-storm':'🌪️',
    'neon-rain':'🌧️',
    'bokeh':'💡'
  }[type] ?? '🎨';

  final label = type.replaceAll('-', ' ').toUpperCase();

  return Container(
    decoration: BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end:   Alignment.bottomRight,
        colors: [
          SlidePreview.parseColor(c1Str, fallback: const Color(0xFF1a1a2e)),
          SlidePreview.parseColor(c2Str, fallback: const Color(0xFF2a2a4e)),
        ],
      ),
    ),
    child: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(emoji,  style: const TextStyle(fontSize: 14)),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              color:      Colors.white54,
              fontSize:   6,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    ),
  );
}

  // ── Element dispatcher ────────────────────────────────────────────────────
  Widget _buildElement(SlideElement element, BuildContext context) {
    // Scale from design canvas (1920×1080) to preview size.
    // We measure the actual rendered preview width at build time.
    final screenWidth = MediaQuery.of(context).size.width * 0.85;
    final scale = screenWidth / 1920.0;

    switch (element.type) {
      case 'text':
        return _buildTextElement(element, scale);
      case 'shape':
        return _buildShapeElement(element, scale);
      case 'image':
        return _buildImageElement(element, scale);
      default:
        return const SizedBox.shrink();
    }
  }

  // ── Text element ──────────────────────────────────────────────────────────
  Widget _buildTextElement(SlideElement element, double scale) {
    return Positioned(
      left: element.x * scale,
      top: element.y * scale,
      width: element.width * scale,
      child: Transform.rotate(
        angle: (element.rotation ?? 0) * (3.141592653589793 / 180),
        child: Opacity(
          opacity: element.opacity.clamp(0.0, 1.0),
          child: Text(
            element.text ?? '',
            style: TextStyle(
              fontSize: (element.fontSize ?? 24) * scale,
              fontFamily: element.fontFamily ?? 'Arial',
              color: parseColor(element.fontColor, fallback: Colors.black),
              fontWeight: element.fontWeight == 'bold' ? FontWeight.bold : FontWeight.normal,
              fontStyle: element.fontStyle == 'italic' ? FontStyle.italic : FontStyle.normal,
              decoration: _parseTextDecoration(element.textDecoration),
              shadows: element.shadowColor != null
                  ? [
                      Shadow(
                        color: parseColor(element.shadowColor),
                        blurRadius: (element.shadowBlur ?? 0) * scale,
                        offset: Offset((element.shadowOffsetX ?? 0) * scale, (element.shadowOffsetY ?? 0) * scale),
                      ),
                    ]
                  : null,
            ),
            textAlign: _getTextAlign(element.textAlign),
            overflow: TextOverflow.visible,
          ),
        ),
      ),
    );
  }

  // ── Shape element ─────────────────────────────────────────────────────────
  Widget _buildShapeElement(SlideElement element, double scale) {
    return Positioned(
      left: element.x * scale,
      top: element.y * scale,
      child: Transform.rotate(
        angle: (element.rotation ?? 0) * (3.141592653589793 / 180),
        child: Opacity(opacity: element.opacity.clamp(0.0, 1.0), child: _buildShape(element, scale)),
      ),
    );
  }

  Widget _buildShape(SlideElement element, double scale) {
    final w = element.width * scale;
    final h = element.height * scale;

    // ✅ Shape fill gradient support
    final fillGradient = _buildGradient(element.fillGradient as Map<String, dynamic>?);

    BorderSide borderSide = element.stroke != null ? BorderSide(color: parseColor(element.stroke), width: (element.strokeWidth ?? 1) * scale) : BorderSide.none;

    switch (element.shapeType) {
      // ── Circle ─────────────────────────────────────────────────────────────
      case 'circle':
        return Container(
          width: w,
          height: h,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: fillGradient == null ? parseColor(element.fill, fallback: Colors.blue) : null,
            gradient: fillGradient,
            border: element.stroke != null ? Border.all(color: parseColor(element.stroke), width: (element.strokeWidth ?? 1) * scale) : null,
          ),
        );

      // ── Ellipse ────────────────────────────────────────────────────────────
      case 'ellipse':
        return Container(
          width: w,
          height: h,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.all(Radius.elliptical(w / 2, h / 2)),
            color: fillGradient == null ? parseColor(element.fill, fallback: Colors.blue) : null,
            gradient: fillGradient,
            border: element.stroke != null ? Border.all(color: parseColor(element.stroke), width: (element.strokeWidth ?? 1) * scale) : null,
          ),
        );

      // ── Rounded rect ───────────────────────────────────────────────────────
      case 'rounded-rect':
        final radius = (element.cornerRadius ?? 20) * scale;
        return Container(
          width: w,
          height: h,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(radius),
            color: fillGradient == null ? parseColor(element.fill, fallback: Colors.blue) : null,
            gradient: fillGradient,
            border: element.stroke != null ? Border.all(color: parseColor(element.stroke), width: (element.strokeWidth ?? 1) * scale) : null,
          ),
        );

      // ── Star (custom painter) ──────────────────────────────────────────────
      case 'star':
        return SizedBox(
          width: w,
          height: h,
          child: CustomPaint(
            painter: _StarPainter(
              fillColor: parseColor(element.fill, fallback: Colors.yellow),
              fillGradient: fillGradient,
              strokeColor: element.stroke != null ? parseColor(element.stroke) : null,
              strokeWidth: (element.strokeWidth ?? 0) * scale,
              numPoints: 5,
            ),
          ),
        );

      // ── Default rect ───────────────────────────────────────────────────────
      default:
        return Container(
          width: w,
          height: h,
          decoration: BoxDecoration(
            color: fillGradient == null ? parseColor(element.fill, fallback: Colors.blue) : null,
            gradient: fillGradient,
            border: element.stroke != null ? Border.all(color: parseColor(element.stroke), width: (element.strokeWidth ?? 1) * scale) : null,
          ),
        );
    }
  }

  // ── Image element ─────────────────────────────────────────────────────────
  Widget _buildImageElement(SlideElement element, double scale) {
    return Positioned(
      left: element.x * scale,
      top: element.y * scale,
      width: element.width * scale,
      height: element.height * scale,
      child: Transform.rotate(
        angle: (element.rotation ?? 0) * (3.141592653589793 / 180),
        child: Opacity(opacity: element.opacity.clamp(0.0, 1.0), child: _buildImageWidget(element.src)),
      ),
    );
  }

  Widget _buildImageWidget(String? src) {
    if (src == null || src.isEmpty) {
      return Container(
        color: Colors.grey.shade800,
        child: const Icon(Icons.image, color: Colors.grey),
      );
    }
    if (src.startsWith('data:image')) {
      try {
        final base64Str = src.split(',').last;
        return Image.memory(
          base64Decode(base64Str),
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            color: Colors.grey.shade800,
            child: const Icon(Icons.broken_image, color: Colors.grey),
          ),
        );
      } catch (_) {}
    }
    return Container(
      color: Colors.grey.shade800,
      child: const Icon(Icons.image, color: Colors.grey),
    );
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  TextAlign _getTextAlign(String? align) {
    switch (align) {
      case 'center':
        return TextAlign.center;
      case 'right':
        return TextAlign.right;
      default:
        return TextAlign.left;
    }
  }

  TextDecoration _parseTextDecoration(String? deco) {
    switch (deco) {
      case 'underline':
        return TextDecoration.underline;
      case 'line-through':
        return TextDecoration.lineThrough;
      default:
        return TextDecoration.none;
    }
  }
}

// ── Star CustomPainter ────────────────────────────────────────────────────────
class _StarPainter extends CustomPainter {
  final Color fillColor;
  final Gradient? fillGradient;
  final Color? strokeColor;
  final double strokeWidth;
  final int numPoints;

  const _StarPainter({required this.fillColor, required this.numPoints, this.fillGradient, this.strokeColor, this.strokeWidth = 0});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final outer = cx < cy ? cx : cy; // outer radius
    final inner = outer / 2; // inner radius
    final path = Path();
    const pi2 = 3.141592653589793 * 2;

    for (int i = 0; i < numPoints * 2; i++) {
      // Rotate so the first point faces up (-π/2)
      final angle = (i / (numPoints * 2)) * pi2 - (3.141592653589793 / 2);
      final r = i.isEven ? outer : inner;
      final x = cx + r * math.cos(angle);
      final y = cy + r * math.sin(angle);
      if (i == 0)
        path.moveTo(x, y);
      else
        path.lineTo(x, y);
    }
    path.close();

    // Fill
    final fillPaint = Paint()..style = PaintingStyle.fill;
    if (fillGradient != null) {
      fillPaint.shader = fillGradient!.createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    } else {
      fillPaint.color = fillColor;
    }
    canvas.drawPath(path, fillPaint);

    // Stroke
    if (strokeColor != null && strokeWidth > 0) {
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..color = strokeColor!
          ..strokeWidth = strokeWidth,
      );
    }
  }

  @override
  bool shouldRepaint(_StarPainter old) => old.fillColor != fillColor || old.fillGradient != fillGradient || old.strokeColor != strokeColor || old.strokeWidth != strokeWidth;
}

// ── Trig helpers (avoid importing dart:math just for these) ──────────────────
double sin(double radians) {
  // Taylor series good enough for UI rendering
  return _dartSin(radians);
}

double cos(double radians) {
  return _dartCos(radians);
}

double _dartSin(double x) {
  // Use dart:math via tear-off to avoid full import at top level
  return _MathProxy.sin(x);
}

double _dartCos(double x) {
  return _MathProxy.cos(x);
}

abstract class _MathProxy {
  static final _sin = (double x) => x - x * x * x / 6 + x * x * x * x * x / 120;
  static double sin(double x) {
    // Normalize to [-π, π]
    const pi = 3.141592653589793;
    x = x % (2 * pi);
    if (x > pi) x -= 2 * pi;
    if (x < -pi) x += 2 * pi;
    return _sin(x);
  }

  static double cos(double x) => sin(x + 3.141592653589793 / 2);
}
