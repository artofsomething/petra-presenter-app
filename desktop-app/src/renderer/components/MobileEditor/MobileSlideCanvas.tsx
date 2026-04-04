// src/renderer/components/Editor/MobileSlideCanvas.tsx
import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Stage, Layer, Rect, Circle, Ellipse, Star,
  Transformer, Group,
} from 'react-konva';
import Konva from 'konva';
import usePresentationStore from '../../store/usePresentation';
import type { SlideElement, AnimatedBackground } from '../../../server/types';
import EditableText          from '../Editor/EditableText';
import ImageElement          from '../Editor/ImageElement';
import VideoElement          from '../Editor/VideoElement';
import VideoBackground       from '../Editor/VideoBackground';
import BackgroundImageLayer  from '../Editor/BackgroundImageLayer';
import TextEditOverlay       from '../Editor/TextEditOverlay';
import AnimatedBackgroundComponent from '../Editor/AnimatedBackground';
import { gradientToKonvaPoints }   from '../Editor/GradientPicker';
import type { GradientConfig }     from '../../../server/types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
export const CANVAS_WIDTH  = 960;
export const CANVAS_HEIGHT = 540;
export const CANVAS_SCALE  = CANVAS_WIDTH / 1920;   // exported so parent can use it

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Gradient helpers
// ─────────────────────────────────────────────────────────────────────────────
function buildKonvaGradientProps(gradient: GradientConfig, w: number, h: number) {
  const stops      = [...gradient.stops].sort((a, b) => a.offset - b.offset);
  const colorStops = stops.flatMap((s) => [s.offset, s.color]);

  if (gradient.type === 'radial') {
    const cx = w / 2, cy = h / 2;
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
  if (element.fillGradient) return buildKonvaGradientProps(element.fillGradient, w, h);
  return { fill: element.fill || '#3b82f6' };
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface MobileSlideCanvasProps {
  editable?:    boolean;
  /** zoom from parent viewport — used to scale transformer anchor size */
  zoom?:        number;
  /** called when user taps the background (so parent can deselect / cancel pan) */
  onBgTap?:     () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const MobileSlideCanvas: React.FC<MobileSlideCanvasProps> = ({
  editable = true,
  zoom     = 1,
  onBgTap,
}) => {
  const stageRef          = useRef<Konva.Stage>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const transformerRef    = useRef<Konva.Transformer>(null);

  const [editingText, setEditingText] = useState<TextEditState | null>(null);

  const {
    presentation, currentSlideIndex, selectedElementId,
    setSelectedElementId, updateElement, deleteElement,
  } = usePresentationStore();

  const currentSlide = presentation?.slides[currentSlideIndex];

  // ── Clear on slide change ─────────────────────────────────────────────────
  useEffect(() => {
    setSelectedElementId(null);
    setEditingText(null);
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [currentSlideIndex, setSelectedElementId]);

  // ── Sync transformer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    if (selectedElementId && !editingText) {
      const exists = currentSlide?.elements.some(el => el.id === selectedElementId);
      if (exists) {
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

  // ── Handlers ─────────────────────────────────────────────────────────────
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
        onBgTap?.();
      }
    },
    [editingText, setSelectedElementId, onBgTap],
  );

  // Accept MouseEvent | TouchEvent | PointerEvent from both onClick and onTap
  const handleElementSelect = useCallback(
    (
      e: Konva.KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>,
      elementId: string,
    ) => {
      e.cancelBubble = true;
      if (editable && !editingText) setSelectedElementId(elementId);
    },
    [editable, editingText, setSelectedElementId],
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, element: SlideElement) => {
      if (!editable) return;
      const node = e.target;
      updateElement(currentSlideIndex, element.id, {
        x: node.x() / CANVAS_SCALE,
        y: node.y() / CANVAS_SCALE,
      });
    },
    [editable, currentSlideIndex, updateElement],
  );

  // ✅ KEY FIX: handleTransformEnd properly resets scale and computes new size
  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>, element: SlideElement) => {
      if (!editable) return;
      const node   = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // ✅ Reset scale to 1 — Konva applies scale on top of width/height
      node.scaleX(1);
      node.scaleY(1);

      const newWidth  = Math.max(10, (node.width()  * scaleX)/CANVAS_SCALE);
      const newHeight = Math.max(10, (node.height() * scaleY)/CANVAS_SCALE);

      const updates: Partial<SlideElement> = {
        x:        node.x() / CANVAS_SCALE,
        y:        node.y() / CANVAS_SCALE,
        width:    newWidth,
        height:   newHeight,
        rotation: node.rotation(),
      };

      if (element.type === 'text') {
        const fontScale  = scaleY !== 1 ? scaleY : scaleX;
        updates.fontSize = Math.max(6, Math.round((element.fontSize ?? 24) * fontScale));
      }

      updateElement(currentSlideIndex, element.id, updates);
    },
    [editable, currentSlideIndex, updateElement],
  );

  // ── Text editing ──────────────────────────────────────────────────────────
  const handleTextDoubleClick = useCallback(
    (element: SlideElement, textNode: Konva.Text) => {
      if (!editable || !stageRef.current) return;
      textNode.hide();
      transformerRef.current?.nodes([]);
      transformerRef.current?.getLayer()?.batchDraw();
      textNode.getLayer()?.batchDraw();
      const r = textNode.getClientRect();
      setEditingText({
        elementId:  element.id,
        x: r.x,     y: r.y,
        width: r.width, height: r.height,
        rotation:   element.rotation   || 0,
        text:       element.text       || '',
        fontSize:   (element.fontSize  || 24) * CANVAS_SCALE,
        fontFamily: element.fontFamily || 'Arial',
        fontColor:  element.fontColor  || '#000000',
        fontWeight: element.fontWeight || 'normal',
        fontStyle:  element.fontStyle  || 'normal',
        textAlign:  element.textAlign  || 'left',
      });
    },
    [editable],
  );

  const handleTextSave = useCallback(
    (newText: string) => {
      if (!editingText) return;
      updateElement(currentSlideIndex, editingText.elementId, { text: newText });
      const node = stageRef.current?.findOne(`#${editingText.elementId}`);
      if (node) { node.show(); node.getLayer()?.batchDraw(); }
      setEditingText(null);
      setSelectedElementId(editingText.elementId);
    },
    [editingText, currentSlideIndex, updateElement, setSelectedElementId],
  );

  const handleTextCancel = useCallback(() => {
    if (!editingText) return;
    const node = stageRef.current?.findOne(`#${editingText.elementId}`);
    if (node) { node.show(); node.getLayer()?.batchDraw(); }
    setEditingText(null);
  }, [editingText]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (editingText) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        e.preventDefault();
        deleteElement(currentSlideIndex, selectedElementId);
      }
      if (e.key === 'Escape') setSelectedElementId(null);

      if (selectedElementId && !e.ctrlKey && !e.metaKey) {
        const el = currentSlide?.elements.find(el => el.id === selectedElementId);
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
          case ']': e.preventDefault();
            e.shiftKey
              ? usePresentationStore.getState().bringToFront(currentSlideIndex, selectedElementId)
              : usePresentationStore.getState().moveLayerUp(currentSlideIndex, selectedElementId);
            break;
          case '[': e.preventDefault();
            e.shiftKey
              ? usePresentationStore.getState().sendToBack(currentSlideIndex, selectedElementId)
              : usePresentationStore.getState().moveLayerDown(currentSlideIndex, selectedElementId);
            break;
        }
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [selectedElementId, editingText, currentSlideIndex, currentSlide]);

  // ── Shape renderer ────────────────────────────────────────────────────────
  const renderShape = (element: SlideElement) => {
    const x      = element.x * CANVAS_SCALE;
    const y      = element.y * CANVAS_SCALE;
    const w      = element.width  * CANVAS_SCALE;
    const h      = element.height * CANVAS_SCALE;
    const locked = element.isLocked ?? false;

    const commonGroup = {
      key:            element.id,
      id:             element.id,
      x, y,
      rotation:       element.rotation || 0,
      opacity:        element.opacity  ?? 1,
      draggable:      editable && !locked,
      onClick:        (e: Konva.KonvaEventObject<MouseEvent>)  => handleElementSelect(e, element.id),
      onTap:          (e: Konva.KonvaEventObject<TouchEvent>)  => handleElementSelect(e, element.id),
      onDragEnd:      (e: Konva.KonvaEventObject<DragEvent>)   => handleDragEnd(e, element),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>)       => handleTransformEnd(e, element),
    };

    switch (element.shapeType) {

      case 'circle':
        return (
          <Group {...commonGroup}>
            <Rect width={w} height={h} fill="transparent" stroke="transparent" />
            <Circle
              x={w / 2} y={h / 2}
              radius={Math.min(w, h) / 2}
              {...getShapeFillProps(element, w, h)}
              stroke={element.stroke || ''}
              strokeWidth={(element.strokeWidth || 0) * CANVAS_SCALE}
              listening={false}
            />
          </Group>
        );

      case 'ellipse':
        return (
          <Group {...commonGroup}>
            <Rect width={w} height={h} fill="transparent" stroke="transparent" />
            <Ellipse
              x={w / 2} y={h / 2}
              radiusX={w / 2} radiusY={h / 2}
              {...getShapeFillProps(element, w, h)}
              stroke={element.stroke || ''}
              strokeWidth={(element.strokeWidth || 0) * CANVAS_SCALE}
              listening={false}
            />
          </Group>
        );

      case 'star':
        return (
          <Group {...commonGroup}>
            <Rect width={w} height={h} fill="transparent" stroke="transparent" />
            <Circle
              x={w / 2} y={h / 2}
              radius={Math.min(w, h) / 2}
              {...getShapeFillProps(element, w, h)}
              stroke={element.stroke || ''}
              strokeWidth={(element.strokeWidth || 0) * CANVAS_SCALE}
              listening={false}
            />
          </Group>
        );

      case 'rounded-rect': {
        const rawRadius    = element.cornerRadius ?? 20;
        const scaledRadius = Math.min(rawRadius * CANVAS_SCALE, Math.min(w, h) / 2);
        return (
          <Rect
            key={element.id} id={element.id}
            x={x} y={y} width={w} height={h}
            {...getShapeFillProps(element, w, h)}
            stroke={element.stroke || ''}
            strokeWidth={(element.strokeWidth || 0) * CANVAS_SCALE}
            cornerRadius={scaledRadius}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
            draggable={editable && !locked}
            onClick={(e) => handleElementSelect(e, element.id)}
            onTap={(e: Konva.KonvaEventObject<TouchEvent>) => handleElementSelect(e, element.id)}
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
            strokeWidth={(element.strokeWidth || 0) * CANVAS_SCALE}
            cornerRadius={0}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
            draggable={editable && !locked}
            onClick={(e) => handleElementSelect(e, element.id)}
            onTap={(e: Konva.KonvaEventObject<TouchEvent>) => handleElementSelect(e, element.id)}
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
            element={element} scale={CANVAS_SCALE}
            isSelected={selectedElementId === element.id}
            editable={editable}
            onSelect={(e) => handleElementSelect(e, element.id)}
            onDragEnd={(e) => handleDragEnd(e, element)}
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
            element={element} scale={CANVAS_SCALE} editable={editable}
            onSelect={(e) => handleElementSelect(e, element.id)}
            onDragEnd={(e) => handleDragEnd(e, element)}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
          />
        );
      case 'video':
        return (
          <VideoElement
            key={element.id}
            element={element} scale={CANVAS_SCALE} editable={editable}
            onSelect={(e) => handleElementSelect(e, element.id)}
            onDragEnd={(e) => handleDragEnd(e, element)}
            onTransformEnd={(e) => handleTransformEnd(e, element)}
          />
        );
      default:
        return null;
    }
  };

  // ── Background ────────────────────────────────────────────────────────────
  const hasVideoBackground    = !!currentSlide?.backgroundVideo;
  const hasImageBackground    = !!currentSlide?.backgroundImage;
  const animatedBg            = currentSlide?.animatedBackground as AnimatedBackground | undefined;
  const hasAnimatedBackground = !!animatedBg;

  const getBgRectProps = () => {
    if (hasAnimatedBackground || hasVideoBackground) return { fill: 'transparent' };
    if (currentSlide?.backgroundGradient)
      return buildKonvaGradientProps(currentSlide.backgroundGradient, CANVAS_WIDTH, CANVAS_HEIGHT);
    return { fill: currentSlide?.backgroundColor || '#ffffff' };
  };

  if (!currentSlide) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No slide selected
      </div>
    );
  }

  // Scale transformer anchors inversely so they stay ~fingertip size
  const anchorSize = Math.round(Math.max(10, Math.min(16, 12 / zoom)));

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — pure canvas, no viewport/zoom logic
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={stageContainerRef}
      style={{
        position:     'relative',
        width:         CANVAS_WIDTH,
        height:        CANVAS_HEIGHT,
        borderRadius:  8,
        overflow:      'hidden',
        // no border here — parent viewport adds the shadow
      }}
    >
      {/* Video background */}
      {hasVideoBackground && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <VideoBackground
            videoSrc={currentSlide.backgroundVideo!}
            loop={currentSlide.backgroundVideoLoop   ?? true}
            muted={currentSlide.backgroundVideoMuted ?? true}
            width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
            isPlaying={true}
          />
        </div>
      )}

      {/* Animated background */}
      {hasAnimatedBackground && animatedBg && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          overflow: 'hidden', pointerEvents: 'none',
        }}>
          <AnimatedBackgroundComponent config={animatedBg} />
        </div>
      )}

      {/* Konva Stage */}
      <Stage
        ref={stageRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleStageClick}
        style={{
          position:   'absolute', top: 0, left: 0, zIndex: 1,
          background: 'transparent',
        }}
      >
        <Layer>
          <Rect
            id="slide-bg"
            x={0} y={0}
            width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
            {...getBgRectProps()}
          />

          {hasImageBackground && !hasVideoBackground && !hasAnimatedBackground && (
            <BackgroundImageLayer
              src={currentSlide.backgroundImage!}
              width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
            />
          )}

          {currentSlide.elements.map(renderElement)}

          {editable && (
            <Transformer
              ref={transformerRef}
              flipEnabled={false}
              // ✅ Larger anchors for touch — scale inversely with zoom
              anchorSize={anchorSize}
              anchorCornerRadius={4}
              anchorStroke="#3b82f6"
              anchorFill="#ffffff"
              borderStroke="#3b82f6"
              borderStrokeWidth={1.5}
              borderDash={[4, 4]}
              padding={4}
              boundBoxFunc={(oldBox, newBox) => {
                if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) return oldBox;
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>

      {/* Text edit overlay */}
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
    </div>
  );
};

export default MobileSlideCanvas;