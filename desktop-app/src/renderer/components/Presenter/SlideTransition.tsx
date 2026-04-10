import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import type { TransitionType } from '../../types/transitions';

interface SlideTransitionProps {
  slideIndex: number;
  transition: TransitionType;
  duration: number;
  children: React.ReactNode;
}

interface SlideSnapshot {
  content: React.ReactNode;
  key: number;
}

const SlideTransition: React.FC<SlideTransitionProps> = ({
  slideIndex,
  transition,
  duration,
  children,
}) => {
  const [outgoing, setOutgoing] = useState<SlideSnapshot | null>(null);
  const [incoming, setIncoming] = useState<SlideSnapshot>({
    content: children,
    key: slideIndex,
  });
  const [isAnimating, setIsAnimating] = useState(false);

  // ✅ FIX 1: Track the COMMITTED slide index separately
  // This only updates AFTER we've snapshotted the outgoing slide
  const committedIndexRef = useRef(slideIndex);
  
  // ✅ FIX 2: Store snapshot of content KEYED to slideIndex
  // Map of slideIndex → React.ReactNode (frozen snapshots)
  const snapshotMapRef = useRef<Map<number, React.ReactNode>>(new Map());
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAnimatingRef = useRef(false);

  // ✅ FIX 3: Use useLayoutEffect to capture snapshot SYNCHRONOUSLY
  // before the browser paints — guarantees correct slide content
 useLayoutEffect(() => {
  snapshotMapRef.current.set(slideIndex, children);

  // ✅ FIX: Guard against undefined before deleting
  if (snapshotMapRef.current.size > 10) {
    const firstKey = snapshotMapRef.current.keys().next().value;
    if (firstKey !== undefined) {
      snapshotMapRef.current.delete(firstKey);
    }
  }
});

  useEffect(() => {
    const prevIndex = committedIndexRef.current;

    // ── Same slide: just update content (e.g. live editing) ──────────────
    if (slideIndex === prevIndex) {
      if (!isAnimatingRef.current) {
        setIncoming({ content: children, key: slideIndex });
      }
      return;
    }

    // ── Slide index changed → start transition ────────────────────────────

    // ✅ FIX 4: Cancel any in-progress transition immediately
    // Don't let the old animation finish — jump to new target
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // ✅ FIX 5: Get the FROZEN snapshot of the previous slide
    // snapshotMapRef has the exact content that was rendered for prevIndex
    const outgoingContent = snapshotMapRef.current.get(prevIndex)
      ?? incoming.content; // fallback to last known incoming

    // ✅ FIX 6: Update committedIndexRef BEFORE any state updates
    committedIndexRef.current = slideIndex;

    if (transition === 'none') {
      // No animation — instant switch
      isAnimatingRef.current = false;
      setIsAnimating(false);
      setOutgoing(null);
      setIncoming({ content: children, key: slideIndex });
      return;
    }

    // ✅ FIX 7: Batch state updates together to avoid intermediate renders
    // outgoing = frozen snapshot of OLD slide (correct content)
    // incoming = NEW target slide (correct content)
    isAnimatingRef.current = true;
    setOutgoing({ content: outgoingContent, key: prevIndex });
    setIncoming({ content: children, key: slideIndex });
    setIsAnimating(true);

    // ✅ FIX 8: Clean up after animation completes
    timeoutRef.current = setTimeout(() => {
      isAnimatingRef.current = false;
      setOutgoing(null);
      setIsAnimating(false);
      timeoutRef.current = null;
    }, duration + 50); // +50ms buffer for animation to fully complete

  }, [slideIndex]); // ✅ ONLY slideIndex — never re-run for children changes

  // ✅ FIX 9: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // ── Style builders ────────────────────────────────────────────────────────

  const getOutgoingStyle = (): React.CSSProperties => {
    if (!isAnimating) return {};
    const base: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      zIndex: 1,
      // ✅ FIX 10: Disable pointer events on outgoing slide
      pointerEvents: 'none',
    };

    switch (transition) {
      case 'fade':
        return { ...base, animation: `tr-fade-out ${duration}ms ease-in-out forwards` };
      case 'slide-left':
        return { ...base, animation: `tr-slide-to-left ${duration}ms ease-in-out forwards` };
      case 'slide-right':
        return { ...base, animation: `tr-slide-to-right ${duration}ms ease-in-out forwards` };
      case 'slide-up':
        return { ...base, animation: `tr-slide-to-up ${duration}ms ease-in-out forwards` };
      case 'slide-down':
        return { ...base, animation: `tr-slide-to-down ${duration}ms ease-in-out forwards` };
      case 'zoom-in':
        return { ...base, animation: `tr-zoom-out-exit ${duration}ms ease-in-out forwards` };
      case 'zoom-out':
        return { ...base, animation: `tr-zoom-in-exit ${duration}ms ease-in-out forwards` };
      case 'flip':
        return { ...base, animation: `tr-flip-out ${duration}ms ease-in-out forwards` };
      default:
        return base;
    }
  };

  const getIncomingStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      zIndex: isAnimating ? 2 : 1,
      pointerEvents: 'none',
    };

    if (!isAnimating) return base;

    switch (transition) {
      case 'fade':
        return { ...base, animation: `tr-fade-in ${duration}ms ease-in-out forwards` };
      case 'slide-left':
        return { ...base, animation: `tr-slide-from-right ${duration}ms ease-in-out forwards` };
      case 'slide-right':
        return { ...base, animation: `tr-slide-from-left ${duration}ms ease-in-out forwards` };
      case 'slide-up':
        return { ...base, animation: `tr-slide-from-bottom ${duration}ms ease-in-out forwards` };
      case 'slide-down':
        return { ...base, animation: `tr-slide-from-top ${duration}ms ease-in-out forwards` };
      case 'zoom-in':
        return { ...base, animation: `tr-zoom-in-enter ${duration}ms ease-in-out forwards` };
      case 'zoom-out':
        return { ...base, animation: `tr-zoom-out-enter ${duration}ms ease-in-out forwards` };
      case 'flip':
        return { ...base, animation: `tr-flip-in ${duration}ms ease-in-out forwards` };
      default:
        return base;
    }
  };

  return (
    <>
      <style>{KEYFRAMES_CSS}</style>
      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* OUTGOING: frozen snapshot of old slide */}
        {outgoing && isAnimating && (
          <div
            key={`out-${outgoing.key}`}
            style={getOutgoingStyle()}
          >
            {outgoing.content}
          </div>
        )}

        {/* INCOMING: new target slide */}
        <div
          key={`in-${incoming.key}`}
          style={getIncomingStyle()}
        >
          {incoming.content}
        </div>
      </div>
    </>
  );
};

