// src/renderer/components/Stage/StageDisplay.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import usePresentationStore from '../../store/usePresentation';
import { useSocket }        from '../../hooks/useSocket';
import StageFileTab         from './StageFileTab';
import StageSlidePicker     from './StageSlidePicker';
import StageOutput          from './StageOutput';
import ConnectionPanel      from '../Controller/ConnectionPanel';
import { readFileAsJson }   from '../../utils/fileManager';
import { loadFromArchive }  from '../../utils/presentationArchive';
import type { Presentation, StageFile } from '../../../server/types';
import { v4 as uuid }       from 'uuid';
import DisplaySettings from '../Editor/DisplaySettings';

// ── Loading state ─────────────────────────────────────────────────────────────
interface LoadingState {
  filename: string;
  progress: number;
}

// ── Socket options (stable reference) ────────────────────────────────────────
const SOCKET_OPTIONS = { role: 'stage-display' as const, name: 'Stage Display' };

const StageDisplay: React.FC = () => {

  // ── Socket ────────────────────────────────────────────────────────────────
  const {
    isConnected,
    emit,
    emitStartPresentation,
    emitStopPresentation,
    emitToggleBlackScreen,
    emitUpdatePresentation,
} = useSocket(SOCKET_OPTIONS);

  // ── Store ─────────────────────────────────────────────────────────────────
  const {
    stage,
    isPresenting,
    isBlackScreen,
    setIsPresenting,
    stageLoadFile,
    stageUpdateFile,
    stageRemoveFile,
    stageSetActiveFile,
    stageSetSlide,
    stageClear,
    stageSetPresentingFile
  } = usePresentationStore();

  // ── Local state ───────────────────────────────────────────────────────────
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const [loading,       setLoading]       = useState<LoadingState | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [showConnection, setShowConnection] = useState(false);
  const prevFileIdRef = useRef<string | null>(null);
    const prevPresentingRef = useRef<boolean>(false);

  // ── Active file + slide ───────────────────────────────────────────────────
  const activeFile  = stage.files.find(f => f.id === stage.activeFileId);
  const activeSlideIndex = activeFile?.activeSlideIndex ?? 0;
  const activeSlide = activeFile?.presentation.slides[activeSlideIndex];
  // ── Sync slide index to socket when presenting ────────────────────────────
useEffect(() => {
  if (!isConnected || !isPresenting) return;
  if (!stage.presentingFileId) return;
  if (stage.activeFileId !== stage.presentingFileId) return;

  const presentingFile = stage.files.find(f => f.id === stage.presentingFileId);
  if (!presentingFile) return;

  const currentIndex = presentingFile.activeSlideIndex ?? 0; // ✅ per-file
  if (currentIndex === stage.presentingSlideIndex) return;   // no change

  stageSetPresentingFile(stage.presentingFileId, currentIndex);
  emit('go-to-slide', currentIndex);

}, [
  activeFile?.activeSlideIndex,  // ✅ per-file index
  stage.activeFileId,
  stage.presentingFileId,
  stage.presentingSlideIndex,
  isPresenting,
  isConnected,
]);

useEffect(() => {
  if (!window.electronAPI?.onFileChanged) return;

  const unsubscribe = window.electronAPI.onFileChanged(
    async (changedPath: string) => {
      const matchingFile = stage.files.find(f => f.filePath === changedPath);
      if (!matchingFile) return;

      try {
        const result = await window.electronAPI.readFile(changedPath);
        if (result?.error || !result?.content) return;

        const parsed = JSON.parse(result.content);
        if (!isValidPresentation(parsed)) return;

        // ✅ use stageUpdateFile
        stageUpdateFile({
          ...matchingFile,
          presentation: parsed,
        });

        console.log('[StageDisplay] ✅ Auto-reloaded:', matchingFile.name);
      } catch (err) {
        console.error('[StageDisplay] Auto-reload failed:', err);
      }
    }
  );

  return () => unsubscribe?.();
}, [stage.files, stageUpdateFile]);  // ✅ updated dep


  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          if (activeFile) {
            const max = activeFile.presentation.slides.length - 1;
            if (activeSlideIndex < max) {
              stageSetSlide(activeFile.id, activeSlideIndex + 1);
            }
          }
          break;

        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          if (activeFile && activeSlideIndex > 0) {
            stageSetSlide(activeFile.id, activeSlideIndex - 1);
          }
          break;

        case 'Escape':
          if (isPresenting) handleStopPresentation();
          break;

        case 'b':
        case 'B':
          handleToggleBlackScreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, activeSlideIndex, isPresenting]);


  const handleGoLive = useCallback(async (
  file:       StageFile,
  slideIndex: number,
) => {
  if (!isConnected) return;

  const isSameFile = file.id === stage.presentingFileId;

  if (isSameFile) {
    // ✅ Same file - just change slide
    stageSetPresentingFile(file.id, slideIndex);
    emit('go-to-slide', slideIndex);
    console.log('[StageDisplay] Go Live → same file, slide', slideIndex);
  } else {
    // ✅ Different file
    console.log('[StageDisplay] Go Live → switching to:', file.name, 'slide', slideIndex);
    try {
      // Step 1: Push full presentation with correct index
      await emitUpdatePresentation(file.presentation, slideIndex);

      // ✅ Step 2: Explicitly emit go-to-slide AFTER presentation is pushed
      // Small delay to ensure server processed update-presentation first
      await new Promise<void>(resolve => setTimeout(resolve, 150));
      emit('go-to-slide', slideIndex);

      // Step 3: Update local presenting state
      stageSetPresentingFile(file.id, slideIndex);
      console.log('[StageDisplay] ✅ Switched live to:', file.name, 'slide', slideIndex);
    } catch (err) {
      console.error('[StageDisplay] Go Live error:', err);
    }
  }
}, [
  stage.presentingFileId,
  isConnected,
  emit,
  emitUpdatePresentation,
  stageSetPresentingFile,
]);
const handleOpenInEditor = useCallback(async () => {
  if (!activeFile) return;

  if (!window.electronAPI?.openEditorWindow) {
    alert('Open in Editor is only available in the desktop app.');
    return;
  }

  try {
    // ✅ Serialize current presentation to JSON
    const content = JSON.stringify(activeFile.presentation, null, 2);

    const result = await window.electronAPI.openEditorWindow({
      filePath: activeFile.filePath,   // might be undefined if loaded via input
      fileName: activeFile.name,
      content,
    });

    if (result?.reused) {
      console.log('[StageDisplay] Focused existing editor window');
    } else {
      console.log('[StageDisplay] Opened new editor window');
    }
  } catch (err) {
    console.error('[StageDisplay] Failed to open editor:', err);
  }
}, [activeFile]);
  // ── Presentation control ──────────────────────────────────────────────────
  const handleStartPresentation = useCallback(async () => {
    if (!activeFile) {
      alert('Please load a presentation file first.');
      return;
    }
    const slideIndex = activeFile.activeSlideIndex ?? 0; // ✅ per-file

    try {
      if (isConnected) {
        await emitUpdatePresentation(activeFile.presentation, slideIndex);
        await new Promise<void>(resolve => setTimeout(resolve, 400));
      }
      if (window.electronAPI) {
        await window.electronAPI.openPresentation();
      } else {
        window.open('/#/presentation', '_blank', 'fullscreen=yes');
      }
      stageSetPresentingFile(activeFile.id, slideIndex);
      setIsPresenting(true);
      emitStartPresentation();
    } catch (err: any) {
      console.error('[StageDisplay] Start error:', err);
      try {
        if (window.electronAPI) await window.electronAPI.openPresentation();
        else window.open('/#/presentation', '_blank', 'fullscreen=yes');
      } catch {}
      stageSetPresentingFile(activeFile.id, slideIndex);
      setIsPresenting(true);
      emitStartPresentation();
    }
  }, [
    activeFile,
    isConnected,
    emitUpdatePresentation,
    emitStartPresentation,
    stageSetPresentingFile,
    setIsPresenting,
  ]);
  const isReloadRef = useRef<boolean>(false);

    const handleStopPresentation = useCallback(async () => {
    try {
        if (window.electronAPI) await window.electronAPI.closePresentation();
    } catch {}
    stageSetPresentingFile(null,0);
    setIsPresenting(false);
    emitStopPresentation();
    }, [emitStopPresentation, setIsPresenting]);



  const handleToggleBlackScreen = useCallback(() => {
    emitToggleBlackScreen();
  }, [emitToggleBlackScreen]);

  // ── Electron IPC ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.onRemotePresentationStarted?.(() => setIsPresenting(true));
    window.electronAPI.onRemotePresentationStopped?.(() => setIsPresenting(false));
    window.electronAPI.onPresentationClosed?.(() => setIsPresenting(false));
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────
  function isValidPresentation(data: unknown): data is Presentation {
    if (!data || typeof data !== 'object') return false;
    const p = data as Record<string, unknown>;
    return (
      typeof p.id   === 'string' &&
      typeof p.name === 'string' &&
      Array.isArray(p.slides)   &&
      p.slides.every(
        (s: unknown) =>
          s !== null &&
          typeof s === 'object' &&
          typeof (s as Record<string, unknown>).id === 'string' &&
          Array.isArray((s as Record<string, unknown>).elements),
      )
    );
  }

  // ── File loader ───────────────────────────────────────────────────────────

  // ── Reload active file ────────────────────────────────────────────────────
