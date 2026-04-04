// lib/widgets/control_buttons.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/presentation_provider.dart';

class ControlButtons extends StatelessWidget {
  const ControlButtons({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<PresentationProvider>(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        children: [
          // ===== MAIN NAVIGATION ROW =====
          Row(
            children: [
              // Previous Button
              Expanded(
                child: SizedBox(
                  height: 70,
                  child: ElevatedButton(
                    onPressed: provider.currentSlideIndex > 0
                        ? () {
                            provider.prevSlide();
                            HapticFeedback.mediumImpact();
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2A2A4A),
                      disabledBackgroundColor:
                          const Color(0xFF1A1A2A),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.arrow_back_rounded,
                          size: 24,
                          color: provider.currentSlideIndex > 0
                              ? Colors.white
                              : Colors.grey.shade700,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'PREV',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: provider.currentSlideIndex > 0
                                ? Colors.white70
                                : Colors.grey.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 12),

              // Next Button (larger)
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: 70,
                  child: ElevatedButton(
                    onPressed: provider.currentSlideIndex <
                            provider.totalSlides - 1
                        ? () {
                            provider.nextSlide();
                            HapticFeedback.mediumImpact();
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade700,
                      disabledBackgroundColor:
                          Colors.blue.shade900.withAlpha(100),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.arrow_forward_rounded,
                          size: 24,
                          color: provider.currentSlideIndex <
                                  provider.totalSlides - 1
                              ? Colors.white
                              : Colors.grey.shade600,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'NEXT',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: provider.currentSlideIndex <
                                    provider.totalSlides - 1
                                ? Colors.white
                                : Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // ===== SECONDARY CONTROLS ROW =====
          Row(
            children: [
              // Start/Stop Presentation
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      if (provider.isPresenting) {
                        provider.stopPresentation();
                      } else {
                        provider.startPresentation();
                      }
                      HapticFeedback.heavyImpact();
                    },
                    icon: Icon(
                      provider.isPresenting
                          ? Icons.stop_rounded
                          : Icons.play_arrow_rounded,
                      size: 20,
                    ),
                    label: Text(
                      provider.isPresenting ? 'STOP' : 'START',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: provider.isPresenting
                          ? Colors.red.shade700
                          : Colors.green.shade700,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 8),

              // Black Screen
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      provider.toggleBlackScreen();
                      HapticFeedback.mediumImpact();
                    },
                    icon: Icon(
                      provider.isBlackScreen
                          ? Icons.visibility_off
                          : Icons.visibility,
                      size: 20,
                    ),
                    label: Text(
                      provider.isBlackScreen ? 'SHOW' : 'BLACK',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: provider.isBlackScreen
                          ? Colors.orange.shade700
                          : const Color(0xFF2A2A4A),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 8),

              // Go to first slide
              SizedBox(
                height: 48,
                width: 48,
                child: ElevatedButton(
                  onPressed: () {
                    provider.goToSlide(0);
                    HapticFeedback.lightImpact();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2A2A4A),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: EdgeInsets.zero,
                  ),
                  child: const Icon(
                    Icons.first_page_rounded,
                    size: 24,
                  ),
                ),
              ),

              const SizedBox(width: 8),

              // Go to last slide
              SizedBox(
                height: 48,
                width: 48,
                child: ElevatedButton(
                  onPressed: () {
                    provider.goToSlide(provider.totalSlides - 1);
                    HapticFeedback.lightImpact();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2A2A4A),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: EdgeInsets.zero,
                  ),
                  child: const Icon(
                    Icons.last_page_rounded,
                    size: 24,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}