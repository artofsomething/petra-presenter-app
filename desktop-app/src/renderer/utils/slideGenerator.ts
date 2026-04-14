// src/renderer/utils/slideGenerator.ts

import { v4 as uuidv4 } from 'uuid';
import type { ParsedSlide } from './slideParser';
import type { SlideElement } from '../../server/types';
import usePresentationStore from '../store/usePresentation';

// ── Layout constants (logical coords — independent of canvas preview scale) ───
const MARGIN          = 40;    // outer margin on all sides
const GAP             = 24;    // gap between stacked elements
const TITLE_HEIGHT    = 100;   // fixed title element height
const TITLE_FONT      = 60;
const CONTENT_FONT    = 36;
const LINE_HEIGHT_PX  = CONTENT_FONT * 1.5;   // ~54px per line
const MIN_BLOCK_HEIGHT = 80;

export interface GeneratedSlide {
  id:                   string;
  order:                number;
  backgroundColor:      string;
  backgroundVideoLoop:  boolean;
  backgroundVideoMuted: boolean;
  elements:             SlideElement[];
  notes:                string;
}

// ── Unique element ID ─────────────────────────────────────────────────────────
function makeId(slideIndex: number, suffix: string): string {
  return `el_${Date.now()}_${slideIndex}_${suffix}`;
}

// ── Estimate block height from line count ─────────────────────────────────────
function estimateHeight(text: string): number {
  const lineCount = text.split('\n').length;
  return Math.max(Math.ceil(lineCount * LINE_HEIGHT_PX) + GAP, MIN_BLOCK_HEIGHT);
}

// ── Main generator ────────────────────────────────────────────────────────────
export function generateSlides(
  parsed:     ParsedSlide[],
  startOrder: number = 1,
): GeneratedSlide[] {

  // ✅ Read canvas resolution from store at call time
  const { canvasWidth, canvasHeight } = usePresentationStore.getState();

  const SLIDE_WIDTH  = canvasWidth;
  const SLIDE_HEIGHT = canvasHeight;

  return parsed.map((slide, i) => {
    const elements: SlideElement[] = [];
    let currentY = MARGIN;

    // ── Title ───────────────────────────────────────────────────────────────
    if (slide.title) {
      elements.push(
        makeTitleElement(
          makeId(i, 'title'),
          slide.title,
          MARGIN,
          currentY,
          SLIDE_WIDTH - MARGIN * 2,
          TITLE_HEIGHT,
        ),
      );
      currentY += TITLE_HEIGHT + GAP;
    }

    // ── Content blocks ───────────────────────────────────────────────────────
    const blocks          = slide.contents;
    const remainingHeight = SLIDE_HEIGHT - currentY - MARGIN;

    if (blocks.length === 0) {
      // nothing to do
    } else if (blocks.length === 1) {
      // Single block — fill all remaining height
      elements.push(
        makeContentElement(
          makeId(i, 'content_0'),
          blocks[0],
          currentY,
          remainingHeight,
          SLIDE_WIDTH - MARGIN * 2,
        ),
      );
    } else {
      // Multiple blocks — divide space proportionally by line count
      const estimates  = blocks.map(estimateHeight);
      const totalEst   = estimates.reduce((a, b) => a + b, 0);
      const totalGaps  = GAP * (blocks.length - 1);
      const available  = remainingHeight - totalGaps;

      blocks.forEach((text, ci) => {
        const proportion = estimates[ci] / totalEst;
        const blockH     = Math.max(
          Math.floor(available * proportion),
          MIN_BLOCK_HEIGHT,
        );

        elements.push(
          makeContentElement(
            makeId(i, `content_${ci}`),
            text,
            currentY,
            blockH,
            SLIDE_WIDTH - MARGIN * 2,
          ),
        );
        currentY += blockH + GAP;
      });
    }

    return {
      id:                   uuidv4(),
      order:                startOrder + i,
      backgroundColor:      '#000000',
      backgroundVideoLoop:  true,
      backgroundVideoMuted: true,
      elements,
      notes:                '',
    };
  });
}

// ── Title element factory ─────────────────────────────────────────────────────
function makeTitleElement(
  id:     string,
  text:   string,
  x:      number,
  y:      number,
  width:  number,
  height: number,
): SlideElement {
  return {
    id,
    type:          'text',
    x,
    y,
    width,
    height,
    rotation:      0,
    opacity:       1,
    text,
    fontSize:      TITLE_FONT,
    fontFamily:    'Arial',
    fontColor:     '#ffffff',
    fontWeight:    'bold',
    fontStyle:     'normal',
    textAlign:     'left',
    verticalAlign: 'middle',
    textPlacement: 'middleLeft',
    strokeColor:   '#000000',
    strokeWidth:   0,
    shadowColor:   undefined,
    shadowBlur:    0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    isLocked:      false,
  };
}

// ── Content element factory ───────────────────────────────────────────────────
function makeContentElement(
  id:     string,
  text:   string,
  y:      number,
  height: number,
  width:  number,
): SlideElement {
  return {
    id,
    type:          'text',
    x:             MARGIN,
    y,
    width,
    height,
    rotation:      0,
    opacity:       1,
    listType:      'bullet',
    text,
    fontSize:      CONTENT_FONT,
    fontFamily:    'Arial',
    fontColor:     '#e2e8f0',
    fontWeight:    'normal',
    fontStyle:     'normal',
    textAlign:     'left',
    verticalAlign: 'top',
    textPlacement: 'topLeft',
    strokeColor:   '#000000',
    strokeWidth:   0,
    shadowColor:   undefined,
    shadowBlur:    0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    isLocked:      false,
  };
}