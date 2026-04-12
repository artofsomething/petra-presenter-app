// src/renderer/pages/EditorPage.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SlideCanvas from '../components/Editor/SlideCanvas';
import ElementToolbar from '../components/Editor/ElementToolbar';
import SlidePanel from '../components/Editor/SlidePanel';
import PropertiesPanel from '../components/Editor/PropertiesPanel';
import LayersPanel from '../components/Editor/LayersPanel';
import ConnectionPanel from '../components/Controller/ConnectionPanel';
import usePresentationStore from '../store/usePresentation';
import { useSocket } from '../hooks/useSocket';
import DisplaySettings from '../components/Editor/DisplaySettings';
import { SLIDE_LAYOUTS } from '../types/slideLayouts';
import type { SlideLayout, LayoutPreviewBlock } from '../types/slideLayouts';
import { saveAsArchive, loadFromArchive } from '../utils/presentationArchive';
import HeaderDropdown from '../components/Editor/DropdownMenuItem';
import AssetLibrary from '../components/Editor/AssetLibrary';
import { useAssetStore, type AssetItem } from '../hooks/useAssets';
import { getImageDimensions, getVideoDimensions, fitToSlide} from '../utils/getAssetDimensions';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../components/MobileEditor/MobileSlideCanvas';
import BackButton from '../components/Shared/BackButton';
import SlideGeneratorModal from '../components/Editor/SlideGeneratorModal';
import type { GeneratedSlide } from '../utils/slideGenerator';
import AppCapturePicker from '../components/Advanced/AppCapturePicker';

// ── New Presentation Modal ────────────────────────────────────────────────────
const NewPresentationModal: React.FC<{
  isOpen:   boolean;
  onClose:  () => void;
  onCreate: (name: string) => void;
}> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName]   = useState('Untitled Presentation');
  const inputRef          = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('Untitled Presentation');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-xl
                      shadow-2xl p-5 w-80 flex flex-col gap-4">
        <div>
          <h2 className="text-white font-bold text-sm">📄 New Presentation</h2>
          <p className="text-gray-400 text-xs mt-1">Enter a name for your presentation</p>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={80}
          placeholder="Presentation name…"
          className="w-full bg-gray-700 text-white border border-gray-600
                     focus:border-blue-500 outline-none rounded-lg px-3 py-2
                     text-sm focus:ring-1 focus:ring-blue-500 transition-colors"
        />

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-gray-300 bg-gray-700
                       hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600
                       hover:bg-blue-500 rounded-lg transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Archive Progress Modal ────────────────────────────────────────────────────
// Place this above EditorPage or in a separate file

type ArchiveOperation = 'saving' | 'loading' | null;

