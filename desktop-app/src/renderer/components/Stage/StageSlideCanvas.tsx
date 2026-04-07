// src/renderer/components/Stage/StageSlideCanvas.tsx
import React, { useRef } from 'react';
import {
  Stage, Layer, Rect, Text, Circle, Ellipse, Star, Group,
} from 'react-konva';
import Konva from 'konva';
import type { Slide, SlideElement, AnimatedBackground, GradientConfig } from '../../../server/types';
import ImageElement    from '../Editor/ImageElement';
import VideoElement    from '../Editor/VideoElement';
import VideoBackground from '../Editor/VideoBackground';
import BackgroundImageLayer  from '../Editor/BackgroundImageLayer';
import AnimatedBackgroundComponent from '../Editor/AnimatedBackground';
import EditableText    from '../Editor/EditableText';
import { gradientToKonvaPoints } from '../Editor/GradientPicker';

const CANVAS_WIDTH  = 960;
const CANVAS_HEIGHT = 540;
const SCALE         = CANVAS_WIDTH / 1920;

interface StageSlideCanvasProps {
  slide:  Slide;
  width?: number;   // optional override for scaling
  height?: number;
}

// ── Gradient helpers (same as SlideCanvas) ────────────────────────────────────
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

const StageSlideCanvas: React.FC<StageSlideCanvasProps> = ({
  slide,
  width  = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
}) => {
  const scale = width / 1920;

  // ── Shape renderer ────────────────────────────────────────────────────────
  const renderShape = (element: SlideElement) => {
    const x = element.x * scale;
    const y = element.y * scale;
    const w = element.width  * scale;
    const h = element.height * scale;

    switch (element.shapeType) {
      case 'circle':
        return (
          <Group key={element.id} id={element.id}
            x={x} y={y} rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
          >
            <Rect width={w} height={h} fill="transparent" />
            <Circle
              x={w / 2} y={h / 2}
              radius={Math.min(w, h) / 2}
              {...getShapeFillProps(element, w, h)}
              stroke={element.stroke || ''}
              strokeWidth={(element.strokeWidth || 0) * scale}
              listening={false}
            />
          </Group>
        );

      case 'ellipse':
        return (
          <Group key={element.id} id={element.id}
            x={x} y={y} rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
          >
            <Rect width={w} height={h} fill="transparent" />
            <Ellipse
              x={w / 2} y={h / 2}
              radiusX={w / 2} radiusY={h / 2}
              {...getShapeFillProps(element, w, h)}
              stroke={element.stroke || ''}
              strokeWidth={(element.strokeWidth || 0) * scale}
              listening={false}
            />
          </Group>
        );

      case 'star':
        return (
          <Group key={element.id} id={element.id}
            x={x} y={y} rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
          >
            <Rect width={w} height={h} fill="transparent" />
            <Star
              x={w / 2} y={h / 2}
              numPoints={5}
              innerRadius={Math.min(w, h) / 4}
              outerRadius={Math.min(w, h) / 2}
              {...getShapeFillProps(element, w, h)}
              stroke={element.stroke || ''}
              strokeWidth={(element.strokeWidth || 0) * scale}
              listening={false}
            />
          </Group>
        );

      case 'rounded-rect': {
        const rawRadius    = element.cornerRadius ?? 20;
        const scaledRadius = Math.min(rawRadius * scale, Math.min(w, h) / 2);
        return (
          <Rect key={element.id} id={element.id}
            x={x} y={y} width={w} height={h}
            {...getShapeFillProps(element, w, h)}
            stroke={element.stroke || ''}
            strokeWidth={(element.strokeWidth || 0) * scale}
            cornerRadius={scaledRadius}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
          />
        );
      }

      default:
        return (
          <Rect key={element.id} id={element.id}
            x={x} y={y} width={w} height={h}
            {...getShapeFillProps(element, w, h)}
            stroke={element.stroke || ''}
            strokeWidth={(element.strokeWidth || 0) * scale}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
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
            scale={scale}
            isSelected={false}
            editable={false}
            onSelect={() => {}}
            onDragEnd={() => {}}
            onDragMove={() => {}}
            onTransformEnd={() => {}}
            onDoubleClick={() => {}}
          />
        );
      case 'shape':
        return renderShape(element);
      case 'image':
        return (
          <ImageElement
            key={element.id}
            element={element}
            scale={scale}
            editable={false}
            onSelect={() => {}}
            onDragEnd={() => {}}
            onDragMove={() => {}}
            onTransformEnd={() => {}}
          />
        );
      case 'video':
        return (
          <VideoElement
            key={element.id}
            element={element}
            scale={scale}
            editable={false}
            onSelect={() => {}}
            onDragEnd={() => {}}
            onDragMove={() => {}}
            onTransformEnd={() => {}}
          />
        );
      default:
        return null;
    }
  };

  // ── Background helpers ────────────────────────────────────────────────────
  const hasVideoBackground    = !!slide.backgroundVideo;
  const hasImageBackground    = !!slide.backgroundImage;
  const animatedBg            = slide.animatedBackground as AnimatedBackground | undefined;
  const hasAnimatedBackground = !!animatedBg;

  const getBgRectProps = () => {
    if (hasAnimatedBackground || hasVideoBackground) return { fill: 'transparent' };
    if (slide.backgroundGradient) {
      return buildKonvaGradientProps(slide.backgroundGradient, width, height);
    }
    return { fill: slide.backgroundColor || '#ffffff' };
  };

  return (
    <div style={{
      position:     'relative',
      width,
      height,
      overflow:     'hidden',
      borderRadius: 4,
      background:   slide.backgroundColor || '#ffffff',
    }}>
      {/* Video background */}
      {hasVideoBackground && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <VideoBackground
            videoSrc={slide.backgroundVideo!}
            loop={slide.backgroundVideoLoop   ?? true}
            muted={slide.backgroundVideoMuted ?? true}
            width={width}
            height={height}
            isPlaying={true}
          />
        </div>
      )}

      {/* Animated background */}
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

      {/* Konva Stage */}
      <Stage
        width={width}
        height={height}
        style={{
          position:   'absolute',
          top:        0,
          left:       0,
          zIndex:     1,
          background: 'transparent',
        }}
        listening={false}
      >
        <Layer>
          <Rect
            id="slide-bg"
            x={0} y={0}
            width={width}
            height={height}
            {...getBgRectProps()}
          />

          {hasImageBackground && !hasVideoBackground && !hasAnimatedBackground && (
            <BackgroundImageLayer
              src={slide.backgroundImage!}
              width={width}
              height={height}
            />
          )}

          {slide.elements.map(renderElement)}
        </Layer>
      </Stage>
    </div>
  );
};

export default StageSlideCanvas;