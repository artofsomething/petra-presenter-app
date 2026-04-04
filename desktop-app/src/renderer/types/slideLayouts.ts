// src/renderer/types/slideLayouts.ts

export type LayoutId =
  | 'blank'
  | 'title-only'
  | 'title-subtitle'
  | 'title-content'
  | 'two-column'
  | 'title-three-col'
  | 'image-right'
  | 'image-left'
  | 'big-quote'
  | 'section-header'
  | 'title-bullets'
  | 'full-image';

export interface SlideLayout {
  id:          LayoutId;
  label:       string;
  emoji:       string;
  description: string;
  preview:     LayoutPreviewBlock[];   // used to draw the thumbnail
  elements:    LayoutElement[];        // spawned into the slide
}

export interface LayoutPreviewBlock {
  x: number; y: number; w: number; h: number;
  type: 'title' | 'text' | 'image' | 'shape';
  dark?: boolean;
}

export interface LayoutElement {
  type:          'text' | 'image' | 'shape';
  text?:         string;
  x:             number;
  y:             number;
  width:         number;
  height:        number;
  fontSize?:     number;
  fontFamily?:   string;
  fontColor?:    string;
  fontWeight?:   string;
  fontStyle?:    string;
  textAlign?:    string;
  fill?:         string;
  stroke?:       string;
  strokeWidth?:  number;
  shapeType?:    string;
  cornerRadius?: number;
  opacity?:      number;
  src?:          string;
  // NOTE: no `id` here — generated fresh at inject time
}

// Helper – percent of canvas size (1280 × 720)
const pw = (p: number) => Math.round(1280 * p);
const ph = (p: number) => Math.round(720  * p);