const ArchiveProgressModal: React.FC<{
  operation: ArchiveOperation;
  progress:  number;           // 0–100, only used during loading
  fileName?: string;
}> = ({ operation, progress, fileName }) => {
  if (!operation) return null;

  const isSaving  = operation === 'saving';
  const isLoading = operation === 'loading';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-xl
                      shadow-2xl p-6 flex flex-col gap-4"
           style={{ width: 340 }}>

        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
               style={{ background: isSaving ? '#1e3a5f' : '#1a2e1a' }}>
            <span className="text-xl">
              {isSaving ? '📦' : '📂'}
            </span>
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">
              {isSaving ? 'Saving Archive…' : 'Loading Archive…'}
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {isSaving
                ? 'Packing slides and assets into a .preszip file'
                : `Reading ${fileName ?? 'archive'}`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width:      isSaving ? '100%'       : `${progress}%`,
                background: isSaving
                  ? 'linear-gradient(90deg, #3b82f6, #6366f1)'
                  : 'linear-gradient(90deg, #22c55e, #16a34a)',
                // Indeterminate animation for saving (we don't track save %)
                animation:  isSaving
                  ? 'archive-indeterminate 1.4s ease-in-out infinite'
                  : 'none',
                backgroundSize: isSaving ? '200% 100%' : undefined,
              }}
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-[10px]">
              {isSaving
                ? 'Compressing assets…'
                : progress < 100
                ? 'Extracting assets…'
                : 'Restoring presentation…'}
            </span>
            {isLoading && (
              <span className="text-gray-300 text-[10px] font-mono font-bold">
                {progress}%
              </span>
            )}
          </div>
        </div>

        {/* Tip */}
        <p className="text-gray-600 text-[10px] text-center leading-relaxed">
          {isSaving
            ? 'Large presentations with videos may take a moment.'
            : 'Videos are converted to playable blob URLs.'}
        </p>
      </div>

      {/* Indeterminate keyframe — injected once */}
      <style>{`
        @keyframes archive-indeterminate {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

type RightPanelTab = 'properties' | 'layers';

// ── Layout preview thumbnail ──────────────────────────────────────────────────
const LayoutThumbnail: React.FC<{ blocks: LayoutPreviewBlock[] }> = ({ blocks }) => (
  <div
    className="relative w-full rounded overflow-hidden border border-gray-600"
    style={{ aspectRatio: '16/9', background: '#1e293b' }}
  >
    {blocks.map((b, i) => (
      <div
        key={i}
        style={{
          position:     'absolute',
          left:         `${b.x}%`,
          top:          `${b.y}%`,
          width:        `${b.w}%`,
          height:       `${b.h}%`,
          borderRadius: 2,
          background:
            b.type === 'title'
              ? '#60a5fa'
              : b.type === 'image'
              ? '#374151'
              : b.type === 'shape'
              ? b.dark ? '#1e3a5f' : '#3b82f6'
              : '#475569',
          opacity: b.type === 'image' ? 0.7 : 1,
        }}
      />
    ))}
    {/* Image placeholder icon */}
    {blocks.some((b) => b.type === 'image') && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-gray-500 text-lg">🖼️</span>
      </div>
    )}
  </div>
);

// ── Layout picker modal ───────────────────────────────────────────────────────
interface LayoutPickerModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onSelect:  (layout: SlideLayout) => void;
}

const LayoutPickerModal: React.FC<LayoutPickerModalProps> = ({
  isOpen, onClose, onSelect,
}) => {
  const [hovered,  setHovered]  = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('blank');

  // Reset selection every time the modal opens
  useEffect(() => {
    if (isOpen) setSelected('blank');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const chosenLayout = SLIDE_LAYOUTS.find((l) => l.id === selected)!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={handleBackdrop}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl
                   flex flex-col overflow-hidden"
        style={{ width: 760, maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3
                        border-b border-gray-700 shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">Choose a Layout</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Select a starting layout for the new slide
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white w-7 h-7 flex items-center
                       justify-center rounded hover:bg-gray-700 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-3">
              {SLIDE_LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => setSelected(layout.id)}
                  onMouseEnter={() => setHovered(layout.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`flex flex-col gap-2 p-2 rounded-lg border text-left
                              transition-all cursor-pointer
                    ${selected === layout.id
                      ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500/50'
                      : hovered === layout.id
                      ? 'border-gray-500 bg-gray-800/60'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-500'
                    }`}
                >
                  <LayoutThumbnail blocks={layout.preview} />
                  <div className="px-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{layout.emoji}</span>
                      <span className="text-white text-xs font-semibold truncate">
                        {layout.label}
                      </span>
                      {selected === layout.id && (
                        <span className="ml-auto text-blue-400 text-xs">✓</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-[10px] mt-0.5 leading-tight">
                      {layout.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview sidebar */}
          <div className="w-52 border-l border-gray-700 p-4 flex flex-col gap-3 shrink-0">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Preview
            </p>
            <LayoutThumbnail blocks={chosenLayout.preview} />
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{chosenLayout.emoji}</span>
                <span className="text-white text-xs font-bold">{chosenLayout.label}</span>
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                {chosenLayout.description}
              </p>
              <p className="text-gray-600 text-[10px] mt-2">
                {chosenLayout.elements.length === 0
                  ? 'No elements — fully blank'
                  : `${chosenLayout.elements.length} element${chosenLayout.elements.length > 1 ? 's' : ''} pre-placed`}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3
                        border-t border-gray-700 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-gray-300 bg-gray-700
                       hover:bg-gray-600 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(chosenLayout)}
            className="px-5 py-1.5 text-xs font-bold text-white bg-blue-600
                       hover:bg-blue-500 rounded transition-colors"
          >
            ＋ Add Slide
          </button>
        </div>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// EDITOR PAGE
// ─────────────────────────────────────────────────────────────────────────────

const SOCKET_OPTIONS = {role:'editor' as const, name: 'Desktop Editor'};

const EditorPage: React.FC = () => {
  const {
    emitUpdatePresentation,
    emitStartPresentation,
    emitStopPresentation,
    emitToggleBlackScreen,
    emitSyncSlideIndex,
    isConnected,
  } = useSocket(SOCKET_OPTIONS);

  const {
    presentation, currentSlideIndex,
    createNewPresentation, saveToJSON, loadFromJSON, setIsPresenting,
    selectedElementId, copyElement, toggleLockElement,
    addSlide, addElement, setOpenedFilePath,openedFilePath
  } = usePresentationStore();

  const [showConnection,       setShowConnection]       = useState(false);
  const [showLayoutPicker,     setShowLayoutPicker]     = useState(false);
  const [rightPanelTab,        setRightPanelTab]        = useState<RightPanelTab>('properties');
  const [isEditingName,        setIsEditingName]        = useState(false);
  const [editingName,          setEditingName]          = useState('');
  const [isDirectControlEnabled, setDirectControl]      = useState(false);

  const nameInputRef  = useRef<HTMLInputElement>(null);
  const syncTimerRef  = useRef<number | null>(null);
  const connectedRef  = useRef(false);

  const currentSlide    = presentation?.slides[currentSlideIndex];
  const selectedElement = currentSlide?.elements.find(el => el.id === selectedElementId);
  const [isSyncing,     setIsSyncing]     = useState(false);
  const [lastSyncTime,  setLastSyncTime]  = useState<Date | null>(null);

  const [archiveOperation, setArchiveOperation] = useState<ArchiveOperation>(null);
  const [archiveProgress,  setArchiveProgress]  = useState(0);
  const [archiveFileName,  setArchiveFileName]  = useState<string>('');
  const [showNewModal, setShowNewModal] = useState(false);

  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [assetTarget, setAssetTarget] = useState<'image' | 'video' | 'bgImage' | 'bgVideo'>('image');
  const [showGenerator, setShowGenerator] = useState(false);
  const [showCapturePicker, setShowCapturePicker] = useState(false);

  const handleGenerateSlides = useCallback((newSlides: GeneratedSlide[]) => {
    // Capture current count BEFORE adding
    const beforeCount = usePresentationStore.getState().presentation?.slides.length ?? 0;

    usePresentationStore.getState().addSlides(newSlides);

    // Now jump to the first new slide
    usePresentationStore.getState().setCurrentSlideIndex(beforeCount);
  }, []);

  const handleCaptureSelect = useCallback(async (sourceId: string, sourceName: string) => {
    setShowCapturePicker(false);

    const state  = usePresentationStore.getState();
    const idx    = state.currentSlideIndex;
    const slide  = state.presentation?.slides[idx];
    const zIndex = slide?.elements.length ?? 0;

    state.addElement(idx, {
      id:         `el_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type:       'screen-capture' as any,
      sourceId,
      sourceName,
      x:          160,
      y:          90,
      width:      1600,
      height:     900,
      rotation:   0,
      opacity:    1,
      zIndex,
      isLocked:   false,
    } as any);
  }, []);
  const handleAssetSelect = useCallback(async (asset: AssetItem) => {
    const state = usePresentationStore.getState();
    const idx   = state.currentSlideIndex;
    const elId  = state.selectedElementId;

    switch (assetTarget) {

      case 'image': {
        if (elId) {
          // ✅ Update existing selected element's src
          state.updateElement(idx, elId, { src: asset.url });
        } else {
          // ✅ No element selected → add a NEW image element to the slide
          const natural = await getImageDimensions(asset.url);
          const fit = fitToSlide(
            natural.width, natural.height, CANVAS_WIDTH,CANVAS_HEIGHT
          );
          const slide  = state.presentation?.slides[idx];
          const zIndex = (slide?.elements.length ?? 0);

          state.addElement(idx, {
            id:       `el_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type:     'image',
            src:      asset.url,
            x:        fit.x,
            y:        fit.y,
            width:    fit.width,
            height:   fit.height,
            rotation: 0,
            opacity:  1,
            zIndex,
            isLocked: false,
          } as any);
        }
        break;
      }

      case 'video': {
        if (elId) {
          // ✅ Update existing selected element's videoSrc
          state.updateElement(idx, elId, { videoSrc: asset.url });
        } else {
          // ✅ No element selected → add a NEW video element
          const natural = await getVideoDimensions(asset.url);
          const fit = fitToSlide(natural.width,natural.height,CANVAS_WIDTH,CANVAS_HEIGHT);
          const slide  = state.presentation?.slides[idx];
          const zIndex = (slide?.elements.length ?? 0);
          state.addElement(idx, {
            id:       `el_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type:     'video',
            videoSrc: asset.url,
            x:        fit.x,
            y:        fit.y,
            width:    fit.width,
            height:   fit.height,
            rotation: 0,
            opacity:  1,
            zIndex,
            isLocked: false,
          } as any);
        }
        break;
      }

      case 'bgImage':
        state.updateSlide(idx, { backgroundImage: asset.url });
        break;

      case 'bgVideo':
        state.updateSlide(idx, { backgroundVideo: asset.url });
        break;

      default:
        console.warn('[EditorPage] Unknown assetTarget:', assetTarget);
    }
  }, [assetTarget]);

  // ── Keep connectedRef in sync ─────────────────────────────────────────────
  useEffect(() => { connectedRef.current = isConnected; }, [isConnected]);
  useEffect(()=>{
    useAssetStore.getState().fetchAssets();
  },[]);

  // ── Init ──────────────────────────────────────────────────────────────────
  // useEffect(() => {
  //   if (!presentation) createNewPresentation('Untitled Presentation');
  // }, []);
