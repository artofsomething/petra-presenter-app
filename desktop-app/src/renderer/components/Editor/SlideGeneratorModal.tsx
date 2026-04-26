// src/renderer/components/Editor/SlideGeneratorModal.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { parseSlideMarkup, migrateLegacyMarkup } from '../../utils/slideParser';
import { generateSlides }    from '../../utils/slideGenerator';
import type { GeneratedSlide } from '../../utils/slideGenerator';
import { importPresentationFile } from '../../utils/fileImporter';
import BibleLookupPanel from './BibleLookupPanel';

interface SlideGeneratorModalProps {
  onClose:           () => void;
  onGenerate:        (slides: GeneratedSlide[]) => void;
  currentSlideCount: number;
  initialMarkup?:    string;   // ✅ NEW — pre-fill from import
}

const EXAMPLE = `# Sermon Title
## Passage: John 3:16
Introduction text here
- bullet point

--

## Point 1: The Setup
Second block with its own subtitle
- another bullet
- more detail

--

## Point 2: The Resolution
Third block
- final bullet

---

# Section Divider
## No body content → centred automatically

---

Just content, no title, no subtitle.
Some opening quote or verse here.`;

const SlideGeneratorModal: React.FC<SlideGeneratorModalProps> = ({
  onClose,
  onGenerate,
  currentSlideCount,
  initialMarkup,
}) => {
  const [input,          setInput]          = useState(initialMarkup ?? '');
  const [preview,        setPreview]        = useState<ReturnType<typeof parseSlideMarkup>>([]);
  const [error,          setError]          = useState('');
  const [tab,            setTab]            = useState<'input' | 'preview'>('input');
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [isImporting,    setIsImporting]    = useState(false);
  const [importError,    setImportError]    = useState<string | null>(null);
  

  const [showBible, setShowBible] = useState(false);

  // ✅ If initialMarkup is provided later (e.g., from import), update input
  useEffect(() => {
    if (initialMarkup) {
      setInput(initialMarkup);
      setError('');
    }
  }, [initialMarkup]);

  const handleBibleInsert = useCallback((slideMarkup: string) => {
  setInput(prev => {
    if (!prev.trim()) return slideMarkup;
    // Append with slide separator
    return prev.trimEnd() + '\n\n---\n\n' + slideMarkup;
  });
  setError('');
  setShowBible(false);
}, []);

  function sanitizeInput(raw: string): string {
    return raw
      .replace(/\u200B/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  const handleChange = useCallback((raw: string) => {
    const sanitized = sanitizeInput(raw);
    const converted = /$$slide$$/i.test(sanitized)
      ? migrateLegacyMarkup(sanitized)
      : sanitized;
    setInput(converted);
    setError('');
  }, []);

  const parsedSlides = parseSlideMarkup(input);
  const parsedCount  = parsedSlides.length;

  const totalBlocks   = parsedSlides.reduce((s, sl) => s + sl.blocks.length, 0);
  const centredSlides = parsedSlides.filter(sl => sl.blocks.every(b => !b.text));
  const subtitleCount = parsedSlides.reduce(
    (s, sl) => s + sl.blocks.filter(b => b.subtitle).length, 0,
  );

  const handlePreview = useCallback(() => {
    if (!input.trim()) { setError('Please enter some slide content.'); return; }
    const parsed = parseSlideMarkup(input);
    if (parsed.length === 0) {
      setError(
        'No slides found. Separate slides with --- on its own line,\n' +
        'or start a line with # for a title.'
      );
      return;
    }
    setError('');
    setPreview(parsed);
    setTab('preview');
  }, [input]);

  const handleGenerate = useCallback(() => {
    const parsed = parseSlideMarkup(input);
    if (parsed.length === 0) return;
    const slides = generateSlides(parsed, currentSlideCount + 1);
    onGenerate(slides);
    onClose();
  }, [input, currentSlideCount, onGenerate, onClose]);

  const handleExample = useCallback(() => {
    setInput(EXAMPLE);
    setError('');
  }, []);

  // ✅ NEW — Import PDF/DOCX and populate textarea
  const handleImportFile = useCallback(async () => {
    setIsImporting(true);
    setImportError(null);

    try {
      const result = await importPresentationFile();

      if (!result) {
        // User cancelled
        setIsImporting(false);
        return;
      }

      // Populate the textarea with the generated markup
      setInput(result.markup);
      setError('');
      setTab('input');

      console.log(
        `[SlideGenerator] Imported ${result.fileName}: ${result.slideCount} slides detected`
      );
    } catch (err: any) {
      console.error('[SlideGenerator] Import error:', err);
      setImportError(err.message || 'Failed to import file');
    } finally {
      setIsImporting(false);
    }
  }, []);

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerTitle}>⚡ Generate Slides</span>
            <span style={styles.headerSub}>Type, paste, or import from PDF / DOCX</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === 'input'   ? styles.tabActive : {}) }}
            onClick={() => setTab('input')}
          >✏️ Input</button>
          <button
            style={{ ...styles.tab, ...(tab === 'preview' ? styles.tabActive : {}) }}
            onClick={() => setTab('preview')}
          >
            👁 Preview
            {preview.length > 0 && (
              <span style={styles.tabBadge}>{preview.length}</span>
            )}
          </button>
          <div style={{ flex: 1 }} />

          <button
            style={styles.bibleBtn}
            onClick={() => setShowBible(true)}
            title="Cari ayat Alkitab"
          >
            📖 Alkitab
          </button>

          {/* ✅ NEW — Import button in tabs bar */}
          <button
            style={{
              ...styles.importBtn,
              ...(isImporting ? styles.importBtnLoading : {}),
            }}
            onClick={handleImportFile}
            disabled={isImporting}
            title="Import a PDF or Word document"
          >
            {isImporting ? (
              <>
                <span style={styles.spinner}>⏳</span>
                Importing...
              </>
            ) : (
              <>📄 Import File</>
            )}
          </button>

          <button style={styles.exampleBtn} onClick={handleExample}>
            📋 Load Example
          </button>
        </div>

        {/* ✅ Import error banner */}
        {importError && (
          <div style={styles.importErrorBanner}>
            <span>⚠️ Import failed: {importError}</span>
            <button
              style={styles.importErrorDismiss}
              onClick={() => setImportError(null)}
            >✕</button>
          </div>
        )}

        {/* ════════ INPUT TAB ════════ */}
        {tab === 'input' && (
          <div style={styles.body}>

            {/* ── Cheat sheet ─────────────────────────────────────────────── */}
            <div style={styles.cheatSheet}>
              <button
                style={styles.cheatToggle}
                onClick={() => setShowCheatSheet(v => !v)}
              >
                <span style={styles.cheatToggleLeft}>
                  <span style={styles.cheatToggleIcon}>
                    {showCheatSheet ? '▾' : '▸'}
                  </span>
                  <span style={styles.cheatToggleTitle}>Format Guide</span>
                  {!showCheatSheet && (
                    <span style={styles.cheatToggleHints}>
                      {[
                        ['#',    'title'],
                        ['##',   'subtitle (per block)'],
                        ['--',   'new block'],
                        ['---',  'new slide'],
                        ['-',    'bullet'],
                      ].map(([sym, label], k) => (
                        <React.Fragment key={k}>
                          {k > 0 && <span style={styles.hintDot}>·</span>}
                          <code style={styles.inlineCode}>{sym}</code>
                          <span style={styles.hintSep}>{label}</span>
                        </React.Fragment>
                      ))}
                    </span>
                  )}
                </span>
                <span style={styles.cheatToggleCta}>
                  {showCheatSheet ? 'Collapse ▴' : 'Show example ▾'}
                </span>
              </button>

              {showCheatSheet && (
                <div style={styles.cheatBody}>
                  <div style={styles.symbolRow}>
                    {[
                      { symbol: '#',   color: '#7dd3fc', label: 'Title',
                        desc: 'Slide title — only in first section' },
                      { symbol: '##',  color: '#c4b5fd', label: 'Subtitle',
                        desc: 'Each -- block can have its own ## subtitle' },
                      { symbol: '--',  color: '#f9a8d4', label: 'New block',
                        desc: 'Splits content into separate text elements' },
                      { symbol: '---', color: '#fcd34d', label: 'New slide',
                        desc: '3+ dashes starts a new slide' },
                      { symbol: '-',   color: '#86efac', label: 'Bullet',
                        desc: 'Lines starting with - become bullet points' },
                    ].map(({ symbol, color, label, desc }) => (
                      <div key={symbol} style={styles.symbolItem} title={desc}>
                        <code style={{ ...styles.symbolCode, color }}>{symbol}</code>
                        <span style={styles.symbolLabel}>{label}</span>
                      </div>
                    ))}
                  </div>

                  <pre style={styles.cheatPre}>{
`# Sermon Title             ← slide title (bold, large)
## Passage: John 3:16      ← subtitle for block 1
Introduction text here
- bullet point

--                         ← new block, same slide

## Point 1: The Cause      ← each block has its own subtitle!
Content for block 2
- another bullet

---                        ← new slide

# Section Divider          ← title only
## No body → centred       ← subtitle only → centred on canvas`
                  }</pre>

                  <div style={styles.layoutHint}>
                    <span style={styles.layoutHintIcon}>💡</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={styles.layoutHintText}>
                        <strong style={{ color: '#c4b5fd' }}>## subtitle</strong> can
                        appear at the start of <em>any</em> block — each{' '}
                        <code style={styles.inlineCodeSmall}>--</code> section gets
                        its own subtitle rendered above that block's content.
                      </span>
                      <span style={styles.layoutHintText}>
                        Slides with <strong>only</strong> titles / subtitles and
                        no body text are <strong>centred</strong> on the canvas.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Textarea ────────────────────────────────────────────────── */}
            <textarea
              style={styles.textarea}
              value={input}
              onChange={e => handleChange(e.target.value)}
              placeholder={EXAMPLE}
              spellCheck={false}
              autoFocus
            />

            {/* ── Live feedback bar ────────────────────────────────────────── */}
            {input.trim() && !error && (
              <div style={{
                ...styles.feedbackBar,
                background:  parsedCount > 0 ? '#14532d33' : '#450a0a33',
                borderColor: parsedCount > 0 ? '#16a34a66' : '#dc262666',
              }}>
                {parsedCount > 0 ? (
                  <span style={{ color: '#4ade80', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>✅ {parsedCount} slide{parsedCount !== 1 ? 's' : ''}</span>
                    <span style={{ color: '#64748b' }}>·</span>
                    <span>{totalBlocks} block{totalBlocks !== 1 ? 's' : ''}</span>
                    {subtitleCount > 0 && (
                      <>
                        <span style={{ color: '#64748b' }}>·</span>
                        <span style={{ color: '#c4b5fd' }}>
                          {subtitleCount} subtitle{subtitleCount !== 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                    {centredSlides.length > 0 && (
                      <>
                        <span style={{ color: '#64748b' }}>·</span>
                        <span style={{ color: '#818cf8' }}>
                          {centredSlides.length} centred
                        </span>
                      </>
                    )}
                  </span>
                ) : (
                  <span style={{ color: '#f87171' }}>
                    ⚠️ No slides detected yet
                  </span>
                )}
              </div>
            )}

            {error && (
              <div style={styles.errorBox}>
                <span style={{ whiteSpace: 'pre-line' }}>⚠️ {error}</span>
                <button style={styles.errorDismiss} onClick={() => setError('')}>✕</button>
              </div>
            )}
          </div>
        )}

        {/* ════════ PREVIEW TAB ════════ */}
        {tab === 'preview' && (
          <div style={styles.body}>
            {preview.length === 0 ? (
              <div style={styles.emptyPreview}>
                <span style={{ fontSize: 40 }}>👁</span>
                <span style={{ color: '#475569', marginTop: 10, fontSize: 14 }}>
                  No preview yet
                </span>
                <span style={{ color: '#334155', fontSize: 12, marginTop: 4 }}>
                  Go to Input tab and click{' '}
                  <strong style={{ color: '#e2e8f0' }}>Preview</strong>
                </span>
              </div>
            ) : (
              <>
                <div style={styles.previewHeader}>
                  <span style={styles.previewCount}>
                    {preview.length} slide{preview.length !== 1 ? 's' : ''} ready
                  </span>
                  <button style={styles.backToInputBtn} onClick={() => setTab('input')}>
                    ← Edit
                  </button>
                </div>

                <div style={styles.previewList}>
                  {preview.map((slide, i) => {
                    const isCentred = slide.blocks.every(b => !b.text);
                    const totalBlockSubtitles = slide.blocks.filter(b => b.subtitle).length;

                    return (
                      <div key={i} style={styles.previewCard}>
                        <div
                          style={{
                            ...styles.thumbnail,
                            alignItems:     isCentred ? 'center' : 'flex-start',
                            justifyContent: isCentred ? 'center' : 'flex-start',
                          }}
                        >
                          <span style={styles.thumbIndex}>{i + 1}</span>
                          {isCentred && (
                            <span style={styles.centredBadge}>⊹ Centred</span>
                          )}
                          <div style={{
                            display: 'flex', flexDirection: 'column', gap: 6,
                            width: '100%',
                            alignItems: isCentred ? 'center' : 'flex-start',
                            textAlign:  isCentred ? 'center' : 'left',
                          }}>
                            {slide.title && (
                              <div style={styles.thumbTitle}>{slide.title}</div>
                            )}
                            {slide.blocks.map((block, bi) => (
                              <div
                                key={bi}
                                style={{
                                  ...styles.thumbBlock,
                                  borderLeft: bi > 0 && !isCentred ? '2px solid #1e3a5f' : 'none',
                                  paddingLeft: bi > 0 && !isCentred ? 8 : 0,
                                  marginTop: bi > 0 ? 4 : 0,
                                }}
                              >
                                {block.subtitle && (
                                  <div style={styles.thumbSubtitle}>{block.subtitle}</div>
                                )}
                                {block.text && (
                                  <div style={styles.thumbContent}>
                                    {block.text.split('\n').slice(0, 3).map((line, li) =>
                                      line.startsWith('- ') ? (
                                        <div key={li} style={styles.thumbBulletRow}>
                                          <span style={styles.thumbBulletDot}>•</span>
                                          <span>{line.slice(2)}</span>
                                        </div>
                                      ) : (
                                        <div key={li}>{line}</div>
                                      )
                                    )}
                                    {block.text.split('\n').length > 3 && (
                                      <span style={{ color: '#334155', fontSize: 9 }}>
                                        +{block.text.split('\n').length - 3} more lines…
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={styles.previewMeta}>
                          <span style={styles.slideNum}>Slide {i + 1}</span>
                          {slide.title && (
                            <span style={{ ...styles.tag, ...styles.tagTitle }}>📌 Title</span>
                          )}
                          {totalBlockSubtitles > 0 && (
                            <span style={{ ...styles.tag, ...styles.tagSubtitle }}>
                              💬 {totalBlockSubtitles} subtitle{totalBlockSubtitles !== 1 ? 's' : ''}
                            </span>
                          )}
                          {isCentred ? (
                            <span style={{ ...styles.tag, ...styles.tagCentred }}>⊹ Centred</span>
                          ) : slide.blocks.filter(b => b.text).length > 0 && (
                            <span style={{ ...styles.tag, ...styles.tagContent }}>
                              📝 {slide.blocks.filter(b => b.text).length} block
                              {slide.blocks.filter(b => b.text).length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div style={styles.footer}>
          <button style={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={styles.btnSecondary} onClick={handlePreview}>👁 Preview</button>
          <button
            style={{
              ...styles.btnPrimary,
              ...(parsedCount === 0 ? styles.btnDisabled : {}),
            }}
            onClick={handleGenerate}
            disabled={parsedCount === 0}
          >
            ⚡ Generate{' '}
            {parsedCount > 0
              ? `${parsedCount} Slide${parsedCount !== 1 ? 's' : ''}`
              : 'Slides'}
          </button>
        </div>
      </div>
      <BibleLookupPanel
          isOpen={showBible}
          onClose={() => setShowBible(false)}
          onInsert={handleBibleInsert}
        />
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.78)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    width: 740, maxHeight: '92vh', backgroundColor: '#1a1f2e',
    borderRadius: 12, border: '1px solid #2e3447',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 25px 60px rgba(0,0,0,0.65)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid #2e3447', flexShrink: 0,
  },
  headerLeft:  { display: 'flex', flexDirection: 'column', gap: 3 },
  headerTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: 700, lineHeight: 1 },
  headerSub:   { color: '#475569', fontSize: 11 },
  closeBtn: {
    background: 'transparent', border: 'none', color: '#8b92a5',
    fontSize: 18, cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
  },
  tabs: {
    display: 'flex', alignItems: 'center', gap: 2,
    padding: '8px 18px 0', borderBottom: '1px solid #2e3447', flexShrink: 0,
  },
  tab: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'transparent', border: 'none',
    borderBottom: '2px solid transparent', color: '#8b92a5',
    fontSize: 13, fontWeight: 500, padding: '6px 12px',
    cursor: 'pointer', marginBottom: -1, borderRadius: '4px 4px 0 0',
  },
  tabActive:  { color: '#e2e8f0', borderBottom: '2px solid #3d5afe' },
  tabBadge: {
    background: '#3d5afe', color: '#fff', fontSize: 10,
    fontWeight: 700, padding: '1px 6px', borderRadius: 10,
  },

  // ✅ NEW — Import button styles
  importBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: '#1e3a5f', border: '1px solid #2563eb',
    color: '#7dd3fc', fontSize: 11, fontWeight: 600,
    padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
    marginBottom: 4, transition: 'all 0.15s',
  },
  importBtnLoading: {
    background: '#1e293b', borderColor: '#334155',
    color: '#64748b', cursor: 'wait',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
  importErrorBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 18px', background: '#450a0a', borderBottom: '1px solid #7f1d1d',
    fontSize: 12, color: '#fca5a5', flexShrink: 0,
  },
  importErrorDismiss: {
    background: 'transparent', border: 'none', color: '#fca5a5',
    cursor: 'pointer', fontSize: 14, padding: '0 4px',
  },

  exampleBtn: {
    background: 'transparent', border: '1px solid #2e3447', color: '#8b92a5',
    fontSize: 11, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', marginBottom: 4,
  },
  body: {
    flex: 1, overflowY: 'auto', padding: 16,
    display: 'flex', flexDirection: 'column', gap: 10,
    minHeight: 0, height: '100%',
  },
  cheatSheet: {
    background: '#111827', border: '1px solid #2e3447',
    borderRadius: 8, overflow: 'hidden', flexShrink: 0,
  },
  cheatToggle: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', background: 'transparent', border: 'none',
    padding: '9px 12px', cursor: 'pointer', textAlign: 'left', gap: 8,
  },
  cheatToggleLeft:  { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 },
  cheatToggleIcon:  { color: '#3d5afe', fontSize: 11, flexShrink: 0, fontWeight: 700 },
  cheatToggleTitle: { fontSize: 12, fontWeight: 700, color: '#64748b', flexShrink: 0 },
  cheatToggleHints: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  hintSep:          { fontSize: 11, color: '#334155' },
  hintDot:          { fontSize: 11, color: '#1e293b' },
  cheatToggleCta:   { fontSize: 10, color: '#3d5afe', flexShrink: 0, whiteSpace: 'nowrap' },
  inlineCode: {
    background: '#1e293b', color: '#94a3b8',
    padding: '1px 5px', borderRadius: 3, fontSize: 11, fontFamily: 'monospace',
  },
  inlineCodeSmall: {
    background: '#1e293b', color: '#94a3b8',
    padding: '0 4px', borderRadius: 3, fontSize: 10, fontFamily: 'monospace',
  },
  cheatBody:   { borderTop: '1px solid #1e2330', display: 'flex', flexDirection: 'column' },
  symbolRow: {
    display: 'flex', gap: 6, padding: '8px 12px',
    flexWrap: 'wrap', background: '#0f172a', borderBottom: '1px solid #1e2330',
  },
  symbolItem: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: '#1e2330', border: '1px solid #2e3447',
    borderRadius: 5, padding: '3px 10px',
  },
  symbolCode:  { fontSize: 12, fontFamily: 'monospace', fontWeight: 700 },
  symbolLabel: { fontSize: 11, color: '#475569' },
  cheatPre: {
    margin: 0, padding: '12px 14px', color: '#6ee7b7',
    fontSize: 12, fontFamily: 'monospace', lineHeight: 1.9,
    whiteSpace: 'pre', overflowX: 'auto', background: '#111827',
  },
  layoutHint: {
    display: 'flex', gap: 8, alignItems: 'flex-start',
    padding: '8px 12px', background: '#0f172a', borderTop: '1px solid #1e2330',
  },
  layoutHintIcon: { fontSize: 14, flexShrink: 0, marginTop: 2 },
  layoutHintText: { fontSize: 11, color: '#475569', lineHeight: 1.6 },
  textarea: {
    flex: '1 1 auto', minHeight: 380, height: '100%',
    background: '#111827', border: '1px solid #2e3447', borderRadius: 8,
    color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace',
    padding: 12, resize: 'vertical', outline: 'none',
    lineHeight: 1.8, boxSizing: 'border-box',
  },
  feedbackBar: {
    padding: '7px 12px', borderRadius: 6, border: '1px solid',
    fontSize: 12, flexShrink: 0,
  },
  errorBox: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '8px 12px', background: '#450a0a', border: '1px solid #7f1d1d',
    borderRadius: 6, fontSize: 12, color: '#fca5a5', flexShrink: 0, gap: 8,
  },
  errorDismiss: {
    background: 'transparent', border: 'none', color: '#fca5a5',
    cursor: 'pointer', fontSize: 13, padding: 0, flexShrink: 0,
  },
  emptyPreview: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  previewHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
  },
  previewCount:   { fontSize: 12, color: '#64748b' },
  backToInputBtn: {
    background: 'transparent', border: '1px solid #2e3447', color: '#8b92a5',
    fontSize: 11, padding: '3px 10px', borderRadius: 5, cursor: 'pointer',
  },
  previewList:  { display: 'flex', flexDirection: 'column', gap: 10 },
  previewCard:  {
    background: '#111827', border: '1px solid #2e3447',
    borderRadius: 8, overflow: 'hidden',
  },
  thumbnail: {
    background: '#000', padding: '14px 16px', minHeight: 90,
    display: 'flex', flexDirection: 'column', gap: 6, position: 'relative',
  },
  thumbIndex:    { position: 'absolute', top: 8, right: 10, fontSize: 10, color: '#334155', fontWeight: 700 },
  centredBadge: {
    position: 'absolute', top: 8, left: 10, fontSize: 9, color: '#818cf8',
    fontWeight: 700, background: '#1e1b4b', padding: '1px 6px',
    borderRadius: 4, letterSpacing: '0.04em',
  },
  thumbTitle:    { color: '#ffffff', fontSize: 13, fontWeight: 700, lineHeight: 1.3 },
  thumbSubtitle: {
    color: '#94a3b8', fontSize: 11, fontStyle: 'italic',
    lineHeight: 1.4, opacity: 0.9,
  },
  thumbBlock:   { display: 'flex', flexDirection: 'column', gap: 3 },
  thumbContent: {
    color: '#e2e8f0', fontSize: 11, lineHeight: 1.5, opacity: 0.7,
    display: 'flex', flexDirection: 'column', gap: 1,
  },
  thumbBulletRow: { display: 'flex', gap: 5 },
  thumbBulletDot: { color: '#3d5afe', flexShrink: 0 },
  previewMeta: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderTop: '1px solid #1e2330',
  },
  slideNum:    { color: '#8b92a5', fontSize: 11, flexGrow: 1 },
  tag:         { fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600 },
  tagTitle:    { background: '#1e3a5f', color: '#7dd3fc' },
  tagSubtitle: { background: '#2d1b69', color: '#c4b5fd' },
  tagContent:  { background: '#14532d', color: '#86efac' },
  tagCentred:  { background: '#1e1b4b', color: '#818cf8' },
  footer: {
    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
    gap: 8, padding: '12px 18px', borderTop: '1px solid #2e3447', flexShrink: 0,
  },
  btnSecondary: {
    background: '#2e3447', border: '1px solid #3d4560', color: '#e2e8f0',
    fontSize: 13, fontWeight: 500, padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
  },
  btnPrimary: {
    background: '#3d5afe', border: 'none', color: '#fff',
    fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 6, cursor: 'pointer',
  },
  btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  bibleBtn: {
  display: 'flex', alignItems: 'center', gap: 5,
  background: '#14532d', border: '1px solid #16a34a',
  color: '#86efac', fontSize: 11, fontWeight: 600,
  padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
  marginBottom: 4,
},
};

export default SlideGeneratorModal;