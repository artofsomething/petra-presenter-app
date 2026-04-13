// src/renderer/components/Editor/SlideGeneratorModal.tsx

import React, { useState, useCallback } from 'react';
import { parseSlideMarkup, migrateLegacyMarkup } from '../../utils/slideParser';
import { generateSlides }    from '../../utils/slideGenerator';
import type { GeneratedSlide } from '../../utils/slideGenerator';

interface SlideGeneratorModalProps {
  onClose:           () => void;
  onGenerate:        (slides: GeneratedSlide[]) => void;
  currentSlideCount: number;
}

const EXAMPLE = `# Sermon Title
Introduction text here
- bullet point

--

Second block of content
- another bullet

---

# Second Slide
Content only, one block.
--
Another block below it.
--
Third block here.

---

Just content, no title.
Some opening quote or verse.`;

const SlideGeneratorModal: React.FC<SlideGeneratorModalProps> = ({
  onClose,
  onGenerate,
  currentSlideCount,
}) => {
  const [input,          setInput]          = useState('');
  const [preview,        setPreview]        = useState<ReturnType<typeof parseSlideMarkup>>([]);
  const [error,          setError]          = useState('');
  const [tab,            setTab]            = useState<'input' | 'preview'>('input');
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  // ── Sanitize ────────────────────────────────────────────────────────────────
  function sanitizeInput(raw: string): string {
    return raw
      .replace(/\u200B/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  // ── Handle change — auto-migrate legacy [slide] format ──────────────────────
  const handleChange = useCallback((raw: string) => {
    const sanitized = sanitizeInput(raw);
    const converted = /$$slide$$/i.test(sanitized)
      ? migrateLegacyMarkup(sanitized)
      : sanitized;
    setInput(converted);
    setError('');
  }, []);

  // ── Live parsed count ───────────────────────────────────────────────────────
  const parsedSlides = parseSlideMarkup(input);
  const parsedCount  = parsedSlides.length;

  // ── Preview ─────────────────────────────────────────────────────────────────
  const handlePreview = useCallback(() => {
    if (!input.trim()) {
      setError('Please enter some slide content.');
      return;
    }
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

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    const parsed = parseSlideMarkup(input);
    if (parsed.length === 0) return;
    const slides = generateSlides(parsed, currentSlideCount + 1);
    onGenerate(slides);
    onClose();
  }, [input, currentSlideCount, onGenerate, onClose]);

  // ── Load example ────────────────────────────────────────────────────────────
  const handleExample = useCallback(() => {
    setInput(EXAMPLE);
    setError('');
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerTitle}>⚡ Generate Slides</span>
            <span style={styles.headerSub}>Simple markdown-style syntax</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === 'input'   ? styles.tabActive : {}) }}
            onClick={() => setTab('input')}
          >
            ✏️ Input
          </button>
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
          <button style={styles.exampleBtn} onClick={handleExample}>
            📋 Load Example
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            INPUT TAB
        ════════════════════════════════════════════════════════════════════ */}
        {tab === 'input' && (
          <div style={styles.body}>

            {/* ── Collapsible cheat sheet ─────────────────────────────────── */}
            <div style={styles.cheatSheet}>

              {/* Toggle row */}
              <button
                style={styles.cheatToggle}
                onClick={() => setShowCheatSheet(v => !v)}
              >
                <span style={styles.cheatToggleLeft}>
                  <span style={styles.cheatToggleIcon}>
                    {showCheatSheet ? '▾' : '▸'}
                  </span>
                  <span style={styles.cheatToggleTitle}>Format Guide</span>
                  {/* Inline hint chips shown only when collapsed */}
                  {!showCheatSheet && (
                    <span style={styles.cheatToggleHints}>
                      <code style={styles.inlineCode}>#</code>
                      <span style={styles.hintSep}>title</span>
                      <span style={styles.hintDot}>·</span>
                      <code style={styles.inlineCode}>--</code>
                      <span style={styles.hintSep}>new block</span>
                      <span style={styles.hintDot}>·</span>
                      <code style={styles.inlineCode}>---</code>
                      <span style={styles.hintSep}>new slide</span>
                      <span style={styles.hintDot}>·</span>
                      <code style={styles.inlineCode}>-</code>
                      <span style={styles.hintSep}>bullet</span>
                    </span>
                  )}
                </span>
                <span style={styles.cheatToggleCta}>
                  {showCheatSheet ? 'Collapse ▴' : 'Show example ▾'}
                </span>
              </button>

              {/* Expanded content */}
              {showCheatSheet && (
                <div style={styles.cheatBody}>

                  {/* Symbol reference chips */}
                  <div style={styles.symbolRow}>
                    {[
                      { symbol: '#',   color: '#7dd3fc', label: 'Title',     desc: 'First # line = slide title'          },
                      { symbol: '--',  color: '#f9a8d4', label: 'New block', desc: 'New text element on the same slide'  },
                      { symbol: '---', color: '#fcd34d', label: 'New slide', desc: '3+ dashes = start a new slide'       },
                      { symbol: '-',   color: '#86efac', label: 'Bullet',    desc: 'Lines starting with - are bullets'   },
                    ].map(({ symbol, color, label, desc }) => (
                      <div key={symbol} style={styles.symbolItem} title={desc}>
                        <code style={{ ...styles.symbolCode, color }}>{symbol}</code>
                        <span style={styles.symbolLabel}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Annotated example */}
                  <pre style={styles.cheatPre}>{
`# Sermon Title           ← title (optional)
Introduction text here   ← first content block
- bullet point

--                       ← new text element, same slide

Second block of content
- another bullet

---                      ← new slide starts here

# Second Slide
Content only, one block.
--
Another block below it.`
                  }</pre>
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
                  <span style={{ color: '#4ade80' }}>
                    ✅ {parsedCount} slide{parsedCount !== 1 ? 's' : ''} detected
                    {' — '}
                    {parsedSlides.reduce((sum, s) => sum + s.contents.length, 0)} content block
                    {parsedSlides.reduce((sum, s) => sum + s.contents.length, 0) !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span style={{ color: '#f87171' }}>
                    ⚠️ No slides detected yet — add content or a --- separator
                  </span>
                )}
              </div>
            )}

            {/* ── Error ───────────────────────────────────────────────────── */}
            {error && (
              <div style={styles.errorBox}>
                <span style={{ whiteSpace: 'pre-line' }}>⚠️ {error}</span>
                <button style={styles.errorDismiss} onClick={() => setError('')}>✕</button>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            PREVIEW TAB
        ════════════════════════════════════════════════════════════════════ */}
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
                {/* Preview header */}
                <div style={styles.previewHeader}>
                  <span style={styles.previewCount}>
                    {preview.length} slide{preview.length !== 1 ? 's' : ''} ready to generate
                  </span>
                  <button
                    style={styles.backToInputBtn}
                    onClick={() => setTab('input')}
                  >
                    ← Edit
                  </button>
                </div>

                {/* Preview cards */}
                <div style={styles.previewList}>
                  {preview.map((s, i) => (
                    <div key={i} style={styles.previewCard}>

                      {/* Mini slide mockup */}
                      <div style={styles.thumbnail}>
                        <span style={styles.thumbIndex}>{i + 1}</span>

                        {s.title && (
                          <div style={styles.thumbTitle}>{s.title}</div>
                        )}

                        {s.contents.map((block, bi) => (
                          <div
                            key={bi}
                            style={{
                              ...styles.thumbContent,
                              borderLeft:  bi > 0 ? '2px solid #1e3a5f' : 'none',
                              paddingLeft: bi > 0 ? 8 : 0,
                              marginTop:   bi > 0 ? 6 : 0,
                            }}
                          >
                            {bi > 0 && (
                              <span style={styles.blockLabel}>block {bi + 1}</span>
                            )}
                            {block.split('\n').map((line, li) =>
                              line.startsWith('- ') ? (
                                <div key={li} style={styles.thumbBulletRow}>
                                  <span style={styles.thumbBulletDot}>•</span>
                                  <span>{line.slice(2)}</span>
                                </div>
                              ) : (
                                <div key={li}>{line}</div>
                              )
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Meta row */}
                      <div style={styles.previewMeta}>
                        <span style={styles.slideNum}>Slide {i + 1}</span>
                        {s.title && (
                          <span style={{ ...styles.tag, ...styles.tagTitle }}>
                            📌 Title
                          </span>
                        )}
                        {s.contents.length > 0 && (
                          <span style={{ ...styles.tag, ...styles.tagContent }}>
                            📝 {s.contents.length} block{s.contents.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span style={styles.lineCount}>
                          {s.contents.reduce((n, c) => n + c.split('\n').length, 0)} line
                          {s.contents.reduce((n, c) => n + c.split('\n').length, 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div style={styles.footer}>
          <button style={styles.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button style={styles.btnSecondary} onClick={handlePreview}>
            👁 Preview
          </button>
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
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {

  // ── Layout ───────────────────────────────────────────────────────────────
  backdrop: {
    position:        'fixed',
    inset:           0,
    backgroundColor: 'rgba(0,0,0,0.78)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          9999,
  },
  modal: {
    width:           720,
    maxHeight:       '92vh',   // ← was 90vh
    backgroundColor: '#1a1f2e',
    borderRadius:    12,
    border:          '1px solid #2e3447',
    display:         'flex',
    flexDirection:   'column',
    overflow:        'hidden',
    boxShadow:       '0 25px 60px rgba(0,0,0,0.65)',
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '14px 18px',
    borderBottom:   '1px solid #2e3447',
    flexShrink:     0,
  },
  headerLeft: {
    display:       'flex',
    flexDirection: 'column',
    gap:           3,
  },
  headerTitle: {
    color:      '#e2e8f0',
    fontSize:   15,
    fontWeight: 700,
    lineHeight: 1,
  },
  headerSub: {
    color:    '#475569',
    fontSize: 11,
  },
  closeBtn: {
    background:   'transparent',
    border:       'none',
    color:        '#8b92a5',
    fontSize:     18,
    cursor:       'pointer',
    lineHeight:   1,
    padding:      '2px 6px',
    borderRadius: 4,
  },

  // ── Tabs ─────────────────────────────────────────────────────────────────
  tabs: {
    display:      'flex',
    alignItems:   'center',
    gap:          2,
    padding:      '8px 18px 0',
    borderBottom: '1px solid #2e3447',
    flexShrink:   0,
  },
  tab: {
    display:      'flex',
    alignItems:   'center',
    gap:          6,
    background:   'transparent',
    border:       'none',
    borderBottom: '2px solid transparent',
    color:        '#8b92a5',
    fontSize:     13,
    fontWeight:   500,
    padding:      '6px 12px',
    cursor:       'pointer',
    marginBottom: -1,
    borderRadius: '4px 4px 0 0',
    transition:   'color 0.15s',
  },
  tabActive: {
    color:        '#e2e8f0',
    borderBottom: '2px solid #3d5afe',
  },
  tabBadge: {
    background:   '#3d5afe',
    color:        '#fff',
    fontSize:     10,
    fontWeight:   700,
    padding:      '1px 6px',
    borderRadius: 10,
  },
  exampleBtn: {
    background:   'transparent',
    border:       '1px solid #2e3447',
    color:        '#8b92a5',
    fontSize:     11,
    padding:      '4px 10px',
    borderRadius: 5,
    cursor:       'pointer',
    marginBottom: 4,
  },

  // ── Body ─────────────────────────────────────────────────────────────────
  body: {
    flex:          1,
    overflowY:     'auto',
    padding:       16,
    display:       'flex',
    flexDirection: 'column',
    gap:           10,
    minHeight:     0,
    height:        '100%',     // ← ADD
  },

  // ── Cheat sheet ───────────────────────────────────────────────────────────
  cheatSheet: {
    background:   '#111827',
    border:       '1px solid #2e3447',
    borderRadius: 8,
    overflow:     'hidden',
    flexShrink:   0,
  },
  cheatToggle: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    width:          '100%',
    background:     'transparent',
    border:         'none',
    padding:        '9px 12px',
    cursor:         'pointer',
    textAlign:      'left',
    gap:            8,
  },
  cheatToggleLeft: {
    display:    'flex',
    alignItems: 'center',
    gap:        8,
    flexWrap:   'wrap' as const,
    minWidth:   0,
  },
  cheatToggleIcon: {
    color:      '#3d5afe',
    fontSize:   11,
    flexShrink: 0,
    width:      10,
    fontWeight: 700,
  },
  cheatToggleTitle: {
    fontSize:   12,
    fontWeight: 700,
    color:      '#64748b',
    flexShrink: 0,
  },
  cheatToggleHints: {
    display:    'flex',
    alignItems: 'center',
    gap:        4,
    flexWrap:   'wrap' as const,
  },
  hintSep: {
    fontSize: 11,
    color:    '#334155',
  },
  hintDot: {
    fontSize: 11,
    color:    '#1e293b',
  },
  cheatToggleCta: {
    fontSize:   10,
    color:      '#3d5afe',
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
  },
  inlineCode: {
    background:   '#1e293b',
    color:        '#94a3b8',
    padding:      '1px 5px',
    borderRadius: 3,
    fontSize:     11,
    fontFamily:   'monospace',
  },

  // Expanded body
  cheatBody: {
    borderTop:     '1px solid #1e2330',
    display:       'flex',
    flexDirection: 'column' as const,
  },
  symbolRow: {
    display:    'flex',
    gap:        6,
    padding:    '8px 12px',
    flexWrap:   'wrap' as const,
    background: '#0f172a',
    borderBottom:'1px solid #1e2330',
  },
  symbolItem: {
    display:      'flex',
    alignItems:   'center',
    gap:          6,
    background:   '#1e2330',
    border:       '1px solid #2e3447',
    borderRadius: 5,
    padding:      '3px 10px',
  },
  symbolCode: {
    fontSize:   12,
    fontFamily: 'monospace',
    fontWeight: 700,
  },
  symbolLabel: {
    fontSize: 11,
    color:    '#475569',
  },
  cheatPre: {
    margin:     0,
    padding:    '12px 14px',
    color:      '#6ee7b7',
    fontSize:   12,
    fontFamily: 'monospace',
    lineHeight: 1.9,
    whiteSpace: 'pre' as const,
    overflowX:  'auto',
    background: '#111827',
  },

  // ── Textarea ──────────────────────────────────────────────────────────────
  textarea: {
    flex:         '1 1 auto',
    minHeight:    380,         // ← was 200
    height:       '100%',     // ← ADD — fills all remaining body space
    background:   '#111827',
    border:       '1px solid #2e3447',
    borderRadius: 8,
    color:        '#e2e8f0',
    fontSize:     13,
    fontFamily:   'monospace',
    padding:      12,
    resize:       'vertical',
    outline:      'none',
    lineHeight:   1.8,
    boxSizing:    'border-box', // ← ADD
  },

  // ── Feedback bar ──────────────────────────────────────────────────────────
  feedbackBar: {
    padding:      '7px 12px',
    borderRadius: 6,
    border:       '1px solid',
    fontSize:     12,
    flexShrink:   0,
  },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorBox: {
    display:        'flex',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    padding:        '8px 12px',
    background:     '#450a0a',
    border:         '1px solid #7f1d1d',
    borderRadius:   6,
    fontSize:       12,
    color:          '#fca5a5',
    flexShrink:     0,
    gap:            8,
  },
  errorDismiss: {
    background:   'transparent',
    border:       'none',
    color:        '#fca5a5',
    cursor:       'pointer',
    fontSize:     13,
    padding:      0,
    flexShrink:   0,
  },

  // ── Preview ───────────────────────────────────────────────────────────────
  emptyPreview: {
    flex:           1,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        40,
  },
  previewHeader: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    flexShrink:     0,
  },
  previewCount: {
    fontSize: 12,
    color:    '#64748b',
  },
  backToInputBtn: {
    background:   'transparent',
    border:       '1px solid #2e3447',
    color:        '#8b92a5',
    fontSize:     11,
    padding:      '3px 10px',
    borderRadius: 5,
    cursor:       'pointer',
  },
  previewList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           10,
  },
  previewCard: {
    background:   '#111827',
    border:       '1px solid #2e3447',
    borderRadius: 8,
    overflow:     'hidden',
  },
  thumbnail: {
    background:    '#000',
    padding:       '14px 16px',
    minHeight:     80,
    display:       'flex',
    flexDirection: 'column',
    gap:           4,
    position:      'relative',
  },
  thumbIndex: {
    position:   'absolute',
    top:        8,
    right:      10,
    fontSize:   10,
    color:      '#334155',
    fontWeight: 700,
  },
  thumbTitle: {
    color:        '#ffffff',
    fontSize:     14,
    fontWeight:   700,
    lineHeight:   1.3,
    marginBottom: 4,
  },
  thumbContent: {
    color:         '#e2e8f0',
    fontSize:      11,
    lineHeight:    1.6,
    opacity:       0.75,
    display:       'flex',
    flexDirection: 'column',
    gap:           2,
    maxHeight:     72,
    overflow:      'hidden',
  },
  blockLabel: {
    fontSize:     9,
    fontWeight:   700,
    color:        '#1e3a5f',
    textTransform:'uppercase' as const,
    letterSpacing:'0.06em',
    marginBottom: 2,
  },
  thumbBulletRow: {
    display: 'flex',
    gap:     6,
  },
  thumbBulletDot: {
    color:      '#3d5afe',
    flexShrink: 0,
  },
  previewMeta: {
    display:    'flex',
    alignItems: 'center',
    gap:        6,
    padding:    '6px 12px',
    borderTop:  '1px solid #1e2330',
  },
  slideNum: {
    color:    '#8b92a5',
    fontSize: 11,
    flexGrow: 1,
  },
  tag: {
    fontSize:     10,
    padding:      '2px 8px',
    borderRadius: 10,
    fontWeight:   600,
  },
  tagTitle: {
    background: '#1e3a5f',
    color:      '#7dd3fc',
  },
  tagContent: {
    background: '#14532d',
    color:      '#86efac',
  },
  lineCount: {
    fontSize: 10,
    color:    '#475569',
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    display:        'flex',
    justifyContent: 'flex-end',
    alignItems:     'center',
    gap:            8,
    padding:        '12px 18px',
    borderTop:      '1px solid #2e3447',
    flexShrink:     0,
  },
  btnSecondary: {
    background:   '#2e3447',
    border:       '1px solid #3d4560',
    color:        '#e2e8f0',
    fontSize:     13,
    fontWeight:   500,
    padding:      '8px 16px',
    borderRadius: 6,
    cursor:       'pointer',
  },
  btnPrimary: {
    background:   '#3d5afe',
    border:       'none',
    color:        '#ffffff',
    fontSize:     13,
    fontWeight:   600,
    padding:      '8px 20px',
    borderRadius: 6,
    cursor:       'pointer',
  },
  btnDisabled: {
    opacity: 0.4,
    cursor:  'not-allowed',
  },
};

export default SlideGeneratorModal;