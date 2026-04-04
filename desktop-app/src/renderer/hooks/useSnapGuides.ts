// src/renderer/hooks/useSnapGuides.ts
import { useState, useCallback } from 'react';

export interface SnapGuide {
  type:      'horizontal' | 'vertical';
  position:  number;   // logical coords (1920x1080)
  label?:    string;
  spanStart?: number;  // logical coords
  spanEnd?:   number;  // logical coords
}

interface ElementBounds {
  id:     string;
  x:      number;   // logical coords
  y:      number;
  width:  number;
  height: number;
}

interface SnapResult {
  x:      number;
  y:      number;
  guides: SnapGuide[];
}

interface UseSnapGuidesOptions {
  canvasWidth:    number;   // logical (1920)
  canvasHeight:   number;   // logical (1080)
  snapThreshold?: number;   // logical px
}

export function useSnapGuides({
  canvasWidth,
  canvasHeight,
  snapThreshold = 8,
}: UseSnapGuidesOptions) {
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  const computeSnap = useCallback((
    dragging: ElementBounds,
    others:   ElementBounds[],
  ): SnapResult => {
    let { x, y } = dragging;
    const raw: SnapGuide[] = [];

    const cX = canvasWidth  / 2;
    const cY = canvasHeight / 2;

    const getAnchors = (ex: number, ey: number) => ({
      left:    ex,
      right:   ex + dragging.width,
      centerX: ex + dragging.width  / 2,
      top:     ey,
      bottom:  ey + dragging.height,
      centerY: ey + dragging.height / 2,
    });

    // ── Canvas center & edges ─────────────────────────────────────────────
    {
      const a = getAnchors(x, y);

      if (Math.abs(a.centerX - cX) < snapThreshold) {
        x = cX - dragging.width / 2;
        raw.push({ type: 'vertical',   position: cX, label: 'center',
                   spanStart: 0, spanEnd: canvasHeight });
      }
      if (Math.abs(a.centerY - cY) < snapThreshold) {
        y = cY - dragging.height / 2;
        raw.push({ type: 'horizontal', position: cY, label: 'center',
                   spanStart: 0, spanEnd: canvasWidth });
      }
      if (Math.abs(a.left) < snapThreshold) {
        x = 0;
        raw.push({ type: 'vertical',   position: 0,
                   spanStart: 0, spanEnd: canvasHeight });
      }
      if (Math.abs(a.right - canvasWidth) < snapThreshold) {
        x = canvasWidth - dragging.width;
        raw.push({ type: 'vertical',   position: canvasWidth,
                   spanStart: 0, spanEnd: canvasHeight });
      }
      if (Math.abs(a.top) < snapThreshold) {
        y = 0;
        raw.push({ type: 'horizontal', position: 0,
                   spanStart: 0, spanEnd: canvasWidth });
      }
      if (Math.abs(a.bottom - canvasHeight) < snapThreshold) {
        y = canvasHeight - dragging.height;
        raw.push({ type: 'horizontal', position: canvasHeight,
                   spanStart: 0, spanEnd: canvasWidth });
      }
    }

    // ── Other elements ────────────────────────────────────────────────────
    for (const o of others) {
      const a = getAnchors(x, y);

      const oL  = o.x;
      const oR  = o.x + o.width;
      const oCX = o.x + o.width  / 2;
      const oT  = o.y;
      const oB  = o.y + o.height;
      const oCY = o.y + o.height / 2;

      // ── Vertical snaps (align on X axis) ─────────────────────────────
      const vSnaps: Array<{ da: number; oa: number; newX: number }> = [
        { da: a.left,    oa: oL,  newX: oL                      },
        { da: a.left,    oa: oR,  newX: oR                      },
        { da: a.right,   oa: oR,  newX: oR  - dragging.width    },
        { da: a.right,   oa: oL,  newX: oL  - dragging.width    },
        { da: a.centerX, oa: oCX, newX: oCX - dragging.width / 2},
      ];

      for (const { da, oa, newX } of vSnaps) {
        if (Math.abs(da - oa) < snapThreshold) {
          x = newX;
          // ✅ spanStart/End in LOGICAL Y coords
          const minY = Math.min(o.y, y);
          const maxY = Math.max(o.y + o.height, y + dragging.height);
          raw.push({
            type:      'vertical',
            position:  oa,          // logical X
            spanStart: minY,        // logical Y
            spanEnd:   maxY,        // logical Y
          });
          break;
        }
      }

      // ── Horizontal snaps (align on Y axis) ───────────────────────────
      const hSnaps: Array<{ da: number; oa: number; newY: number }> = [
        { da: a.top,     oa: oT,  newY: oT                       },
        { da: a.top,     oa: oB,  newY: oB                       },
        { da: a.bottom,  oa: oB,  newY: oB  - dragging.height    },
        { da: a.bottom,  oa: oT,  newY: oT  - dragging.height    },
        { da: a.centerY, oa: oCY, newY: oCY - dragging.height / 2},
      ];

      for (const { da, oa, newY } of hSnaps) {
        if (Math.abs(da - oa) < snapThreshold) {
          y = newY;
          // ✅ spanStart/End in LOGICAL X coords
          const minX = Math.min(o.x, x);
          const maxX = Math.max(o.x + o.width, x + dragging.width);
          raw.push({
            type:      'horizontal',
            position:  oa,          // logical Y
            spanStart: minX,        // logical X
            spanEnd:   maxX,        // logical X
          });
          break;
        }
      }
    }

    // ── Deduplicate — keep widest span ────────────────────────────────────
    const map = new Map<string, SnapGuide>();
    for (const g of raw) {
      const key      = `${g.type}-${Math.round(g.position)}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { ...g });
      } else {
        map.set(key, {
          ...existing,
          spanStart: Math.min(existing.spanStart ?? 0, g.spanStart ?? 0),
          spanEnd:   Math.max(existing.spanEnd   ?? 0, g.spanEnd   ?? 0),
          label:     existing.label ?? g.label,
        });
      }
    }

    return { x, y, guides: Array.from(map.values()) };
  }, [canvasWidth, canvasHeight, snapThreshold]);

  const updateGuides = useCallback((g: SnapGuide[]) => setGuides(g), []);
  const clearGuides  = useCallback(() => setGuides([]),               []);

  return { guides, computeSnap, updateGuides, clearGuides };
}