// src/renderer/components/Editor/EditableText.tsx

import React, { useRef } from 'react'; // ✅ remove useState, useEffect
import { Text, Rect, Group, Line } from 'react-konva';
import Konva from 'konva';
import type { SlideElement } from '../../../server/types';
import { resolveAlignment }  from '../../utils/alignmentUtils';
import { formatDisplayText } from '../../utils/textFormatter';
import { getRenderedLines }  from '../../utils/underlineUtils'; // ✅ new import

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
  onSelect, onDragEnd, onDragMove, onTransformEnd, onDoubleClick,lineHeight
}) => {
  const textRef = useRef<Konva.Text>(null);

  const { horizontal, vertical } = resolveAlignment(
    element.textPlacement,
    element.textAlign,
    element.verticalAlign,
  );

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

  // ✅ Synchronous — no refs, no useEffect, no timing issues
  // Editor uses scaled coords directly (element coords × scale)
  const underlineLines = element.underline
    ? getRenderedLines({
        text:          displayText,
        fontSize:      element.fontSize || 24,  // ✅ unscaled font
        fontFamily:    element.fontFamily  || 'Arial',
        fontStyle,
        fontWeight,
        lineHeight:    element.lineHeight??1.2,
        elementWidth:  element.width,           // ✅ unscaled element dims
        elementHeight: element.height  || 50,
        elementX:      element.x,
        elementY:      element.y,
        align:         horizontal,
        verticalAlign: vertical,
        stageScaleX:   scale,                   // ✅ editor scale applied here
        stageScaleY:   scale,
        stageX:        0,
        stageY:        0,
      })
    : [];

  const strokeW = Math.max(0.5, fontSize * 0.04);

  return (
    <Group>
      {/* Invisible background rect */}
      <Rect
        id={`${element.id}-bg`}
        x={x} y={y}
        width={width} height={height}
        fill="transparent"
        rotation={element.rotation || 0}
        onClick={onSelect}
      />

      <Text
        ref={textRef}
        id={element.id}
        x={x} y={y}
        width={width} height={height}
        text={displayText}
        fontSize={fontSize}
        fontFamily={element.fontFamily || 'Arial'}
        fill={element.fontColor || '#000000'}
        fontStyle={konvaFontStyle}
        align={horizontal}
        verticalAlign={vertical}
        wrap="word"
        lineHeight={element.lineHeight ?? 1.2}
        stroke={element.strokeColor    || undefined}
        strokeWidth={element.strokeWidth ? element.strokeWidth * scale : 0}
        shadowColor={element.shadowColor   || undefined}
        shadowBlur={element.shadowBlur     ? element.shadowBlur     * scale : 0}
        shadowOffsetX={element.shadowOffsetX ? element.shadowOffsetX * scale : 0}
        shadowOffsetY={element.shadowOffsetY ? element.shadowOffsetY * scale : 0}
        rotation={element.rotation || 0}
        opacity={element.opacity ?? 1}
        draggable={editable}
        onClick={onSelect}
        onTap={(e) => onSelect(e as any)}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
        onDblClick={() => {
          if (editable && textRef.current) onDoubleClick(element, textRef.current);
        }}
        onDblTap={() => {
          if (editable && textRef.current) onDoubleClick(element, textRef.current);
        }}
      />

      {/* ✅ Underlines — in scaled editor coords */}
      {element.underline && underlineLines.map((line, i) => (
        <Line
          key={i}
          points={[
            line.x,              line.y,
            line.x + line.width, line.y,
          ]}
          stroke={element.fontColor || '#000000'}
          strokeWidth={strokeW}
          opacity={element.opacity ?? 1}
          listening={false}
        />
      ))}
    </Group>
  );
};

export default EditableText;