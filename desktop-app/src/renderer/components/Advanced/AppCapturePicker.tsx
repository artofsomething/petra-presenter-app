import React, { useEffect, useState, useCallback } from 'react';

interface DesktopSource {
  id:        string;
  name:      string;
  thumbnail: string; // base64
  appIcon:   string | null;
}

interface AppCapturePickerProps {
  onSelect: (sourceId: string, sourceName: string) => void;
  onClose:  () => void;
}

const AppCapturePicker: React.FC<AppCapturePickerProps> = ({
  onSelect,
  onClose,
}) => {
  const [sources,    setSources]    = useState<DesktopSource[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<'all' | 'window' | 'screen'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const types: Array<'window' | 'screen'> =
        filter === 'all'   ? ['window', 'screen'] :
        filter === 'window'? ['window'] :
                             ['screen'];

      const result = await (window as any).electronAPI.getDesktopSources(types);
      setSources(result);
    } catch (err) {
      console.error('Failed to get sources:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadSources(); }, [loadSources]);

  const filtered = sources.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>📺 Capture Window / Screen</span>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Filter + Search */}
        <div style={styles.toolbar}>
          <div style={styles.filterGroup}>
            {(['all', 'window', 'screen'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...styles.filterBtn,
                  ...(filter === f ? styles.filterBtnActive : {}),
                }}
              >
                {f === 'all' ? '🖥️ All' : f === 'window' ? '🪟 Windows' : '📺 Screens'}
              </button>
            ))}
          </div>

          <input
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={styles.search}
          />

          <button onClick={loadSources} style={styles.refreshBtn}>
            🔄 Refresh
          </button>
        </div>

        {/* Grid */}
        <div style={styles.grid}>
          {loading ? (
            <div style={styles.loading}>Loading sources...</div>
          ) : filtered.length === 0 ? (
            <div style={styles.loading}>No sources found</div>
          ) : (
            filtered.map(source => (
              <button
                key={source.id}
                onClick={() => onSelect(source.id, source.name)}
                style={styles.sourceCard}
              >
                <img
                  src={source.thumbnail}
                  alt={source.name}
                  style={styles.thumbnail}
                />
                <div style={styles.sourceName}>{source.name}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position:       'fixed',
    inset:          0,
    background:     'rgba(0,0,0,0.8)',
    zIndex:         9999,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
  },
  modal: {
    background:    '#1e2330',
    borderRadius:  12,
    border:        '1px solid #2e3447',
    width:         720,
    maxHeight:     560,
    display:       'flex',
    flexDirection: 'column',
    overflow:      'hidden',
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '14px 16px',
    borderBottom:   '1px solid #2e3447',
    flexShrink:     0,
  },
  title: {
    fontSize:   14,
    fontWeight: 700,
    color:      '#e2e8f0',
  },
  closeBtn: {
    background: 'transparent',
    border:     'none',
    color:      '#94a3b8',
    fontSize:   16,
    cursor:     'pointer',
  },
  toolbar: {
    display:    'flex',
    alignItems: 'center',
    gap:        8,
    padding:    '10px 16px',
    borderBottom: '1px solid #2e3447',
    flexShrink: 0,
  },
  filterGroup: {
    display: 'flex',
    gap:     4,
  },
  filterBtn: {
    fontSize:     11,
    padding:      '4px 10px',
    borderRadius: 6,
    border:       'none',
    background:   '#374151',
    color:        '#9ca3af',
    cursor:       'pointer',
  },
  filterBtnActive: {
    background: '#3d5afe',
    color:      '#fff',
  },
  search: {
    flex:         1,
    fontSize:     12,
    padding:      '4px 10px',
    borderRadius: 6,
    border:       '1px solid #374151',
    background:   '#0f172a',
    color:        '#e2e8f0',
    outline:      'none',
  },
  refreshBtn: {
    fontSize:     11,
    padding:      '4px 10px',
    borderRadius: 6,
    border:       'none',
    background:   '#374151',
    color:        '#e2e8f0',
    cursor:       'pointer',
  },
  grid: {
    display:        'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap:            12,
    padding:        16,
    overflowY:      'auto',
    flex:           1,
  },
  sourceCard: {
    background:    '#0f172a',
    border:        '1px solid #2e3447',
    borderRadius:  8,
    padding:       8,
    cursor:        'pointer',
    display:       'flex',
    flexDirection: 'column',
    gap:           6,
    transition:    'border-color 0.15s',
  },
  thumbnail: {
    width:        '100%',
    aspectRatio:  '16/9',
    objectFit:    'cover',
    borderRadius: 4,
    background:   '#1e2330',
  },
  sourceName: {
    fontSize:     10,
    color:        '#94a3b8',
    textAlign:    'center',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap',
  },
  loading: {
    gridColumn: '1 / -1',
    textAlign:  'center',
    color:      '#64748b',
    padding:    40,
  },
};

export default AppCapturePicker;