// src/renderer/components/Editor/SlideCanvas.tsx

import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Stage, Layer, Rect, Text, Circle, Ellipse, Star,
  Transformer, Group,
} from 'react-konva';
import Konva from 'konva';
import usePresentationStore from '../../store/usePresentation';
import type { SlideElement, AnimatedBackground } from '../../../server/types';
import EditableText from './EditableText';
import ImageElement from './ImageElement';
import VideoElement from './VideoElement';
import VideoBackground from './VideoBackground';
import BackgroundImageLayer from './BackgroundImageLayer';
import TextEditOverlay from './TextEditOverlay';
import { gradientToKonvaPoints } from './GradientPicker';
import type { GradientConfig } from '../../../server/types';
import AnimatedBackgroundComponent from './AnimatedBackground';
import { useSnapGuides } from '../../hooks/useSnapGuides';
import SnapGuideLines from './SnapGuideLines';
import ScreenCaptureElement from '../Advanced/ScreenCaptureElement';

// ── Display ratio — canvas preview is rendered at half the logical size ───────
const PREVIEW_RATIO = 0.5;   // 1920 → 960, 1080 → 540

interface SlideCanvasProps {
  editable?: boolean;
}

// 1. Update TextEditState — remove _nodeWasVisible
interface TextEditState {
  elementId:  string;
  x:          number;
  y:          number;
  width:      number;
  height:     number;
  rotation:   number;
  text:       string;
  fontSize:   number;
  fontFamily: string;
  fontColor:  string;
  fontWeight: string;
  fontStyle:  string;
  textAlign:  string;
}

function buildKonvaGradientProps(
  gradient: GradientConfig,
  w: number,
  h: number,
) {
  const stops      = [...gradient.stops].sort((a, b) => a.offset - b.offset);
  const colorStops = stops.flatMap((s) => [s.offset, s.color]);

  if (gradient.type === 'radial') {
    const cx     = w / 2;
    const cy     = h / 2;
    const radius = Math.max(w, h) / 2;
    return {
      fillRadialGradientStartPoint:  { x: cx, y: cy },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndPoint:    { x: cx, y: cy },
      fillRadialGradientEndRadius:   radius,
      fillRadialGradientColorStops:  colorStops,
      fill: undefined,
    };
  }

  const { startPoint, endPoint } = gradientToKonvaPoints(gradient.angle, w, h);
  return {
    fillLinearGradientStartPoint:  startPoint,
    fillLinearGradientEndPoint:    endPoint,
    fillLinearGradientColorStops:  colorStops,
    fill: undefined,
  };
}

const getShapeFillProps = (element: SlideElement, w: number, h: number) => {
  if (element.fillGradient) {
    return buildKonvaGradientProps(element.fillGradient, w, h);
  }
  return { fill: element.fill || '#3b82f6' };
};

