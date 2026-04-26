// src/renderer/components/Editor/BibleLookupPanel.tsx

import React, { useState, useCallback, useEffect, useRef } from 'react';

interface BibleBook {
  id: number; name: string; name_short: string; testament: string; chapters: number;
}
interface BibleVerse {
  book_id: number; book_name: string; book_short: string;
  chapter: number; verse: number; text: string;
}
interface BibleSearchResult {
  book_id: number; book_name: string; chapter: number;
  verse: number; text: string; reference: string;
}
interface BibleLookupResult {
  reference: string; verses: BibleVerse[];
  text: string; slideText: string;
}

interface BibleLookupPanelProps {
  isOpen:     boolean;
  onClose:    () => void;
  onInsert:   (slideMarkup: string) => void;  // Insert into slide generator textarea
}

type Tab = 'lookup' | 'browse' | 'search';

const BibleLookupPanel: React.FC<BibleLookupPanelProps> = ({
  isOpen, onClose, onInsert,
}) => {
  // ── State ───────────────────────────────────────────────────────────────
  const [tab, setTab]           = useState<Tab>('lookup');
  const [books, setBooks]       = useState<BibleBook[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Lookup tab
  const [refInput, setRefInput]       = useState('');
  const [lookupResult, setLookupResult] = useState<BibleLookupResult | null>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Browse tab
  const [selectedBook, setSelectedBook]       = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterVerses, setChapterVerses]     = useState<BibleVerse[]>([]);
  const [selectedVerses, setSelectedVerses]   = useState<Set<number>>(new Set());

  // Search tab
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState<BibleSearchResult[]>([]);
  const searchTimerRef = useRef<number | null>(null);

  // ── Load books on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    window.electronAPI.bibleGetBooks().then(res => {
      if (res.success && res.data) setBooks(res.data);
    });
  }, [isOpen]);

  // ── Focus input on open ─────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && tab === 'lookup') {
      setTimeout(() => refInputRef.current?.focus(), 100);
    }
  }, [isOpen, tab]);

  // ── Quick lookup ────────────────────────────────────────────────────────
  const handleLookup = useCallback(async () => {
    if (!refInput.trim()) return;
    setLoading(true);
    setError(null);
    setLookupResult(null);

    const res = await window.electronAPI.bibleLookup(refInput.trim());

    if (res.success && res.data) {
      setLookupResult(res.data);
    } else {
      setError(res.error || 'Ayat tidak ditemukan');
    }
    setLoading(false);
  }, [refInput]);

  // ── Browse: load chapter ────────────────────────────────────────────────
  useEffect(() => {
    if (selectedBook === null || selectedChapter === null) return;
    setLoading(true);
    window.electronAPI.bibleGetChapter(selectedBook, selectedChapter).then(res => {
      if (res.success && res.data) setChapterVerses(res.data);
      setLoading(false);
    });
    setSelectedVerses(new Set());
  }, [selectedBook, selectedChapter]);

  // ── Search with debounce ────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }

    searchTimerRef.current = window.setTimeout(async () => {
      setLoading(true);
      const res = await window.electronAPI.bibleSearch(searchQuery, 30);
      if (res.success && res.data) setSearchResults(res.data);
      setLoading(false);
    }, 400);

    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  // ── Toggle verse selection (browse tab) ─────────────────────────────────
  const toggleVerse = (verseNum: number) => {
    setSelectedVerses(prev => {
      const next = new Set(prev);
      if (next.has(verseNum)) next.delete(verseNum);
      else next.add(verseNum);
      return next;
    });
  };

  // ── Insert selected verses from browse ──────────────────────────────────
  const handleInsertBrowseSelection = useCallback(() => {
    if (selectedVerses.size === 0 || !chapterVerses.length) return;

    const sorted  = [...selectedVerses].sort((a, b) => a - b);
    const verses  = chapterVerses.filter(v => sorted.includes(v.verse));
    const book    = books.find(b => b.id === selectedBook);
    if (!book || !verses.length) return;

    const first = sorted[0];
    const last  = sorted[sorted.length - 1];
    const ref   = first === last
      ? `${book.name} ${selectedChapter}:${first}`
      : `${book.name} ${selectedChapter}:${first}-${last}`;

    const lines = [
      `# ${ref}`,
      ...verses.map(v => `${v.verse}  ${v.text}`),
    ];

    onInsert(lines.join('\n'));
    onClose();
  }, [selectedVerses, chapterVerses, selectedBook, selectedChapter, books, onInsert, onClose]);

  // ── Insert search result ────────────────────────────────────────────────
  const handleInsertSearchResult = useCallback((result: BibleSearchResult) => {
    const markup = `# ${result.reference}\n${result.verse}  ${result.text}`;
    onInsert(markup);
    onClose();
  }, [onInsert, onClose]);

  if (!isOpen) return null;

  const selectedBookObj = books.find(b => b.id === selectedBook);

  return (
    <div style={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>

        {/* ── Header ── */}
        <div style={styles.header}>
          <div>
            <div style={styles.headerTitle}>📖 Alkitab Indonesia</div>
            <div style={styles.headerSub}>Terjemahan Baru (TB)</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── Tabs ── */}
        <div style={styles.tabs}>
          {([
            { key: 'lookup' as Tab, icon: '🔍', label: 'Cari Ayat' },
            { key: 'browse' as Tab, icon: '📚', label: 'Jelajahi' },
            { key: 'search' as Tab, icon: '🔎', label: 'Cari Kata' },
          ]).map(t => (
            <button
              key={t.key}
              style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}
              onClick={() => setTab(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ══════════ LOOKUP TAB ══════════ */}
        {tab === 'lookup' && (
          <div style={styles.body}>
            <div style={styles.lookupRow}>
              <input
                ref={refInputRef}
                type="text"
                value={refInput}
                onChange={e => setRefInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleLookup(); }}
                placeholder="Contoh: Yohanes 3:16 atau Mzm 23 atau Roma 8:28-30"
                style={styles.lookupInput}
              />
              <button
                style={styles.lookupBtn}
                onClick={handleLookup}
                disabled={loading || !refInput.trim()}
              >
                {loading ? '⏳' : '🔍'} Cari
              </button>
            </div>

            {/* Quick reference hints */}
            <div style={styles.hints}>
              {['Yohanes 3:16', 'Mazmur 23', 'Roma 8:28-30', 'Kejadian 1', 'Filipi 4:13'].map(ref => (
                <button
                  key={ref}
                  style={styles.hintChip}
                  onClick={() => { setRefInput(ref); }}
                >
                  {ref}
                </button>
              ))}
            </div>

            {error && <div style={styles.errorBox}>⚠️ {error}</div>}

            {lookupResult && (
              <div style={styles.resultCard}>
                <div style={styles.resultHeader}>
                  <span style={styles.resultRef}>{lookupResult.reference}</span>
                  <span style={styles.resultCount}>
                    {lookupResult.verses.length} ayat
                  </span>
                </div>

                <div style={styles.verseList}>
                  {lookupResult.verses.map(v => (
                    <div key={v.verse} style={styles.verseRow}>
                      <span style={styles.verseNum}>{v.verse}</span>
                      <span style={styles.verseText}>{v.text}</span>
                    </div>
                  ))}
                </div>

                {/* Preview of slide markup */}
                <div style={styles.previewBox}>
                  <div style={styles.previewLabel}>📝 Slide markup preview:</div>
                  <pre style={styles.previewCode}>{lookupResult.slideText}</pre>
                </div>

                <button
                  style={styles.insertBtn}
                  onClick={() => { onInsert(lookupResult.slideText); onClose(); }}
                >
                  ⚡ Masukkan ke Slide Generator
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════ BROWSE TAB ══════════ */}
        {tab === 'browse' && (
          <div style={styles.body}>
            <div style={styles.browseLayout}>

              {/* Book list */}
              <div style={styles.bookList}>
                <div style={styles.bookListHeader}>Kitab</div>
                <div style={styles.bookListScroll}>
                  {['PL', 'PB'].map(testament => (
                    <div key={testament}>
                      <div style={styles.testamentLabel}>
                        {testament === 'PL' ? '📜 Perjanjian Lama' : '✝️ Perjanjian Baru'}
                      </div>
                      {books.filter(b => b.testament === testament).map(book => (
                        <button
                          key={book.id}
                          style={{
                            ...styles.bookItem,
                            ...(selectedBook === book.id ? styles.bookItemActive : {}),
                          }}
                          onClick={() => {
                            setSelectedBook(book.id);
                            setSelectedChapter(null);
                            setChapterVerses([]);
                            setSelectedVerses(new Set());
                          }}
                        >
                          <span>{book.name}</span>
                          <span style={styles.bookChapters}>{book.chapters}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chapter selector + verses */}
              <div style={styles.browseContent}>
                {selectedBook && (
                  <>
                    {/* Chapter grid */}
                    <div style={styles.chapterGrid}>
                      <div style={styles.chapterLabel}>
                        {selectedBookObj?.name} — Pilih Pasal:
                      </div>
                      <div style={styles.chapterButtons}>
                        {Array.from(
                          { length: selectedBookObj?.chapters ?? 0 },
                          (_, i) => i + 1,
                        ).map(ch => (
                          <button
                            key={ch}
                            style={{
                              ...styles.chapterBtn,
                              ...(selectedChapter === ch ? styles.chapterBtnActive : {}),
                            }}
                            onClick={() => setSelectedChapter(ch)}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Verses */}
                    {selectedChapter && (
                      <div style={styles.browseVerses}>
                        <div style={styles.browseVersesHeader}>
                          <span>
                            {selectedBookObj?.name} {selectedChapter}
                            {selectedVerses.size > 0 && (
                              <span style={styles.selectedBadge}>
                                {selectedVerses.size} dipilih
                              </span>
                            )}
                          </span>
                          {selectedVerses.size > 0 && (
                            <button style={styles.insertBtnSmall} onClick={handleInsertBrowseSelection}>
                              ⚡ Masukkan
                            </button>
                          )}
                        </div>

                        <div style={styles.browseVerseList}>
                          {loading ? (
                            <div style={styles.loadingText}>Memuat...</div>
                          ) : (
                            chapterVerses.map(v => (
                              <div
                                key={v.verse}
                                style={{
                                  ...styles.browseVerseRow,
                                  ...(selectedVerses.has(v.verse)
                                    ? styles.browseVerseSelected : {}),
                                }}
                                onClick={() => toggleVerse(v.verse)}
                              >
                                <span style={styles.browseVerseNum}>{v.verse}</span>
                                <span style={styles.browseVerseText}>{v.text}</span>
                                {selectedVerses.has(v.verse) && (
                                  <span style={styles.checkMark}>✓</span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!selectedBook && (
                  <div style={styles.emptyState}>
                    <span style={{ fontSize: 48 }}>📖</span>
                    <span style={{ color: '#475569', marginTop: 12 }}>
                      Pilih kitab di sebelah kiri
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ SEARCH TAB ══════════ */}
        {tab === 'search' && (
          <div style={styles.body}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Ketik kata untuk mencari di seluruh Alkitab..."
              style={styles.searchInput}
              autoFocus
            />

            {loading && <div style={styles.loadingText}>Mencari...</div>}

            {searchResults.length > 0 && (
              <div style={styles.searchResultCount}>
                {searchResults.length} hasil ditemukan
              </div>
            )}

            <div style={styles.searchList}>
              {searchResults.map((r, i) => (
                <div key={i} style={styles.searchResultItem}>
                  <div style={styles.searchResultRef}>{r.reference}</div>
                  <div style={styles.searchResultText}>{r.text}</div>
                  <button
                    style={styles.insertBtnSmall}
                    onClick={() => handleInsertSearchResult(r)}
                  >
                    ⚡ Masukkan
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
  },
  modal: {
    width: 900, maxHeight: '90vh', background: '#1a1f2e',
    borderRadius: 12, border: '1px solid #2e3447',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid #2e3447',
  },
  headerTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: 700 },
  headerSub:   { color: '#64748b', fontSize: 11, marginTop: 2 },
  closeBtn: {
    background: 'transparent', border: 'none', color: '#8b92a5',
    fontSize: 18, cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
  },
  tabs: {
    display: 'flex', gap: 2, padding: '8px 18px 0',
    borderBottom: '1px solid #2e3447',
  },
  tab: {
    background: 'transparent', border: 'none',
    borderBottom: '2px solid transparent', color: '#8b92a5',
    fontSize: 13, fontWeight: 500, padding: '8px 14px',
    cursor: 'pointer', marginBottom: -1,
  },
  tabActive: { color: '#e2e8f0', borderBottom: '2px solid #3d5afe' },

  body: {
    flex: 1, overflow: 'auto', padding: 16,
    display: 'flex', flexDirection: 'column', gap: 12,
  },

  // Lookup
  lookupRow: { display: 'flex', gap: 8 },
  lookupInput: {
    flex: 1, background: '#111827', border: '1px solid #2e3447', borderRadius: 8,
    color: '#e2e8f0', fontSize: 14, padding: '10px 14px', outline: 'none',
    fontFamily: 'inherit',
  },
  lookupBtn: {
    background: '#3d5afe', border: 'none', color: '#fff',
    fontSize: 13, fontWeight: 600, padding: '10px 18px', borderRadius: 8,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  hints: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  hintChip: {
    background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
    fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
  },
  errorBox: {
    background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8,
    color: '#fca5a5', fontSize: 12, padding: '10px 14px',
  },

  resultCard: {
    background: '#111827', border: '1px solid #2e3447', borderRadius: 10,
    overflow: 'hidden',
  },
  resultHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: '1px solid #1e2330',
  },
  resultRef:   { color: '#7dd3fc', fontSize: 14, fontWeight: 700 },
  resultCount: { color: '#64748b', fontSize: 11 },

  verseList: {
    padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8,
    maxHeight: 250, overflowY: 'auto',
  },
  verseRow:  { display: 'flex', gap: 10, alignItems: 'flex-start' },
  verseNum:  { color: '#3d5afe', fontSize: 11, fontWeight: 700, minWidth: 24, textAlign: 'right', flexShrink: 0, marginTop: 2 },
  verseText: { color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 },

  previewBox: {
    margin: '0 16px', padding: 12, background: '#0f172a',
    borderRadius: 8, border: '1px solid #1e2330',
  },
  previewLabel: { color: '#64748b', fontSize: 10, marginBottom: 6, fontWeight: 600 },
  previewCode: {
    color: '#6ee7b7', fontSize: 11, fontFamily: 'monospace',
    lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap',
  },
  insertBtn: {
    margin: 16, background: '#3d5afe', border: 'none', color: '#fff',
    fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 8,
    cursor: 'pointer', textAlign: 'center',
  },
  insertBtnSmall: {
    background: '#3d5afe', border: 'none', color: '#fff',
    fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6,
    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  },

  // Browse
  browseLayout: { display: 'flex', gap: 0, flex: 1, minHeight: 0, height: 480 },
  bookList: {
    width: 200, borderRight: '1px solid #2e3447',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
  },
  bookListHeader: {
    padding: '8px 12px', color: '#64748b', fontSize: 11, fontWeight: 700,
    borderBottom: '1px solid #1e2330', textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  bookListScroll: { flex: 1, overflowY: 'auto' },
  testamentLabel: {
    padding: '8px 12px 4px', color: '#475569', fontSize: 10,
    fontWeight: 700, textTransform: 'uppercase',
  },
  bookItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', padding: '6px 12px', background: 'transparent',
    border: 'none', color: '#cbd5e1', fontSize: 12, cursor: 'pointer',
    textAlign: 'left',
  },
  bookItemActive: { background: '#1e3a5f', color: '#7dd3fc' },
  bookChapters: { color: '#475569', fontSize: 10 },

  browseContent: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  chapterGrid: { padding: 12, borderBottom: '1px solid #1e2330', flexShrink: 0 },
  chapterLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 8, fontWeight: 600 },
  chapterButtons: {
    display: 'flex', flexWrap: 'wrap', gap: 4,
  },
  chapterBtn: {
    width: 36, height: 30, background: '#1e293b', border: '1px solid #334155',
    color: '#cbd5e1', fontSize: 12, borderRadius: 6, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  chapterBtnActive: { background: '#3d5afe', borderColor: '#3d5afe', color: '#fff', fontWeight: 700 },

  browseVerses: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  browseVersesHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', borderBottom: '1px solid #1e2330',
    color: '#e2e8f0', fontSize: 13, fontWeight: 600,
  },
  selectedBadge: {
    marginLeft: 8, background: '#3d5afe', color: '#fff',
    fontSize: 10, padding: '2px 8px', borderRadius: 10,
  },
  browseVerseList: {
    flex: 1, overflowY: 'auto', padding: '8px 0',
  },
  browseVerseRow: {
    display: 'flex', gap: 10, padding: '6px 12px', cursor: 'pointer',
    alignItems: 'flex-start', borderLeft: '3px solid transparent',
    transition: 'all 0.1s',
  },
  browseVerseSelected: {
    background: '#1e3a5f33', borderLeftColor: '#3d5afe',
  },
  browseVerseNum: {
    color: '#64748b', fontSize: 11, fontWeight: 700,
    minWidth: 24, textAlign: 'right', flexShrink: 0, marginTop: 2,
  },
  browseVerseText: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, flex: 1 },
  checkMark: { color: '#3d5afe', fontSize: 14, fontWeight: 700, flexShrink: 0 },

  emptyState: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
  },

  // Search
  searchInput: {
    background: '#111827', border: '1px solid #2e3447', borderRadius: 8,
    color: '#e2e8f0', fontSize: 14, padding: '10px 14px', outline: 'none',
  },
  searchResultCount: { color: '#64748b', fontSize: 11 },
  searchList: {
    flex: 1, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  searchResultItem: {
    background: '#111827', border: '1px solid #2e3447', borderRadius: 8,
    padding: 12, display: 'flex', flexDirection: 'column', gap: 6,
  },
  searchResultRef: { color: '#7dd3fc', fontSize: 12, fontWeight: 700 },
  searchResultText: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 },

  loadingText: { color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 },
};

export default BibleLookupPanel;