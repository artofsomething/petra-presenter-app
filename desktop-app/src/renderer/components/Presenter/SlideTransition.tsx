// src/renderer/components/Presenter/SlideTransition.tsx
// REPLACE ENTIRE FILE

import React, { useEffect, useState, useRef } from 'react';
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
  // ✅ Two buffers: outgoing (old) and incoming (new)
  const [outgoing, setOutgoing] = useState<SlideSnapshot | null>(null);
  const [incoming, setIncoming] = useState<SlideSnapshot>({ content: children, key: slideIndex });
  const [isAnimating, setIsAnimating] = useState(false);

  const prevIndexRef = useRef(slideIndex);
  const prevChildrenRef = useRef(children);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Update children ref without triggering transition
  // (needed because children reference changes on every render)
  useEffect(() => {
    if (slideIndex === prevIndexRef.current) {
      // Same slide, just update the incoming content (e.g. editing)
      prevChildrenRef.current = children;
      if (!isAnimating) {
        setIncoming({ content: children, key: slideIndex });
      }
      return;
    }

    // ── Slide index changed → start transition ──

    // Clear any ongoing transition
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (transition === 'none') {
      setOutgoing(null);
      setIncoming({ content: children, key: slideIndex });
      prevIndexRef.current = slideIndex;
      prevChildrenRef.current = children;
      return;
    }

    // ✅ Snapshot the OLD content as outgoing
    setOutgoing({ content: prevChildrenRef.current, key: prevIndexRef.current });
    // ✅ Set NEW content as incoming immediately (but animated in)
    setIncoming({ content: children, key: slideIndex });
    setIsAnimating(true);

    prevIndexRef.current = slideIndex;
    prevChildrenRef.current = children;

    // After full animation duration, clean up outgoing
    timeoutRef.current = setTimeout(() => {
      setOutgoing(null);
      setIsAnimating(false);
    }, duration);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [slideIndex]); // ✅ Only trigger on slideIndex change, NOT children

  // ─── Style builders ───────────────────────────────────────────

  const getOutgoingStyle = (): React.CSSProperties => {
    if (!isAnimating) return {};
    const base: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      zIndex: 1,
    };

    switch (transition) {
      case 'fade':
        return {
          ...base,
          animation: `tr-fade-out ${duration}ms ease-in-out forwards`,
        };
      case 'slide-left':
        return {
          ...base,
          animation: `tr-slide-to-left ${duration}ms ease-in-out forwards`,
        };
      case 'slide-right':
        return {
          ...base,
          animation: `tr-slide-to-right ${duration}ms ease-in-out forwards`,
        };
      case 'slide-up':
        return {
          ...base,
          animation: `tr-slide-to-up ${duration}ms ease-in-out forwards`,
        };
      case 'slide-down':
        return {
          ...base,
          animation: `tr-slide-to-down ${duration}ms ease-in-out forwards`,
        };
      case 'zoom-in':
        return {
          ...base,
          animation: `tr-zoom-out-exit ${duration}ms ease-in-out forwards`,
        };
      case 'zoom-out':
        return {
          ...base,
          animation: `tr-zoom-in-exit ${duration}ms ease-in-out forwards`,
        };
      case 'flip':
        return {
          ...base,
          animation: `tr-flip-out ${duration}ms ease-in-out forwards`,
        };
      default:
        return base;
    }
  };

  const getIncomingStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      zIndex: isAnimating ? 2 : 1, // incoming on top
    };

    if (!isAnimating) return base;

    switch (transition) {
      case 'fade':
        return {
          ...base,
          animation: `tr-fade-in ${duration}ms ease-in-out forwards`,
        };
      case 'slide-left':
        return {
          ...base,
          animation: `tr-slide-from-right ${duration}ms ease-in-out forwards`,
        };
      case 'slide-right':
        return {
          ...base,
          animation: `tr-slide-from-left ${duration}ms ease-in-out forwards`,
        };
      case 'slide-up':
        return {
          ...base,
          animation: `tr-slide-from-bottom ${duration}ms ease-in-out forwards`,
        };
      case 'slide-down':
        return {
          ...base,
          animation: `tr-slide-from-top ${duration}ms ease-in-out forwards`,
        };
      case 'zoom-in':
        return {
          ...base,
          animation: `tr-zoom-in-enter ${duration}ms ease-in-out forwards`,
        };
      case 'zoom-out':
        return {
          ...base,
          animation: `tr-zoom-out-enter ${duration}ms ease-in-out forwards`,
        };
      case 'flip':
        return {
          ...base,
          animation: `tr-flip-in ${duration}ms ease-in-out forwards`,
        };
      default:
        return base;
    }
  };

  return (
    <>
      {/* ✅ Inject keyframes once */}
      <style>{KEYFRAMES_CSS}</style>

      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* ✅ OUTGOING: old slide animates OUT */}
        {outgoing && isAnimating && (
          <div
            key={`out-${outgoing.key}`}
            style={getOutgoingStyle()}
          >
            {outgoing.content}
          </div>
        )}

        {/* ✅ INCOMING: new slide animates IN */}
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

