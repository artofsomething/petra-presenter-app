// src/renderer/utils/slideGenerator.ts

import { v4 as uuidv4 } from 'uuid';
import type { ParsedSlide } from './slideParser';
import type { SlideElement } from '../../server/types';

const SLIDE_WIDTH  = 1920;
const SLIDE_HEIGHT = 1080;

const MARGIN        = 40;   // outer margin
const GAP           = 24;   // gap between elements
const TITLE_HEIGHT  = 100;
const TITLE_FONT    = 60;
const CONTENT_FONT  = 36;

// Lines visible per content block before overflow
const LINE_HEIGHT_PX   = CONTENT_FONT * 1.5;   // ~54px per line
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

function makeId(slideIndex: number, suffix: string): string {
  return `el_${Date.now()}_${slideIndex}_${suffix}`;
}

// ── Estimate element height from line count ───────────────────────────────────
function estimateHeight(text: string, minHeight = MIN_BLOCK_HEIGHT): number {
  const lineCount = text.split('\n').length;
  const estimated = Math.ceil(lineCount * LINE_HEIGHT_PX) + GAP;
  return Math.max(estimated, minHeight);
}

export function generateSlides(
  parsed:     ParsedSlide[],
  startOrder: number = 1,
): GeneratedSlide[] {
  return parsed.map((slide, i) => {
    const elements: SlideElement[] = [];
    let currentY = MARGIN;

    // ── Title ─────────────────────────────────────────────────────────────────
    if (slide.title) {
      const titleEl: SlideElement = {
        id:            makeId(i, 'title'),
        type:          'text',
        x:             MARGIN,
        y:             currentY,
        width:         SLIDE_WIDTH - MARGIN * 2,
        height:        TITLE_HEIGHT,
        rotation:      0,
        opacity:       1,
        text:          slide.title,
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
      elements.push(titleEl);
      currentY += TITLE_HEIGHT + GAP;
    }

    // ── Content blocks (dynamic height, stacked) ──────────────────────────────
    const contentBlocks = slide.contents;
    const remainingHeight = SLIDE_HEIGHT - currentY - MARGIN;

    if (contentBlocks.length > 0) {
      // ── Single block: fill remaining height ──────────────────────────────────
      if (contentBlocks.length === 1) {
        const contentEl = makeContentElement(
          makeId(i, 'content_0'),
          contentBlocks[0],
          currentY,
          remainingHeight,
        );
        elements.push(contentEl);

      } else {
        // ── Multiple blocks: divide space by estimated proportions ────────────
        const estimates  = contentBlocks.map(c => estimateHeight(c));
        const totalEst   = estimates.reduce((a, b) => a + b, 0);
        const totalGaps  = GAP * (contentBlocks.length - 1);
        const available  = remainingHeight - totalGaps;

        contentBlocks.forEach((text, ci) => {
          // Proportional height based on line count estimate
          const proportion = estimates[ci] / totalEst;
          const blockH     = Math.max(
            Math.floor(available * proportion),
            MIN_BLOCK_HEIGHT,
          );

          const contentEl = makeContentElement(
            makeId(i, `content_${ci}`),
            text,
            currentY,
            blockH,
          );
          elements.push(contentEl);
          currentY += blockH + GAP;
        });
      }
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

// ── Build a single content SlideElement ──────────────────────────────────────
function makeContentElement(
  id:      string,
  text:    string,
  y:       number,
  height:  number,
): SlideElement {
  return {
    id,
    type:          'text',
    x:             MARGIN,
    y,
    width:         SLIDE_WIDTH - MARGIN * 2,
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