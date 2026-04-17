import React, { useRef } from 'react';
import { Text, Rect, Group, Line } from 'react-konva';
import Konva from 'konva';
import type { SlideElement } from '../../../server/types';
import { resolveAlignment, toKonvaHAlign, toKonvaVAlign }  from '../../utils/alignmentUtils';
import { formatDisplayText } from '../../utils/textFormatter';
import { getRenderedLines }  from '../../utils/underlineUtils';
import RichText              from './RichText';
import { hasInlineMarkup }   from '../../utils/InlineMarkup';

interface EditableTextProps {
  element:        SlideElement;
  scale:          number;
  isSelected:     boolean;
  editable:       boolean;
  lineHeight:     number;
  onSelect:       (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragEnd:      (e: Konva.KonvaEventObject<DragEvent>)  => void;
  onDragMove?:    (e: Konva.KonvaEventObject<DragEvent>)  => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>)      => void;
  onDoubleClick:  (element: SlideElement, node: Konva.Text) => void;
}

const EditableText: React.FC<EditableTextProps> = ({
  element, scale, isSelected, editable,
  onSelect, onDragEnd, onDragMove, onTransformEnd, onDoubleClick, lineHeight,
}) => {
  const textRef = useRef<Konva.Text>(null);

  const { horizontal, vertical } = resolveAlignment(
    element.textPlacement,
    element.textAlign,
    element.verticalAlign,
  );
  const konvaAlign         = toKonvaHAlign(horizontal);
  const konvaVerticalAlign = toKonvaVAlign(vertical);

  const x        = element.x      * scale;
  const y        = element.y      * scale;
  const width    = element.width  * scale;
  const height   = (element.height || 50) * scale;
  const fontSize = (element.fontSize || 24) * scale;

  const fontStyle  = element.fontStyle  === 'italic' ? 'italic' : 'normal';
  const fontWeight = element.fontWeight === 'bold'   ? 'bold'   : 'normal';

  const konvaFontStyle = [
    fontWeight === 'bold'   ? 'bold'   : '',
    fontStyle  === 'italic' ? 'italic' : '',
  ].filter(Boolean).join(' ') || 'normal';

  const displayText = formatDisplayText(element.text || 'Double-click to edit');
  const isRich      = hasInlineMarkup(displayText);

  const shadowProps = element.shadowColor ? {
    shadowColor:   element.shadowColor,
    shadowBlur:    (element.shadowBlur    ?? 0) * scale,
    shadowOffsetX: (element.shadowOffsetX ?? 0) * scale,
    shadowOffsetY: (element.shadowOffsetY ?? 0) * scale,
    shadowOpacity: 1,
  } : {};

  const strokeProps = (element.strokeWidth ?? 0) > 0 ? {
    stroke:      element.strokeColor ?? '#000000',
    strokeWidth: element.strokeWidth! * scale,
  } : {};

  const underlineLines = element.underline
    ? getRenderedLines({
        text:          displayText,
        fontSize:      element.fontSize || 24,
        fontFamily:    element.fontFamily || 'Arial',
        fontStyle,
        fontWeight,
        lineHeight:    element.lineHeight ?? 1.2,
        elementWidth:  element.width,
        elementHeight: element.height || 50,
        elementX:      element.x,
        elementY:      element.y,
        align:         konvaAlign,
        verticalAlign: konvaVerticalAlign,
        stageScaleX:   scale,
        stageScaleY:   scale,
        stageX:        0,
        stageY:        0,
      })
    : [];

  const strokeW = Math.max(0.5, fontSize * 0.04);

  const handleDblClick = () => {
    if (editable && textRef.current) onDoubleClick(element, textRef.current);
  };

  return (
    <Group
      id={element.id}
      x={x}
      y={y}
      width={width}
      height={height}
      rotation={element.rotation || 0}
      opacity={element.opacity ?? 1}
      draggable={editable && !(element.isLocked ?? false)}
      onClick={onSelect}
      onTap={(e) => onSelect(e as any)}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
    >
      {isRich ? (
        <>
          {/*
            ── 1. Visual layer — rendered first (bottom of z-stack) ────────
            listening={false} on all visual nodes so they never consume events
          */}
          <RichText
            x={0}
            y={0}
            width={width}
            height={height}
            text={displayText}
            fontSize={fontSize}
            fontFamily={element.fontFamily ?? 'Arial'}
            fontColor={element.fontColor   ?? '#ffffff'}
            fontWeight={fontWeight}
            fontStyle={fontStyle}
            lineHeight={element.lineHeight ?? 1.2}
            textAlign={konvaAlign}
            opacity={element.opacity ?? 1}
            listening={false}           // ✅ never consumes events
          />

          {/* Hidden Text ref — for TextEditOverlay position measurement */}
          <Text
            ref={textRef}
            x={0} y={0}
            width={width}
            height={height}
            text={displayText}
            fontSize={fontSize}
            fontFamily={element.fontFamily || 'Arial'}
            fontStyle={konvaFontStyle}
            fill={element.fontColor || '#ffffff'}
            align={konvaAlign}
            verticalAlign={konvaVerticalAlign}
            lineHeight={element.lineHeight ?? 1.2}
            wrap="word"
            visible={false}
            listening={false}           // ✅ hidden ref only
            {...shadowProps}
            {...strokeProps}
          />
        </>
      ) : (
        /*
          ── Plain text visual — listening={false}, hit-Rect below handles events
        */
        <Text
          ref={textRef}
          x={0} y={0}
          width={width}
          height={height}
          text={displayText}
          fontSize={fontSize}
          fontFamily={element.fontFamily || 'Arial'}
          fill={element.fontColor || '#000000'}
          fontStyle={konvaFontStyle}
          align={konvaAlign}
          verticalAlign={konvaVerticalAlign}
          wrap="word"
          lineHeight={element.lineHeight ?? 1.2}
          listening={false}             // ✅ hit-Rect handles events
          {...shadowProps}
          {...strokeProps}
        />
      )}

      {/* ── Underlines ───────────────────────────────────────────────────── */}
      {element.underline && underlineLines.map((line, i) => (
        <Line
          key={i}
          points={[
            line.x - x,              line.y - y,
            line.x - x + line.width, line.y - y,
          ]}
          stroke={element.fontColor || '#000000'}
          strokeWidth={strokeW}
          opacity={element.opacity ?? 1}
          listening={false}             // ✅ never consumes events
        />
      ))}

      {/*
        ── 2. Hit rect — rendered LAST so it sits on TOP of the z-stack ────
        This is the ONLY node with listening={true}.
        Being on top guarantees it catches all pointer events before any
        visual node can intercept them — regardless of how many markup
        segments RichText renders underneath.
      */}
      <Rect
        x={0} y={0}
        width={width}
        height={height}
        fill="transparent"
        listening={true}                // ✅ sole event receiver
        perfectDrawEnabled={false}      // no canvas draw needed
      />
    </Group>
  );
};

export default EditableText;