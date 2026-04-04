// src/renderer/components/Editor/EditableText.tsx
import React, { useRef } from 'react';
import { Text, Rect, Group } from 'react-konva';
import Konva from 'konva';
import type { SlideElement } from '../../../server/types';

interface EditableTextProps {
  element:        SlideElement;
  scale:          number;
  isSelected:     boolean;
  editable:       boolean;
  onSelect:       (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragEnd:      (e: Konva.KonvaEventObject<DragEvent>)  => void;
  onDragMove?:    (e: Konva.KonvaEventObject<DragEvent>)  => void;  // ✅ added
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
  onDragMove,       // ✅ destructured
  onTransformEnd,
  onDoubleClick,
}) => {
  const textRef = useRef<Konva.Text>(null);

  return (
    <Group>
      {/* Invisible background rect for easier clicking */}
      <Rect
        id={`${element.id}-bg`}
        x={element.x * scale}
        y={element.y * scale}
        width={element.width  * scale}
        height={(element.height || 50) * scale}
        fill="transparent"
        rotation={element.rotation || 0}
        onClick={onSelect}
      />

      <Text
        ref={textRef}
        id={element.id}
        x={element.x * scale}
        y={element.y * scale}
        width={element.width  * scale}
        height={(element.height || 50) * scale}
        text={element.text || 'Double-click to edit'}
        fontSize={(element.fontSize || 24) * scale}
        fontFamily={element.fontFamily || 'Arial'}
        fill={element.fontColor || '#000000'}
        fontStyle={
          `${element.fontWeight === 'bold' ? 'bold' : ''} ${
            element.fontStyle === 'italic' ? 'italic' : ''
          }`.trim() || 'normal'
        }
        align={element.textAlign || 'left'}
        verticalAlign="top"
        wrap="word"
        stroke={element.strokeColor || undefined}
        strokeWidth={
          element.strokeWidth ? element.strokeWidth * scale : 0
        }
        shadowColor={element.shadowColor     || undefined}
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
        onDragMove={onDragMove}                // ✅ hooked up
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