// src/renderer/utils/slideParser.ts

export interface ParsedSlide {
  title?:   string;
  content?: string;
}

// ── Extract text between two tags ─────────────────────────────────────────────
function extractTag(text: string, tag: string): string | undefined {
  const open  = `[${tag}]`;
  const close = `[/${tag}]`;

  const start = text.toLowerCase().indexOf(open.toLowerCase());
  if (start === -1) return undefined;

  const contentStart = start + open.length;
  const end = text.toLowerCase().indexOf(close.toLowerCase(), contentStart);
  if (end === -1) return undefined;

  return text.substring(contentStart, end).trim() || undefined;
}

// ── Split into [slide] blocks ─────────────────────────────────────────────────
function splitSlideBlocks(input: string): string[] {
  const blocks: string[] = [];
  const lower = input.toLowerCase();

  const openTag  = '[slide]';
  const closeTag = '[/slide]';

  let searchFrom = 0;

  while (true) {
    const openIdx = lower.indexOf(openTag, searchFrom);
    if (openIdx === -1) break;

    const contentStart = openIdx + openTag.length;
    const closeIdx = lower.indexOf(closeTag, contentStart);

    if (closeIdx === -1) {
      // Unclosed [slide] — grab everything to end
      const block = input.substring(contentStart).trim();
      if (block) blocks.push(block);
      break;
    }

    const block = input.substring(contentStart, closeIdx).trim();
    if (block) blocks.push(block);

    searchFrom = closeIdx + closeTag.length;
  }

  return blocks;
}

// ── Main parser ───────────────────────────────────────────────────────────────
export function parseSlideMarkup(input: string): ParsedSlide[] {
  if (!input || !input.trim()) return [];

  // Normalize line endings
  const normalized = input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const blocks = splitSlideBlocks(normalized);

  console.log('[parseSlideMarkup] blocks found:', blocks.length);
  blocks.forEach((b, i) => console.log(`Block ${i}:`, b.substring(0, 80)));

  const slides: ParsedSlide[] = [];

  for (const block of blocks) {
    const title   = extractTag(block, 'title');
    const content = extractTag(block, 'content');

    console.log('[parseSlideMarkup] title:', title);
    console.log('[parseSlideMarkup] content:', content?.substring(0, 40));

    if (title || content) {
      slides.push({ title, content });
    }
  }

  return slides;
}