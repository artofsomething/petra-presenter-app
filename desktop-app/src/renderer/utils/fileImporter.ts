// src/renderer/utils/fileImporter.ts

export type ImportFileType = 'pdf' | 'docx';

export interface ImportResult {
  markup:     string;
  slideCount: number;
  fileType:   ImportFileType;
  fileName:   string;
}

// ── HTML → Sections (for DOCX) ───────────────────────────────────────────────

interface DocxSection {
  heading?:      string;
  headingLevel?: number;
  paragraphs:    string[];
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function parseHtmlToSections(html: string): DocxSection[] {
  const sections: DocxSection[] = [];
  const parts = html.split(/(?=<h[123][^>]*>)/i);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^<h([123])[^>]*>([\s\S]*?)<\/h[123]>/i);
    const section: DocxSection = { paragraphs: [] };
    let bodyHtml = trimmed;

    if (headingMatch) {
      section.headingLevel = parseInt(headingMatch[1], 10);
      section.heading = stripHtmlTags(headingMatch[2]).trim();
      bodyHtml = trimmed.slice(headingMatch[0].length);
    }

    const pMatches = bodyHtml.matchAll(/<(?:p|li)[^>]*>([\s\S]*?)<\/(?:p|li)>/gi);
    for (const m of pMatches) {
      const text = stripHtmlTags(m[1]).trim();
      if (text) section.paragraphs.push(text);
    }

    if (section.paragraphs.length === 0) {
      const plainText = stripHtmlTags(bodyHtml).trim();
      if (plainText) section.paragraphs.push(plainText);
    }

    if (section.heading || section.paragraphs.length > 0) {
      sections.push(section);
    }
  }

  return sections;
}

// ── PDF Pages → Markup ────────────────────────────────────────────────────────

function pdfPagesToMarkup(pages: string[]): string {
  const slideStrings: string[] = [];

  for (const page of pages) {
    if (!page.trim()) continue;
    const lines = page.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const slideLines: string[] = [];
    const firstLine = lines[0];

    const isLikelyTitle =
      firstLine.length < 80 &&
      lines.length > 1 &&
      !firstLine.startsWith('-') &&
      !firstLine.startsWith('•') &&
      !firstLine.startsWith('*');

    if (isLikelyTitle) {
      slideLines.push(`# ${firstLine}`);
      lines.shift();
    }

    let currentBlock: string[] = [];
    let currentSubtitle: string | undefined;

    for (const line of lines) {
      const isSubheading =
        (line.length < 60 && line === line.toUpperCase() && line.length > 3) ||
        (line.endsWith(':') && line.length < 80);

      if (isSubheading && currentBlock.length > 0) {
        if (currentSubtitle) slideLines.push(`## ${currentSubtitle}`);
        slideLines.push(currentBlock.join('\n'));
        slideLines.push('--');
        currentBlock = [];
        currentSubtitle = line.replace(/:$/, '').trim();
      } else if (isSubheading && currentBlock.length === 0) {
        currentSubtitle = line.replace(/:$/, '').trim();
      } else {
        const bulletLine = line
          .replace(/^[•●■◆▪→]\s*/, '- ')
          .replace(/^\*\s+/, '- ');
        currentBlock.push(bulletLine);
      }
    }

    if (currentSubtitle) slideLines.push(`## ${currentSubtitle}`);
    if (currentBlock.length > 0) slideLines.push(currentBlock.join('\n'));

    slideStrings.push(slideLines.join('\n'));
  }

  return slideStrings.join('\n\n---\n\n');
}

// ── DOCX Sections → Markup ──────────────────────────────────────────────────

