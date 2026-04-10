// src/renderer/utils/underlineUtils.ts

export interface RenderedLine {
  text:  string;
  width: number;
  x:     number;
  y:     number;
}

export function getRenderedLines(options: {
  text:          string;
  fontSize:      number;
  fontFamily:    string;
  fontStyle:     string;
  fontWeight:    string;
  lineHeight?:   number;   // ✅ ADD
  elementWidth:  number;
  elementHeight: number;
  elementX:      number;
  elementY:      number;
  align:         string;
  verticalAlign: string;
  stageScaleX:   number;
  stageScaleY:   number;
  stageX:        number;
  stageY:        number;
}): RenderedLine[] {

  const {
    text, fontSize, fontFamily, fontStyle, fontWeight,
    lineHeight = 1.2,  // ✅ use passed value, default 1.2
    elementWidth, elementHeight, elementX, elementY,
    align, verticalAlign,
    stageScaleX, stageScaleY, stageX, stageY,
  } = options;

  if (!text || !text.trim()) return [];

  const canvas    = document.createElement('canvas');
  const ctx       = canvas.getContext('2d')!;
  const fullStyle = [fontStyle, fontWeight, `${fontSize}px`, fontFamily]
    .filter(Boolean).join(' ');
  ctx.font = fullStyle;

  const measureW = (t: string) => ctx.measureText(t).width;

  // ── Word-wrap ─────────────────────────────────────────────────────────────
  const renderedLines: { text: string; width: number }[] = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) {
      renderedLines.push({ text: '', width: 0 });
      continue;
    }

    const words   = para.split(' ');
    let   current = '';

    for (const word of words) {
      const test      = current ? `${current} ${word}` : word;
      const testWidth = measureW(test);

      if (testWidth > elementWidth && current) {
        renderedLines.push({ text: current, width: measureW(current) });
        current = word;
      } else {
        current = test;
      }
    }
    if (current) {
      renderedLines.push({ text: current, width: measureW(current) });
    }
  }

  // ✅ Use passed lineHeight multiplier
  const lineH  = fontSize * lineHeight;
  const totalH = renderedLines.length * lineH;

  // ── Vertical start ────────────────────────────────────────────────────────
  let localStartY = 0;
  if (verticalAlign === 'middle') {
    localStartY = (elementHeight - totalH) / 2;
  } else if (verticalAlign === 'bottom') {
    localStartY = elementHeight - totalH;
  }

  const toStageX = (lx: number) => stageX + (elementX + lx) * stageScaleX;
  const toStageY = (ly: number) => stageY + (elementY + ly) * stageScaleY;

  const result: RenderedLine[] = [];

  renderedLines.forEach((line, i) => {
    if (!line.text.trim()) return;

    let localX = 0;
    if (align === 'center') {
      localX = (elementWidth - line.width) / 2;
    } else if (align === 'right') {
      localX = elementWidth - line.width;
    }

    // ✅ lineH uses the custom multiplier
    const localY = localStartY + i * lineH + fontSize * 0.9;

    result.push({
      text:  line.text,
      width: line.width * stageScaleX,
      x:     toStageX(localX),
      y:     toStageY(localY),
    });
  });

  return result;
}