const SlideCanvas: React.FC<SlideCanvasProps> = ({ editable = true }) => {
  const stageRef          = useRef<Konva.Stage>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const transformerRef    = useRef<Konva.Transformer>(null);
  const [editingText, setEditingText] = useState<TextEditState | null>(null);

  // ── Dynamic canvas resolution from store ─────────────────────────────────
  const canvasWidth  = usePresentationStore(s => s.canvasWidth);
  const canvasHeight = usePresentationStore(s => s.canvasHeight);

  // ── Logical (design) dimensions ───────────────────────────────────────────
  const LOGICAL_WIDTH  = canvasWidth;
  const LOGICAL_HEIGHT = canvasHeight;

  // ── Preview (rendered) dimensions ─────────────────────────────────────────
  const CANVAS_WIDTH  = Math.round(canvasWidth  * PREVIEW_RATIO);
  const CANVAS_HEIGHT = Math.round(canvasHeight * PREVIEW_RATIO);

  // ── Scale factor: logical → canvas preview ────────────────────────────────
  const SCALE = CANVAS_WIDTH / LOGICAL_WIDTH;   // always = PREVIEW_RATIO

  const { guides, computeSnap, updateGuides, clearGuides } = useSnapGuides({
    canvasWidth:   LOGICAL_WIDTH,
    canvasHeight:  LOGICAL_HEIGHT,
    snapThreshold: 6,
  });

  const {
    presentation,
    currentSlideIndex,
    selectedElementId,
    setSelectedElementId,
    updateElement,
    deleteElement,
  } = usePresentationStore();

  const currentSlide = presentation?.slides[currentSlideIndex];

  // ── Clear selection on slide change ──────────────────────────────────────
  useEffect(() => {
    setSelectedElementId(null);
    setEditingText(null);
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [currentSlideIndex, setSelectedElementId]);

  // ── Update transformer when selection changes ─────────────────────────────
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    if (selectedElementId && !editingText) {
      const elementExists = currentSlide?.elements.some(
        (el) => el.id === selectedElementId,
      );

      if (elementExists) {
        const timer = setTimeout(() => {
          if (!transformerRef.current || !stageRef.current) return;
          const node = stageRef.current.findOne(`#${selectedElementId}`);
          if (node) {
            transformerRef.current.nodes([node]);
            transformerRef.current.getLayer()?.batchDraw();
          }
        }, 10);
        return () => clearTimeout(timer);
      } else {
        transformerRef.current.nodes([]);
        setSelectedElementId(null);
      }
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedElementId, editingText, currentSlideIndex, currentSlide?.elements]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (editingText) return;
      const target = e.target;
      if (
        target === e.target.getStage() ||
        target.attrs?.id === 'slide-bg' ||
        target.attrs?.id === 'slide-bg-image'
      ) {
        setSelectedElementId(null);
      }
    },
    [editingText, setSelectedElementId],
  );

  const handleElementSelect = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, elementId: string) => {
      e.cancelBubble = true;
      if (editable && !editingText) {
        setSelectedElementId(elementId);
      }
    },
    [editable, editingText, setSelectedElementId],
  );

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, element: SlideElement) => {
      if (!editable) return;
      const node = e.target;

      const rawX = node.x() / SCALE;
      const rawY = node.y() / SCALE;

      const slide = usePresentationStore
        .getState()
        .presentation?.slides[currentSlideIndex];
      if (!slide) return;

      const others = slide.elements
        .filter((el) => el.id !== element.id)
        .map((el) => ({
          id: el.id, x: el.x, y: el.y,
          width: el.width, height: el.height,
        }));

      const { x, y, guides: newGuides } = computeSnap(
        {
          id: element.id, x: rawX, y: rawY,
          width: element.width, height: element.height,
        },
        others,
      );

      updateGuides(newGuides);
      node.x(x * SCALE);
      node.y(y * SCALE);
    },
    [editable, currentSlideIndex, computeSnap, updateGuides, SCALE],
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, element: SlideElement) => {
      if (!editable) return;
      clearGuides();
      const node = e.target;
      updateElement(currentSlideIndex, element.id, {
        x: node.x() / SCALE,
        y: node.y() / SCALE,
      });
    },
    [editable, currentSlideIndex, updateElement, clearGuides, SCALE],
  );

  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>, element: SlideElement) => {
      if (!editable) return;
      const node   = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      node.scaleX(1);
      node.scaleY(1);

      const newWidth  = Math.max(10, element.width  * scaleX);
      const newHeight = Math.max(10, element.height * scaleY);

      const updates: Partial<SlideElement> = {
        x:        node.x() / SCALE,
        y:        node.y() / SCALE,
        width:    newWidth,
        height:   newHeight,
        rotation: node.rotation(),
      };

      if (element.type === 'text') {
        const currentFontSize = element.fontSize ?? 24;
        const fontScale       = scaleY !== 1 ? scaleY : scaleX;
        updates.fontSize      = Math.max(6, Math.round(currentFontSize * fontScale));
      }

      updateElement(currentSlideIndex, element.id, updates);
    },
    [editable, currentSlideIndex, updateElement, SCALE],
  );