// ── Keyframes CSS (unchanged) ─────────────────────────────────────────────────
const KEYFRAMES_CSS = `
  @keyframes tr-fade-out {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes tr-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes tr-slide-to-left {
    from { transform: translateX(0); }
    to   { transform: translateX(-100%); }
  }
  @keyframes tr-slide-from-right {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  @keyframes tr-slide-to-right {
    from { transform: translateX(0); }
    to   { transform: translateX(100%); }
  }
  @keyframes tr-slide-from-left {
    from { transform: translateX(-100%); }
    to   { transform: translateX(0); }
  }
  @keyframes tr-slide-to-up {
    from { transform: translateY(0); }
    to   { transform: translateY(-100%); }
  }
  @keyframes tr-slide-from-bottom {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes tr-slide-to-down {
    from { transform: translateY(0); }
    to   { transform: translateY(100%); }
  }
  @keyframes tr-slide-from-top {
    from { transform: translateY(-100%); }
    to   { transform: translateY(0); }
  }
  @keyframes tr-zoom-out-exit {
    from { transform: scale(1);   opacity: 1; }
    to   { transform: scale(1.3); opacity: 0; }
  }
  @keyframes tr-zoom-in-enter {
    from { transform: scale(0.7); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }
  @keyframes tr-zoom-in-exit {
    from { transform: scale(1);   opacity: 1; }
    to   { transform: scale(0.7); opacity: 0; }
  }
  @keyframes tr-zoom-out-enter {
    from { transform: scale(1.3); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }
  @keyframes tr-flip-out {
    from { transform: perspective(1000px) rotateY(0deg);   opacity: 1; }
    to   { transform: perspective(1000px) rotateY(-90deg); opacity: 0; }
  }
  @keyframes tr-flip-in {
    from { transform: perspective(1000px) rotateY(90deg); opacity: 0; }
    to   { transform: perspective(1000px) rotateY(0deg);  opacity: 1; }
  }
`;

export default SlideTransition;