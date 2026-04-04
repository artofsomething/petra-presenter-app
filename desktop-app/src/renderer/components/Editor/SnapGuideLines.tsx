// src/renderer/components/Editor/SnapGuideLines.tsx
import React from 'react';
import { Line, Group, Text, Rect, Circle } from 'react-konva';
import type { SnapGuide } from '../../hooks/useSnapGuides';

interface Props {
  guides:        SnapGuide[];
  canvasWidth:   number;   // canvas px  (960)
  canvasHeight:  number;   // canvas px  (540)
  logicalWidth:  number;   // logical px (1920)
  logicalHeight: number;   // logical px (1080)
}

const SnapGuideLines: React.FC<Props> = ({
  guides,
  canvasWidth,
  canvasHeight,
  logicalWidth,
  logicalHeight,
}) => {
  if (!guides.length) return null;

  // ✅ Scale factors to convert logical → canvas px
  const scaleX = canvasWidth  / logicalWidth;
  const scaleY = canvasHeight / logicalHeight;

  return (
    <>
      {guides.map((guide, i) => {
        const isCenter = guide.label === 'center';
        const color    = isCenter ? '#f59e0b' : '#ef4444';

        if (guide.type === 'vertical') {
          // ✅ Convert logical X → canvas px
          const px    = guide.position  * scaleX;
          // ✅ Convert logical Y span → canvas px
          const yFrom = (guide.spanStart ?? 0)             * scaleY;
          const yTo   = (guide.spanEnd   ?? logicalHeight) * scaleY;

          return (
            <Group key={`v-${i}`} listening={false}>
              {/* Faint full-height ghost line */}
              <Line
                points={[px, 0, px, canvasHeight]}
                stroke={color}
                strokeWidth={0.5}
                dash={[3, 4]}
                opacity={0.25}
                listening={false}
              />
              {/* Bold span between matched elements */}
              <Line
                points={[px, yFrom, px, yTo]}
                stroke={color}
                strokeWidth={1.5}
                opacity={1}
                listening={false}
              />
              {/* Endpoint dots */}
              <Circle x={px} y={yFrom} radius={3} fill={color} listening={false} />
              <Circle x={px} y={yTo}   radius={3} fill={color} listening={false} />

              {isCenter && (
                <Group x={px + 5} y={canvasHeight / 2 - 9} listening={false}>
                  <Rect width={44} height={16} fill={color}
                        opacity={0.9} cornerRadius={3} />
                  <Text text="CENTER" fontSize={8} fontStyle="bold"
                        fill="white" width={44} height={16}
                        align="center" verticalAlign="middle" listening={false} />
                </Group>
              )}
            </Group>
          );
        }

        // Horizontal guide
        // ✅ Convert logical Y → canvas px
        const py    = guide.position  * scaleY;
        // ✅ Convert logical X span → canvas px
        const xFrom = (guide.spanStart ?? 0)            * scaleX;
        const xTo   = (guide.spanEnd   ?? logicalWidth) * scaleX;

        return (
          <Group key={`h-${i}`} listening={false}>
            {/* Faint full-width ghost line */}
            <Line
              points={[0, py, canvasWidth, py]}
              stroke={color}
              strokeWidth={0.5}
              dash={[3, 4]}
              opacity={0.25}
              listening={false}
            />
            {/* Bold span between matched elements */}
            <Line
              points={[xFrom, py, xTo, py]}
              stroke={color}
              strokeWidth={1.5}
              opacity={1}
              listening={false}
            />
            {/* Endpoint dots */}
            <Circle x={xFrom} y={py} radius={3} fill={color} listening={false} />
            <Circle x={xTo}   y={py} radius={3} fill={color} listening={false} />

            {isCenter && (
              <Group x={canvasWidth / 2 - 22} y={py + 4} listening={false}>
                <Rect width={44} height={16} fill={color}
                      opacity={0.9} cornerRadius={3} />
                <Text text="CENTER" fontSize={8} fontStyle="bold"
                      fill="white" width={44} height={16}
                      align="center" verticalAlign="middle" listening={false} />
              </Group>
            )}
          </Group>
        );
      })}
    </>
  );
};

export default SnapGuideLines;