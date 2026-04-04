import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FONTS, CATEGORY_LABELS, type FontOption } from '../../constants/fonts';

interface FontPickerProps {
  value: string;
  onChange: (fontFamily: string) => void;
}

const ALL_CATEGORIES = ['sans-serif', 'serif', 'display', 'handwriting', 'monospace'] as const;

const FontPicker: React.FC<FontPickerProps> = ({ value, onChange }) => {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const containerRef        = useRef<HTMLDivElement>(null);
  const searchRef           = useRef<HTMLInputElement>(null);

  // ── Close on outside click ─────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Auto-focus search when opened ─────────────────────
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const filtered = FONTS.filter((f) => {
    const matchSearch   = f.label.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'all' || f.category === category;
    return matchSearch && matchCategory;
  });

  const handleSelect = useCallback((font: FontOption) => {
    onChange(font.value);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const currentLabel = FONTS.find((f) => f.value === value)?.label ?? value;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>

      {/* ── Trigger ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 8px',
          background: '#374151',
          border: `1px solid ${open ? '#3b82f6' : '#4b5563'}`,
          borderRadius: 6,
          color: '#fff',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: value,
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentLabel}
        </span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          style={{ flexShrink: 0, marginLeft: 4,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s' }}
        >
          <path d="M1 3l4 4 4-4" />
        </svg>
      </button>

      {/* ── Dropdown ────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 99999,
          width: 240,
          background: '#1f2937',
          border: '1px solid #374151',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>

          {/* Search ───────────────────── */}
          <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid #374151' }}>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search fonts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                background: '#374151',
                border: '1px solid #4b5563',
                borderRadius: 5,
                color: '#fff',
                fontSize: 11,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Category tabs ──────────── */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            padding: '6px 8px',
            borderBottom: '1px solid #374151',
          }}>
            {['all', ...ALL_CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                style={{
                  padding: '2px 7px',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: category === cat ? '#3b82f6' : '#4b5563',
                  background: category === cat ? '#3b82f6' : 'transparent',
                  color: category === cat ? '#fff' : '#9ca3af',
                  fontSize: 10,
                  cursor: 'pointer',
                  fontWeight: category === cat ? 600 : 400,
                  transition: 'all 0.12s',
                }}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Font list ───────────────── */}
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{
                padding: 16, textAlign: 'center',
                color: '#6b7280', fontSize: 11,
              }}>
                No fonts found
              </div>
            ) : (
              filtered.map((font) => {
                const isSelected = font.value === value;
                return (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => handleSelect(font)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '7px 10px',
                      background: isSelected ? '#1e3a5f' : 'transparent',
                      border: 'none',
                      borderLeft: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                      color: isSelected ? '#93c5fd' : '#e5e7eb',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                      gap: 8,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLButtonElement).style.background = '#374151';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >
                    {/* Font name rendered in its own font */}
                    <span style={{
                      fontFamily: font.value,
                      fontSize: 14,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {font.label}
                    </span>

                    {/* Category badge */}
                    <span style={{
                      fontSize: 9,
                      color: '#6b7280',
                      flexShrink: 0,
                      background: '#111827',
                      padding: '1px 5px',
                      borderRadius: 3,
                    }}>
                      {CATEGORY_LABELS[font.category]}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FontPicker;