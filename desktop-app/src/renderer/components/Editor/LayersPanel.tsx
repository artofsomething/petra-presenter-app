// src/renderer/components/Editor/LayersPanel.tsx
import React, { useCallback } from 'react';
import usePresentationStore from '../../store/usePresentation';
import type { SlideElement } from '../../../server/types';

const LayersPanel: React.FC = () => {
  const {
    presentation,
    currentSlideIndex,
    selectedElementId,
    setSelectedElementId,
    bringToFront,
    sendToBack,
    moveLayerUp,
    moveLayerDown,
    deleteElement,
  } = usePresentationStore();

  const currentSlide = presentation?.slides[currentSlideIndex];

  // Elements reversed: top of list = visually on top (last in array)
  const layerElements = currentSlide
    ? [...currentSlide.elements].reverse()
    : [];

  const handleDragStart = useCallback(
    (e: React.DragEvent, elementId: string) => {
      e.dataTransfer.setData('text/plain', elementId);
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetElementId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId || draggedId === targetElementId || !currentSlide) return;

      const elements = currentSlide.elements;
      const targetIndex = elements.findIndex((el) => el.id === targetElementId);

      if (targetIndex !== -1) {
        usePresentationStore
          .getState()
          .moveToLayer(currentSlideIndex, draggedId, targetIndex);
      }
    },
    [currentSlide, currentSlideIndex]
  );

  const getElementIcon = (element: SlideElement): string => {
    switch (element.type) {
      case 'text': return '📝';
      case 'shape':
        switch (element.shapeType) {
          case 'circle': return '⭕';
          case 'ellipse': return '🔵';
          case 'star': return '⭐';
          default: return '⬜';
        }
      case 'image': return '🖼️';
      case 'video': return '🎬';
      default: return '📦';
    }
  };

  const getElementLabel = (element: SlideElement): string => {
    switch (element.type) {
      case 'text':
        const preview = (element.text || 'Text').substring(0, 20);
        return preview + (preview.length < (element.text || '').length ? '...' : '');
      case 'shape':
        return `${element.shapeType || 'rect'}`.charAt(0).toUpperCase() +
               `${element.shapeType || 'rect'}`.slice(1);
      case 'image': return 'Image';
      case 'video': return 'Video';
      default: return 'Element';
    }
  };

  const getElementColor = (element: SlideElement): string => {
    switch (element.type) {
      case 'text': return element.fontColor || '#000';
      case 'shape': return element.fill || '#3b82f6';
      case 'image': return '#ec4899';
      case 'video': return '#ef4444';
      default: return '#666';
    }
  };

  if (!currentSlide) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <h3 className="text-white text-xs font-bold">📚 Layers</h3>
        <span className="text-gray-500 text-[10px]">
          {currentSlide.elements.length} elements
        </span>
      </div>

      {/* Layer controls for selected element */}
      {selectedElementId && (
        <div className="flex items-center gap-1 p-2 border-b border-gray-700 bg-gray-800/50">
          <button
            onClick={() => bringToFront(currentSlideIndex, selectedElementId)}
            className="flex-1 px-1 py-1 bg-gray-700 text-white rounded text-[10px]
                       hover:bg-gray-600 transition-colors"
            title="Bring to Front"
          >
            ⬆⬆ Top
          </button>
          <button
            onClick={() => moveLayerUp(currentSlideIndex, selectedElementId)}
            className="flex-1 px-1 py-1 bg-gray-700 text-white rounded text-[10px]
                       hover:bg-gray-600 transition-colors"
            title="Move Up"
          >
            ⬆ Up
          </button>
          <button
            onClick={() => moveLayerDown(currentSlideIndex, selectedElementId)}
            className="flex-1 px-1 py-1 bg-gray-700 text-white rounded text-[10px]
                       hover:bg-gray-600 transition-colors"
            title="Move Down"
          >
            ⬇ Down
          </button>
          <button
            onClick={() => sendToBack(currentSlideIndex, selectedElementId)}
            className="flex-1 px-1 py-1 bg-gray-700 text-white rounded text-[10px]
                       hover:bg-gray-600 transition-colors"
            title="Send to Back"
          >
            ⬇⬇ Bottom
          </button>
        </div>
      )}

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto">
        {layerElements.length === 0 ? (
          <div className="text-center text-gray-600 text-xs p-4">
            No elements on this slide.<br />
            Add elements using the toolbar above.
          </div>
        ) : (
          <div className="p-1">
            {layerElements.map((element, displayIndex) => {
              const isSelected = element.id === selectedElementId;
              // Real index in the elements array (0 = bottom, length-1 = top)
              const realIndex = currentSlide.elements.length - 1 - displayIndex;
              const isTopLayer = realIndex === currentSlide.elements.length - 1;
              const isBottomLayer = realIndex === 0;

              return (
                <div
                  key={element.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, element.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, element.id)}
                  onClick={() => setSelectedElementId(element.id)}
                  className={`
                    flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5
                    cursor-pointer select-none transition-all duration-100
                    ${isSelected
                      ? 'bg-blue-600/30 border border-blue-500/50'
                      : 'bg-gray-800/50 border border-transparent hover:bg-gray-700/50 hover:border-gray-600/50'
                    }
                  `}
                >
                  {/* Drag Handle */}
                  <div className="text-gray-500 cursor-grab active:cursor-grabbing text-[10px]"
                    title="Drag to reorder">
                    ⠿
                  </div>

                  {/* Color indicator */}
                  <div
                    className="w-3 h-3 rounded-sm border border-gray-600 flex-shrink-0"
                    style={{ backgroundColor: getElementColor(element) }}
                  />

                  {/* Icon */}
                  <span className="text-xs flex-shrink-0">
                    {getElementIcon(element)}
                  </span>

                  {/* Label */}
                  <span className={`text-[11px] flex-1 truncate ${
                    isSelected ? 'text-white font-medium' : 'text-gray-300'
                  }`}>
                    {getElementLabel(element)}
                  </span>

                  {/* Layer position indicator */}
                  <span className="text-[9px] text-gray-500 flex-shrink-0 w-4 text-center">
                    {realIndex}
                  </span>

                  {/* Quick actions (visible on hover/selected) */}
                  <div className={`flex gap-0.5 flex-shrink-0 ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    {/* Move Up */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayerUp(currentSlideIndex, element.id);
                      }}
                      disabled={isTopLayer}
                      className={`w-4 h-4 rounded text-[8px] flex items-center justify-center
                        ${isTopLayer
                          ? 'text-gray-700 cursor-default'
                          : 'text-gray-400 hover:bg-gray-600 hover:text-white cursor-pointer'
                        }`}
                      title="Move Up"
                    >
                      ▲
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayerDown(currentSlideIndex, element.id);
                      }}
                      disabled={isBottomLayer}
                      className={`w-4 h-4 rounded text-[8px] flex items-center justify-center
                        ${isBottomLayer
                          ? 'text-gray-700 cursor-default'
                          : 'text-gray-400 hover:bg-gray-600 hover:text-white cursor-pointer'
                        }`}
                      title="Move Down"
                    >
                      ▼
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteElement(currentSlideIndex, element.id);
                      }}
                      className="w-4 h-4 rounded text-[8px] flex items-center justify-center
                                 text-gray-400 hover:bg-red-900 hover:text-red-400 cursor-pointer"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-2 border-t border-gray-700">
        <div className="text-[9px] text-gray-600 text-center">
          ↑ Top (Front) — ↓ Bottom (Back) • Drag to reorder
        </div>
      </div>
    </div>
  );
};

export default LayersPanel;