useEffect(() => {
  const initEditor = async () => {

    // ✅ APPROACH 1: IPC pull (most reliable — stored before loadURL)
    if (window.electronAPI?.getPendingEditorFile) {
      try {
        const pending = await window.electronAPI.getPendingEditorFile();
        if (pending?.content) {
          console.log('[Editor] Loading from IPC:', pending.fileName);
          loadFromJSON(pending.content);
          if (pending.filePath) {
            setOpenedFilePath(pending.filePath);
            window.electronAPI?.watchFile?.(pending.filePath);
          }
          return; // ✅ Stop here — don't create empty presentation
        }
      } catch (err) {
        console.error('[Editor] IPC pull failed:', err);
      }
    }

    // ✅ APPROACH 2: sessionStorage fallback
    const pendingRaw = sessionStorage.getItem('pendingEditorFile');
    if (pendingRaw) {
      sessionStorage.removeItem('pendingEditorFile');
      try {
        const pending = JSON.parse(pendingRaw);
        if (pending?.content) {
          console.log('[Editor] Loading from sessionStorage:', pending.fileName);
          loadFromJSON(pending.content);
          if (pending.filePath) {
            setOpenedFilePath(pending.filePath);
            window.electronAPI?.watchFile?.(pending.filePath);
          }
          return; // ✅ Stop here
        }
      } catch (err) {
        console.error('[Editor] sessionStorage parse failed:', err);
      }
    }

    // ✅ APPROACH 3: Nothing pending → create new presentation
    if (!presentation) {
      console.log('[Editor] No pending file — creating new presentation');
      createNewPresentation('Untitled Presentation');
    }
  };

  initEditor();
}, []); // ✅ Run once on mount only

  
  // ── Sync helpers ──────────────────────────────────────────────────────────
  const lastSentJsonRef = useRef<string>('');

  const syncPresentation = useCallback(() => {
    const state = usePresentationStore.getState();
    if (!state.presentation || !connectedRef.current) return;

    const json = JSON.stringify({
      slides: state.presentation.slides.map(s => ({
        id: s.id, elements: s.elements.length, bg: s.backgroundColor,
      })),
      name: state.presentation.name,
    });

    if (json === lastSentJsonRef.current) return;
    lastSentJsonRef.current = json;

    emitUpdatePresentation(
      state.presentation,
      isDirectControlEnabled ? state.currentSlideIndex : null,
    );
  }, [emitUpdatePresentation]);

  useEffect(() => {
    if (!presentation || !isConnected) return;
    if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(syncPresentation, 250);
    return () => { if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current); };
  }, [
    presentation?.slides.length,
    presentation?.name,
    JSON.stringify(presentation?.slides.map(s => s.elements.map(e => e.id))),
    isConnected, isDirectControlEnabled, syncPresentation,
  ]);

  useEffect(() => {
    if (!isConnected || !presentation) return;
    lastSentJsonRef.current = '';
    setTimeout(syncPresentation, 200);
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected || !isDirectControlEnabled) return;
    emitSyncSlideIndex(currentSlideIndex);
  }, [currentSlideIndex, isConnected, isDirectControlEnabled]);

  // ── Name editing ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleStartEditingName = () => {
    setEditingName(presentation?.name || 'Untitled Presentation');
    setIsEditingName(true);
  };
  const handleConfirmName = () => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== presentation?.name)
      usePresentationStore.getState().updatePresentationName(trimmed);
    setIsEditingName(false);
  };
  const handleCancelName = () => { setIsEditingName(false); setEditingName(''); };
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  handleConfirmName();
    if (e.key === 'Escape') handleCancelName();
  };

  // ── Force sync ────────────────────────────────────────────────────────────
  const handleForceSync = useCallback(() => {
    if (!presentation || !isConnected) return;
    setIsSyncing(true);
    lastSentJsonRef.current = '';
    const state = usePresentationStore.getState();
    emitUpdatePresentation(state.presentation!, state.currentSlideIndex);
    setTimeout(() => { setIsSyncing(false); setLastSyncTime(new Date()); }, 1500);
  }, [presentation, isConnected, emitUpdatePresentation]);


  const handleSaveArchive = async () => {
    if (!presentation) return;
    try {
        setArchiveOperation('saving');
        setArchiveProgress(0);

        const blob     = await saveAsArchive(presentation);
        const url      = URL.createObjectURL(blob);
        const a        = document.createElement('a');
        a.href         = url;
        a.download     = `${presentation.name || 'presentation'}.preszip`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Failed to save archive:', err);
        alert('Failed to save archive. See console for details.');
    } finally {
        setArchiveOperation(null);
    }
};

