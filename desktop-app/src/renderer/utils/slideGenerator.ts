// src/renderer/utils/slideGenerator.ts

import { v4 as uuidv4 } from 'uuid';
import type { ParsedSlide } from './slideParser';
import type { SlideElement } from '../../server/types';

// ── Slide canvas size ─────────────────────────────────────────────────────────
const SLIDE_WIDTH  = 1920;
const SLIDE_HEIGHT = 1080;

// ── Layout constants ──────────────────────────────────────────────────────────
const MARGIN        = 20;   // px — outer margin on all sides
const GAP           = 20;   // px — gap between title bottom and content top
const TITLE_HEIGHT  = 100;  // px — fixed title element height
const TITLE_FONT    = 60;
const CONTENT_FONT  = 40;

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

export function generateSlides(
  parsed:     ParsedSlide[],
  startOrder: number = 1,
): GeneratedSlide[] {
  return parsed.map((slide, i) => {
    const elements: SlideElement[] = [];

    // ── Title element ─────────────────────────────────────────────────────────
    if (slide.title) {
      const titleEl: SlideElement = {
        // ── Required base fields ──────────────────────────────────────────────
        id:       makeId(i, 'title'),
        type:     'text',
        x:        MARGIN,
        y:        MARGIN,
        width:    SLIDE_WIDTH - MARGIN * 2,
        height:   TITLE_HEIGHT,
        rotation: 0,
        opacity:  1,

        // ── Text fields ───────────────────────────────────────────────────────
        text:          slide.title,
        fontSize:      TITLE_FONT,
        fontFamily:    'Arial',
        fontColor:     '#ffffff',
        fontWeight:    'bold',
        fontStyle:     'normal',
        textAlign:     'left',
        verticalAlign: 'middle',
        textPlacement: 'middleLeft',

        // ── Stroke / shadow defaults ──────────────────────────────────────────
        strokeColor: '#000000',
        strokeWidth: 0,
        shadowColor: undefined,
        shadowBlur:  0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,

        // ── Optional flags ────────────────────────────────────────────────────
        isLocked: false,
      };
      elements.push(titleEl);
    }

    // ── Content element ───────────────────────────────────────────────────────
    if (slide.content) {
      // Starts below title + gap, or just margin if no title
      const contentY = slide.title
        ? MARGIN + TITLE_HEIGHT + GAP
        : MARGIN;

      // Fills down to bottom with margin
      const contentHeight = SLIDE_HEIGHT - contentY - MARGIN;

      const contentEl: SlideElement = {
        // ── Required base fields ──────────────────────────────────────────────
        id:       makeId(i, 'content'),
        type:     'text',
        x:        MARGIN,
        y:        contentY,
        width:    SLIDE_WIDTH - MARGIN * 2,
        height:   contentHeight,
        rotation: 0,
        opacity:  1,
        listType:'bullet',

        // ── Text fields ───────────────────────────────────────────────────────
        text:          slide.content,
        fontSize:      CONTENT_FONT,
        fontFamily:    'Arial',
        fontColor:     '#e2e8f0',
        fontWeight:    'normal',
        fontStyle:     'normal',
        textAlign:     'left',
        verticalAlign: 'top',
        textPlacement: 'topLeft',

        // ── Stroke / shadow defaults ──────────────────────────────────────────
        strokeColor:  '#000000',
        strokeWidth:  0,
        shadowColor:  undefined,
        shadowBlur:   0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,

        // ── Optional flags ────────────────────────────────────────────────────
        isLocked: false,
      };
      elements.push(contentEl);
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