function docxSectionsToMarkup(sections: DocxSection[]): string {
  const slideStrings: string[] = [];
  let currentSlideLines: string[] = [];

  for (const section of sections) {
    if (section.headingLevel === 1) {
      if (currentSlideLines.length > 0) {
        slideStrings.push(currentSlideLines.join('\n'));
        currentSlideLines = [];
      }
      if (section.heading) currentSlideLines.push(`# ${section.heading}`);
      if (section.paragraphs.length > 0) {
        currentSlideLines.push(section.paragraphs.join('\n'));
      }
    } else if (section.headingLevel === 2 || section.headingLevel === 3) {
      if (currentSlideLines.length > 0 &&
          currentSlideLines.some(l => !l.startsWith('#'))) {
        currentSlideLines.push('--');
      }
      if (section.heading) currentSlideLines.push(`## ${section.heading}`);
      if (section.paragraphs.length > 0) {
        currentSlideLines.push(section.paragraphs.join('\n'));
      }
    } else {
      if (currentSlideLines.length === 0 &&
          section.paragraphs.length > 0 &&
          section.paragraphs[0].length < 80) {
        currentSlideLines.push(`# ${section.paragraphs[0]}`);
        const rest = section.paragraphs.slice(1);
        if (rest.length > 0) currentSlideLines.push(rest.join('\n'));
      } else {
        currentSlideLines.push(section.paragraphs.join('\n'));
      }
    }
  }

  if (currentSlideLines.length > 0) {
    slideStrings.push(currentSlideLines.join('\n'));
  }

  if (slideStrings.length === 1) {
    return splitLongSlide(slideStrings[0]);
  }

  return slideStrings.join('\n\n---\n\n');
}

function splitLongSlide(markup: string, maxLines: number = 8): string {
  const lines = markup.split('\n').filter(l => l.trim().length > 0);
  if (lines.length <= maxLines) return markup;

  const slides: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    current.push(line);
    if (current.length >= maxLines) {
      slides.push([...current]);
      current = [];
    }
  }
  if (current.length > 0) slides.push(current);

  return slides
    .map(slideLines => {
      if (!slideLines[0].startsWith('# ')) {
        slideLines[0] = `# ${slideLines[0]}`;
      }
      return slideLines.join('\n');
    })
    .join('\n\n---\n\n');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Opens file dialog → reads & parses in main process → converts to markup
 * in renderer. NO Buffer needed in renderer.
 */
export async function importPresentationFile(): Promise<ImportResult | null> {
  // 1. Open file dialog using existing API
  const fileResult = await window.electronAPI.openFileDialog([
    { name: 'Presentation Files', extensions: ['pdf', 'docx','doc'] },
    { name: 'PDF Files',          extensions: ['pdf'] },
    { name: 'Word Documents',     extensions: ['docx','doc'] },
  ]);

  if (!fileResult || fileResult.error || !fileResult.filePath || !fileResult.fileName) {
    return null;
  }

  const { filePath, fileName } = fileResult;

  // 2. Main process does the heavy lifting (reads binary, parses PDF/DOCX)
  const result = await window.electronAPI.importPresentationFile(filePath);

  if (!result || !result.success) {
    throw new Error(result?.error || 'Failed to parse file');
  }

  // 3. Convert extracted data → your slide markup format (runs in renderer)
  let markup: string;

  if (result.fileType === 'pdf' && result.pages) {
    console.log(`[importFile] PDF: ${result.pages.length} pages extracted`);
    markup = pdfPagesToMarkup(result.pages);
  } else if (result.fileType === 'docx' && result.html) {
    console.log(`[importFile] DOCX: ${result.html.length} chars of HTML`);
    const sections = parseHtmlToSections(result.html);
    console.log(`[importFile] DOCX: ${sections.length} sections parsed`);
    markup = docxSectionsToMarkup(sections);
  } else {
    throw new Error('No content extracted from file');
  }

  const slideCount = (markup.match(/^---+\s*$/gm)?.length ?? 0) + 1;

  console.log('[importFile] Generated markup:\n', markup);
  console.log(`[importFile] Slide count: ${slideCount}`);

  return {
    markup,
    slideCount,
    fileType: result.fileType as ImportFileType,
    fileName,
  };
}