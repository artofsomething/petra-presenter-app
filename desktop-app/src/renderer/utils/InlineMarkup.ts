// src/renderer/utils/InlineMarkup.ts

export type InlineStyle = {
  bold?:          boolean;
  italic?:        boolean;
  underline?:     boolean;
  strikethrough?: boolean;
  code?:          boolean;
  color?:         string;
};

export interface TextSegment {
  text:  string;
  style: InlineStyle;
}

export interface TextLine {
  segments: TextSegment[];
}

// ── Token patterns (order matters — longer tokens first) ─────────────────────
const TOKENS: Array<{ re: RegExp; style: InlineStyle }> = [
  { re: /^\*\*(.+?)\*\*/, style: { bold: true }         },
  { re: /^\*(.+?)\*/,     style: { italic: true }        },
  { re: /^__(.+?)__/,     style: { underline: true }     },
  { re: /^~~(.+?)~~/,     style: { strikethrough: true } },
  { re: /^`(.+?)`/,       style: { code: true }          },
];

// ✅ Correct square-bracket escaping
const COLOR_RE = /^$$color:([^$$]+)\](.+?)$$\/color$$/;

export function parseLine(line: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    // Color tag
    const colorMatch = remaining.match(COLOR_RE);
    if (colorMatch) {
      const [full, color, text] = colorMatch;
      if (text) segments.push({ text, style: { color } });
      remaining = remaining.slice(full.length);
      continue;
    }

    // Styled tokens
    let matched = false;
    for (const token of TOKENS) {
      const m = remaining.match(token.re);
      if (m) {
        const [full, inner] = m;
        if (inner) segments.push({ text: inner, style: { ...token.style } });
        remaining = remaining.slice(full.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Plain character
    const lastSeg = segments[segments.length - 1];
    if (lastSeg && Object.keys(lastSeg.style).length === 0) {
      lastSeg.text += remaining[0];
    } else {
      segments.push({ text: remaining[0], style: {} });
    }
    remaining = remaining.slice(1);
  }

  return segments.filter(s => s.text.length > 0);
}

export function parseInlineMarkup(text: string): TextLine[] {
  return text
    .split('\n')
    .map(line => ({ segments: parseLine(line) }));
}

export function stripInlineMarkup(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g,               '\$1')
    .replace(/\*(.+?)\*/g,                    '\$1')
    .replace(/__(.+?)__/g,                    '\$1')
    .replace(/~~(.+?)~~/g,                    '\$1')
    .replace(/`(.+?)`/g,                      '\$1')
    .replace(/$$color:[^$$]+\](.+?)$$\/color$$/g, '\$1');  // ✅
}

export function hasInlineMarkup(text: string): boolean {
  return (
    /\*\*.+?\*\*/.test(text)                  ||
    /\*.+?\*/.test(text)                       ||
    /__(.+?)__/.test(text)                     ||
    /~~.+?~~/.test(text)                       ||
    /`.+?`/.test(text)                         ||
    /$$color:[^$$]+\].+?$$\/color$$/.test(text)   // ✅
  );
}