// ── Text editing ──────────────────────────────────────────────────────────
  // 2. Replace all three handlers — no more hide/show
  const handleTextDoubleClick = useCallback(
    (element: SlideElement, textNode: Konva.Text) => {
      if (!editable || !stageRef.current) return;

      // ✅ Do NOT call textNode.hide() — let CSS opacity handle it
      transformerRef.current?.nodes([]);
      transformerRef.current?.getLayer()?.batchDraw();

      const textRect = textNode.getClientRect();

      setEditingText({
        elementId:  element.id,
        x:          textRect.x,
        y:          textRect.y,
        width:      textRect.width,
        height:     textRect.height,
        rotation:   element.rotation || 0,
        text:       element.text || '',
        fontSize:   (element.fontSize || 24) * SCALE,
        fontFamily: element.fontFamily || 'Arial',
        fontColor:  element.fontColor  || '#000000',
        fontWeight: element.fontWeight || 'normal',
        fontStyle:  element.fontStyle  || 'normal',
        textAlign:  element.textAlign  || 'left',
      });
    },
    [editable, SCALE],
  );

  const handleTextSave = useCallback(
    (newText: string) => {
      if (!editingText) return;
      // ✅ Just update the text — React re-renders everything correctly
      updateElement(currentSlideIndex, editingText.elementId, { text: newText });
      setEditingText(null);
      setSelectedElementId(editingText.elementId);
    },
    [editingText, currentSlideIndex, updateElement, setSelectedElementId],
  );

  const handleTextCancel = useCallback(() => {
    if (!editingText) return;
    // ✅ Just clear editing state — nothing to restore
    setEditingText(null);
  }, [editingText]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingText) return;
      const tag = (e.target as HTMLElement).tagName;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        deleteElement(currentSlideIndex, selectedElementId);
      }

      if (e.key === 'Escape') setSelectedElementId(null);

      if (selectedElementId && !e.ctrlKey && !e.metaKey) {
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const el = currentSlide?.elements.find((el) => el.id === selectedElementId);
        if (!el) return;
        const nudge = e.shiftKey ? 10 : 1;
        switch (e.key) {
          case 'ArrowUp':    e.preventDefault(); updateElement(currentSlideIndex, selectedElementId, { y: el.y - nudge }); break;
          case 'ArrowDown':  e.preventDefault(); updateElement(currentSlideIndex, selectedElementId, { y: el.y + nudge }); break;
          case 'ArrowLeft':  e.preventDefault(); updateElement(currentSlideIndex, selectedElementId, { x: el.x - nudge }); break;
          case 'ArrowRight': e.preventDefault(); updateElement(currentSlideIndex, selectedElementId, { x: el.x + nudge }); break;
        }
      }

      if ((e.ctrlKey || e.metaKey) && selectedElementId) {
        switch (e.key) {
          case ']':
            e.preventDefault();
            e.shiftKey
              ? usePresentationStore.getState().bringToFront(currentSlideIndex, selectedElementId)
              : usePresentationStore.getState().moveLayerUp(currentSlideIndex, selectedElementId);
            break;
          case '[':
            e.preventDefault();
            e.shiftKey
              ? usePresentationStore.getState().sendToBack(currentSlideIndex, selectedElementId)
              : usePresentationStore.getState().moveLayerDown(currentSlideIndex, selectedElementId);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, editingText, currentSlideIndex, currentSlide]);

  // ── Shape renderer ────────────────────────────────────────────────────────
  const renderShape = (element: SlideElement) => {
    const x       = element.x * SCALE;
    const y       = element.y * SCALE;
    const w       = element.width  * SCALE;
    const h       = element.height * SCALE;
    const isLocked = element.isLocked ?? false;

    switch (element.shapeType) {

      case 'circle':
        return (
          <Group
            key={element.id} id={element.id}
            x={x} y={y}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
            draggable={editable && !isLocked}
            onClick={(e) => handleElementSelect(e, element.id)}
            onDragMove={(e) => handleDragMove(e, element)}
            onDragEnd={(e) => handleDragEnd(e, element)}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
          >
            <Rect width={w} height={h} fill="transparent" stroke="transparent" />
            <Circle
              x={w / 2} y={h / 2}
              radius={Math.min(w, h) / 2}
              {...getShapeFillProps(element, w, h)}
              stroke={element.stroke || ''}
              strokeWidth={(element.strokeWidth || 0) * SCALE}
              listening={false}
            />
          </Group>
        );

      case 'ellipse':
        return (
          <Group
            key={element.id} id={element.id}
            x={x} y={y}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
            draggable={editable && !isLocked}
            onClick={(e) => handleElementSelect(e, element.id)}
            onDragMove={(e) => handleDragMove(e, element)}
            onDragEnd={(e) => handleDragEnd(e, element)}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
          >
            <Rect width={w} height={h} fill="transparent" stroke="transparent" />
            <Ellipse
              x={w / 2} y={h / 2}
              radiusX={w / 2} radiusY={h / 2}
              {...getShapeFillProps(element, w, h)}
              stroke={element.stroke || ''}
              strokeWidth={(element.strokeWidth || 0) * SCALE}
              listening={false}
            />
          </Group>
        );

      case 'star':
        return (
          <Group
            key={element.id} id={element.id}
            x={x} y={y}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
            draggable={editable && !isLocked}
            onClick={(e) => handleElementSelect(e, element.id)}
            onDragMove={(e) => handleDragMove(e, element)}
            onDragEnd={(e) => handleDragEnd(e, element)}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
          >
            <Rect width={w} height={h} fill="transparent" stroke="transparent" />
            <Star
              x={w / 2} y={h / 2}
              numPoints={5}
              innerRadius={Math.min(w, h) / 4}
              outerRadius={Math.min(w, h) / 2}
              {...getShapeFillProps(element, w, h)}
              stroke={element.stroke || ''}
              strokeWidth={(element.strokeWidth || 0) * SCALE}
              listening={false}
            />
          </Group>
        );

      case 'rounded-rect': {
        const rawRadius    = element.cornerRadius ?? 20;
        const scaledRadius = Math.min(rawRadius * SCALE, Math.min(w, h) / 2);
        return (
          <Rect
            key={element.id} id={element.id}
            x={x} y={y} width={w} height={h}
            {...getShapeFillProps(element, w, h)}
            stroke={element.stroke || ''}
            strokeWidth={(element.strokeWidth || 0) * SCALE}
            cornerRadius={scaledRadius}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
            draggable={editable && !isLocked}
            onDragMove={(e) => handleDragMove(e, element)}
            onClick={(e) => handleElementSelect(e, element.id)}
            onDragEnd={(e) => handleDragEnd(e, element)}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
          />
        );
      }

      default:
        return (
          <Rect
            key={element.id} id={element.id}
            x={x} y={y} width={w} height={h}
            {...getShapeFillProps(element, w, h)}
            stroke={element.stroke || ''}
            strokeWidth={(element.strokeWidth || 0) * SCALE}
            cornerRadius={0}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
            draggable={editable && !isLocked}
            onDragMove={(e) => handleDragMove(e, element)}
            onClick={(e) => handleElementSelect(e, element.id)}
            onDragEnd={(e) => handleDragEnd(e, element)}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
          />
        );
    }
  };

  // ── Element renderer ──────────────────────────────────────────────────────
  const renderElement = (element: SlideElement) => {
    switch (element.type) {
      case 'text':
        return (
          <EditableText
            key={element.id}
            element={element}
            scale={SCALE}
            isSelected={selectedElementId === element.id}
            editable={editable}
            lineHeight={element.lineHeight ?? 1.2}
            onSelect={(e) => handleElementSelect(e, element.id)}
            onDragEnd={(e) => handleDragEnd(e, element)}
            onDragMove={(e) => handleDragMove(e, element)}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
            onDoubleClick={handleTextDoubleClick}
          />
        );
      case 'shape':
        return renderShape(element);
      case 'image':
        return (
          <ImageElement
            key={element.id}
            element={element}
            scale={SCALE}
            editable={editable}
            onSelect={(e) => handleElementSelect(e, element.id)}
            onDragEnd={(e) => handleDragEnd(e, element)}
            onDragMove={(e) => handleDragMove(e, element)}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
          />
        );
      case 'video':
        return (
          <VideoElement
            key={element.id}
            element={element}
            scale={SCALE}
            editable={editable}
            onSelect={(e) => handleElementSelect(e, element.id)}
            onDragEnd={(e) => handleDragEnd(e, element)}
            onDragMove={(e) => handleDragMove(e, element)}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
          />
        );
      case 'screen-capture':
        return (
          <ScreenCaptureElement
            key={element.id}
            element={element}
            scale={SCALE}
            isEditor={editable}
            onSelect={(e) => handleElementSelect(e, element.id)}
            onDragEnd={(e) => handleDragEnd(e, element)}
            onDragMove={(e) => handleDragMove(e, element)}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
          />
        );
      default:
        return null;
    }
  };

  if (!currentSlide) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No slide selected
      </div>
    );
  }

  const hasVideoBackground    = !!currentSlide.backgroundVideo;
  const hasImageBackground    = !!currentSlide.backgroundImage;
  const animatedBg            = currentSlide?.animatedBackground as AnimatedBackground | undefined;
  const hasAnimatedBackground = !!animatedBg;

  const getBgRectProps = () => {
    if (hasAnimatedBackground || hasVideoBackground) {
      return { fill: 'transparent' };
    }
    if (currentSlide?.backgroundGradient) {
      return buildKonvaGradientProps(
        currentSlide.backgroundGradient,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
      );
    }
    return { fill: currentSlide?.backgroundColor || '#ffffff' };
  };

  return (
    <div
      ref={stageContainerRef}
      className="slide-canvas-container"
      style={{
        position:     'relative',
        display:      'inline-block',
        width:        CANVAS_WIDTH,   // ✅ reactive
        height:       CANVAS_HEIGHT,  // ✅ reactive
        border:       '2px solid #333',
        borderRadius: 8,
        overflow:     'hidden',
      }}
    >
      {/* ── Video background ───────────────────────────────────────────── */}
      {hasVideoBackground && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <VideoBackground
            videoSrc={currentSlide.backgroundVideo!}
            loop={currentSlide.backgroundVideoLoop   ?? true}
            muted={currentSlide.backgroundVideoMuted ?? true}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            isPlaying={true}
          />
        </div>
      )}

      {/* ── Animated background ────────────────────────────────────────── */}
      {hasAnimatedBackground && animatedBg && (
        <div style={{
          position:      'absolute',
          inset:         0,
          zIndex:        0,
          overflow:      'hidden',
          pointerEvents: 'none',
        }}>
          <AnimatedBackgroundComponent config={animatedBg} />
        </div>
      )}

      {/* ── Konva stage ────────────────────────────────────────────────── */}
      <Stage
        ref={stageRef}
        width={CANVAS_WIDTH}    // ✅ reactive
        height={CANVAS_HEIGHT}  // ✅ reactive
        onClick={handleStageClick}
        style={{
          position:   'absolute',
          top:        0,
          left:       0,
          zIndex:     1,
          background: 'transparent',
        }}
      >
        <Layer>
          <Rect
            id="slide-bg"
            x={0} y={0}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            {...getBgRectProps()}
          />

          {hasImageBackground && !hasVideoBackground && !hasAnimatedBackground && (
            <BackgroundImageLayer
              src={currentSlide.backgroundImage!}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
            />
          )}

          {currentSlide.elements.map(renderElement)}

          {editable && (
            <Transformer
              ref={transformerRef}
              flipEnabled={false}
              boundBoxFunc={(oldBox, newBox) => {
                if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
        </Layer>

        {editable && guides.length > 0 && (
          <Layer listening={false}>
            <SnapGuideLines
              guides={guides}
              logicalWidth={LOGICAL_WIDTH}
              logicalHeight={LOGICAL_HEIGHT}
              canvasWidth={CANVAS_WIDTH}
              canvasHeight={CANVAS_HEIGHT}
            />
          </Layer>
        )}
      </Stage>

      {/* ── Text edit overlay ──────────────────────────────────────────── */}
      {editingText && (
        <TextEditOverlay
          x={editingText.x}
          y={editingText.y}
          width={editingText.width}
          height={editingText.height}
          rotation={editingText.rotation}
          text={editingText.text}
          fontSize={editingText.fontSize}
          fontFamily={editingText.fontFamily}
          fontColor={editingText.fontColor}
          fontWeight={editingText.fontWeight}
          fontStyle={editingText.fontStyle}
          textAlign={editingText.textAlign}
          onSave={handleTextSave}
          onCancel={handleTextCancel}
          stageContainer={stageContainerRef.current}
        />
      )}

      {/* ── Selection hint ─────────────────────────────────────────────── */}
      {selectedElementId && !editingText && (
        <div style={{
          position:      'absolute',
          bottom:        -24,
          left:          '50%',
          transform:     'translateX(-50%)',
          color:         '#666',
          fontSize:      10,
          whiteSpace:    'nowrap',
          zIndex:        10,
          pointerEvents: 'none',
        }}>
          {currentSlide.elements.find(e => e.id === selectedElementId)?.type === 'text'
            ? 'Dbl-click to edit • ' : ''}
          Del remove • Arrows nudge • Ctrl+] up • Ctrl+[ down
        </div>
      )}
    </div>
  );
};

export default SlideCanvas;