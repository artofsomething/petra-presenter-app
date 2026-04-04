// src/renderer/components/Editor/LayerControls.tsx
import React from 'react';
import usePresentationStore from '../../store/usePresentation';

const LayerControls: React.FC = () => {
  const {
    presentation,
    currentSlideIndex,
    selectedElementId,
    bringToFront,
    sendToBack,
    moveLayerUp,
    moveLayerDown,
  } = usePresentationStore();

  const currentSlide = presentation?.slides[currentSlideIndex];

  if (!selectedElementId || !currentSlide) return null;

  const elements = currentSlide.elements;
  const currentIndex = elements.findIndex((el) => el.id === selectedElementId);
  if (currentIndex === -1) return null;

  const isTop = currentIndex === elements.length - 1;
  const isBottom = currentIndex === 0;
  const totalLayers = elements.length;

  return (
    <div className="p-3 bg-gray-800 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-gray-300 text-xs font-bold">📚 Layer Order</h4>
        <span className="text-gray-500 text-[10px]">
          {currentIndex + 1} / {totalLayers}
        </span>
      </div>

      {/* Visual layer indicator */}
      <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-blue-500 rounded-full transition-all duration-200"
          style={{
            left: `${(currentIndex / Math.max(totalLayers - 1, 1)) * 100}%`,
            width: `${100 / totalLayers}%`,
            minWidth: '8px',
          }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-600">
        <span>Back</span>
        <span>Front</span>
      </div>

      {/* Layer buttons */}
      <div className="grid grid-cols-4 gap-1">
        <button
          onClick={() => sendToBack(currentSlideIndex, selectedElementId)}
          disabled={isBottom}
          className={`px-1 py-1.5 rounded text-[10px] font-medium transition-colors
            ${isBottom
              ? 'bg-gray-700/50 text-gray-600 cursor-default'
              : 'bg-gray-700 text-white hover:bg-gray-600 cursor-pointer'
            }`}
          title="Send to Back (Behind all)"
        >
          ⬇⬇
          <div className="text-[8px] text-gray-400 mt-0.5">Back</div>
        </button>

        <button
          onClick={() => moveLayerDown(currentSlideIndex, selectedElementId)}
          disabled={isBottom}
          className={`px-1 py-1.5 rounded text-[10px] font-medium transition-colors
            ${isBottom
              ? 'bg-gray-700/50 text-gray-600 cursor-default'
              : 'bg-gray-700 text-white hover:bg-gray-600 cursor-pointer'
            }`}
          title="Move Down (Behind one)"
        >
          ⬇
          <div className="text-[8px] text-gray-400 mt-0.5">Down</div>
        </button>

        <button
          onClick={() => moveLayerUp(currentSlideIndex, selectedElementId)}
          disabled={isTop}
          className={`px-1 py-1.5 rounded text-[10px] font-medium transition-colors
            ${isTop
              ? 'bg-gray-700/50 text-gray-600 cursor-default'
              : 'bg-gray-700 text-white hover:bg-gray-600 cursor-pointer'
            }`}
          title="Move Up (In front of one)"
        >
          ⬆
          <div className="text-[8px] text-gray-400 mt-0.5">Up</div>
        </button>

        <button
          onClick={() => bringToFront(currentSlideIndex, selectedElementId)}
          disabled={isTop}
          className={`px-1 py-1.5 rounded text-[10px] font-medium transition-colors
            ${isTop
              ? 'bg-gray-700/50 text-gray-600 cursor-default'
              : 'bg-blue-600 text-white hover:bg-blue-500 cursor-pointer'
            }`}
          title="Bring to Front (In front of all)"
        >
          ⬆⬆
          <div className="text-[8px] text-blue-200 mt-0.5">Front</div>
        </button>
      </div>
    </div>
  );
};

export default LayerControls;