import { v4 as uuidv4 } from 'uuid';
import type { ParsedSlide, ContentBlock } from './slideParser';
import type { SlideElement } from '../../server/types';
import usePresentationStore from '../store/usePresentation';

// ── Layout constants ──────────────────────────────────────────────────────────
const MARGIN           = 60;
const GAP              = 20;
const TITLE_HEIGHT     = 110;
const SUBTITLE_HEIGHT  = 60;
const TITLE_FONT       = 64;
const SUBTITLE_FONT    = 34;
const CONTENT_FONT     = 32;
const LINE_HEIGHT_PX   = CONTENT_FONT * 1.55;
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
  return `el_${Date.now()}_${slideIndex}_${suffix}_${Math.random().toString(36).slice(2, 7)}`;
}

function estimateTextHeight(text: string): number {
  if (!text) return 0;
  const lineCount = text.split('\n').length;
  return Math.max(Math.ceil(lineCount * LINE_HEIGHT_PX) + GAP, MIN_BLOCK_HEIGHT);
}

/**
 * Estimate the total height one ContentBlock occupies:
 *   optional subtitle row + body text
 */
function estimateBlockHeight(block: ContentBlock): number {
  let h = 0;
  if (block.subtitle) h += SUBTITLE_HEIGHT + GAP;
  if (block.text)     h += estimateTextHeight(block.text);
  if (!block.text && block.subtitle) h = SUBTITLE_HEIGHT; // subtitle-only block
  return Math.max(h, block.subtitle ? SUBTITLE_HEIGHT : MIN_BLOCK_HEIGHT);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main generator
// ─────────────────────────────────────────────────────────────────────────────
export function generateSlides(
  parsed:     ParsedSlide[],
  startOrder: number = 1,
): GeneratedSlide[] {

  const { canvasWidth, canvasHeight } = usePresentationStore.getState();
  const W = canvasWidth;
  const H = canvasHeight;

  return parsed.map((slide, i) => {
    const elements: SlideElement[] = [];

    const hasTitle   = !!slide.title;
    // A slide is "title only" when every block has no body text
    // (could still have subtitles)
    const hasContent = slide.blocks.some(b => b.text.trim().length > 0);
    const isCentred  = !hasContent;

    if (isCentred) {
      // ══ CENTRED LAYOUT ══════════════════════════════════════════════════
      // Collect all "lines" of the centred group:
      //   title → slide.title
      //   then each block's subtitle (if any)
      // Calculate total height and vertically centre the group.

      // Build an ordered list of { kind, text } to render
      type CentredItem =
        | { kind: 'title';    text: string }
        | { kind: 'subtitle'; text: string };

      const items: CentredItem[] = [];
      if (hasTitle) items.push({ kind: 'title', text: slide.title! });
      slide.blocks.forEach(b => {
        if (b.subtitle) items.push({ kind: 'subtitle', text: b.subtitle });
      });

      // Total height of the group
      let groupH = 0;
      items.forEach((item, idx) => {
        groupH += item.kind === 'title' ? TITLE_HEIGHT : SUBTITLE_HEIGHT;
        if (idx < items.length - 1) groupH += GAP;
      });

      // Start Y so the group is vertically centred
      let y = Math.max(MARGIN, Math.round((H - groupH) / 2));

      items.forEach((item, idx) => {
        const h = item.kind === 'title' ? TITLE_HEIGHT : SUBTITLE_HEIGHT;
        if (item.kind === 'title') {
          elements.push(makeTitleEl(
            makeId(i, `title_${idx}`),
            item.text, MARGIN, y, W - MARGIN * 2, h, 'center',
          ));
        } else {
          elements.push(makeSubtitleEl(
            makeId(i, `subtitle_${idx}`),
            item.text, MARGIN, y, W - MARGIN * 2, h, 'center',
          ));
        }
        y += h + GAP;
      });

    } else {
      // ══ NORMAL LAYOUT ═══════════════════════════════════════════════════
      // Title at top, then each block (optional subtitle + body) stacked.

      let currentY = MARGIN;

      // ── Slide title ──────────────────────────────────────────────────────
      if (hasTitle) {
        elements.push(makeTitleEl(
          makeId(i, 'title'),
          slide.title!, MARGIN, currentY, W - MARGIN * 2, TITLE_HEIGHT, 'left',
        ));
        currentY += TITLE_HEIGHT + GAP;
      }

      // ── Blocks ───────────────────────────────────────────────────────────
      const blocksWithContent = slide.blocks.filter(b => b.text || b.subtitle);
      const remainingH        = H - currentY - MARGIN;

      if (blocksWithContent.length === 0) {
        // nothing

      } else if (blocksWithContent.length === 1) {
        // Single block — fills all remaining space
        currentY = placeBlock(
          elements, blocksWithContent[0],
          i, 0, MARGIN, currentY, W - MARGIN * 2, remainingH,
        );

      } else {
        // Multiple blocks — divide proportionally by estimated height
        const estimates  = blocksWithContent.map(estimateBlockHeight);
        const totalEst   = estimates.reduce((a, b) => a + b, 0);
        const totalGaps  = GAP * (blocksWithContent.length - 1);
        const available  = remainingH - totalGaps;

        blocksWithContent.forEach((block, bi) => {
          const proportion = estimates[bi] / totalEst;
          const allocatedH = Math.max(
            Math.floor(available * proportion),
            block.subtitle ? SUBTITLE_HEIGHT + MIN_BLOCK_HEIGHT : MIN_BLOCK_HEIGHT,
          );
          currentY = placeBlock(
            elements, block, i, bi,
            MARGIN, currentY, W - MARGIN * 2, allocatedH,
          );
          currentY += GAP;
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

/**
 * Place one ContentBlock (subtitle + body) into the elements array.
 * Returns the new currentY after placing this block.
 */
function placeBlock(
  elements:  SlideElement[],
  block:     ContentBlock,
  slideIdx:  number,
  blockIdx:  number,
  x:         number,
  y:         number,
  width:     number,
  totalH:    number,    // total vertical space allocated to this block
): number {
  let currentY = y;

  // ── Per-block subtitle ──────────────────────────────────────────────────
  if (block.subtitle) {
    elements.push(makeSubtitleEl(
      makeId(slideIdx, `sub_${blockIdx}`),
      block.subtitle, x, currentY, width, SUBTITLE_HEIGHT, 'left',
    ));
    currentY += SUBTITLE_HEIGHT + GAP;
  }

  // ── Body text ───────────────────────────────────────────────────────────
  if (block.text) {
    const bodyH = Math.max(
      totalH - (block.subtitle ? SUBTITLE_HEIGHT + GAP : 0),
      MIN_BLOCK_HEIGHT,
    );
    elements.push(makeContentEl(
      makeId(slideIdx, `content_${blockIdx}`),
      block.text, x, currentY, width, bodyH,
    ));
    currentY += bodyH;
  }

  return currentY;
}

// ── Element factories ─────────────────────────────────────────────────────────

function makeTitleEl(
  id:        string,
  text:      string,
  x:         number,
  y:         number,
  width:     number,
  height:    number,
  textAlign: 'left' | 'center' | 'right' = 'left',
): SlideElement {
  return {
    id,
    type:          'text',
    x, y, width, height,
    rotation:      0,
    opacity:       1,
    text,
    fontSize:      TITLE_FONT,
    fontFamily:    'Arial',
    fontColor:     '#ffffff',
    fontWeight:    'bold',
    fontStyle:     'normal',
    textAlign,
    verticalAlign: 'middle',
    textPlacement: textAlign === 'center' ? 'middleCenter' : 'middleLeft',
    strokeColor:   '#000000',
    strokeWidth:   0,
    shadowColor:   undefined,
    shadowBlur:    0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    isLocked:      false,
  };
}

function makeSubtitleEl(
  id:        string,
  text:      string,
  x:         number,
  y:         number,
  width:     number,
  height:    number,
  textAlign: 'left' | 'center' | 'right' = 'left',
): SlideElement {
  return {
    id,
    type:          'text',
    x, y, width, height,
    rotation:      0,
    opacity:       1,
    text,
    fontSize:      SUBTITLE_FONT,
    fontFamily:    'Arial',
    fontColor:     '#94a3b8',     // slate-400
    fontWeight:    'normal',
    fontStyle:     'italic',
    textAlign,
    verticalAlign: 'middle',
    textPlacement: textAlign === 'center' ? 'middleCenter' : 'middleLeft',
    strokeColor:   '#000000',
    strokeWidth:   0,
    shadowColor:   undefined,
    shadowBlur:    0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    isLocked:      false,
  };
}

function makeContentEl(
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
    x, y, width, height,
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