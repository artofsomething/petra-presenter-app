// src/renderer/utils/textFormatter.ts

export type ListStyle = 'none' | 'bullet' | 'numbered';

// ── Apply list formatting to raw text ─────────────────────────────────────────
export function applyListFormat(
  text:     string,
  listType: ListStyle,
): string {
  if (!text || listType === 'none') return text;

  const lines = text.split('\n');

  if (listType === 'bullet') {
    return lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      // Already has bullet — don't double-add
      if (trimmed.startsWith('• ') || trimmed.startsWith('◦ ')) return line;
      return `• ${trimmed}`;
    }).join('\n');
  }

  if (listType === 'numbered') {
    let num = 1;
    return lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      // Already numbered — don't double-add
      if (/^\d+\.\s/.test(trimmed)) return line;
      return `${num++}. ${trimmed}`;
    }).join('\n');
  }

  return text;
}

// ── Strip list formatting from text ───────────────────────────────────────────
export function stripListFormat(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      // Strip bullet
      if (line.startsWith('• '))  return line.slice(2);
      if (line.startsWith('◦ '))  return line.slice(2);
      // Strip numbered
      return line.replace(/^\d+\.\s/, '');
    })
    .join('\n');
}

// ── Format display text (existing — keep as is) ───────────────────────────────
export function formatDisplayText(raw: string): string {
  if (!raw) return raw;

  const lines = raw.split('\n');

  const processed = lines.map((line) => {
    if (/^(\s{2,}|\t)[*-]\s/.test(line)) {
      return line.replace(/^(\s{2,}|\t)[*-]\s/, '    ◦ ');
    }
    if (/^\*\s/.test(line)) return line.replace(/^\*\s/, '• ');
    if (/^-\s/.test(line))  return line.replace(/^-\s/, '• ');
    return line;
  });

  return processed.join('\n');
}