const handleLoadArchive = () => {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.preszip';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      setArchiveFileName(file.name);
      setArchiveOperation('loading');
      setArchiveProgress(0);

      const loaded = await loadFromArchive(file, (pct) => {
        setArchiveProgress(pct);
      });

      usePresentationStore.getState().loadPresentation(loaded);
    } catch (err) {
      console.error('Failed to load archive:', err);
      alert('Failed to load archive. The file may be corrupted.');
    } finally {
      setArchiveOperation(null);
      setArchiveProgress(0);
      setArchiveFileName('');
    }
  };
  input.click();
};


// ── Add slide with layout ─────────────────────────────────────────────────
const handleAddSlideWithLayout = useCallback((layout: SlideLayout) => {
    // 1. Add a blank slide
    addSlide();

    // 2. Get the index of the newly added slide
    const state    = usePresentationStore.getState();
    const newIndex = state.presentation!.slides.length - 1;

    // 3. Inject normalised layout elements
    layout.elements.forEach((el, i) => {
        const normalised = {
        // ── Identity ────────────────────────────────────────────────────
        id: `el_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 9)}`,

        // ── Geometry ────────────────────────────────────────────────────
        x:        el.x      ?? 0,
        y:        el.y      ?? 0,
        width:    el.width  ?? 300,
        height:   el.height ?? 100,
        rotation: 0,

        // ── Common ──────────────────────────────────────────────────────
        type:     el.type,
        opacity:  el.opacity ?? 1,
        zIndex:   i,
        isLocked: false,

        // ── Text fields ─────────────────────────────────────────────────
        ...(el.type === 'text' && {
            text:        el.text       ?? 'Text',
            fontSize:    el.fontSize   ?? 24,
            fontFamily:  el.fontFamily ?? 'Arial',
            fontColor:   el.fontColor  ?? '#ffffff',
            fontWeight:  el.fontWeight ?? 'normal',
            fontStyle:   'normal',
            textAlign:   el.textAlign  ?? 'left',
            strokeColor: '#000000',
            strokeWidth: 0,
        }),

        // ── Shape fields ─────────────────────────────────────────────────
        ...(el.type === 'shape' && {
            shapeType:    (el as any).shapeType ?? 'rect',
            fill:         (el as any).fill      ?? '#3b82f6',
            stroke:       '#000000',
            strokeWidth:  0,
            cornerRadius: 0,
            fillGradient: undefined,
        }),

        // ── Image fields ─────────────────────────────────────────────────
        ...(el.type === 'image' && {
            src: (el as any).src ?? '',
        }),
        };

        addElement(newIndex, normalised as any);
    });

    // 4. Navigate to the new slide & close modal
    state.setCurrentSlideIndex(newIndex);
    setShowLayoutPicker(false);
    }, [addSlide, addElement]);

  // ── File operations ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
  if (!presentation) return;

  const content = saveToJSON();

  if (window.electronAPI?.saveFileDialog) {
    const result = await window.electronAPI.saveFileDialog({
      filePath:    openedFilePath ?? undefined, // ✅ overwrite if known
      content,
      defaultName: `${presentation.name || 'presentation'}.json`,
    });

    if (!result)           return;
    if (result.canceled)   return;
    if (result.error) {
      alert(`Save failed: ${result.error}`);
      return;
    }
    if (!result.filePath)  return;

      // ✅ Remember path for future Ctrl+S
      setOpenedFilePath(result.filePath);

      // ✅ Sync to Stage Display + Presentation View via WebSocket
      if (isConnected) {
        lastSentJsonRef.current = ''; // force re-sync
        emitUpdatePresentation(presentation, currentSlideIndex);
      

      console.log('[Editor] Saved:', result.filePath);
    } else if (result?.error) {
      alert(`Save failed: ${result.error}`);
    }
    // result?.canceled → user dismissed, do nothing

  } else {
    // ✅ Browser fallback (non-Electron)
    const blob = new Blob([content], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${presentation.name || 'presentation'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}, [
  presentation,
  openedFilePath,
  saveToJSON,
  setOpenedFilePath,
  isConnected,
  emitUpdatePresentation,
  currentSlideIndex,
]);

// ── Add handleSaveAs (always shows dialog) ────────────────────────────────
const handleSaveAs = useCallback(async () => {
  if (!presentation) return;

  const content = saveToJSON();

  if (window.electronAPI?.saveFileDialog) {
    // ✅ Force dialog by NOT passing filePath
    const result = await window.electronAPI.saveFileDialog({
      content,
      defaultName: `${presentation.name || 'presentation'}.json`,
    });
    if (!result)           return;
    if (result.canceled)   return;
    if (result.error) {
      alert(`Save failed: ${result.error}`);
      return;
    }
    if (!result.filePath)  return;

    if (result?.success) {
      setOpenedFilePath(result.filePath);
      if (isConnected) {
        lastSentJsonRef.current = '';
        emitUpdatePresentation(presentation, currentSlideIndex);
      }
      console.log('[Editor] Saved As:', result.filePath);
    } else if (result?.error) {
      alert(`Save failed: ${result.error}`);
    }
  }
}, [
  presentation,
  saveToJSON,
  setOpenedFilePath,
  isConnected,
  emitUpdatePresentation,
  currentSlideIndex,
]);
const handleLoad = useCallback(async () => {
  if (window.electronAPI?.openFileDialog) {
    // ✅ Electron: native dialog with path tracking
    const result = await window.electronAPI.openFileDialog([
      { name: 'Presentation', extensions: ['json', 'petra'] },
    ]);

    if (!result)          return;
    if (result.error) {
      alert(`Open failed: ${result.error}`);
      return;
    }
    if (!result.content || !result.filePath) return;

    try {
      loadFromJSON(result.content);
      setOpenedFilePath(result.filePath);

      // ✅ Watch file for external changes (Stage Display sync)
      await window.electronAPI.watchFile?.(result.filePath);

      console.log('[Editor] Opened:', result.filePath);
    } catch {
      alert('Failed to parse presentation file.');
    }

  } else {
    // ✅ Browser fallback
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.json,.petra';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader  = new FileReader();
      reader.onload = (ev) => loadFromJSON(ev.target?.result as string);
      reader.readAsText(file);
    };
    input.click();
  }
}, [loadFromJSON, setOpenedFilePath]);

  // ── Presentation control ──────────────────────────────────────────────────
  const handleStartPresentation = async () => {
    try {
      if (window.electronAPI) await window.electronAPI.openPresentation();
      setIsPresenting(true);
      emitStartPresentation();
    } catch {
      window.open('/#/presentation', '_blank', 'fullscreen=yes');
    }
  };

  const handleStopPresentation = async () => {
    try { if (window.electronAPI) await window.electronAPI.closePresentation(); } catch {}
    setIsPresenting(false);
    emitStopPresentation();
  };

  useEffect(() => {
    if (!window.electronAPI?.onLoadFileInEditor) return;

    const unsubscribe = window.electronAPI.onLoadFileInEditor((data) => {
      console.log('[Editor] Loading file from Stage Display:', data.fileName);

      try {
        loadFromJSON(data.content);

        // ✅ Remember the file path so Ctrl+S overwrites correctly
        if (data.filePath) {
          setOpenedFilePath(data.filePath);
          // ✅ Watch for external changes
          window.electronAPI?.watchFile?.(data.filePath);
        }

        console.log('[Editor] ✅ File loaded:', data.fileName);
      } catch (err) {
        console.error('[Editor] Failed to load file:', err);
        alert('Failed to load presentation file.');
      }
    });

    return () => unsubscribe();
  }, [loadFromJSON, setOpenedFilePath]);
