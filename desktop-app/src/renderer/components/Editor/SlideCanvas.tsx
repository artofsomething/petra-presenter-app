import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Stage, Layer, Rect, Text, Circle, Ellipse, Star,
  Transformer, Group,
} from 'react-konva';
import Konva from 'konva';
import usePresentationStore from '../../store/usePresentation';
import type { SlideElement,AnimatedBackground } from '../../../server/types';
import EditableText from './EditableText';
import ImageElement from './ImageElement';
import VideoElement from './VideoElement';
import VideoBackground from './VideoBackground';
import BackgroundImageLayer from './BackgroundImageLayer';
import TextEditOverlay from './TextEditOverlay';
import { gradientToKonvaPoints} from './GradientPicker';
import type { GradientConfig} from '../../../server/types';
import AnimatedBackgroundComponent from './AnimatedBackground';
import { useSnapGuides} from '../../hooks/useSnapGuides';
import SnapGuideLines from './SnapGuideLines';
import ScreenCaptureElement from '../Advanced/ScreenCaptureElement';



const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const SCALE = CANVAS_WIDTH / 1920;

interface SlideCanvasProps {
  editable?: boolean;
}

interface TextEditState {
  elementId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
}

function buildKonvaGradientProps(gradient: GradientConfig, w: number, h: number) {
  const stops = [...gradient.stops]
    .sort((a, b) => a.offset - b.offset);

  const colorStops = stops.flatMap((s) => [s.offset, s.color]);

  if (gradient.type === 'radial') {
    const cx = w / 2;
    const cy = h / 2;
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

  // linear
  const { startPoint, endPoint } = gradientToKonvaPoints(gradient.angle, w, h);
  return {
    fillLinearGradientStartPoint:      startPoint,
    fillLinearGradientEndPoint:        endPoint,
    fillLinearGradientColorStops:      colorStops,
    fill: undefined,
  };
}

// Helper — call inside renderShape before each shape's props
const getShapeFillProps = (element: SlideElement, w: number, h: number) => {
  if (element.fillGradient) {
    return buildKonvaGradientProps(element.fillGradient, w, h);
  }
  return { fill: element.fill || '#3b82f6' };
};

const SlideCanvas: React.FC<SlideCanvasProps> = ({ editable = true }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [editingText, setEditingText] = useState<TextEditState | null>(null);
  const LOGICAL_WIDTH = 1920;
  const LOGICAL_HEIGHT = 1080;
  const { guides, computeSnap, updateGuides, clearGuides} = useSnapGuides({
    canvasWidth:      LOGICAL_WIDTH,
    canvasHeight:     LOGICAL_HEIGHT,
    snapThreshold: 6
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

  // Clear selection on slide change
  useEffect(() => {
    setSelectedElementId(null);
    setEditingText(null);
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [currentSlideIndex, setSelectedElementId]);

  // ✅ Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    if (selectedElementId && !editingText) {
      const elementExists = currentSlide?.elements.some(
        (el) => el.id === selectedElementId
      );

      if (elementExists) {
        // ✅ Small delay to ensure Konva has rendered the node
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

  // ===== HANDLERS =====
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
    [editingText, setSelectedElementId]
  );

  const handleElementSelect = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, elementId: string) => {
      e.cancelBubble = true;
      if (editable && !editingText) {
        setSelectedElementId(elementId);
      }
    },
    [editable, editingText, setSelectedElementId]
  );

  // ✅ FIX: handleDragEnd receives full element
  // const handleDragEnd = useCallback(
  //   (e: Konva.KonvaEventObject<DragEvent>, element: SlideElement) => {
  //     if (!editable) return;
  //     const node = e.target;
  //     updateElement(currentSlideIndex, element.id, {
  //       x: node.x() / SCALE,
  //       y: node.y() / SCALE,
  //     });
  //   },
  //   [editable, currentSlideIndex, updateElement]
  // );

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, element: SlideElement) => {
      if (!editable) return;
      const node = e.target;

      // ✅ Convert canvas px → logical coords for snap computation
      const rawX = node.x() / SCALE;
      const rawY = node.y() / SCALE;

      const slide = usePresentationStore.getState()
        .presentation?.slides[currentSlideIndex];
      if (!slide) return;

      // ✅ Others are already in logical coords from the store
      const others = slide.elements
        .filter(el => el.id !== element.id)
        .map(el => ({
          id: el.id, x: el.x, y: el.y,
          width: el.width, height: el.height,
        }));

      const { x, y, guides: newGuides } = computeSnap(
        { id: element.id, x: rawX, y: rawY,
          width: element.width, height: element.height },
        others,
      );

      updateGuides(newGuides);

      // ✅ Convert snapped logical coords back to canvas px for Konva
      node.x(x * SCALE);
      node.y(y * SCALE);
    },
    [editable, currentSlideIndex, computeSnap, updateGuides],
  );


  
  const handleDragEnd = useCallback(
  (e: Konva.KonvaEventObject<DragEvent>, element: SlideElement) => {
    if (!editable) return;
    clearGuides();                        // ← clear guides on drop

    const node = e.target;
    updateElement(currentSlideIndex, element.id, {
      x: node.x() / SCALE,
      y: node.y() / SCALE,
    });
  },
  [editable, currentSlideIndex, updateElement, clearGuides],
);


  // ✅ FIX: Use element stored size × scale, NOT node.width()
  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>, element: SlideElement) => {
      if (!editable) return;
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // ✅ Reset scale
      node.scaleX(1);
      node.scaleY(1);

      // ✅ Calculate new size from stored element size × transformer scale
      const newWidth  = Math.max(10, element.width  * scaleX);
      const newHeight = Math.max(10, element.height * scaleY);

      const updates: Partial<SlideElement> = {
        x: node.x() / SCALE,
        y: node.y() / SCALE,
        width: newWidth,
        height: newHeight,
        rotation:node.rotation()
      };

      if(element.type==='text'){
        const currentFontSize = element.fontSize??24;
        const fontScale = scaleY !== 1? scaleY : scaleX;
        updates.fontSize = Math.max(6, Math.round(currentFontSize * fontScale));
      }

      updateElement(currentSlideIndex, element.id, {
        x:        node.x() / SCALE,
        y:        node.y() / SCALE,
        width:    newWidth,
        height:   newHeight,
        rotation: node.rotation(),
        ...updates
      });
    },
    [editable, currentSlideIndex, updateElement]
  );

  // ===== TEXT DOUBLE CLICK =====
  const handleTextDoubleClick = useCallback(
    (element: SlideElement, textNode: Konva.Text) => {
      if (!editable || !stageRef.current) return;

      textNode.hide();
      transformerRef.current?.nodes([]);
      transformerRef.current?.getLayer()?.batchDraw();
      textNode.getLayer()?.batchDraw();

      const textRect = textNode.getClientRect();

      setEditingText({
        elementId: element.id,
        x: textRect.x,
        y: textRect.y,
        width: textRect.width,
        height: textRect.height,
        rotation: element.rotation || 0,
        text: element.text || '',
        fontSize: (element.fontSize || 24) * SCALE,
        fontFamily: element.fontFamily || 'Arial',
        fontColor: element.fontColor || '#000000',
        fontWeight: element.fontWeight || 'normal',
        fontStyle: element.fontStyle || 'normal',
        textAlign: element.textAlign || 'left',
      });
    },
    [editable]
  );

  const handleTextSave = useCallback(
    (newText: string) => {
      if (!editingText) return;
      updateElement(currentSlideIndex, editingText.elementId, { text: newText });
      const textNode = stageRef.current?.findOne(`#${editingText.elementId}`);
      if (textNode) {
        textNode.show();
        textNode.getLayer()?.batchDraw();
      }
      setEditingText(null);
      setSelectedElementId(editingText.elementId);
    },
    [editingText, currentSlideIndex, updateElement, setSelectedElementId]
  );

  const handleTextCancel = useCallback(() => {
    if (!editingText) return;
    const textNode = stageRef.current?.findOne(`#${editingText.elementId}`);
    if (textNode) {
      textNode.show();
      textNode.getLayer()?.batchDraw();
    }
    setEditingText(null);
  }, [editingText]);

  // ===== KEYBOARD SHORTCUTS =====
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

  // ===== SHAPE RENDERER =====
  // ✅ KEY FIX: Don't use Group for shapes
  // Instead render a single Konva shape with a transparent Rect for hit area
  const renderShape = (element: SlideElement) => {
  const x = element.x * SCALE;
  const y = element.y * SCALE;
  const w = element.width  * SCALE;
  const h = element.height * SCALE;
  const isLocked = element.isLocked ?? false;

  switch (element.shapeType) {

    case 'circle': {
      return (
        <Group
          key={element.id}
          id={element.id}
          x={x} y={y}
          rotation={element.rotation || 0}
          opacity={element.opacity ?? 1}
          draggable={editable && !isLocked}
          onClick={(e) => handleElementSelect(e, element.id)}
          onDragMove={(e)=> handleDragMove(e,element)}
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
    }

    case 'ellipse': {
      return (
        <Group
          key={element.id}
          id={element.id}
          x={x} y={y}
          rotation={element.rotation || 0}
          opacity={element.opacity ?? 1}
          draggable={editable && !isLocked}
          onClick={(e) => handleElementSelect(e, element.id)}
          onDragMove={(e)=> handleDragMove(e,element)}
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
    }

    case 'star': {
      return (
        <Group
          key={element.id}
          id={element.id}
          x={x} y={y}
          rotation={element.rotation || 0}
          opacity={element.opacity ?? 1}
          draggable={editable && !isLocked}
          onClick={(e) => handleElementSelect(e, element.id)}
          onDragMove={(e)=>handleDragMove(e,element)}
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
    }

    // ✅ NEW: Rounded Rectangle
    case 'rounded-rect': {
      // ✅ cornerRadius scales with canvas, capped at half of shortest side
      const rawRadius = element.cornerRadius ?? 20;
      const scaledRadius = Math.min(
        rawRadius * SCALE,
        (Math.min(w, h) / 2)  // ✅ Can't exceed half of shortest side
      );

      return (
        <Rect
          key={element.id}
          id={element.id}
          x={x} y={y}
          width={w} height={h}
          {...getShapeFillProps(element, w, h)}
          stroke={element.stroke || ''}
          strokeWidth={(element.strokeWidth || 0) * SCALE}
          cornerRadius={scaledRadius}     // ✅ Scaled corner radius
          rotation={element.rotation || 0}
          opacity={element.opacity ?? 1}
          draggable={editable && !isLocked}
          onDragMove={(e)=>handleDragMove(e,element)}
          onClick={(e) => handleElementSelect(e, element.id)}
          onDragEnd={(e) => handleDragEnd(e, element)}
          onTransformEnd={(e) => handleTransformEnd(e, element)}
        />
      );
    }

    default: { // plain rect
      return (
        <Rect
          key={element.id}
          id={element.id}
          x={x} y={y}
          width={w} height={h}
          {...getShapeFillProps(element, w, h)}
          stroke={element.stroke || ''}
          strokeWidth={(element.strokeWidth || 0) * SCALE}
          cornerRadius={0}
          rotation={element.rotation || 0}
          opacity={element.opacity ?? 1}
          draggable={editable && !isLocked}
          onDragMove={(e)=>handleDragMove(e,element)}
          onClick={(e) => handleElementSelect(e, element.id)}
          onDragEnd={(e) => handleDragEnd(e, element)}
          onTransformEnd={(e) => handleTransformEnd(e, element)}
        />
      );
    }
  }
};

  // ===== ELEMENT RENDERER =====
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
            lineHeight={element.lineHeight??1.2}
            onSelect={(e) => handleElementSelect(e, element.id)}
            onDragEnd={(e) => handleDragEnd(e, element)}
            onDragMove={(e)=>handleDragMove(e,element)}
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
            onDragMove={(e)=> handleDragMove(e,element)}
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
            onDragMove={(e)=>handleDragMove(e,element)}
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

  const hasVideoBackground = !!currentSlide.backgroundVideo;
  const hasImageBackground = !!currentSlide.backgroundImage;
  const animatedBg          = currentSlide?.animatedBackground as AnimatedBackground | undefined;
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

  // The container needs explicit dimensions AND the Stage needs to not be absolute
// when there's no HTML background layer underneath it

return (
  <div
    ref={stageContainerRef}
    className="slide-canvas-container"
    style={{
      position:     'relative',
      display:      'inline-block',
      width:        CANVAS_WIDTH,
      height:       CANVAS_HEIGHT,
      border:       '2px solid #333',
      borderRadius: 8,
      overflow:     'hidden',
    }}
  >
    {/* ── Layer 0: Video background ────────────────────────────────────── */}
    {hasVideoBackground && (
      <div style={{
        position: 'absolute',
        inset:    0,
        zIndex:   0,
      }}>
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

    {/* ── Layer 1: Animated background ─────────────────────────────────── */}
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

    {/* ── Layer 2: Konva Stage ──────────────────────────────────────────── */}
    {/*
      ✅ KEY FIX: Stage is position:absolute so it overlays the HTML layers.
      The container div has explicit width+height so it doesn't collapse.
      Stage itself has background:transparent so HTML layers show through.
    */}
    <Stage
      ref={stageRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
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
      {editable && guides.length>0 &&(
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

    {/* ── Text edit overlay ─────────────────────────────────────────────── */}
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

    {/* ── Selection hint ─────────────────────────────────────────────────── */}
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
