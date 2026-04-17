// src/renderer/components/Editor/RichText.tsx
// REPLACE ENTIRE FILE

import React, { useMemo } from 'react';
import { Group, Text, Rect } from 'react-konva';
import { parseLine } from '../../utils/InlineMarkup';  // ✅ single source of truth

// ─────────────────────────────────────────────────────────────────────────────
// Re-export hasInlineMarkup from the shared util (used by EditableText)
// ─────────────────────────────────────────────────────────────────────────────
export { hasInlineMarkup } from '../../utils/InlineMarkup';

// ─────────────────────────────────────────────────────────────────────────────
// Layout engine
// ─────────────────────────────────────────────────────────────────────────────

const _mc   = document.createElement('canvas');
const _mctx = _mc.getContext('2d')!;

function measureW(
  text:   string,
  size:   number,
  family: string,
  weight: string,
  style:  string,
): number {
  _mctx.font = `${style} ${weight} ${size}px ${family}`;
  return _mctx.measureText(text).width;
}

interface PlacedSeg {
  text:       string;
  x:          number;
  y:          number;
  w:          number;
  fill:       string;
  fontStyle:  string;
  family:     string;
  decoration: string;
  isCode:     boolean;
}

function layoutLines(
  rawText:    string,
  maxW:       number,
  size:       number,
  family:     string,
  baseFill:   string,
  baseWeight: string,
  baseStyle:  string,
  lhMult:     number,
  align:      string,
  codeColor:  string,
  codeFam:    string,
): PlacedSeg[] {

  const lh  = size * lhMult;
  const out: PlacedSeg[] = [];

  const hardLines = rawText.split('\n');
  let globalVisualLine = 0;

  hardLines.forEach(hardLine => {
    // ✅ Uses parseLine from InlineMarkup.ts — correct regex guaranteed
    const segs = parseLine(hardLine);

    interface Atom {
      text:       string;
      w:          number;
      isSpace:    boolean;
      fontStyle:  string;
      fill:       string;
      family:     string;
      decoration: string;
      isCode:     boolean;
    }

    const atoms: Atom[] = [];

    segs.forEach(seg => {
      const fStyle  = seg.style.italic ? 'italic'  : baseStyle;
      const fWeight = seg.style.bold   ? 'bold'    : baseWeight;
      const segFill = seg.style.color  ?? (seg.style.code ? codeColor : baseFill);
      const fam     = seg.style.code   ? codeFam   : family;
      const dec     = seg.style.underline
        ? 'underline'
        : seg.style.strikethrough
        ? 'line-through'
        : '';
      const combined = [
        fStyle  !== 'normal' ? fStyle  : '',
        fWeight !== 'normal' ? fWeight : '',
      ].filter(Boolean).join(' ') || 'normal';

      seg.text.split(/(\s+)/).forEach(tok => {
        if (!tok) return;
        const w = measureW(tok, size, fam, fWeight, fStyle);
        atoms.push({
          text:       tok,
          w,
          isSpace:    /^\s+$/.test(tok),
          fontStyle:  combined,
          fill:       segFill,
          family:     fam,
          decoration: dec,
          isCode:     !!seg.style.code,
        });
      });
    });

    // Empty line → blank visual line
    if (atoms.length === 0) {
      globalVisualLine++;
      return;
    }

    // Greedy word-wrap
    type LineAtom = Atom & { measured: number };
    let lineAtoms: LineAtom[] = [];
    let lineW = 0;

    const flush = (la: LineAtom[]) => {
      while (la.length && la[la.length - 1].isSpace) la.pop();
      if (!la.length) { globalVisualLine++; return; }

      const totalW = la.reduce((s, a) => s + a.w, 0);
      let xOff = 0;
      if (align === 'center') xOff = Math.max(0, (maxW - totalW) / 2);
      if (align === 'right')  xOff = Math.max(0, maxW - totalW);

      const baseY = globalVisualLine * lh;
      let cx = xOff;
      la.forEach(a => {
        out.push({
          text:       a.text,
          x:          cx,
          y:          baseY,
          w:          a.w,
          fill:       a.fill,
          fontStyle:  a.fontStyle,
          family:     a.family,
          decoration: a.decoration,
          isCode:     a.isCode,
        });
        cx += a.w;
      });
      globalVisualLine++;
    };

    for (const atom of atoms) {
      const la: LineAtom = { ...atom, measured: atom.w };
      if (atom.isSpace) {
        lineAtoms.push(la);
        lineW += atom.w;
        continue;
      }
      if (lineW + atom.w > maxW && lineAtoms.length > 0) {
        while (lineAtoms.length && lineAtoms[lineAtoms.length - 1].isSpace) {
          lineW -= lineAtoms[lineAtoms.length - 1].w;
          lineAtoms.pop();
        }
        flush(lineAtoms);
        lineAtoms = [];
        lineW     = 0;
        if (atom.isSpace) continue;
      }
      lineAtoms.push(la);
      lineW += atom.w;
    }
    flush(lineAtoms);
  });

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface RichTextProps {
  x:           number;
  y:           number;
  width:       number;
  height:      number;
  text:        string;
  fontSize:    number;
  fontFamily:  string;
  fontColor:   string;
  fontWeight?: string;
  fontStyle?:  string;
  lineHeight?: number;
  textAlign?:  'left' | 'center' | 'right';
  opacity?:    number;
  listening?:  boolean;
  codeBg?:     string;
  codeColor?:  string;
  codeFamily?: string;
}

const RichText: React.FC<RichTextProps> = ({
  x, y, width, height,
  text,
  fontSize,
  fontFamily,
  fontColor,
  fontWeight  = 'normal',
  fontStyle   = 'normal',
  lineHeight  = 1.5,
  textAlign   = 'left',
  opacity     = 1,
  listening   = false,
  codeBg      = '#1e293b',
  codeColor   = '#7dd3fc',
  codeFamily  = 'monospace',
}) => {
  const placed = useMemo(() => layoutLines(
    text,
    width,
    fontSize,
    fontFamily,
    fontColor,
    fontWeight,
    fontStyle,
    lineHeight,
    textAlign,
    codeColor,
    codeFamily,
  ), [
    text, width, fontSize, fontFamily, fontColor,
    fontWeight, fontStyle, lineHeight, textAlign,
    codeColor, codeFamily,
  ]);

  return (
    <Group
      x={x} y={y}
      width={width} height={height}
      opacity={opacity}
      listening={listening}
    >
      {placed.map((seg, i) => (
        <React.Fragment key={i}>
          {seg.isCode && (
            <Rect
              x={seg.x - 2}
              y={seg.y + fontSize * 0.08}
              width={seg.w + 4}
              height={fontSize * 1.18}
              fill={codeBg}
              cornerRadius={3}
              listening={false}
            />
          )}
          <Text
            x={seg.x}
            y={seg.y}
            text={seg.text}
            fontSize={fontSize}
            fontFamily={seg.family}
            fontStyle={seg.fontStyle}
            fill={seg.fill}
            textDecoration={seg.decoration}
            listening={false}
            perfectDrawEnabled={false}
          />
        </React.Fragment>
      ))}
    </Group>
  );
};

export default RichText;