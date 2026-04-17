export interface ContentBlock {
  subtitle?: string;   // ## before the text in this block
  text:      string;   // body lines of this block
}

export interface ParsedSlide {
  title?:  string;
  blocks:  ContentBlock[];   // replaces flat `contents: string[]`
}

/**
 * Syntax:
 *
 *   # Title              ← optional slide title
 *   ## Subtitle          ← optional subtitle for first block
 *   First content block
 *   - bullet
 *
 *   --                   ← new block (can have its own ## subtitle)
 *   ## Subtitle 2
 *   Second block
 *
 *   ---                  ← new slide
 *
 *   # Next Slide
 *   ## Centred subtitle  ← no body → title + subtitle centred
 */
export function parseSlideMarkup(input: string): ParsedSlide[] {
  if (!input?.trim()) return [];

  const normalized = input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const slideBlocks = normalized
    .split(/^---+\s*$/m)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  console.log('[parseSlideMarkup] slide blocks:', slideBlocks.length);

  return slideBlocks
    .map((block, i) => parseSlideBlock(block, i))
    .filter(s => s.title || s.blocks.length > 0);
}

// ── Parse one slide block ─────────────────────────────────────────────────────
function parseSlideBlock(block: string, index: number): ParsedSlide {
  // Split into sections on -- (2 dashes, not 3)
  const sections = block
    .split(/^--(?!-)\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let title: string | undefined;
  const blocks: ContentBlock[] = [];

  sections.forEach((section, si) => {
    const lines = section
      .split('\n')
      .map(l => l.trimEnd());

    // ── Title: only in the very first section ─────────────────────────────
    if (si === 0) {
      const titleIdx = lines.findIndex(l => /^# (?!#)/.test(l));
      if (titleIdx !== -1) {
        title = lines[titleIdx].slice(2).trim() || undefined;
        lines.splice(titleIdx, 1);
      }
    }

    // ── Subtitle: any section can have its own ## line ─────────────────────
    // Always take the FIRST ## line found in this section
    let subtitle: string | undefined;
    const subIdx = lines.findIndex(l => l.startsWith('## '));
    if (subIdx !== -1) {
      subtitle = lines[subIdx].slice(3).trim() || undefined;
      lines.splice(subIdx, 1);
    }

    // ── Body text ─────────────────────────────────────────────────────────
    // Trim blank lines from edges
    while (lines.length > 0 && !lines[0].trim())               lines.shift();
    while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();

    const text = lines.join('\n').trim();

    // Only push a block if it has a subtitle OR body text
    if (subtitle || text) {
      blocks.push({ subtitle, text });
    }
  });

  console.log(
    `[parseSlideMarkup] block ${index} — title:"${title}" blocks:${blocks.length}`,
    blocks.map(b => `sub:"${b.subtitle}" text:${b.text.length}ch`),
  );

  return { title, blocks };
}

// ── Legacy migration ──────────────────────────────────────────────────────────
export function migrateLegacyMarkup(input: string): string {
  const legacySlide = /$$slide$$([\s\S]*?)$$\/slide$$/gi;
  const parts: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = legacySlide.exec(input)) !== null) {
    const block    = match[1];
    const title    = extractLegacyTag(block, 'title');
    const subtitle = extractLegacyTag(block, 'subtitle');
    const content  = extractLegacyTag(block, 'content');

    const lines: string[] = [];
    if (title)    lines.push(`# ${title}`);
    if (subtitle) lines.push(`## ${subtitle}`);
    if (content)  lines.push(content);
    parts.push(lines.join('\n'));
  }

  return parts.join('\n\n---\n\n');
}

function extractLegacyTag(text: string, tag: string): string | undefined {
  const re = new RegExp(`\$$${tag}\$$([\\s\\S]*?)\$$\\/${tag}\$$`, 'i');
  return text.match(re)?.[1]?.trim() || undefined;
}