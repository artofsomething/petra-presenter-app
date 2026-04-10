
import React, { useState } from 'react';
import usePresentationStore from '../../store/usePresentation';
import { TRANSITIONS } from '../../types/transitions';
import type { TransitionType } from '../../types/transitions';

const TransitionControl: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  const { presentation, currentSlideIndex, updateSlide } = usePresentationStore();
  const currentSlide = presentation?.slides[currentSlideIndex];

  if (!currentSlide) return null;

  const currentTransition = (currentSlide.transition || 'fade') as TransitionType;
  const currentDuration   = currentSlide.transitionDuration || 500;

  // Label of the currently selected transition for the collapsed summary
  const currentLabel = TRANSITIONS.find((t) => t.value === currentTransition);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">

      {/* ── Header ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2
                   hover:bg-gray-700 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-gray-300 text-xs font-bold shrink-0">✨ Slide Transition</span>

          {/* Collapsed summary pill */}
          {!isOpen && currentLabel && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded
                             bg-blue-600/30 border border-blue-500/40
                             text-blue-300 text-[10px] truncate">
              <span>{currentLabel.icon}</span>
              <span>{currentLabel.label}</span>
              <span className="text-blue-400/70">· {currentDuration}ms</span>
            </span>
          )}
        </div>

        {/* Chevron */}
        <svg
          viewBox="0 0 24 24" width="12" height="12" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            transition: 'transform 0.2s',
            transform:  isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            color:      '#9ca3af',
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── Body ── */}
      {isOpen && (
        <div className="px-3 pb-3 pt-1 space-y-2">

          {/* Transition Type Grid */}
          <div className="grid grid-cols-3 gap-1">
            {TRANSITIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => updateSlide(currentSlideIndex, { transition: t.value })}
                className={`px-1 py-1.5 rounded text-[10px] transition-colors
                            flex flex-col items-center gap-0.5
                  ${currentTransition === t.value
                    ? 'bg-blue-600 text-white border border-blue-400'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600 border border-transparent'
                  }`}
              >
                <span className="text-sm">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Duration */}
          <div>
            <label className="text-gray-400 text-xs block mb-1">
              Duration: {currentDuration}ms
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={currentDuration}
              onChange={(e) =>
                updateSlide(currentSlideIndex, {
                  transitionDuration: Number(e.target.value),
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-gray-600">
              <span>100ms</span>
              <span>1s</span>
              <span>2s</span>
            </div>
          </div>

          {/* Apply to all */}
          <button
            onClick={() => {
              if (!presentation) return;
              const confirmed = confirm('Apply this transition to ALL slides?');
              if (!confirmed) return;
              presentation.slides.forEach((_, i) => {
                updateSlide(i, {
                  transition:         currentTransition,
                  transitionDuration: currentDuration,
                });
              });
            }}
            className="w-full px-2 py-1.5 bg-gray-700 text-gray-300
                       rounded text-xs hover:bg-gray-600"
          >
            Apply to All Slides
          </button>

          {/* Preview */}
          <div className="text-center">
            <button
              onClick={() => {
                const store = usePresentationStore.getState();
                const total = presentation?.slides.length || 0;
                if (total > 1 && currentSlideIndex > 0) {
                  store.setCurrentSlideIndex(currentSlideIndex - 1);
                  setTimeout(() => store.setCurrentSlideIndex(currentSlideIndex), 100);
                } else if (total > 1) {
                  store.setCurrentSlideIndex(currentSlideIndex + 1);
                  setTimeout(() => store.setCurrentSlideIndex(currentSlideIndex), 100);
                }
              }}
              className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-500"
            >
              👁 Preview Transition
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default TransitionControl;

// // src/renderer/components/Editor/TransitionControl.tsx
// import React from 'react';
// import usePresentationStore from '../../store/usePresentation';
// import { TRANSITIONS } from '../../types/transitions';
// import type {TransitionType} from '../../types/transitions';

// const TransitionControl: React.FC = () => {
//   const { presentation, currentSlideIndex, updateSlide } = usePresentationStore();
//   const currentSlide = presentation?.slides[currentSlideIndex];

//   if (!currentSlide) return null;

//   const currentTransition = (currentSlide.transition || 'fade') as TransitionType;
//   const currentDuration = currentSlide.transitionDuration || 500;

//   return (
//     <div className="p-3 bg-gray-800 rounded-lg space-y-2">
//       <h4 className="text-gray-300 text-xs font-bold">✨ Slide Transition</h4>

//       {/* Transition Type Grid */}
//       <div className="grid grid-cols-3 gap-1">
//         {TRANSITIONS.map((t) => (
//           <button
//             key={t.value}
//             onClick={() => updateSlide(currentSlideIndex, { transition: t.value })}
//             className={`px-1 py-1.5 rounded text-[10px] transition-colors flex flex-col items-center gap-0.5
//               ${currentTransition === t.value
//                 ? 'bg-blue-600 text-white border border-blue-400'
//                 : 'bg-gray-700 text-gray-400 hover:bg-gray-600 border border-transparent'
//               }`}
//           >
//             <span className="text-sm">{t.icon}</span>
//             <span>{t.label}</span>
//           </button>
//         ))}
//       </div>

//       {/* Duration */}
//       <div>
//         <label className="text-gray-400 text-xs block mb-1">
//           Duration: {currentDuration}ms
//         </label>
//         <input
//           type="range"
//           min="100"
//           max="2000"
//           step="100"
//           value={currentDuration}
//           onChange={(e) =>
//             updateSlide(currentSlideIndex, {
//               transitionDuration: Number(e.target.value),
//             })
//           }
//           className="w-full"
//         />
//         <div className="flex justify-between text-[9px] text-gray-600">
//           <span>100ms</span>
//           <span>1s</span>
//           <span>2s</span>
//         </div>
//       </div>

//       {/* Apply to all slides */}
//       <button
//         onClick={() => {
//           if (!presentation) return;
//           const confirmed = confirm('Apply this transition to ALL slides?');
//           if (!confirmed) return;
//           presentation.slides.forEach((_, i) => {
//             updateSlide(i, {
//               transition: currentTransition,
//               transitionDuration: currentDuration,
//             });
//           });
//         }}
//         className="w-full px-2 py-1.5 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
//       >
//         Apply to All Slides
//       </button>

//       {/* Preview */}
//       <div className="text-center">
//         <button
//           onClick={() => {
//             // Trigger a quick preview by toggling slides
//             const store = usePresentationStore.getState();
//             const total = presentation?.slides.length || 0;
//             if (total > 1 && currentSlideIndex > 0) {
//               store.setCurrentSlideIndex(currentSlideIndex - 1);
//               setTimeout(() => store.setCurrentSlideIndex(currentSlideIndex), 100);
//             } else if (total > 1) {
//               store.setCurrentSlideIndex(currentSlideIndex + 1);
//               setTimeout(() => store.setCurrentSlideIndex(currentSlideIndex), 100);
//             }
//           }}
//           className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-500"
//         >
//           👁 Preview Transition
//         </button>
//       </div>
//     </div>
//   );
// };

// export default TransitionControl;