const handleReloadFile = useCallback(async () => {
  if (!activeFile) return;
  setError(null);

  if (activeFile.filePath && window.electronAPI?.readFile) {
    setLoading({ filename: activeFile.name, progress: 50 });
    try {
      const result = await window.electronAPI.readFile(activeFile.filePath);

      if (result?.error || !result?.content) {
        setError(`Reload failed: ${result?.error ?? 'empty response'}`);
        return;
      }

      let presentation: Presentation;
      try {
        presentation = JSON.parse(result.content);
      } catch {
        setError('Reload failed: invalid JSON in file.');
        return;
      }

      if (!isValidPresentation(presentation)) {
        setError('Reload failed: file is not a valid presentation.');
        return;
      }

      // ✅ stageUpdateFile replaces presentation in-place — no early-return bug
      stageUpdateFile({
        ...activeFile,
        presentation,
      });

      console.log('[StageDisplay] ✅ Reloaded:', activeFile.name,
        presentation.slides.length, 'slides');

    } catch (err: any) {
      setError(err?.message ?? 'Reload failed.');
      console.error('[StageDisplay] Reload error:', err);
    } finally {
      setLoading(null);
    }
    return;
  }

  // No path: re-open file picker
  isReloadRef.current = true;
  fileInputRef.current?.click();
}, [activeFile, stageUpdateFile]);

  const handleLoadFile = useCallback(() => {
    setError(null);
    fileInputRef.current?.click();
  }, []);

  const onFileSelected = useCallback(async (
  e: React.ChangeEvent<HTMLInputElement>,
) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';
  setError(null);

  const isReload = isReloadRef.current;
  isReloadRef.current = false;          // reset immediately

  try {
    let presentation: Presentation;
    const isPreszip = file.name.toLowerCase().endsWith('.preszip');

    if (isPreszip) {
      setLoading({ filename: file.name, progress: 0 });
      presentation = await loadFromArchive(file, (pct) => {
        setLoading({ filename: file.name, progress: pct });
      });
      setLoading(null);

      if (!isValidPresentation(presentation)) {
        setError('Invalid .preszip — missing required presentation data.');
        return;
      }
    } else {
      const json = await readFileAsJson(file);
      if (!json) { setError('Could not read file.'); return; }
      if (!isValidPresentation(json)) {
        setError('Invalid file. Must be a valid .petra or .json file.');
        return;
      }
      presentation = json;
    }

    if (isReload && activeFile) {
      // ✅ stageUpdateFile — replaces presentation, keeps id/name/filePath/slideIndex
      stageUpdateFile({
        ...activeFile,
        presentation,
      });
      console.log('[StageDisplay] ✅ Reloaded via picker:', activeFile.name);
    } else {
      const stageFile: StageFile = {
        id:               uuid(),
        name:             file.name.replace(/\.[^/.]+$/, ''),
        presentation,
        activeSlideIndex: 0,
        filePath:         undefined,
      };
      stageLoadFile(stageFile);
    }

  } catch (err: any) {
    setLoading(null);
    isReloadRef.current = false;
    setError(err?.message ?? 'Failed to load file.');
    console.error('[StageDisplay] Load error:', err);
  }
}, [activeFile, activeSlideIndex, stageLoadFile]);

  // ── Slide navigation ──────────────────────────────────────────────────────
  const handlePrevSlide = useCallback(() => {
    if (!activeFile || activeSlideIndex <= 0) return;
    stageSetSlide(activeFile.id, activeSlideIndex - 1);
  }, [activeFile, activeSlideIndex, stageSetSlide]);

  const handleNextSlide = useCallback(() => {
    if (!activeFile) return;
    const max = activeFile.presentation.slides.length - 1;
    if (activeSlideIndex < max) {
      stageSetSlide(activeFile.id, activeSlideIndex + 1);
    }
  }, [activeFile, activeSlideIndex, stageSetSlide]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".petra,.json,.preszip"
        style={{ display: 'none' }}
        onChange={onFileSelected}
      />

      {/* ══ TOP TOOLBAR (matches Editor header style) ══ */}
      <div style={styles.toolbar}>

        {/* Left: title + connection status */}
        <div style={styles.toolbarLeft}>
          <span style={styles.toolbarTitle}>🎬 Stage Display</span>

          <span style={{
            ...styles.badge,
            background: isConnected ? '#14532d' : '#450a0a',
            color:      isConnected ? '#4ade80' : '#f87171',
          }}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>

          {activeFile && (
            <span style={styles.slideCountBadge}>
              {activeSlideIndex + 1} / {activeFile.presentation.slides.length}
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div style={styles.toolbarRight}>
          <DisplaySettings />
          {/* Load File */}
          <button
            onClick={handleLoadFile}
            disabled={!!loading}
            style={{ ...styles.btn, ...styles.btnBlue }}
            title="Load a .petra, .json, or .preszip file"
          >
            📂 Load File
          </button>
          {activeFile && (
            <button
              onClick={handleOpenInEditor}
              style={{ ...styles.btn, ...styles.btnPurple }}
              title="Open current file in Editor window"
            >
              ✏️ Open in Editor
            </button>
          )}
          {/* Reload File */}
          {activeFile && (
            <button
              onClick={handleReloadFile}
              disabled={!!loading}
              style={{
                ...styles.btn,
                ...styles.btnGray,
                opacity: loading ? 0.5 : 1,
              }}
              title={
                activeFile.filePath
                  ? `Reload "${activeFile.name}" from disk`
                  : `Re-select "${activeFile.name}" to reload`
              }
            >
              🔄 Reload
            </button>
          )}
          {/* Divider */}
          <div style={styles.divider} />

          {/* Slide navigation */}
          <button
            onClick={handlePrevSlide}
            disabled={!activeFile || activeSlideIndex <= 0}
            style={{
              ...styles.btn,
              ...styles.btnGray,
              opacity: (!activeFile || activeSlideIndex <= 0) ? 0.4 : 1,
            }}
            title="Previous slide (← Arrow)"
          >
            ◀ Prev
          </button>

          <button
            onClick={handleNextSlide}
            disabled={
              !activeFile ||
              activeSlideIndex >= (activeFile?.presentation.slides.length ?? 1) - 1
            }
            style={{
              ...styles.btn,
              ...styles.btnGray,
              opacity: (
                !activeFile ||
                activeSlideIndex >= (activeFile?.presentation.slides.length ?? 1) - 1
              ) ? 0.4 : 1,
            }}
            title="Next slide (→ Arrow)"
          >
            Next ▶
          </button>

          {/* Divider */}
          <div style={styles.divider} />

          {/* Present / Stop */}
          {!isPresenting ? (
            <button
              onClick={handleStartPresentation}
              style={{ ...styles.btn, ...styles.btnGreen }}
              title="Start Presentation (F5)"
            >
              ▶ Present
            </button>
          ) : (
            <button
              onClick={handleStopPresentation}
              style={{ ...styles.btn, ...styles.btnRed }}
              title="Stop Presentation (Esc)"
            >
              ⏹ Stop
            </button>
          )}

          {/* Black Screen */}
          <button
            onClick={handleToggleBlackScreen}
            style={{
              ...styles.btn,
              ...(isBlackScreen ? styles.btnBlackActive : styles.btnGray),
            }}
            title="Toggle Black Screen (B)"
          >
            {isBlackScreen ? '🖥️ Unblack' : '🖥️ Black'}
          </button>

          {/* Divider */}
          <div style={styles.divider} />

          {/* Connect */}
          <button
            onClick={() => setShowConnection(true)}
            style={{ ...styles.btn, ...styles.btnPurple }}
            title="Show Connection Info"
          >
            📱 Connect
          </button>

          {/* Clear all */}
          {stage.files.length > 0 && !loading && (
            <button
              onClick={stageClear}
              style={{ ...styles.btn, ...styles.btnDanger }}
              title="Clear all loaded files"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ══ MAIN AREA ══ */}
      <div style={styles.mainArea}>

        {/* ══ LEFT — sidebar ══ */}
        <div style={styles.sidebar}>

          {/* Loading progress */}
          {loading && (
            <div style={styles.loadingBox}>
              <div style={styles.loadingFilename}>📦 {loading.filename}</div>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressBar, width: `${loading.progress}%` }} />
              </div>
              <div style={styles.loadingPct}>
                Extracting assets… {loading.progress}%
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <span>⚠️ {error}</span>
              <button
                onClick={() => setError(null)}
                style={styles.errorDismiss}
              >✕</button>
            </div>
          )}

          {/* Empty state */}
          {stage.files.length === 0 && !loading && (
            <div style={styles.empty}>
              <span style={{ fontSize: 36 }}>🎬</span>
              <span style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
                No presentations loaded
              </span>
              <span style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                .petra · .json · .preszip
              </span>
              <button
                onClick={handleLoadFile}
                style={{ ...styles.btn, ...styles.btnBlue, marginTop: 16 }}
              >
                + Load Presentation
              </button>
            </div>
          )}

          {/* File tabs */}
          {stage.files.length > 0 && (
            <div style={styles.fileTabs}>
              {stage.files.map(file => (
                <StageFileTab
                  key={file.id}
                  file={file}
                  isActive={stage.activeFileId === file.id}
                  isLive={
                    isPresenting && stage.presentingFileId === file.id
                  }
                  onSelect={() => stageSetActiveFile(file.id)}
                  onRemove={() => stageRemoveFile(file.id)}
                />
              ))}
            </div>
          )}

          {/* Slide picker */}
          {activeFile && (
            <StageSlidePicker
              file={activeFile}
              onSelect={(i) => stageSetSlide(activeFile.id, i)}
              isFilePresenting={
                  isPresenting && stage.presentingFileId === activeFile.id  // ✅ conditional
                }
                presentingSlideIndex={stage.presentingSlideIndex ?? -1}
                isPresenting={isPresenting}                                  // ✅ ADD
                onGoLive={(slideIndex) => handleGoLive(activeFile, slideIndex)} // ✅ ADD
            />
          )}
        </div>

        {/* ══ RIGHT — output ══ */}
        <div style={styles.outputArea}>

          {/* Black screen overlay */}
          {isBlackScreen && (
            <div style={styles.blackOverlay}>
              <span style={{ fontSize: 48 }}>🖥️</span>
              <span style={{ color: '#475569', marginTop: 12, fontSize: 14 }}>
                Black Screen Active
              </span>
              <button
                onClick={handleToggleBlackScreen}
                style={{ ...styles.btn, ...styles.btnGray, marginTop: 20 }}
              >
                Click to Unblack
              </button>
            </div>
          )}

          {!isBlackScreen && activeSlide ? (
            <>
              {/* Output label */}
              <div style={styles.outputLabel}>
              <div style={styles.outputLabelLeft}>
                <span style={styles.outputFileName}>{activeFile?.name}</span>
                {/* ✅ Only show LIVE if THIS file is the presenting one */}
                {isPresenting && stage.presentingFileId === activeFile?.id && (
                  <span style={styles.presentingBadge}>
                    ● LIVE
                  </span>
                )}
              </div>
              <span style={styles.outputSlideNum}>
                Slide {activeSlideIndex + 1}
                {' / '}
                {activeFile?.presentation.slides.length}
              </span>
            </div>

              {/* Slide output */}
              <StageOutput slide={activeSlide} />

              {/* Slide nav bar at bottom */}
              <div style={styles.navBar}>
                <button
                  onClick={handlePrevSlide}
                  disabled={activeSlideIndex <= 0}
                  style={{
                    ...styles.btn,
                    ...styles.btnGray,
                    opacity: activeSlideIndex <= 0 ? 0.4 : 1,
                  }}
                >
                  ◀ Prev
                </button>

                <span style={styles.navSlideNum}>
                  {activeSlideIndex + 1} / {activeFile?.presentation.slides.length}
                </span>

                <button
                  onClick={handleNextSlide}
                  disabled={
                    activeSlideIndex >=
                    (activeFile?.presentation.slides.length ?? 1) - 1
                  }
                  style={{
                    ...styles.btn,
                    ...styles.btnGray,
                    opacity:
                      activeSlideIndex >=
                      (activeFile?.presentation.slides.length ?? 1) - 1
                        ? 0.4 : 1,
                  }}
                >
                  Next ▶
                </button>
              </div>
            </>
          ) : !isBlackScreen ? (
            <div style={styles.outputEmpty}>
              {loading ? (
                <>
                  <span style={{ fontSize: 48 }}>📦</span>
                  <span style={{ color: '#475569', marginTop: 12 }}>
                    Loading {loading.filename}…
                  </span>
                  <div style={{ ...styles.progressTrack, width: 240, marginTop: 16 }}>
                    <div style={{
                      ...styles.progressBar,
                      width: `${loading.progress}%`,
                    }} />
                  </div>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 48 }}>📺</span>
                  <span style={{ color: '#475569', marginTop: 12 }}>
                    No slide selected
                  </span>
                  <span style={{ color: '#334155', fontSize: 11, marginTop: 6 }}>
                    Load a .petra, .json, or .preszip file
                  </span>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ══ Connection Panel ══ */}
      <ConnectionPanel
        isOpen={showConnection}
        onClose={() => setShowConnection(false)}
      />
    </div>
  );
};

export default StageDisplay;

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    display:       'flex',
    flexDirection: 'column',
    width:         '100%',
    height:        '100%',
    background:    '#0f172a',
    overflow:      'hidden',
  },

  // ── Toolbar (matches Editor header) ──────────────────────────────────────
  toolbar: {
    height:          48,
    background:      '#0f172a',
    borderBottom:    '1px solid #1e293b',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingLeft:     16,
    paddingRight:    16,
    flexShrink:      0,
    gap:             8,
  },
  toolbarLeft: {
    display:     'flex',
    alignItems:  'center',
    gap:         10,
    flexShrink:  0,
  },
  toolbarRight: {
    display:     'flex',
    alignItems:  'center',
    gap:         6,
    flexShrink:  0,
  },
  toolbarTitle: {
    fontSize:   13,
    fontWeight: 700,
    color:      '#e2e8f0',
    marginRight: 4,
  },
  badge: {
    fontSize:     10,
    padding:      '2px 8px',
    borderRadius: 4,
    fontWeight:   600,
  },
  slideCountBadge: {
    fontSize:  10,
    color:     '#64748b',
  },
  divider: {
    width:      1,
    height:     24,
    background: '#1e293b',
    margin:     '0 2px',
  },

  // ── Main area ─────────────────────────────────────────────────────────────
  mainArea: {
    flex:     1,
    display:  'flex',
    overflow: 'hidden',
  },

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebar: {
    width:         300,
    flexShrink:    0,
    display:       'flex',
    flexDirection: 'column',
    background:    '#1e2330',
    borderRight:   '1px solid #2e3447',
    overflow:      'hidden',
  },
  fileTabs: {
    display:       'flex',
    flexDirection: 'column',
    gap:           2,
    padding:       8,
    borderBottom:  '1px solid #2e3447',
    flexShrink:    0,
  },
  empty: {
    flex:           1,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        24,
  },

  // ── Loading ───────────────────────────────────────────────────────────────
  loadingBox: {
    padding:      '10px 14px',
    borderBottom: '1px solid #2e3447',
    flexShrink:   0,
  },
  loadingFilename: {
    fontSize:     11,
    color:        '#94a3b8',
    marginBottom: 6,
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap',
  },
  progressTrack: {
    height:       6,
    background:   '#1e293b',
    borderRadius: 3,
    overflow:     'hidden',
  },
  progressBar: {
    height:       6,
    background:   'linear-gradient(90deg, #3d5afe, #7c3aed)',
    borderRadius: 3,
    transition:   'width 0.2s ease',
  },
  loadingPct: {
    fontSize:  10,
    color:     '#64748b',
    marginTop: 4,
  },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorBox: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '8px 12px',
    background:     '#450a0a',
    borderBottom:   '1px solid #7f1d1d',
    fontSize:       11,
    color:          '#fca5a5',
    flexShrink:     0,
    gap:            8,
  },
  errorDismiss: {
    background: 'transparent',
    border:     'none',
    color:      '#fca5a5',
    cursor:     'pointer',
    fontSize:   12,
    padding:    0,
    flexShrink: 0,
  },

  // ── Output area ───────────────────────────────────────────────────────────
  outputArea: {
    flex:           1,
    display:        'flex',
    flexDirection:  'column',
    padding:        24,
    gap:            12,
    overflow:       'hidden',
    minWidth:       0,
    position:       'relative',
  },
  outputLabel: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    flexShrink:     0,
  },
  outputLabelLeft: {
    display:    'flex',
    alignItems: 'center',
    gap:        10,
  },
  outputFileName: {
    fontSize:   13,
    fontWeight: 700,
    color:      '#e2e8f0',
  },
  presentingBadge: {
    fontSize:     10,
    fontWeight:   700,
    color:        '#4ade80',
    background:   '#14532d',
    padding:      '2px 8px',
    borderRadius: 4,
    animation:    'pulse 2s infinite',
  },
  outputSlideNum: {
    fontSize: 11,
    color:    '#64748b',
  },
  outputEmpty: {
    flex:           1,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
  },

  // ── Black screen overlay ──────────────────────────────────────────────────
  blackOverlay: {
    position:       'absolute',
    inset:          0,
    background:     '#000',
    zIndex:         10,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
  },

  // ── Nav bar ───────────────────────────────────────────────────────────────
  navBar: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            16,
    flexShrink:     0,
    paddingTop:     4,
  },
  navSlideNum: {
    fontSize:  12,
    color:     '#64748b',
    minWidth:  60,
    textAlign: 'center',
  },

  // ── Buttons (match Editor style exactly) ──────────────────────────────────
  btn: {
    fontSize:     11,
    padding:      '5px 12px',
    border:       'none',
    borderRadius: 6,
    cursor:       'pointer',
    fontWeight:   600,
    transition:   'background 0.15s',
    whiteSpace:   'nowrap',
  },
  btnBlue: {
    background: '#3d5afe',
    color:      '#fff',
  },
  btnGreen: {
    background: '#16a34a',
    color:      '#fff',
  },
  btnRed: {
    background: '#dc2626',
    color:      '#fff',
  },
  btnGray: {
    background: '#374151',
    color:      '#e2e8f0',
  },
  btnBlackActive: {
    background: '#1e293b',
    color:      '#94a3b8',
    outline:    '1px solid #475569',
  },
  btnPurple: {
    background: '#7c3aed',
    color:      '#fff',
  },
  btnDanger: {
    background: '#7f1d1d',
    color:      '#fca5a5',
  },
};