// src/renderer/utils/slideParser.ts

export interface ParsedSlide {
  title?:    string;
  contents:  string[];   // ← was content?: string, now array of blocks
}

/**
 * Syntax:
 *
 *   # Title              ← optional
 *   First content block
 *   - bullet
 *
 *   --                   ← new content block (within same slide)
 *   Second block
 *
 *   ---                  ← new slide
 *
 *   # Next Slide
 *   Content
 *   --
 *   Another block
 */
export function parseSlideMarkup(input: string): ParsedSlide[] {
  if (!input?.trim()) return [];

  const normalized = input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // ── Split into slide blocks on --- (3+ dashes) ────────────────────────────
  const slideBlocks = normalized
    .split(/^---+\s*$/m)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  console.log('[parseSlideMarkup] slide blocks:', slideBlocks.length);

  return slideBlocks
    .map((block, i) => parseBlock(block, i))
    .filter(s => s.title || s.contents.length > 0);
}

// ── Parse one slide block ─────────────────────────────────────────────────────
function parseBlock(block: string, index: number): ParsedSlide {
  // Split on -- (2 dashes, NOT 3) to get content sections
  // (?<!-) negative lookbehind so --- doesn't match
  const sections = block
    .split(/^--(?!-)\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let title: string | undefined;
  const contents: string[] = [];

  for (let si = 0; si < sections.length; si++) {
    const lines = sections[si]
      .split('\n')
      .map(l => l.trimEnd());

    // Only the FIRST section can contain the title (#)
    if (si === 0) {
      const titleLineIdx = lines.findIndex(l => l.startsWith('# '));
      if (titleLineIdx !== -1) {
        title = lines[titleLineIdx].slice(2).trim() || undefined;
        // Remove title line, keep rest as content
        lines.splice(titleLineIdx, 1);
      }
    }

    // Trim blank lines from edges
    while (lines.length > 0 && !lines[0].trim())        lines.shift();
    while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();

    const content = lines.join('\n').trim();
    if (content) contents.push(content);
  }

  console.log(
    `[parseSlideMarkup] block ${index} — title: "${title}" blocks: ${contents.length}`
  );

  return { title, contents };
}

// ── Legacy migration ──────────────────────────────────────────────────────────
export function migrateLegacyMarkup(input: string): string {
  const legacySlide = /$$slide$$([\s\S]*?)$$\/slide$$/gi;
  const blocks: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = legacySlide.exec(input)) !== null) {
    const block   = match[1];
    const title   = extractLegacyTag(block, 'title');
    const content = extractLegacyTag(block, 'content');

    const lines: string[] = [];
    if (title)   lines.push(`# ${title}`);
    if (content) lines.push(content);
    blocks.push(lines.join('\n'));
  }

  return blocks.join('\n\n---\n\n');
}

function extractLegacyTag(text: string, tag: string): string | undefined {
  const re = new RegExp(`\$$${tag}\$$([\\s\\S]*?)\$$\\/${tag}\$$`, 'i');
  return text.match(re)?.[1]?.trim() || undefined;
}