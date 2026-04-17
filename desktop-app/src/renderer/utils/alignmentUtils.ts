// src/renderer/utils/alignmentUtils.ts

export type HorizontalAlign = 'left' | 'center' | 'right';
export type VerticalAlign   = 'top'  | 'middle' | 'bottom';
export type TextPlacement   =
  | 'topLeft'    | 'topCenter'    | 'topRight'
  | 'middleLeft' | 'middleCenter' | 'middleRight'
  | 'bottomLeft' | 'bottomCenter' | 'bottomRight';

export interface ResolvedAlignment {
  horizontal: HorizontalAlign;
  vertical:   VerticalAlign;
}

/**
 * Resolves alignment from either:
 * - a combined `textPlacement` string (e.g. "topCenter")
 * - or separate `textAlign` + `verticalAlign` fields
 */
export function resolveAlignment(
  textPlacement?: TextPlacement,
  textAlign?:     HorizontalAlign,
  verticalAlign?: VerticalAlign,
): ResolvedAlignment {
  if (textPlacement) {
    const map: Record<TextPlacement, ResolvedAlignment> = {
      topLeft:      { horizontal: 'left',   vertical: 'top'    },
      topCenter:    { horizontal: 'center', vertical: 'top'    },
      topRight:     { horizontal: 'right',  vertical: 'top'    },
      middleLeft:   { horizontal: 'left',   vertical: 'middle' },
      middleCenter: { horizontal: 'center', vertical: 'middle' },
      middleRight:  { horizontal: 'right',  vertical: 'middle' },
      bottomLeft:   { horizontal: 'left',   vertical: 'bottom' },
      bottomCenter: { horizontal: 'center', vertical: 'bottom' },
      bottomRight:  { horizontal: 'right',  vertical: 'bottom' },
    };
    return map[textPlacement];
  }

  return {
    horizontal: textAlign    ?? 'left',
    vertical:   verticalAlign ?? 'top',
  };
}

  // ── Normalize to Konva-safe values (same as EditableText) ─────────────────
  // ── Konva alignment normalizers ───────────────────────────────────────────────
  // Accepts any string so TypeScript doesn't narrow the union before comparison
  export function toKonvaHAlign(v: string | undefined): 'left' | 'center' | 'right' {
    if (v === 'center' || v === 'middle')                       return 'center';
    if (v === 'right'  || v === 'end'   || v === 'flex-end')    return 'right';
    return 'left';
  }

  export function toKonvaVAlign(v: string | undefined): 'top' | 'middle' | 'bottom' {
    if (v === 'middle' || v === 'center')                       return 'middle';
    if (v === 'bottom' || v === 'end'   || v === 'flex-end')    return 'bottom';
    return 'top';
  }