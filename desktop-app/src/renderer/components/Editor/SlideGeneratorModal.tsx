// src/renderer/components/Editor/SlideGeneratorModal.tsx

import React, { useState, useCallback } from 'react';
import { parseSlideMarkup }  from '../../utils/slideParser';
import { generateSlides }    from '../../utils/slideGenerator';
import type { GeneratedSlide } from '../../utils/slideGenerator';

interface SlideGeneratorModalProps {
  onClose:    () => void;
  onGenerate: (slides: GeneratedSlide[]) => void;
  currentSlideCount: number;
}

const PLACEHOLDER = `[slide]
[title]Welcome[/title]
[content]This is the first slide content.[/content]
[/slide]

[slide]
[title]About Us[/title]
[content]Some information about us goes here.[/content]
[/slide]`;

const SlideGeneratorModal: React.FC<SlideGeneratorModalProps> = ({
  onClose,
  onGenerate,
  currentSlideCount,
}) => {
  const [input,    setInput]    = useState('');
  const [preview,  setPreview]  = useState<ReturnType<typeof parseSlideMarkup>>([]);
  const [error,    setError]    = useState('');
  const [tab,      setTab]      = useState<'input' | 'preview'>('input');

  function sanitizeInput(raw: string): string {
    return raw
      .replace(/\u200B/g, '')   // zero-width space
      .replace(/\u00A0/g, ' ')  // non-breaking space → normal space
      .replace(/[\u2018\u2019]/g, "'")  // smart single quotes → straight
      .replace(/[\u201C\u201D]/g, '"')  // smart double quotes → straight
      .replace(/\r\n/g, '\n')   // normalize line endings
      .replace(/\r/g, '\n');
  }
  // ── Parse for preview ──────────────────────────────────────────────────────
  
const handlePreview = useCallback(() => {
  if (!input.trim()) {
    setError('Please enter some slide markup.');
    return;
  }

  // ── Quick sanity checks ─────────────────────────────────────────────────
  const hasSlideOpen  = input.includes('[slide]');
  const hasSlideClose = input.includes('[/slide]');

  if (!hasSlideOpen || !hasSlideClose) {
    setError(
      !hasSlideOpen
        ? 'Missing [slide] tag. Each slide must start with [slide].'
        : 'Missing [/slide] tag. Each slide must end with [/slide].'
    );
    return;
  }

  const parsed = parseSlideMarkup(input);

  if (parsed.length === 0) {
    setError(
      'No valid [slide] blocks found. Make sure you have:\n' +
      '[slide]\n[title]Your Title[/title]\n[content]Your Content[/content]\n[/slide]'
    );
    return;
  }

  setError('');
  setPreview(parsed);
  setTab('preview');
}, [input]);

  // ── Generate & close ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    const parsed = parseSlideMarkup(input);
    if (parsed.length === 0) return;

    const slides = generateSlides(parsed, currentSlideCount + 1);
    onGenerate(slides);
    onClose();
  }, [input, currentSlideCount, onGenerate, onClose]);

  return (
    // ── Backdrop ─────────────────────────────────────────────────────────────
    <div style={styles.backdrop}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerTitle}>⚡ Generate Slides</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {(['input', 'preview'] as const).map((t) => (
            <button
              key={t}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
              onClick={() => setTab(t)}
            >
              {t === 'input' ? '✏️ Input' : `👁 Preview (${preview.length})`}
            </button>
          ))}
        </div>

        {/* Input Tab */}
        {tab === 'input' && (
          <div style={styles.body}>
            <p style={styles.hint}>
              Use the format below. Each <code style={styles.code}>[slide]</code> block
              becomes one slide.
            </p>
            <pre style={styles.formatHint}>{PLACEHOLDER}</pre>
            <textarea
              style={styles.textarea}
              value={input}
              onChange={(e) => { setInput(sanitizeInput(e.target.value)); setError(''); }}
              placeholder={PLACEHOLDER}
              spellCheck={false}
            />
            {error && <p style={styles.error}>{error}</p>}
          </div>
        )}

        {/* Preview Tab */}
        {tab === 'preview' && (
          <div style={styles.body}>
            {preview.length === 0 ? (
              <p style={styles.hint}>No preview yet — click "Preview" first.</p>
            ) : (
              <div style={styles.previewList}>
                {preview.map((s, i) => (
                  <div key={i} style={styles.previewCard}>
                    {/* Mini slide thumbnail */}
                    <div style={styles.thumbnail}>
                      {s.title && (
                        <div style={styles.thumbTitle}>{s.title}</div>
                      )}
                      {s.content && (
                        <div style={styles.thumbContent}>{s.content}</div>
                      )}
                    </div>
                    <div style={styles.previewMeta}>
                      <span style={styles.slideNum}>Slide {i + 1}</span>
                      {s.title   && <span style={styles.tag}>Title</span>}
                      {s.content && <span style={styles.tag}>Content</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {tab === 'input' && (
          <div style={styles.body}>
            {/* ... existing content ... */}
            
            {/* ── TEMP DEBUG BUTTON ── */}
            <button
              onClick={() => {
                const raw = input;
                console.log('=== RAW INPUT ===');
                console.log(JSON.stringify(raw)); // shows ALL hidden chars
                console.log('Length:', raw.length);
                console.log('Has [slide]:', raw.includes('[slide]'));
                console.log('Has [/slide]:', raw.includes('[/slide]'));

                // Test regex directly
                const test1 = /$$slide$$/i.test(raw);
                const test2 = /$$\/slide$$/i.test(raw);
                const test3 = /$$slide$$([\s\S]*?)$$\/slide$$/gi;
                const matches = [...raw.matchAll(test3)];

                console.log('Regex [slide]:', test1);
                console.log('Regex [/slide]:', test2);
                console.log('Matches found:', matches.length);
                console.log('Matches:', matches);

                alert(
                  `Length: ${raw.length}\n` +
                  `Has [slide]: ${test1}\n` +
                  `Has [/slide]: ${test2}\n` +
                  `Regex matches: ${matches.length}\n\n` +
                  `First 100 chars:\n${JSON.stringify(raw.substring(0, 100))}`
                );
              }}
              style={{ ...styles.btnSecondary, background: '#7c3aed', fontSize: 11 }}
            >
              🐛 Debug Input
            </button>
          </div>
        )}

        {/* Footer */}
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
              ...(input.trim() === '' ? styles.btnDisabled : {}),
            }}
            onClick={handleGenerate}
            disabled={input.trim() === ''}
          >
            ⚡ Generate {parseSlideMarkup(input).length > 0
              ? `${parseSlideMarkup(input).length} Slide(s)`
              : 'Slides'}
          </button>
          

          <button
            onClick={() => {
              // Hardcoded test — completely bypass textarea input
              const testInput = `[slide]\n[title]Test[/title]\n[content]Hello world[/content]\n[/slide]`;
              const result = parseSlideMarkup(testInput);
              console.log('Hardcoded test result:', result);
              alert(`Hardcoded test: ${result.length} slide(s) found\n${JSON.stringify(result, null, 2)}`);
            }}
            style={{ ...styles.btnSecondary, background: '#059669' }}
          >
            🧪 Test Hardcoded
          </button>
        </div>

      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position:        'fixed',
    inset:           0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          9999,
  },
  modal: {
    width:           640,
    maxHeight:       '85vh',
    backgroundColor: '#1a1f2e',
    borderRadius:    12,
    border:          '1px solid #2e3447',
    display:         'flex',
    flexDirection:   'column',
    overflow:        'hidden',
    boxShadow:       '0 25px 60px rgba(0,0,0,0.6)',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '14px 18px',
    borderBottom:   '1px solid #2e3447',
    flexShrink:     0,
  },
  headerTitle: {
    color:      '#e2e8f0',
    fontSize:   16,
    fontWeight: 700,
  },
  closeBtn: {
    background:  'transparent',
    border:      'none',
    color:       '#8b92a5',
    fontSize:    18,
    cursor:      'pointer',
    lineHeight:  1,
    padding:     '2px 6px',
    borderRadius: 4,
  },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabs: {
    display:      'flex',
    gap:          4,
    padding:      '8px 18px 0',
    borderBottom: '1px solid #2e3447',
    flexShrink:   0,
  },
  tab: {
    background:    'transparent',
    border:        'none',
    borderBottom:  '2px solid transparent',
    color:         '#8b92a5',
    fontSize:      13,
    fontWeight:    500,
    padding:       '6px 12px',
    cursor:        'pointer',
    marginBottom:  -1,
    borderRadius:  '4px 4px 0 0',
    transition:    'color 0.15s',
  },
  tabActive: {
    color:        '#e2e8f0',
    borderBottom: '2px solid #3d5afe',
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  body: {
    flex:       1,
    overflowY:  'auto',
    padding:    18,
    display:    'flex',
    flexDirection: 'column',
    gap:        12,
  },
  hint: {
    color:     '#8b92a5',
    fontSize:  13,
    margin:    0,
    lineHeight: 1.6,
  },
  code: {
    background:   '#2e3447',
    padding:      '1px 5px',
    borderRadius: 3,
    fontSize:     12,
    color:        '#7dd3fc',
  },
  formatHint: {
    background:   '#111827',
    border:       '1px solid #2e3447',
    borderRadius: 6,
    padding:      10,
    color:        '#6ee7b7',
    fontSize:     12,
    margin:       0,
    overflow:     'auto',
    lineHeight:   1.7,
  },
  textarea: {
    flex:        1,
    minHeight:   220,
    background:  '#111827',
    border:      '1px solid #2e3447',
    borderRadius: 8,
    color:       '#e2e8f0',
    fontSize:    13,
    fontFamily:  'monospace',
    padding:     12,
    resize:      'vertical',
    outline:     'none',
    lineHeight:  1.7,
  },
  error: {
    color:     '#f87171',
    fontSize:  13,
    margin:    0,
  },

  // ── Preview ───────────────────────────────────────────────────────────────
  previewList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           12,
  },
  previewCard: {
    background:   '#111827',
    border:       '1px solid #2e3447',
    borderRadius: 8,
    overflow:     'hidden',
  },
  thumbnail: {
    background:  '#000000',
    padding:     '14px 16px',
    minHeight:   80,
    display:     'flex',
    flexDirection: 'column',
    gap:         6,
  },
  thumbTitle: {
    color:      '#ffffff',
    fontSize:   15,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  thumbContent: {
    color:     '#e2e8f0',
    fontSize:  12,
    lineHeight: 1.5,
    opacity:   0.8,
    // Clamp long content in preview
    display:            '-webkit-box',
    WebkitLineClamp:    3,
    WebkitBoxOrient:    'vertical',
    overflow:           'hidden',
  },
  previewMeta: {
    display:    'flex',
    alignItems: 'center',
    gap:        8,
    padding:    '6px 12px',
    borderTop:  '1px solid #1e2330',
  },
  slideNum: {
    color:     '#8b92a5',
    fontSize:  12,
    flexGrow:  1,
  },
  tag: {
    background:   '#1e3a5f',
    color:        '#7dd3fc',
    fontSize:     11,
    padding:      '2px 8px',
    borderRadius: 10,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    display:        'flex',
    justifyContent: 'flex-end',
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
    opacity:  0.4,
    cursor:   'not-allowed',
  },
};

export default SlideGeneratorModal;