const autoSaveTimerRef = useRef<number | null>(null);

useEffect(() => {
  if (!openedFilePath || !presentation || !isConnected) return;

  // ✅ Debounced auto-save to disk when editing
  if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);

  autoSaveTimerRef.current = window.setTimeout(async () => {
    if (!window.electronAPI?.saveFileDialog) return;

    const content = saveToJSON();
    const result  = await window.electronAPI.saveFileDialog({
      filePath: openedFilePath,
      content,
    });

    if (result?.success) {
      console.log('[Editor] Auto-saved to:', openedFilePath);
      // ✅ fs.watch detects change → Stage Display auto-reloads
    }
  }, 2000); // 2s debounce

  return () => {
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
  };
}, [
  presentation?.slides.length,
  JSON.stringify(presentation?.slides.map(s => s.elements)),
  openedFilePath,
]);
  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's': e.preventDefault();if(e.shiftKey)handleSaveAs();else handleSave(); break;
          case 'o': e.preventDefault(); handleLoad(); break;
          case 'd': e.preventDefault(); if (selectedElementId) copyElement(selectedElementId); break;
          case 'l': e.preventDefault(); if (selectedElementId) toggleLockElement(selectedElementId); break;
          case 'm': e.preventDefault(); setShowLayoutPicker(true); break;  // Ctrl+M = new slide
        }
      }
      if (e.key === 'F5') { e.preventDefault(); handleStartPresentation(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentation, selectedElementId]);

  // ── Electron IPC ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.onRemotePresentationStarted?.(() => setIsPresenting(true));
    window.electronAPI.onRemotePresentationStopped?.(() => setIsPresenting(false));
    window.electronAPI.onPresentationClosed?.(() => setIsPresenting(false));
  }, []);
  

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">

      {/* ── Header ── */}
      <header className="h-12 bg-gray-900 border-b border-gray-800
                         flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <BackButton/>
          <h1 className="text-sm font-bold text-blue-400">🎤 Presenter App</h1>

          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                ref={nameInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={handleConfirmName}
                maxLength={60}
                className="text-xs bg-gray-800 text-white border border-blue-500
                           rounded px-2 py-0.5 w-48 outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button onMouseDown={(e) => e.preventDefault()} onClick={handleConfirmName}
                className="text-green-400 hover:text-green-300 text-xs px-1">✓</button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={handleCancelName}
                className="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
            </div>
          ) : (
            <button
              onClick={handleStartEditingName}
              className="text-xs text-gray-300 hover:text-white hover:bg-gray-700
                         rounded px-2 py-0.5 transition-colors group flex items-center gap-1"
              title="Click to rename"
            >
              {presentation?.name || 'Untitled'}
              <span className="opacity-0 group-hover:opacity-100 text-gray-400">✏️</span>
            </button>
          )}

          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            isConnected ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
          }`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
            {openedFilePath && (
              <span
                className="text-[10px] text-gray-500 truncate max-w-[160px]"
                title={openedFilePath}
              >
                📄 {openedFilePath.split(/[\\/]/).pop()}
              </span>
            )}
          <span className="text-[10px] text-gray-500">
            {presentation?.slides.length ?? 0} slides
          </span>
        </div>

        <div className="flex items-center gap-2">
         
          <button onClick={()=> setShowGenerator(true)}
          className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
          title="Generate slides from text"
          >
            ⚡ Generate
          </button>
          <DisplaySettings />

          <button
            onClick={() => setShowNewModal(true)}
            className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
            >
            📄 New
            </button>
          {/* <HeaderDropdown
            label="Save"
            emoji="💾"
            className="bg-gray-700 hover:bg-gray-600 text-white"
            items={[
                {
                emoji:   '💾',
                label:   'Save as JSON',
                desc:    'Lightweight — assets not included',
                onClick: handleSave,
                },
                {
                emoji:   '📦',
                label:   'Save as Archive',
                desc:    'Includes all images & videos (.preszip)',
                onClick: handleSaveArchive,
                },
            ]}
            /> */}

            <HeaderDropdown
              label={openedFilePath ? 'Save' : 'Save'}
              emoji="💾"
              className="bg-gray-700 hover:bg-gray-600 text-white"
              items={[
                {
                  emoji:   '💾',
                  label:   openedFilePath ? 'Save' : 'Save as JSON',
                  desc:    openedFilePath
                    ? `Overwrite: ${openedFilePath.split(/[\\/]/).pop()}`
                    : 'Save as new .json file',
                  onClick: handleSave,
                },
                {
                  emoji:   '📝',
                  label:   'Save As…',
                  desc:    'Save to a different location',
                  onClick: handleSaveAs,
                },
                {
                  emoji:   '📦',
                  label:   'Save as Archive',
                  desc:    'Includes all images & videos (.preszip)',
                  onClick: handleSaveArchive,
                },
              ]}
            />

        <HeaderDropdown
            label="Open"
            emoji="📂"
            className="bg-gray-700 hover:bg-gray-600 text-white"
            items={[
                {
                emoji:   '📂',
                label:   'Open JSON',
                desc:    'Open a plain .json presentation file',
                onClick: handleLoad,
                },
                {
                emoji:   '📦',
                label:   'Open Archive',
                desc:    'Open a .preszip file with embedded assets',
                onClick: handleLoadArchive,
                },
            ]}
            />
          <div className="w-px h-6 bg-gray-700" />
          <button onClick={handleStartPresentation}
            className="px-3 py-1 text-xs bg-green-600 rounded hover:bg-green-700 font-bold">
            ▶ Present
          </button>
          <button onClick={handleStopPresentation}
            className="px-3 py-1 text-xs bg-red-600 rounded hover:bg-red-700">
            ⏹ Stop
          </button>
          <button onClick={() => emitToggleBlackScreen()}
            className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">
            🖥️ Black
          </button>
          <div className="w-px h-6 bg-gray-700" />
          <button onClick={() => setShowConnection(true)}
            className="px-3 py-1 text-xs bg-purple-600 rounded hover:bg-purple-700 font-bold">
            📱 Connect
          </button>
          <button
            onClick={handleForceSync}
            disabled={!isConnected || isSyncing}
            className={`px-3 py-1 text-xs rounded font-bold transition-all flex items-center gap-1 ${
              isSyncing
                ? 'bg-orange-700 text-orange-200 cursor-wait'
                : isConnected
                  ? 'bg-orange-600 hover:bg-orange-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
            title={!isConnected ? 'Not connected' : lastSyncTime
              ? `Last synced: ${lastSyncTime.toLocaleTimeString()}`
              : 'Force push slides to all clients'}
          >
            <span style={{ display: 'inline-block',
                           animation: isSyncing ? 'spin 0.8s linear infinite' : 'none' }}>
              🔄
            </span>
            {isSyncing ? 'Syncing...' : 'Sync All'}
          </button>
         <button
            onClick={() => {
              setAssetTarget('image');
              setShowAssetLibrary(true);
            }}
            className="px-3 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
            title={
              selectedElement?.type === 'image' ? 'Replace image source' :
              selectedElement?.type === 'video' ? 'Open Asset Library' :
              'Add image to slide'
            }
          >
              📁 {selectedElement?.type === 'image' ? 'Replace Image' : 'Asset Library'}
        </button>
        <button
          onClick={() => setShowCapturePicker(true)}
          className="px-3 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
          title="Capture a window or screen"
        >
          📺 Capture
        </button>
        </div>
      </header>

      {/* ── Element Toolbar ── */}
      <div className="px-4 py-2 border-b border-gray-800 shrink-0">
        <ElementToolbar />
        

        
      </div>

      {/* ── Element Action Bar ── */}
      {selectedElement && (
        <div className="px-4 py-1.5 border-b border-gray-800 bg-blue-950/30
                        flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Selected:</span>
            <span className="text-white font-medium">
              {selectedElement.type === 'text'
                ? `📝 "${(selectedElement.text || 'Text').substring(0, 25)}${
                    (selectedElement.text || '').length > 25 ? '...' : ''}"`
                : selectedElement.type === 'shape'
                ? `🔷 Shape (${selectedElement.shapeType || 'rect'})`
                : selectedElement.type === 'image' ? '🖼️ Image'
                : selectedElement.type === 'video' ? '🎬 Video'
                : selectedElement.type}
            </span>
            {selectedElement.isLocked && (
              <span className="bg-yellow-900/50 text-yellow-400 border border-yellow-700/50
                               px-1.5 py-0.5 rounded text-[10px] font-medium">
                🔒 Locked
              </span>
            )}
          </div>
          <div className="flex-1" />
          <button onClick={() => copyElement(selectedElementId!)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs
                       bg-blue-700/50 hover:bg-blue-600/80 border border-blue-600/50 rounded"
            title="Duplicate (Ctrl+D)">
            <span>⧉</span><span>Duplicate</span>
            <kbd className="text-[9px] text-blue-300 bg-blue-900/50 px-1 rounded">Ctrl+D</kbd>
          </button>
          <button
            onClick={() => toggleLockElement(selectedElementId!)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border ${
              selectedElement.isLocked
                ? 'bg-yellow-700/50 hover:bg-yellow-600/80 border-yellow-600/50 text-yellow-200'
                : 'bg-gray-700/50 hover:bg-gray-600/80 border-gray-600/50 text-gray-200'
            }`}
            title={selectedElement.isLocked ? 'Unlock (Ctrl+L)' : 'Lock (Ctrl+L)'}>
            <span>{selectedElement.isLocked ? '🔒' : '🔓'}</span>
            <span>{selectedElement.isLocked ? 'Unlock' : 'Lock'}</span>
            <kbd className="text-[9px] text-gray-400 bg-gray-900/50 px-1 rounded">Ctrl+L</kbd>
          </button>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">
        <SlidePanel onAddSlide={() => setShowLayoutPicker(true)} />

        <div className="flex-1 flex flex-col items-center justify-center
                        p-6 overflow-auto bg-gray-950">
          <div className="mb-3 text-xs text-gray-500">
            Slide {currentSlideIndex + 1} of {presentation?.slides.length || 0}
          </div>
          <SlideCanvas editable={true} />

          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => usePresentationStore.getState().prevSlide()}
              disabled={currentSlideIndex === 0}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600
                         text-sm disabled:opacity-40">
              ◀ Previous
            </button>
            <span className="text-gray-400 text-sm">
              {currentSlideIndex + 1} / {presentation?.slides.length || 0}
            </span>
            <button
              onClick={() => usePresentationStore.getState().nextSlide()}
              disabled={currentSlideIndex === (presentation?.slides.length || 1) - 1}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600
                         text-sm disabled:opacity-40">
              Next ▶
            </button>

            {/* ── Add slide with layout ── */}
            <button
              onClick={() => setShowLayoutPicker(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm
                         font-semibold flex items-center gap-1.5 transition-colors"
              title="Add new slide (Ctrl+M)"
            >
              ＋ New Slide
              <kbd className="text-[9px] text-blue-200 bg-blue-800/60 px-1 rounded">
                Ctrl+M
              </kbd>
            </button>

            <button
              onClick={() => setDirectControl(p => !p)}
              className={`px-4 py-2 text-sm rounded ${
                isDirectControlEnabled
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-gray-800 hover:bg-gray-600'
              }`}>
              {isDirectControlEnabled ? '🔵 Direct Control ON' : '⚪ Direct Control OFF'}
            </button>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="w-64 bg-gray-900 flex flex-col border-l border-gray-800">
          <div className="flex border-b border-gray-800 shrink-0">
            <button onClick={() => setRightPanelTab('properties')}
              className={`flex-1 px-3 py-2 text-xs font-bold transition-colors ${
                rightPanelTab === 'properties'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50'
                  : 'text-gray-500 hover:text-gray-300'}`}>
              ⚙️ Properties
            </button>
            <button onClick={() => setRightPanelTab('layers')}
              className={`flex-1 px-3 py-2 text-xs font-bold transition-colors ${
                rightPanelTab === 'layers'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50'
                  : 'text-gray-500 hover:text-gray-300'}`}>
              📚 Layers
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {rightPanelTab === 'properties' ? <PropertiesPanel /> : <LayersPanel />}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <ConnectionPanel isOpen={showConnection} onClose={() => setShowConnection(false)} />

      <LayoutPickerModal
        isOpen={showLayoutPicker}
        onClose={() => setShowLayoutPicker(false)}
        onSelect={handleAddSlideWithLayout}
      />
      <NewPresentationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreate={(name) => createNewPresentation(name)}
        />
    <ArchiveProgressModal
        operation={archiveOperation}
        progress={archiveProgress}
        fileName={archiveFileName}
        />

        <AssetLibrary
          isOpen={showAssetLibrary}
          onClose={() => setShowAssetLibrary(false)}
          onSelect={handleAssetSelect}
          filter={assetTarget === 'video' || assetTarget === 'bgVideo' ? 'videos' : 'images'}
        />
        {showGenerator && (
        <SlideGeneratorModal
          currentSlideCount={presentation?.slides.length??0}
          onGenerate={handleGenerateSlides}
          onClose={() => setShowGenerator(false)}
        />
        
      )}
      {showCapturePicker && (
        <AppCapturePicker
          onSelect={handleCaptureSelect}
          onClose={() => setShowCapturePicker(false)}
        />
      )}
    </div>
    
  );
};

export default EditorPage;