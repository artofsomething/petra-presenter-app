// lib/screens/controller_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/presentation_provider.dart';
import '../widgets/slide_preview.dart';
import '../widgets/slide_thumbnail.dart';
import '../widgets/control_buttons.dart';
import '../widgets/connection_status.dart';

class ControllerScreen extends StatefulWidget {
  const ControllerScreen({super.key});

  @override
  State<ControllerScreen> createState() => _ControllerScreenState();
}

class _ControllerScreenState extends State<ControllerScreen> {
  bool _showSlideList = false;
  late PageController _pageController;

  // ✅ FIX: Flag to distinguish programmatic page changes from user swipes
  bool _isProgrammaticPageChange = false;

  @override
  void initState() {
    super.initState();
    final provider = Provider.of<PresentationProvider>(context, listen: false);
    _pageController = PageController(
      initialPage: provider.currentSlideIndex,
      viewportFraction: 0.85,
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  // ✅ FIX: Centralized method to animate page WITHOUT triggering goToSlide
  void _animateToPage(int index) {
    if (!_pageController.hasClients) return;
    if (_pageController.page?.round() == index) return; // already there

    _isProgrammaticPageChange = true; // ← set flag BEFORE animating
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    ).then((_) {
      // ✅ Reset flag AFTER animation completes
      _isProgrammaticPageChange = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<PresentationProvider>(
      builder: (context, provider, child) {

        // ✅ FIX: Sync PageController when external slide change happens
        // (from desktop/keyboard — NOT from our own swipe)
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _animateToPage(provider.currentSlideIndex);
        });

        return Scaffold(
          backgroundColor: const Color(0xFF0D0D1A),
          appBar: AppBar(
            backgroundColor: const Color(0xFF1A1A2E),
            title: Text(
              provider.presentation?.name ?? 'Controller',
              style: const TextStyle(fontSize: 16),
            ),
            centerTitle: true,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Disconnect?'),
                    content: const Text(
                      'Are you sure you want to disconnect '
                      'from the presenter?',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Cancel'),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pop(ctx);
                          provider.disconnect();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red,
                        ),
                        child: const Text('Disconnect'),
                      ),
                    ],
                  ),
                );
              },
            ),
            actions: [
              const ConnectionStatusWidget(),
              const SizedBox(width: 8),
              IconButton(
                icon: Icon(
                  _showSlideList ? Icons.view_carousel : Icons.list,
                ),
                onPressed: () {
                  setState(() => _showSlideList = !_showSlideList);
                },
              ),
            ],
          ),
          body: SafeArea(
            child: Column(
              children: [
                // ── Slide counter ───────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Slide ${provider.currentSlideIndex + 1} '
                        'of ${provider.totalSlides}',
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                      Row(
                        children: [
                          if (provider.isPresenting)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.green.shade900,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Row(
                                children: [
                                  Icon(Icons.play_circle,
                                      size: 14, color: Colors.green),
                                  SizedBox(width: 4),
                                  Text(
                                    'LIVE',
                                    style: TextStyle(
                                      color: Colors.green,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          if (provider.isBlackScreen) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade900,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                'BLACK',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),

                // ── Slide Preview (Swipeable) ────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: AspectRatio(
                    aspectRatio: 16 / 9,
                    child: PageView.builder(
                      controller: _pageController,
                      itemCount: provider.totalSlides,
                      onPageChanged: (index) {
                        // ✅ FIX: Only call goToSlide for USER-initiated swipes
                        // NOT for programmatic animateToPage calls
                        if (_isProgrammaticPageChange) {
                          debugPrint('[PageView] programmatic change to $index — skip');
                          return;
                        }

                        debugPrint('[PageView] user swiped to $index');
                        provider.goToSlide(index);
                        HapticFeedback.selectionClick();
                      },
                      itemBuilder: (context, index) {
                        final slide = provider.presentation!.slides[index];
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: SlidePreview(
                            slide: slide,
                            isActive: index == provider.currentSlideIndex,
                            slideNumber: index + 1,
                          ),
                        );
                      },
                    ),
                  ),
                ),

                // ── Slide List (when toggled) ────────────────────────────────
                if (_showSlideList) ...[
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF1A1A2E),
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(16),
                        ),
                      ),
                      child: Column(
                        children: [
                          Container(
                            margin: const EdgeInsets.only(top: 8),
                            width: 40,
                            height: 4,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade700,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Expanded(
                            child: GridView.builder(
                              padding: const EdgeInsets.all(12),
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 3,
                                crossAxisSpacing: 8,
                                mainAxisSpacing: 8,
                                childAspectRatio: 16 / 9,
                              ),
                              itemCount: provider.totalSlides,
                              itemBuilder: (context, index) {
                                final slide =
                                    provider.presentation!.slides[index];
                                return SlideThumbnail(
                                  slide: slide,
                                  slideNumber: index + 1,
                                  isActive: index == provider.currentSlideIndex,
                                  onTap: () {
                                    // ✅ goToSlide handles optimistic update + server emit
                                    provider.goToSlide(index);
                                    HapticFeedback.mediumImpact();
                                  },
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],

                // ── Speaker Notes ────────────────────────────────────────────
                if (provider.currentSlide?.notes != null &&
                    provider.currentSlide!.notes!.isNotEmpty) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1A1A2E),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    constraints: const BoxConstraints(maxHeight: 80),
                    child: SingleChildScrollView(
                      child: Text(
                        provider.currentSlide!.notes!,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],

                if (!_showSlideList) const Spacer(),

                // ── Control Buttons ──────────────────────────────────────────
                const ControlButtons(),
                const SizedBox(height: 8),
              ],
            ),
          ),
        );
      },
    );
  }
}