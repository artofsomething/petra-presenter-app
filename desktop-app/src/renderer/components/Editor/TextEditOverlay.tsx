// src/renderer/components/Editor/TextEditOverlay.tsx
import React, { useRef, useEffect, useState } from 'react';
import { stripInlineMarkup } from '../../utils/InlineMarkup';

interface TextEditOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  onSave: (newText: string) => void;
  onCancel: () => void;
  stageContainer: HTMLDivElement | null;
}

const MARKUP_HINTS = [
  { label: 'Bold',          syntax: '**text**',                  insert: '**',       wrap: true,  color: '#f59e0b', preview: 'bold'          },
  { label: 'Italic',        syntax: '*text*',                    insert: '*',        wrap: true,  color: '#a78bfa', preview: 'italic'        },
  { label: 'Underline',     syntax: '__text__',                  insert: '__',       wrap: true,  color: '#34d399', preview: 'underline'     },
  { label: 'Strikethrough', syntax: '~~text~~',                  insert: '~~',       wrap: true,  color: '#f87171', preview: 'line-through'  },
  { label: 'Code',          syntax: '`text`',                    insert: '`',        wrap: true,  color: '#7dd3fc', preview: 'code'          },
  { label: 'Color',         syntax: '[color:#f87171]text[/color]',insert: '[color:#f87171]', wrap: false, color: '#fb923c', preview: 'color' },
] as const;

const isLightColor = (color: string): boolean => {
  try {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  } catch { return false; }
};

