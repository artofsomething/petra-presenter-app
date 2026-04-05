// src/renderer/components/Editor/EditableText.tsx
import React, { useRef } from 'react';
import { Text, Rect, Group } from 'react-konva';
import Konva from 'konva';
import type { SlideElement } from '../../../server/types';
import { resolveAlignment } from '../../utils/alignmentUtils';

interface EditableTextProps {
  element:        SlideElement;
  scale:          number;
  isSelected:     boolean;
  editable:       boolean;
  onSelect:       (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragEnd:      (e: Konva.KonvaEventObject<DragEvent>)  => void;
  onDragMove?:    (e: Konva.KonvaEventObject<DragEvent>)  => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>)      => void;
  onDoubleClick:  (element: SlideElement, node: Konva.Text) => void;
}

const EditableText: React.FC<EditableTextProps> = ({
  element,
  scale,
  isSelected,
  editable,
  onSelect,
  onDragEnd,
  onDragMove,
  onTransformEnd,
  onDoubleClick,
}) => {
  const textRef = useRef<Konva.Text>(null);

  // ✅ Resolve alignment from placement or separate fields
  const { horizontal, vertical } = resolveAlignment(
    element.textPlacement,
    element.textAlign,
    element.verticalAlign,
  );

  const x       = element.x      * scale;
  const y       = element.y      * scale;
  const width   = element.width  * scale;
  const height  = (element.height || 50) * scale;

  return (
    <Group>
      {/* Invisible background rect for easier clicking */}
      <Rect
        id={`${element.id}-bg`}
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        rotation={element.rotation || 0}
        onClick={onSelect}
      />

      <Text
        ref={textRef}
        id={element.id}
        x={x}
        y={y}
        width={width}
        height={height}
        text={element.text || 'Double-click to edit'}
        fontSize={(element.fontSize || 24) * scale}
        fontFamily={element.fontFamily || 'Arial'}
        fill={element.fontColor || '#000000'}
        fontStyle={
          `${element.fontWeight === 'bold'   ? 'bold'   : ''} ${
            element.fontStyle  === 'italic' ? 'italic' : ''
          }`.trim() || 'normal'
        }

        // ✅ Dynamic alignment
        align={horizontal}
        verticalAlign={vertical}

        wrap="word"
        stroke={element.strokeColor || undefined}
        strokeWidth={
          element.strokeWidth ? element.strokeWidth * scale : 0
        }
        shadowColor={element.shadowColor  || undefined}
        shadowBlur={
          element.shadowBlur    ? element.shadowBlur    * scale : 0
        }
        shadowOffsetX={
          element.shadowOffsetX ? element.shadowOffsetX * scale : 0
        }
        shadowOffsetY={
          element.shadowOffsetY ? element.shadowOffsetY * scale : 0
        }
        rotation={element.rotation || 0}
        opacity={element.opacity ?? 1}
        draggable={editable}
        onClick={onSelect}
        onTap={(e) => onSelect(e as any)}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
        onDblClick={() => {
          if (editable && textRef.current) {
            onDoubleClick(element, textRef.current);
          }
        }}
        onDblTap={() => {
          if (editable && textRef.current) {
            onDoubleClick(element, textRef.current);
          }
        }}
      />
    </Group>
  );
};

export default EditableText;