export const SLIDE_LAYOUTS: SlideLayout[] = [
  // ── 1. Blank ───────────────────────────────────────────────────────────────
  {
    id: 'blank', label: 'Blank', emoji: '⬜',
    description: 'Empty slide — start from scratch',
    preview: [],
    elements: [],
  },

  // ── 2. Title Only ──────────────────────────────────────────────────────────
  {
    id: 'title-only', label: 'Title Only', emoji: '🔤',
    description: 'A single centred title',
    preview: [
      { x: 10, y: 35, w: 80, h: 18, type: 'title' },
    ],
    elements: [
      {
        type: 'text', text: 'Slide Title',
        x: pw(0.1), y: ph(0.38), width: pw(0.8), height: ph(0.2),
        fontSize: 64, fontColor: '#ffffff', fontWeight: 'bold', textAlign: 'center',
      },
    ],
  },

  // ── 3. Title + Subtitle ────────────────────────────────────────────────────
  {
    id: 'title-subtitle', label: 'Title + Subtitle', emoji: '📋',
    description: 'Big title with a subtitle below',
    preview: [
      { x: 10, y: 25, w: 80, h: 16, type: 'title' },
      { x: 15, y: 55, w: 70, h:  9, type: 'text'  },
    ],
    elements: [
      {
        type: 'text', text: 'Presentation Title',
        x: pw(0.1), y: ph(0.22), width: pw(0.8), height: ph(0.22),
        fontSize: 60, fontColor: '#ffffff', fontWeight: 'bold', textAlign: 'center',
      },
      {
        type: 'text', text: 'Subtitle or author name',
        x: pw(0.15), y: ph(0.55), width: pw(0.7), height: ph(0.14),
        fontSize: 28, fontColor: '#94a3b8', textAlign: 'center',
      },
    ],
  },

  // ── 4. Title + Content ─────────────────────────────────────────────────────
  {
    id: 'title-content', label: 'Title + Content', emoji: '📄',
    description: 'Header bar with a large content area',
    preview: [
      { x: 0,  y: 0,  w: 100, h: 20, type: 'shape', dark: true },
      { x: 5,  y: 4,  w: 60,  h: 12, type: 'title' },
      { x: 5,  y: 26, w: 90,  h: 65, type: 'text'  },
    ],
    elements: [
      {
        type: 'shape', shapeType: 'rect',
        x: 0, y: 0, width: pw(1), height: ph(0.18),
        fill: '#1e3a5f',
      },
      {
        type: 'text', text: 'Section Title',
        x: pw(0.04), y: ph(0.03), width: pw(0.7), height: ph(0.13),
        fontSize: 40, fontColor: '#ffffff', fontWeight: 'bold',
      },
      {
        type: 'text', text: 'Add your content here…',
        x: pw(0.04), y: ph(0.24), width: pw(0.92), height: ph(0.68),
        fontSize: 24, fontColor: '#e2e8f0',
      },
    ],
  },

  // ── 5. Two Column ──────────────────────────────────────────────────────────
  {
    id: 'two-column', label: 'Two Column', emoji: '⬛⬛',
    description: 'Side-by-side content columns',
    preview: [
      { x: 5,  y: 5,  w: 90, h: 14, type: 'title' },
      { x: 5,  y: 24, w: 42, h: 68, type: 'text'  },
      { x: 53, y: 24, w: 42, h: 68, type: 'text'  },
    ],
    elements: [
      {
        type: 'text', text: 'Slide Title',
        x: pw(0.05), y: ph(0.04), width: pw(0.9), height: ph(0.14),
        fontSize: 40, fontColor: '#ffffff', fontWeight: 'bold',
      },
      {
        type: 'text', text: 'Left column content',
        x: pw(0.03), y: ph(0.22), width: pw(0.45), height: ph(0.7),
        fontSize: 22, fontColor: '#e2e8f0',
      },
      {
        type: 'text', text: 'Right column content',
        x: pw(0.52), y: ph(0.22), width: pw(0.45), height: ph(0.7),
        fontSize: 22, fontColor: '#e2e8f0',
      },
    ],
  },

  // ── 6. Title + Three Columns ───────────────────────────────────────────────
  {
    id: 'title-three-col', label: 'Three Columns', emoji: '▦',
    description: 'Title with three equal content columns',
    preview: [
      { x: 5,  y: 5,  w: 90, h: 14, type: 'title' },
      { x: 3,  y: 24, w: 28, h: 68, type: 'text'  },
      { x: 36, y: 24, w: 28, h: 68, type: 'text'  },
      { x: 69, y: 24, w: 28, h: 68, type: 'text'  },
    ],
    elements: [
      {
        type: 'text', text: 'Slide Title',
        x: pw(0.05), y: ph(0.04), width: pw(0.9), height: ph(0.14),
        fontSize: 40, fontColor: '#ffffff', fontWeight: 'bold',
      },
      {
        type: 'text', text: 'Column 1',
        x: pw(0.02), y: ph(0.22), width: pw(0.29), height: ph(0.7),
        fontSize: 20, fontColor: '#e2e8f0',
      },
      {
        type: 'text', text: 'Column 2',
        x: pw(0.355), y: ph(0.22), width: pw(0.29), height: ph(0.7),
        fontSize: 20, fontColor: '#e2e8f0',
      },
      {
        type: 'text', text: 'Column 3',
        x: pw(0.69), y: ph(0.22), width: pw(0.29), height: ph(0.7),
        fontSize: 20, fontColor: '#e2e8f0',
      },
    ],
  },

  // ── 7. Image Right ─────────────────────────────────────────────────────────
  {
    id: 'image-right', label: 'Image Right', emoji: '🖼️▶',
    description: 'Text on the left, image placeholder on the right',
    preview: [
      { x: 3,  y: 5,  w: 45, h: 14, type: 'title' },
      { x: 3,  y: 24, w: 45, h: 68, type: 'text'  },
      { x: 52, y: 5,  w: 45, h: 90, type: 'image' },
    ],
    elements: [
      {
        type: 'text', text: 'Slide Title',
        x: pw(0.03), y: ph(0.05), width: pw(0.45), height: ph(0.15),
        fontSize: 38, fontColor: '#ffffff', fontWeight: 'bold',
      },
      {
        type: 'text', text: 'Describe your image here…',
        x: pw(0.03), y: ph(0.25), width: pw(0.45), height: ph(0.65),
        fontSize: 22, fontColor: '#e2e8f0',
      },
      {
        type: 'shape', shapeType: 'rect',
        x: pw(0.52), y: ph(0.05), width: pw(0.45), height: ph(0.88),
        fill: '#1e293b', opacity: 0.8,
      },
    ],
  },

  // ── 8. Image Left ──────────────────────────────────────────────────────────
  {
    id: 'image-left', label: 'Image Left', emoji: '◀🖼️',
    description: 'Image placeholder on the left, text on the right',
    preview: [
      { x: 3,  y: 5,  w: 45, h: 90, type: 'image' },
      { x: 52, y: 5,  w: 45, h: 14, type: 'title' },
      { x: 52, y: 24, w: 45, h: 68, type: 'text'  },
    ],
    elements: [
      {
        type: 'shape', shapeType: 'rect',
        x: pw(0.03), y: ph(0.05), width: pw(0.45), height: ph(0.88),
        fill: '#1e293b', opacity: 0.8,
      },
      {
        type: 'text', text: 'Slide Title',
        x: pw(0.52), y: ph(0.05), width: pw(0.45), height: ph(0.15),
        fontSize: 38, fontColor: '#ffffff', fontWeight: 'bold',
      },
      {
        type: 'text', text: 'Describe your image here…',
        x: pw(0.52), y: ph(0.25), width: pw(0.45), height: ph(0.65),
        fontSize: 22, fontColor: '#e2e8f0',
      },
    ],
  },

  // ── 9. Big Quote ───────────────────────────────────────────────────────────
  {
    id: 'big-quote', label: 'Big Quote', emoji: '💬',
    description: 'Full-slide pull quote with attribution',
    preview: [
      { x: 10, y: 20, w: 80, h: 40, type: 'title' },
      { x: 30, y: 70, w: 40, h:  9, type: 'text'  },
    ],
    elements: [
      {
        type: 'text', text: '"Your inspiring quote goes here."',
        x: pw(0.08), y: ph(0.15), width: pw(0.84), height: ph(0.55),
        fontSize: 48, fontColor: '#f1f5f9', fontWeight: 'bold', textAlign: 'center',
      },
      {
        type: 'text', text: '— Attribution',
        x: pw(0.25), y: ph(0.72), width: pw(0.5), height: ph(0.12),
        fontSize: 24, fontColor: '#94a3b8', textAlign: 'center',
      },
    ],
  },

  // ── 10. Section Header ─────────────────────────────────────────────────────
  {
    id: 'section-header', label: 'Section Header', emoji: '🔖',
    description: 'Bold coloured divider slide between sections',
    preview: [
      { x: 0, y: 0, w: 100, h: 100, type: 'shape', dark: true },
      { x: 8, y: 35, w: 84, h: 22,  type: 'title' },
      { x: 8, y: 62, w: 84, h: 10,  type: 'text'  },
    ],
    elements: [
      {
        type: 'shape', shapeType: 'rect',
        x: 0, y: 0, width: pw(1), height: ph(1),
        fill: '#1e40af',
      },
      {
        type: 'text', text: 'Section Title',
        x: pw(0.08), y: ph(0.32), width: pw(0.84), height: ph(0.24),
        fontSize: 64, fontColor: '#ffffff', fontWeight: 'bold', textAlign: 'center',
      },
      {
        type: 'text', text: 'Optional subtitle or section number',
        x: pw(0.08), y: ph(0.62), width: pw(0.84), height: ph(0.12),
        fontSize: 24, fontColor: '#bfdbfe', textAlign: 'center',
      },
    ],
  },

  // ── 11. Title + Bullets ────────────────────────────────────────────────────
  {
    id: 'title-bullets', label: 'Title + Bullets', emoji: '📝',
    description: 'Title with a bulleted list body',
    preview: [
      { x: 5,  y: 5,  w: 90, h: 16, type: 'title' },
      { x: 8,  y: 26, w: 84, h: 66, type: 'text'  },
    ],
    elements: [
      {
        type: 'text', text: 'Slide Title',
        x: pw(0.05), y: ph(0.04), width: pw(0.9), height: ph(0.16),
        fontSize: 44, fontColor: '#ffffff', fontWeight: 'bold',
      },
      {
        type: 'text',
        text: '• First bullet point\n• Second bullet point\n• Third bullet point\n• Fourth bullet point',
        x: pw(0.07), y: ph(0.25), width: pw(0.86), height: ph(0.66),
        fontSize: 26, fontColor: '#e2e8f0',
      },
    ],
  },

  // ── 12. Full Image ─────────────────────────────────────────────────────────
  {
    id: 'full-image', label: 'Full Image', emoji: '🌅',
    description: 'Full-bleed image placeholder with caption overlay',
    preview: [
      { x: 0,  y: 0,  w: 100, h: 100, type: 'image' },
      { x: 5,  y: 75, w: 90,  h: 20,  type: 'title' },
    ],
    elements: [
      {
        type: 'shape', shapeType: 'rect',
        x: 0, y: 0, width: pw(1), height: ph(1),
        fill: '#0f172a', opacity: 0.6,
      },
      {
        type: 'text', text: 'Caption or title overlay',
        x: pw(0.05), y: ph(0.75), width: pw(0.9), height: ph(0.18),
        fontSize: 36, fontColor: '#ffffff', fontWeight: 'bold', textAlign: 'center',
      },
    ],
  },
];