const TextEditOverlay: React.FC<TextEditOverlayProps> = ({
  x, y, width, height, rotation,
  text, fontSize, fontFamily, fontColor,
  fontWeight, fontStyle, textAlign,
  onSave, onCancel, stageContainer,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue]         = useState(text);
  const [showHints, setShowHints] = useState(false);

  const hasMarkup   = value !== stripInlineMarkup(value);
  const textIsLight = isLightColor(fontColor || '#000000');

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    setTimeout(() => {
      ta.focus();
      ta.select();
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight + 4}px`;
    }, 50);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight + 4}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(value); }
    if (e.key === 'Escape')               { e.preventDefault(); onCancel(); }
  };

  const handleBlur = (e: React.FocusEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related?.closest?.('[data-hints-panel]')) return;
    onSave(value);
  };

  // ── Insert / wrap snippet ─────────────────────────────────────────────────
  const insertSnippet = (hint: typeof MARKUP_HINTS[number]) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start    = ta.selectionStart ?? value.length;
    const end      = ta.selectionEnd   ?? value.length;
    const selected = value.slice(start, end);
    let   snippet  = '';

    if (hint.wrap) {
      const marker = hint.insert;
      if (selected) {
        snippet = `${marker}${selected}${marker}`;
      } else {
        snippet = `${marker}text${marker}`;
      }
    } else {
      // color tag
      snippet = selected
        ? `[color:#f87171]${selected}[/color]`
        : `[color:#f87171]text[/color]`;
    }

    const next = value.slice(0, start) + snippet + value.slice(end);
    setValue(next);

    setTimeout(() => {
      ta.focus();
      const cursor = start + snippet.length;
      ta.setSelectionRange(cursor, cursor);
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight + 4}px`;
    }, 0);
  };

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.2)',
          zIndex: 998,
        }}
        onClick={() => onSave(value)}
      />

      {/* ── Floating toolbar — anchored above the textarea ────────────────── */}
      <div
        style={{
          position:   'absolute',
          left:       `${x}px`,
          top:        `${Math.max(y - 36, 4)}px`,
          zIndex:     1001,
          display:    'flex',
          alignItems: 'center',
          gap:        4,
          background: '#0f172a',
          border:     '1px solid #1e293b',
          borderRadius: 8,
          padding:    '4px 8px',
          boxShadow:  '0 2px 12px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Shortcut badges */}
        <span style={badgeStyle('#3b82f6')}>↵ Save</span>
        <span style={badgeStyle('#64748b')}>⇧↵ New line</span>
        <span style={badgeStyle('#ef4444')}>Esc Cancel</span>

        {hasMarkup && (
          <span style={badgeStyle('#7c3aed')}>✦ Rich</span>
        )}

        {/* Divider */}
        <span style={{ width: 1, height: 16, background: '#334155', margin: '0 2px' }} />

        {/* Toggle hints */}
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowHints(v => !v); }}
          style={{
            background:   showHints ? '#0ea5e9' : 'transparent',
            color:        showHints ? '#fff' : '#94a3b8',
            border:       '1px solid ' + (showHints ? '#0ea5e9' : '#334155'),
            borderRadius: 5,
            padding:      '2px 8px',
            fontSize:     11,
            cursor:       'pointer',
            fontFamily:   'system-ui',
            transition:   'all 0.15s',
          }}
        >
          # hints
        </button>
      </div>

      {/* ── Textarea ──────────────────────────────────────────────────────── */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          position:    'absolute',
          left:        `${x}px`,
          top:         `${y}px`,
          width:       `${Math.max(width + 20, 120)}px`,
          minHeight:   `${Math.max(height + 10, 40)}px`,
          fontSize:    `${fontSize}px`,
          fontFamily:  fontFamily || 'Arial',
          color:       fontColor  || '#000000',
          fontWeight:  fontWeight || 'normal',
          fontStyle:   fontStyle  || 'normal',
          textAlign:   (textAlign as any) || 'left',
          lineHeight:  '1.3',
          background:  'transparent',
          border:      `2px dashed ${hasMarkup ? '#7c3aed' : '#3b82f6'}`,
          borderRadius:'4px',
          padding:     '4px 6px',
          margin:      0,
          outline:     'none',
          resize:      'both',
          overflow:    'hidden',
          zIndex:      999,
          textShadow:  textIsLight
            ? '0 0 6px rgba(0,0,0,0.9)'
            : '0 0 6px rgba(255,255,255,0.9)',
          caretColor:           '#3b82f6',
          transformOrigin:      'top left',
          transform:            rotation ? `rotate(${rotation}deg)` : 'none',
          backdropFilter:       'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* ── Hints side panel — fixed to right edge of viewport ───────────── */}
      {showHints && (
        <div
          data-hints-panel="true"
          tabIndex={-1}
          style={{
            position:     'fixed',
            right:        12,
            top:          '50%',
            transform:    'translateY(-50%)',
            width:        220,
            zIndex:       1002,
            background:   '#0f172a',
            border:       '1px solid #1e293b',
            borderRadius: 10,
            padding:      12,
            boxShadow:    '0 8px 40px rgba(0,0,0,0.6)',
            fontFamily:   'system-ui, sans-serif',
            display:      'flex',
            flexDirection:'column',
            gap:           8,
          }}
        >
          {/* Header */}
          <div style={{
            color:         '#475569',
            fontSize:      10,
            fontWeight:    600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            paddingBottom: 6,
            borderBottom:  '1px solid #1e293b',
            display:       'flex',
            alignItems:    'center',
            gap:           5,
          }}>
            <span style={{ color: '#3b82f6' }}>✦</span>
            Markup — click to insert
          </div>

          {/* Hint rows */}
          {MARKUP_HINTS.map((hint) => (
            <button
              key={hint.label}
              onMouseDown={(e) => { e.preventDefault(); insertSnippet(hint); }}
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           8,
                background:    '#1e293b',
                border:        '1px solid #334155',
                borderRadius:  6,
                padding:       '6px 8px',
                cursor:        'pointer',
                width:         '100%',
                textAlign:     'left',
                transition:    'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.borderColor = hint.color;
                el.style.background  = '#263548';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.borderColor = '#334155';
                el.style.background  = '#1e293b';
              }}
            >
              {/* Color dot */}
              <span style={{
                width:        8,
                height:       8,
                borderRadius: '50%',
                background:   hint.color,
                flexShrink:   0,
              }} />

              {/* Label */}
              <span style={{
                color:      hint.color,
                fontSize:   11,
                fontWeight: 600,
                width:      72,
                flexShrink: 0,
              }}>
                {hint.label}
              </span>

              {/* Syntax */}
              <code style={{
                color:        '#64748b',
                fontSize:     10,
                fontFamily:   'monospace',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
                flex:         1,
              }}>
                {hint.syntax}
              </code>
            </button>
          ))}

          {/* Example block */}
          <div style={{
            background:   '#1e293b',
            borderRadius: 6,
            padding:      '8px 10px',
            border:       '1px solid #334155',
            marginTop:    2,
          }}>
            <div style={{
              color:         '#475569',
              fontSize:      9,
              fontWeight:    600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom:  5,
            }}>
              Example
            </div>
            <pre style={{
              color:      '#7dd3fc',
              fontSize:   10,
              fontFamily: 'monospace',
              lineHeight: 1.8,
              margin:     0,
              whiteSpace: 'pre-wrap',
            }}>
{`**Bold** and *italic*
__underline__ ~~strike~~
\`inline code\`
[color:#f87171]Red[/color]`}
            </pre>
          </div>

          {/* Tip */}
          <div style={{
            color:      '#475569',
            fontSize:   10,
            lineHeight: 1.5,
          }}>
            💡 Select text then click to wrap it.
          </div>
        </div>
      )}
    </>
  );
};

// ── Style helper ──────────────────────────────────────────────────────────────
function badgeStyle(bg: string): React.CSSProperties {
  return {
    background:   bg,
    color:        '#fff',
    padding:      '2px 7px',
    borderRadius: 5,
    fontSize:     10,
    fontWeight:   500,
    fontFamily:   'system-ui',
    userSelect:   'none',
    letterSpacing:'0.02em',
  };
}

export default TextEditOverlay;