// ─── Keyframes CSS ─────────────────────────────────────────────────────────────
const KEYFRAMES_CSS = `
  /* Fade */
  @keyframes tr-fade-out {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes tr-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* Slide Left (outgoing goes left, incoming comes from right) */
  @keyframes tr-slide-to-left {
    from { transform: translateX(0); }
    to   { transform: translateX(-100%); }
  }
  @keyframes tr-slide-from-right {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }

  /* Slide Right (outgoing goes right, incoming comes from left) */
  @keyframes tr-slide-to-right {
    from { transform: translateX(0); }
    to   { transform: translateX(100%); }
  }
  @keyframes tr-slide-from-left {
    from { transform: translateX(-100%); }
    to   { transform: translateX(0); }
  }

  /* Slide Up (outgoing goes up, incoming comes from bottom) */
  @keyframes tr-slide-to-up {
    from { transform: translateY(0); }
    to   { transform: translateY(-100%); }
  }
  @keyframes tr-slide-from-bottom {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }

  /* Slide Down (outgoing goes down, incoming comes from top) */
  @keyframes tr-slide-to-down {
    from { transform: translateY(0); }
    to   { transform: translateY(100%); }
  }
  @keyframes tr-slide-from-top {
    from { transform: translateY(-100%); }
    to   { transform: translateY(0); }
  }

  /* Zoom In (incoming zooms in) */
  @keyframes tr-zoom-out-exit {
    from { transform: scale(1);   opacity: 1; }
    to   { transform: scale(1.3); opacity: 0; }
  }
  @keyframes tr-zoom-in-enter {
    from { transform: scale(0.7); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }

  /* Zoom Out (incoming zooms out) */
  @keyframes tr-zoom-in-exit {
    from { transform: scale(1);   opacity: 1; }
    to   { transform: scale(0.7); opacity: 0; }
  }
  @keyframes tr-zoom-out-enter {
    from { transform: scale(1.3); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }

  /* Flip */
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


// // src/renderer/components/Presenter/SlideTransition.tsx
// import React, { useEffect, useState, useRef } from 'react';
// import type { TransitionType } from '../../types/transitions';

// interface SlideTransitionProps {
//   slideIndex: number;
//   transition: TransitionType;
//   duration: number;
//   children: React.ReactNode;
// }

// const SlideTransition: React.FC<SlideTransitionProps> = ({
//   slideIndex,
//   transition,
//   duration,
//   children,
// }) => {
//   const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
//   const [displayedChildren, setDisplayedChildren] = useState(children);
//   const prevIndexRef = useRef(slideIndex);
//   const timeoutRef = useRef<NodeJS.Timeout | null>(null);

//   useEffect(() => {
//     if (slideIndex === prevIndexRef.current) return;

//     if (transition === 'none') {
//       setDisplayedChildren(children);
//       prevIndexRef.current = slideIndex;
//       return;
//     }

//     // Start exit animation
//     setPhase('exit');

//     // After exit animation, swap content and start enter
//     timeoutRef.current = setTimeout(() => {
//       setDisplayedChildren(children);
//       setPhase('enter');

//       // After enter animation, go idle
//       timeoutRef.current = setTimeout(() => {
//         setPhase('idle');
//         prevIndexRef.current = slideIndex;
//       }, duration / 2);
//     }, duration / 2);

//     return () => {
//       if (timeoutRef.current) clearTimeout(timeoutRef.current);
//     };
//   }, [slideIndex, children, transition, duration]);

//   // On first render, just show immediately
//   useEffect(() => {
//     setDisplayedChildren(children);
//   }, [children]);

//   const getStyles = (): React.CSSProperties => {
//     const halfDuration = duration / 2;

//     switch (transition) {
//       case 'fade':
//         return {
//           opacity: phase === 'exit' ? 0 : phase === 'enter' ? 0 : 1,
//           transition: `opacity ${halfDuration}ms ease-in-out`,
//           ...(phase === 'enter' && {
//             animation: `fadeIn ${halfDuration}ms ease-in-out forwards`,
//           }),
//         };

//       case 'slide-left':
//         return {
//           transform:
//             phase === 'exit' ? 'translateX(-100%)'
//             : phase === 'enter' ? 'translateX(100%)'
//             : 'translateX(0)',
//           transition: `transform ${halfDuration}ms ease-in-out`,
//           ...(phase === 'enter' && {
//             animation: `slideInFromRight ${halfDuration}ms ease-in-out forwards`,
//           }),
//         };

//       case 'slide-right':
//         return {
//           transform:
//             phase === 'exit' ? 'translateX(100%)'
//             : phase === 'enter' ? 'translateX(-100%)'
//             : 'translateX(0)',
//           transition: `transform ${halfDuration}ms ease-in-out`,
//           ...(phase === 'enter' && {
//             animation: `slideInFromLeft ${halfDuration}ms ease-in-out forwards`,
//           }),
//         };

//       case 'slide-up':
//         return {
//           transform:
//             phase === 'exit' ? 'translateY(-100%)'
//             : phase === 'enter' ? 'translateY(100%)'
//             : 'translateY(0)',
//           transition: `transform ${halfDuration}ms ease-in-out`,
//           ...(phase === 'enter' && {
//             animation: `slideInFromBottom ${halfDuration}ms ease-in-out forwards`,
//           }),
//         };

//       case 'slide-down':
//         return {
//           transform:
//             phase === 'exit' ? 'translateY(100%)'
//             : phase === 'enter' ? 'translateY(-100%)'
//             : 'translateY(0)',
//           transition: `transform ${halfDuration}ms ease-in-out`,
//           ...(phase === 'enter' && {
//             animation: `slideInFromTop ${halfDuration}ms ease-in-out forwards`,
//           }),
//         };

//       case 'zoom-in':
//         return {
//           transform:
//             phase === 'exit' ? 'scale(1.5)'
//             : phase === 'enter' ? 'scale(0.5)'
//             : 'scale(1)',
//           opacity: phase === 'exit' ? 0 : phase === 'enter' ? 0 : 1,
//           transition: `transform ${halfDuration}ms ease-in-out, opacity ${halfDuration}ms ease-in-out`,
//           ...(phase === 'enter' && {
//             animation: `zoomIn ${halfDuration}ms ease-in-out forwards`,
//           }),
//         };

//       case 'zoom-out':
//         return {
//           transform:
//             phase === 'exit' ? 'scale(0.5)'
//             : phase === 'enter' ? 'scale(1.5)'
//             : 'scale(1)',
//           opacity: phase === 'exit' ? 0 : phase === 'enter' ? 0 : 1,
//           transition: `transform ${halfDuration}ms ease-in-out, opacity ${halfDuration}ms ease-in-out`,
//           ...(phase === 'enter' && {
//             animation: `zoomOut ${halfDuration}ms ease-in-out forwards`,
//           }),
//         };

//       case 'flip':
//         return {
//           transform:
//             phase === 'exit' ? 'perspective(1000px) rotateY(90deg)'
//             : phase === 'enter' ? 'perspective(1000px) rotateY(-90deg)'
//             : 'perspective(1000px) rotateY(0deg)',
//           transition: `transform ${halfDuration}ms ease-in-out`,
//           ...(phase === 'enter' && {
//             animation: `flipIn ${halfDuration}ms ease-in-out forwards`,
//           }),
//         };

//       default:
//         return {};
//     }
//   };

//   return (
//     <div style={{
//       width: '100%',
//       height: '100%',
//       position: 'relative',
//       overflow: 'hidden',
//     }}>
//       <div style={{
//         width: '100%',
//         height: '100%',
//         ...getStyles(),
//       }}>
//         {displayedChildren}
//       </div>
//     </div>
//   );
// };

// export default SlideTransition;