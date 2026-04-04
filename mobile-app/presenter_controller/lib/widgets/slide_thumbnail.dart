// lib/widgets/slide_thumbnail.dart
import 'package:flutter/material.dart';
import '../models/slide.dart';

class SlideThumbnail extends StatelessWidget {
  final Slide slide;
  final int slideNumber;
  final bool isActive;
  final VoidCallback onTap;

  const SlideThumbnail({
    super.key,
    required this.slide,
    required this.slideNumber,
    required this.isActive,
    required this.onTap,
  });

  Color _parseColor(String? colorStr) {
    if (colorStr == null || colorStr.isEmpty) return Colors.white;
    try {
      String hex = colorStr.replaceFirst('#', '');
      if (hex.length == 6) hex = 'FF$hex';
      return Color(int.parse(hex, radix: 16));
    } catch (e) {
      return Colors.white;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive ? Colors.blue : Colors.grey.shade800,
            width: isActive ? 2 : 1,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: Colors.blue.withOpacity(0.3),
                    blurRadius: 8,
                  ),
                ]
              : [],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(7),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Background color
              Container(
                color: _parseColor(slide.backgroundColor),
              ),

              // Element indicators (simplified preview)
              if (slide.elements.isNotEmpty)
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _getSlideIcon(slide),
                        color: Colors.black26,
                        size: 16,
                      ),
                      Text(
                        '${slide.elements.length} items',
                        style: const TextStyle(
                          color: Colors.black26,
                          fontSize: 8,
                        ),
                      ),
                    ],
                  ),
                ),

              // Slide number
              Positioned(
                bottom: 2,
                right: 4,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 4,
                    vertical: 1,
                  ),
                  decoration: BoxDecoration(
                    color: isActive
                        ? Colors.blue.withOpacity(0.8)
                        : Colors.black45,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '$slideNumber',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getSlideIcon(Slide slide) {
    if (slide.elements.any((e) => e.type == 'image')) {
      return Icons.image;
    }
    if (slide.elements.any((e) => e.type == 'video')) {
      return Icons.videocam;
    }
    if (slide.elements.any((e) => e.type == 'text')) {
      return Icons.text_fields;
    }
    return Icons.dashboard;
  }
}