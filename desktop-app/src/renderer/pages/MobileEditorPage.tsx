// src/renderer/pages/MobileEditorPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import SlideCanvas     from '../components/MobileEditor/MobileSlideCanvas';
import ElementToolbar  from '../components/Editor/ElementToolbar';
import SlidePanel      from '../components/MobileEditor/MobileSlidePanel';
import PropertiesPanel from '../components/MobileEditor/MobilePropertiesPanel';
import LayersPanel     from '../components/Editor/LayersPanel';
import usePresentationStore from '../store/usePresentation';
import { SLIDE_LAYOUTS }    from '../types/slideLayouts';
import type { SlideLayout, LayoutPreviewBlock } from '../types/slideLayouts';
import { saveAsArchive, loadFromArchive } from '../utils/presentationArchive';
import CanvasViewport  from '../components/MobileEditor/CanvasViewport';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../components/MobileEditor/MobileSlideCanvas';
import { useSocket }   from '../hooks/useSocket';
// ── Asset Library imports ─────────────────────────────────────────────────────
import AssetLibrary  from '../components/Editor/AssetLibrary';
import useAssetStore from '../store/useAssetStore';
import type { AssetItem } from '../store/useAssetStore';
import { fitToSlide, getImageDimensions, getVideoDimensions } from '../utils/getAssetDimensions';

const MOBILE_SOCKET_OPTIONS = { role: 'mobile-editor' as const, name: 'Mobile Editor' };

// ── Toast ─────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'loading';

interface Toast {
  id:      number;
  message: string;
  type:    ToastType;
}

let toastCounter = 0;

const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]
                 flex flex-col gap-2 items-center pointer-events-none"
      style={{ minWidth: 240 }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl
                      border text-sm font-medium backdrop-blur-sm
                      transition-all duration-300
                      ${t.type === 'success'
                        ? 'bg-green-900/90 border-green-700 text-green-200'
                        : t.type === 'error'
                        ? 'bg-red-900/90 border-red-700 text-red-200'
                        : 'bg-gray-800/90 border-gray-600 text-gray-200'}`}
        >
          <span className="text-base">
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : '⏳'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
};

// ── Bottom Sheet ──────────────────────────────────────────────────────────────
const BottomSheet: React.FC<{
  isOpen:   boolean;
  onClose:  () => void;
  title:    string;
  children: React.ReactNode;
  height?:  string;
}> = ({ isOpen, onClose, title, children, height = '70vh' }) => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900
                   border-t border-gray-700 rounded-t-2xl flex flex-col
                   transition-transform duration-300"
        style={{
          height,
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        <div className="absolute top-2 left-1/2 -translate-x-1/2
                        w-10 h-1 bg-gray-600 rounded-full" />
        <div className="flex items-center justify-between px-4 pt-6 pb-3
                        border-b border-gray-800 shrink-0">
          <span className="text-white text-sm font-bold">{title}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg
                       text-gray-400 hover:text-white hover:bg-gray-700
                       transition-colors text-base"
          >✕</button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSET TARGET PICKER SHEET
// Mobile-friendly sheet: choose WHERE to apply the chosen asset
// ─────────────────────────────────────────────────────────────────────────────
type AssetTarget = 'image' | 'video' | 'bgImage' | 'bgVideo';

const AssetTargetSheet: React.FC<{
  isOpen:          boolean;
  onClose:         () => void;
  selectedElement: any;   // current selected element or null
  onSelectTarget:  (target: AssetTarget) => void;
}> = ({ isOpen, onClose, selectedElement, onSelectTarget }) => {
  const hasImageEl = selectedElement?.type === 'image';
  const hasVideoEl = selectedElement?.type === 'video';

  const options: Array<{
    target:  AssetTarget;
    emoji:   string;
    label:   string;
    desc:    string;
    filter:  'images' | 'videos';
    badge:   string;
    badgeColor: string;
  }> = [
    {
      target:     'image',
      emoji:      '🖼️',
      label:      hasImageEl ? 'Replace Image Element' : 'Add Image Element',
      desc:       hasImageEl
        ? 'Replace the selected image element\'s source'
        : 'Add a new image element to the current slide',
      filter:     'images',
      badge:      hasImageEl ? 'Replace' : 'New',
      badgeColor: hasImageEl
        ? 'bg-orange-900/60 text-orange-400 border-orange-800'
        : 'bg-green-900/60 text-green-400 border-green-800',
    },
    {
      target:     'video',
      emoji:      '🎬',
      label:      hasVideoEl ? 'Replace Video Element' : 'Add Video Element',
      desc:       hasVideoEl
        ? 'Replace the selected video element\'s source'
        : 'Add a new video element to the current slide',
      filter:     'videos',
      badge:      hasVideoEl ? 'Replace' : 'New',
      badgeColor: hasVideoEl
        ? 'bg-orange-900/60 text-orange-400 border-orange-800'
        : 'bg-green-900/60 text-green-400 border-green-800',
    },
    {
      target:     'bgImage',
      emoji:      '🏞️',
      label:      'Set as Background Image',
      desc:       'Use as the background image for the current slide',
      filter:     'images',
      badge:      'Background',
      badgeColor: 'bg-purple-900/60 text-purple-400 border-purple-800',
    },
    {
      target:     'bgVideo',
      emoji:      '📹',
      label:      'Set as Background Video',
      desc:       'Use as the background video for the current slide',
      filter:     'videos',
      badge:      'Background',
      badgeColor: 'bg-purple-900/60 text-purple-400 border-purple-800',
    },
  ];

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="📁 Asset Library — What to do?"
      height="auto"
    >
      <div
        className="p-4 flex flex-col gap-2"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <p className="text-gray-400 text-xs mb-1">
          Choose how to use an asset from your library:
        </p>

        {options.map((opt) => (
          <button
            key={opt.target}
            onClick={() => { onSelectTarget(opt.target); onClose(); }}
            className="flex items-center gap-3 p-3.5 rounded-xl border text-left
                       transition-all active:scale-[0.98]
                       border-gray-700 bg-gray-800/60
                       hover:border-blue-600/60 hover:bg-blue-950/30"
          >
            <span className="text-2xl shrink-0">{opt.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white text-sm font-semibold">{opt.label}</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border
                                  ${opt.badgeColor}`}>
                  {opt.badge}
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{opt.desc}</p>
            </div>
            <span className="text-gray-600 text-sm shrink-0">›</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
};

// ── Mobile Bottom Toolbar ─────────────────────────────────────────────────────
type SheetType = 'slides' | 'elements' | 'properties' | 'layers' | null;

const MobileToolbar: React.FC<{
  activeSheet:       SheetType;
  onToggleSheet:     (s: SheetType) => void;
  currentSlideIndex: number;
  totalSlides:       number;
  onPrev:            () => void;
  onNext:            () => void;
  onAddSlide:        () => void;
  onOpenAssets:      () => void;   // ← new
}> = ({
  activeSheet, onToggleSheet,
  currentSlideIndex, totalSlides,
  onPrev, onNext, onAddSlide, onOpenAssets,
}) => {
  const toggle = (s: SheetType) =>
    onToggleSheet(activeSheet === s ? null : s);

  const btn = (sheet: SheetType, emoji: string, label: string) => (
    <button
      onClick={() => toggle(sheet)}
      className={`flex flex-col items-center gap-0.5 px-2 py-1.5
                  rounded-xl transition-colors
                  ${activeSheet === sheet
                    ? 'bg-blue-600/30 text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
    >
      <span className="text-lg leading-none">{emoji}</span>
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30
                 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800
                 flex items-center px-1.5 py-1 gap-0.5"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
    >
      {/* ◀ Prev */}
      <button
        onClick={onPrev}
        disabled={currentSlideIndex === 0}
        className="w-9 h-9 flex items-center justify-center rounded-xl
                   bg-gray-800 text-white disabled:opacity-30
                   hover:bg-gray-700 transition-colors text-sm shrink-0"
      >◀</button>

      {/* Slide counter */}
      <span className="text-gray-400 text-xs shrink-0 w-9 text-center tabular-nums">
        {currentSlideIndex + 1}/{totalSlides}
      </span>

      {/* ▶ Next */}
      <button
        onClick={onNext}
        disabled={currentSlideIndex === totalSlides - 1}
        className="w-9 h-9 flex items-center justify-center rounded-xl
                   bg-gray-800 text-white disabled:opacity-30
                   hover:bg-gray-700 transition-colors text-sm shrink-0"
      >▶</button>

      <div className="flex-1" />

      {/* + New Slide */}
      <button
        onClick={onAddSlide}
        className="w-9 h-9 flex items-center justify-center rounded-xl
                   bg-blue-600 text-white hover:bg-blue-500
                   transition-colors text-lg shrink-0 font-bold"
        title="New Slide"
      >＋</button>

      {btn('elements',   '🔧', 'Add')}
      {btn('slides',     '🗂️',  'Slides')}
      {btn('properties', '⚙️',  'Props')}
      {btn('layers',     '📚', 'Layers')}

      {/* ── Assets button ── */}
      <button
        onClick={onOpenAssets}
        className="flex flex-col items-center gap-0.5 px-2 py-1.5
                   rounded-xl text-gray-400 hover:bg-gray-800
                   hover:text-gray-200 transition-colors"
      >
        <span className="text-lg leading-none">📁</span>
        <span className="text-[9px] font-medium">Assets</span>
      </button>
    </div>
  );
};

// ── New Presentation Modal ────────────────────────────────────────────────────
const NewPresentationModal: React.FC<{
  isOpen:   boolean;
  onClose:  () => void;
  onCreate: (name: string) => void;
}> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('Untitled Presentation');
  const inputRef        = useRef<HTMLInputElement>(null);

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
    const t = name.trim();
    if (!t) return;
    onCreate(t);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-gray-800 border border-gray-600 rounded-t-2xl
                   shadow-2xl p-5 w-full flex flex-col gap-4"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        <div className="absolute top-2 left-1/2 -translate-x-1/2
                        w-10 h-1 bg-gray-600 rounded-full" />
        <div className="mt-3">
          <h2 className="text-white font-bold text-sm">📄 New Presentation</h2>
          <p className="text-gray-400 text-xs mt-1">Enter a name for your presentation</p>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  handleSubmit();
            if (e.key === 'Escape') onClose();
          }}
          maxLength={80}
          placeholder="Presentation name…"
          className="w-full bg-gray-700 text-white border border-gray-600
                     focus:border-blue-500 outline-none rounded-xl px-3 py-3
                     text-sm focus:ring-1 focus:ring-blue-500 transition-colors"
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-gray-300 bg-gray-700
                       hover:bg-gray-600 rounded-xl transition-colors"
          >Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-blue-600
                       hover:bg-blue-500 rounded-xl transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >Create</button>
        </div>
      </div>
    </div>
  );
};

// ── Archive Progress Modal ────────────────────────────────────────────────────
type ArchiveOperation = 'saving' | 'loading' | null;

const ArchiveProgressModal: React.FC<{
  operation: ArchiveOperation;
  progress:  number;
  fileName?: string;
}> = ({ operation, progress, fileName }) => {
  if (!operation) return null;
  const isSaving = operation === 'saving';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-2xl
                      shadow-2xl p-6 flex flex-col gap-4 w-full max-w-xs">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: isSaving ? '#1e3a5f' : '#1a2e1a' }}
          >
            <span className="text-xl">{isSaving ? '📦' : '📂'}</span>
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">
              {isSaving ? 'Saving Archive…' : 'Loading Archive…'}
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {isSaving ? 'Packing slides and assets' : `Reading ${fileName ?? 'archive'}`}
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width:      isSaving ? '100%' : `${progress}%`,
                background: isSaving
                  ? 'linear-gradient(90deg, #3b82f6, #6366f1)'
                  : 'linear-gradient(90deg, #22c55e, #16a34a)',
                animation:  isSaving
                  ? 'archive-indeterminate 1.4s ease-in-out infinite'
                  : 'none',
                backgroundSize: isSaving ? '200% 100%' : undefined,
              }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-[10px]">
              {isSaving ? 'Compressing…' : progress < 100 ? 'Extracting…' : 'Restoring…'}
            </span>
            {!isSaving && (
              <span className="text-gray-300 text-[10px] font-mono font-bold">
                {progress}%
              </span>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes archive-indeterminate {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

// ── Layout Picker ─────────────────────────────────────────────────────────────
const LayoutPreviewBlock: React.FC<{ blocks: LayoutPreviewBlock[] }> = ({ blocks }) => (
  <div
    className="relative w-full rounded overflow-hidden border border-gray-600"
    style={{ aspectRatio: '16/9', background: '#1e293b' }}
  >
    {blocks.map((b, i) => (
      <div
        key={i}
        style={{
          position:  'absolute',
          left:      `${b.x}%`, top:    `${b.y}%`,
          width:     `${b.w}%`, height: `${b.h}%`,
          borderRadius: 2,
          background:
            b.type === 'title' ? '#60a5fa' :
            b.type === 'image' ? '#374151' :
            b.type === 'shape' ? (b.dark ? '#1e3a5f' : '#3b82f6') :
            '#475569',
          opacity: b.type === 'image' ? 0.7 : 1,
        }}
      />
    ))}
  </div>
);

const LayoutPickerSheet: React.FC<{
  isOpen:   boolean;
  onClose:  () => void;
  onSelect: (layout: SlideLayout) => void;
}> = ({ isOpen, onClose, onSelect }) => {
  const [selected, setSelected] = useState('blank');
  useEffect(() => { if (isOpen) setSelected('blank'); }, [isOpen]);

  const chosenLayout = SLIDE_LAYOUTS.find((l) => l.id === selected)!;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="🎨 Choose a Layout" height="85vh">
      <div className="grid grid-cols-2 gap-3 p-4">
        {SLIDE_LAYOUTS.map((layout) => (
          <button
            key={layout.id}
            onClick={() => setSelected(layout.id)}
            className={`flex flex-col gap-2 p-2 rounded-xl border text-left transition-all
              ${selected === layout.id
                ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500/50'
                : 'border-gray-700 bg-gray-800/40 active:border-gray-500'}`}
          >
            <LayoutPreviewBlock blocks={layout.preview} />
            <div className="flex items-center gap-1.5 px-0.5">
              <span className="text-sm">{layout.emoji}</span>
              <span className="text-white text-xs font-semibold truncate">{layout.label}</span>
              {selected === layout.id && (
                <span className="ml-auto text-blue-400 text-xs shrink-0">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div
        className="sticky bottom-0 flex gap-2 px-4 py-3
                   bg-gray-900 border-t border-gray-800"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={onClose}
          className="flex-1 py-3 text-sm text-gray-300 bg-gray-700
                     hover:bg-gray-600 rounded-xl transition-colors"
        >Cancel</button>
        <button
          onClick={() => { onSelect(chosenLayout); onClose(); }}
          className="flex-1 py-3 text-sm font-bold text-white bg-blue-600
                     hover:bg-blue-500 rounded-xl transition-colors"
        >＋ Add Slide</button>
      </div>
    </BottomSheet>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE EDITOR PAGE
// ─────────────────────────────────────────────────────────────────────────────
const MobileEditorPage: React.FC = () => {
  const {
    presentation, currentSlideIndex,
    createNewPresentation, saveToJSON, loadFromJSON,
    selectedElementId, copyElement, toggleLockElement,
    addSlide, addElement,
  } = usePresentationStore();

  // ── Sheets ────────────────────────────────────────────────────────────────
  const [activeSheet,  setActiveSheet]  = useState<SheetType>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showLayouts,  setShowLayouts]  = useState(false);

  // ── Asset Library state ───────────────────────────────────────────────────
  const [showAssetTargetSheet, setShowAssetTargetSheet] = useState(false);
  const [showAssetLibrary,     setShowAssetLibrary]     = useState(false);
  const [assetTarget,          setAssetTarget]          = useState<AssetTarget>('image');
  // Derived filter for AssetLibrary modal
  const assetFilter: 'images' | 'videos' =
    assetTarget === 'video' || assetTarget === 'bgVideo' ? 'videos' : 'images';

  // ── Name editing ──────────────────────────────────────────────────────────
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName,   setEditingName]   = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Archive ───────────────────────────────────────────────────────────────
  const [archiveOperation, setArchiveOperation] = useState<ArchiveOperation>(null);
  const [archiveProgress,  setArchiveProgress]  = useState(0);
  const [archiveFileName,  setArchiveFileName]  = useState('');

  const currentSlide    = presentation?.slides[currentSlideIndex];
  const selectedElement = currentSlide?.elements.find(el => el.id === selectedElementId);

  // ── Toasts ────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType, duration = 2500) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (type !== 'loading') {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Socket ────────────────────────────────────────────────────────────────
  const {
    isConnected,
    emitUpdatePresentation,
    emitPullPresentation,
    emitPushPresentation,
  } = useSocket(MOBILE_SOCKET_OPTIONS);

  const [isSyncing,    setIsSyncing]    = useState(false);
  const [isPulling,    setIsPulling]    = useState(false);
  const [lastPushTime, setLastPushTime] = useState<Date | null>(null);
  const [lastPullTime, setLastPullTime] = useState<Date | null>(null);

  // ── Push to Desktop ───────────────────────────────────────────────────────
  const handlePushToDesktop = useCallback(() => {
    if (!presentation || !isConnected) {
      showToast('Not connected to Desktop Editor', 'error');
      return;
    }
    setIsSyncing(true);
    const toastId = showToast('Pushing to Desktop…', 'loading');
    emitPushPresentation();
    setTimeout(() => {
      setIsSyncing(false);
      dismissToast(toastId);
      showToast(`Pushed "${presentation.name}" to Desktop ✓`, 'success');
      setLastPushTime(new Date());
    }, 700);
  }, [presentation, isConnected, emitPushPresentation, showToast, dismissToast]);

  // ── Pull from Desktop ─────────────────────────────────────────────────────
  const handlePullFromDesktop = useCallback(() => {
    if (!isConnected) {
      showToast('Not connected to Desktop Editor', 'error');
      return;
    }
    setIsPulling(true);
    const toastId = showToast('Pulling from Desktop…', 'loading');

    const timeoutId = window.setTimeout(() => {
      window.removeEventListener('presentation-pulled', onPulled as EventListener);
      setIsPulling(false);
      dismissToast(toastId);
      showToast('No response — is Desktop Editor open & connected?', 'error');
    }, 6000);

    const onPulled = (e: CustomEvent) => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('presentation-pulled', onPulled as EventListener);
      setIsPulling(false);
      dismissToast(toastId);
      if (e.detail?.error) {
        showToast(`Pull failed: ${e.detail.error}`, 'error');
        return;
      }
      showToast(`Loaded "${e.detail?.name || 'presentation'}" from Desktop ✓`, 'success');
      setLastPullTime(new Date());
    };

    window.addEventListener('presentation-pulled', onPulled as EventListener);
    emitPullPresentation();
  }, [isConnected, emitPullPresentation, showToast, dismissToast]);

  // ── Asset handling ────────────────────────────────────────────────────────
  // Step 1: user taps Assets in toolbar → show target picker sheet
  const handleOpenAssets = useCallback(() => {
    setShowAssetTargetSheet(true);
  }, []);

  // Step 2: user picks a target → close target sheet, open AssetLibrary modal
  const handleSelectAssetTarget = useCallback((target: AssetTarget) => {
    setAssetTarget(target);
    // Small delay so the bottom sheet animates out first
    setTimeout(() => setShowAssetLibrary(true), 320);
  }, []);

  // Step 3: user picks an asset → apply it to the slide/element
  const handleAssetSelect = useCallback(async (asset: AssetItem) => {
    const state = usePresentationStore.getState();
    const idx   = state.currentSlideIndex;
    const elId  = state.selectedElementId;

    switch (assetTarget) {
      case 'image': {
        if (elId) {
          // Update existing selected image element
          state.updateElement(idx, elId, { src: asset.url });
          showToast('Image updated ✓', 'success');
        } else {
          // No element selected → add new image element
          const natural = await getImageDimensions(asset.url);
          const fit = fitToSlide(natural.width,natural.height,CANVAS_WIDTH,CANVAS_HEIGHT);
          const slide  = state.presentation?.slides[idx];
          const zIndex = slide?.elements.length ?? 0;
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
          showToast('Image added to slide ✓', 'success');
        }
        break;
      }

      case 'video': {
        if (elId) {
          // Update existing selected video element
          state.updateElement(idx, elId, { videoSrc: asset.url });
          showToast('Video updated ✓', 'success');
        } else {
          // No element selected → add new video element
          const natural = await getVideoDimensions(asset.url);
          const fit = fitToSlide(natural.width, natural.height,CANVAS_WIDTH,CANVAS_HEIGHT);
          const slide  = state.presentation?.slides[idx];
          const zIndex = slide?.elements.length ?? 0;
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
          showToast('Video added to slide ✓', 'success');
        }
        break;
      }

      case 'bgImage':
        state.updateSlide(idx, { backgroundImage: asset.url });
        showToast('Background image set ✓', 'success');
        break;

      case 'bgVideo':
        state.updateSlide(idx, { backgroundVideo: asset.url });
        showToast('Background video set ✓', 'success');
        break;

      default:
        console.warn('[MobileEditorPage] Unknown assetTarget:', assetTarget);
    }
  }, [assetTarget, showToast]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!presentation) createNewPresentation('Untitled Presentation');
    // Pre-load asset store on mount
    useAssetStore.getState().fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Name ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isEditingName) {
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 50);
    }
  }, [isEditingName]);

  const handleStartEditingName = () => {
    setEditingName(presentation?.name || 'Untitled Presentation');
    setIsEditingName(true);
  };
  const handleConfirmName = () => {
    const t = editingName.trim();
    if (t && t !== presentation?.name)
      usePresentationStore.getState().updatePresentationName(t);
    setIsEditingName(false);
  };
  const handleCancelName = () => { setIsEditingName(false); setEditingName(''); };

  // ── File ops ──────────────────────────────────────────────────────────────
  const handleSaveJSON = () => {
    if (!presentation) return;
    try {
      const json     = saveToJSON();
      const blob     = new Blob([json], { type: 'application/json' });
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      const safeName = (presentation.name || 'presentation')
        .replace(/[^a-z0-9_\-\s]/gi, '_').trim();
      a.href         = url;
      a.download     = `${safeName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Saved "${safeName}.json"`, 'success');
    } catch (err) {
      console.error('Save JSON failed:', err);
      showToast('Failed to save JSON', 'error');
    }
  };

  const handleLoadJSON = () => {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.json,application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const loadingId = showToast(`Opening "${file.name}"…`, 'loading');
      const reader    = new FileReader();
      reader.onload   = (ev) => {
        try {
          loadFromJSON(ev.target?.result as string);
          dismissToast(loadingId);
          showToast(`Opened "${file.name}"`, 'success');
        } catch {
          dismissToast(loadingId);
          showToast('Failed to read JSON file', 'error');
        }
      };
      reader.onerror = () => {
        dismissToast(loadingId);
        showToast('Failed to read file', 'error');
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSaveArchive = async () => {
    if (!presentation) return;
    const safeName  = (presentation.name || 'presentation')
      .replace(/[^a-z0-9_\-\s]/gi, '_').trim();
    const loadingId = showToast('Saving archive…', 'loading');
    setArchiveOperation('saving');
    setArchiveProgress(0);
    try {
      const blob      = await saveAsArchive(presentation);
      const typedBlob = new Blob([blob], { type: 'application/octet-stream' });
      const url       = URL.createObjectURL(typedBlob);
      const a         = document.createElement('a');
      a.href          = url;
      a.download      = `${safeName}.preszip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      dismissToast(loadingId);
      showToast(`Saved "${safeName}.preszip"`, 'success');
    } catch (err) {
      console.error('Save archive failed:', err);
      dismissToast(loadingId);
      showToast('Failed to save archive', 'error');
    } finally {
      setArchiveOperation(null);
    }
  };

  const handleLoadArchive = () => {
    const input  = document.createElement('input');
    input.type   = 'file';
    input.accept = '.preszip,.zip,application/octet-stream,application/zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const loadingId = showToast(`Opening "${file.name}"…`, 'loading');
      setArchiveFileName(file.name);
      setArchiveOperation('loading');
      setArchiveProgress(0);
      try {
        const loaded = await loadFromArchive(file, (pct) => setArchiveProgress(pct));
        usePresentationStore.getState().loadPresentation(loaded);
        dismissToast(loadingId);
        showToast(`Opened "${file.name}"`, 'success');
      } catch (err) {
        console.error('Load archive failed:', err);
        dismissToast(loadingId);
        showToast('Failed to open archive — file may be corrupted', 'error');
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
    addSlide();
    const state    = usePresentationStore.getState();
    const newIndex = state.presentation!.slides.length - 1;

    layout.elements.forEach((el, i) => {
      const normalised = {
        id:       `el_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 9)}`,
        x:        el.x      ?? 0,
        y:        el.y      ?? 0,
        width:    el.width  ?? 300,
        height:   el.height ?? 100,
        rotation: 0,
        type:     el.type,
        opacity:  el.opacity ?? 1,
        zIndex:   i,
        isLocked: false,
        ...(el.type === 'text' && {
          text:       el.text       ?? 'Text',
          fontSize:   el.fontSize   ?? 24,
          fontFamily: el.fontFamily ?? 'Arial',
          fontColor:  el.fontColor  ?? '#ffffff',
          fontWeight: el.fontWeight ?? 'normal',
          fontStyle:  'normal',
          textAlign:  el.textAlign  ?? 'left',
          strokeColor: '#000000',
          strokeWidth: 0,
        }),
        ...(el.type === 'shape' && {
          shapeType:    (el as any).shapeType ?? 'rect',
          fill:         (el as any).fill      ?? '#3b82f6',
          stroke:       '#000000',
          strokeWidth:  0,
          cornerRadius: 0,
          fillGradient: undefined,
        }),
        ...(el.type === 'image' && { src: (el as any).src ?? '' }),
      };
      addElement(newIndex, normalised as any);
    });

    state.setCurrentSlideIndex(newIndex);
    setShowLayouts(false);
  }, [addSlide, addElement]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-screen w-screen flex flex-col bg-gray-950 text-white
                 overflow-hidden select-none"
      style={{ overscrollBehavior: 'none', touchAction: 'pan-x pan-y' }}
    >
      <ToastContainer toasts={toasts} />

      {/* ── TOP HEADER ── */}
      <header
        className="bg-gray-900 border-b border-gray-800 shrink-0
                   flex items-center justify-between px-3"
        style={{ height: 52, paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Left — name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-blue-400 text-base shrink-0">🎤</span>

          {isEditingName ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                ref={nameInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  handleConfirmName();
                  if (e.key === 'Escape') handleCancelName();
                }}
                onBlur={handleConfirmName}
                maxLength={60}
                className="flex-1 min-w-0 text-xs bg-gray-800 text-white
                           border border-blue-500 rounded-lg px-2 py-1
                           outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleConfirmName}
                className="text-green-400 text-xs px-1 shrink-0"
              >✓</button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCancelName}
                className="text-red-400 text-xs px-1 shrink-0"
              >✕</button>
            </div>
          ) : (
            <button
              onClick={handleStartEditingName}
              className="text-xs text-gray-200 hover:text-white truncate
                         flex items-center gap-1 group"
            >
              <span className="truncate max-w-[140px]">
                {presentation?.name || 'Untitled'}
              </span>
              <span className="opacity-0 group-active:opacity-100 text-gray-500 shrink-0">
                ✏️
              </span>
            </button>
          )}
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowNewModal(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       bg-gray-800 hover:bg-gray-700 text-gray-300
                       transition-colors text-sm"
            title="New Presentation"
          >📄</button>

          <button
            onClick={handleSaveJSON}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       bg-gray-800 hover:bg-gray-700 text-gray-300
                       transition-colors text-sm"
            title="Save JSON"
          >💾</button>

          <button
            onClick={handleSaveArchive}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       bg-gray-800 hover:bg-gray-700 text-gray-300
                       transition-colors text-sm"
            title="Save Archive (.preszip)"
          >📦</button>

          <button
            onClick={handleLoadJSON}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       bg-gray-800 hover:bg-gray-700 text-gray-300
                       transition-colors text-sm"
            title="Open JSON"
          >📂</button>

          <button
            onClick={handleLoadArchive}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       bg-gray-800 hover:bg-gray-700 text-gray-300
                       transition-colors text-sm"
            title="Open Archive"
          >🗂️</button>

          <div className="w-px h-6 bg-gray-700 mx-0.5 shrink-0" />

          {/* Pull from Desktop */}
          <button
            onClick={handlePullFromDesktop}
            disabled={!isConnected || isPulling}
            className={`flex items-center gap-1 px-2.5 h-8 rounded-xl
                        text-xs font-bold transition-colors shrink-0
                        ${!isConnected
                          ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          : isPulling
                          ? 'bg-indigo-900/80 text-indigo-300 cursor-wait'
                          : 'bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 text-white'}`}
            title={
              !isConnected ? 'Not connected to Desktop' :
              lastPullTime ? `Last pulled: ${lastPullTime.toLocaleTimeString()}` :
              'Load presentation from Desktop Editor'
            }
          >
            <span style={{
              fontSize: 14, display: 'inline-block',
              animation: isPulling ? 'spin 1s linear infinite' : 'none',
            }}>
              {isPulling ? '⏳' : '⬇️'}
            </span>
            <span className="hidden sm:inline ml-1">Pull</span>
          </button>

          {/* Push to Desktop */}
          <button
            onClick={handlePushToDesktop}
            disabled={!isConnected || isSyncing}
            className={`flex items-center gap-1 px-2.5 h-8 rounded-xl
                        text-xs font-bold transition-colors shrink-0
                        ${!isConnected
                          ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          : isSyncing
                          ? 'bg-orange-900/80 text-orange-300 cursor-wait'
                          : 'bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white'}`}
            title={
              !isConnected ? 'Not connected to Desktop' :
              lastPushTime ? `Last pushed: ${lastPushTime.toLocaleTimeString()}` :
              'Push presentation to Desktop Editor'
            }
          >
            <span style={{
              fontSize: 14, display: 'inline-block',
              animation: isSyncing ? 'spin 0.8s linear infinite' : 'none',
            }}>
              {isSyncing ? '⏳' : '⬆️'}
            </span>
            <span className="hidden sm:inline ml-1">Push</span>
          </button>

          {/* Connection dot */}
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              isConnected ? 'bg-green-400' : 'bg-red-500'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>
      </header>

      {/* ── SELECTED ELEMENT BAR ── */}
      {selectedElement && (
        <div className="px-3 py-2 border-b border-gray-800 bg-blue-950/30
                        flex items-center gap-2 shrink-0 overflow-x-auto">
          <span className="text-xs text-gray-400 shrink-0">Selected:</span>
          <span className="text-white text-xs font-medium shrink-0">
            {selectedElement.type === 'text'
              ? `📝 "${(selectedElement.text || 'Text').substring(0, 14)}…"`
              : selectedElement.type === 'shape' ? '🔷 Shape'
              : selectedElement.type === 'image' ? '🖼️ Image'
              : selectedElement.type === 'video' ? '🎬 Video'
              : selectedElement.type}
          </span>
          {selectedElement.isLocked && (
            <span className="bg-yellow-900/50 text-yellow-400 border border-yellow-700/50
                             px-1.5 py-0.5 rounded text-[10px] shrink-0">🔒</span>
          )}

          <div className="flex-1 min-w-[8px]" />

          {/* ── Quick "Replace Asset" button for image/video elements ── */}
          {(selectedElement.type === 'image' || selectedElement.type === 'video') && (
            <button
              onClick={() => {
                // Skip the target picker sheet — go straight to the right library
                setAssetTarget(selectedElement.type as AssetTarget);
                setShowAssetLibrary(true);
              }}
              className="px-2.5 py-1 text-xs bg-purple-700/50 border border-purple-600/50
                         rounded-lg shrink-0 active:bg-purple-600/80 text-purple-200
                         flex items-center gap-1"
              title="Replace with asset from library"
            >
              <span>📁</span>
              <span>Replace</span>
            </button>
          )}

          <button
            onClick={() => copyElement(selectedElementId!)}
            className="px-2.5 py-1 text-xs bg-blue-700/50 border border-blue-600/50
                       rounded-lg shrink-0 active:bg-blue-600/80"
          >⧉ Dupe</button>

          <button
            onClick={() => toggleLockElement(selectedElementId!)}
            className={`px-2.5 py-1 text-xs rounded-lg border shrink-0 ${
              selectedElement.isLocked
                ? 'bg-yellow-700/50 border-yellow-600/50 text-yellow-200'
                : 'bg-gray-700/50 border-gray-600/50 text-gray-200'
            }`}
          >
            {selectedElement.isLocked ? '🔒 Unlock' : '🔓 Lock'}
          </button>
        </div>
      )}

      {/* ── CANVAS AREA ── */}
      <div className="flex-1" style={{ paddingBottom: 0 }}>
        <CanvasViewport
          canvasWidth={CANVAS_WIDTH}
          canvasHeight={CANVAS_HEIGHT}
          onBgTap={() => setActiveSheet(null)}
        >
          {(zoom) => (
            <SlideCanvas editable={true} zoom={zoom} />
          )}
        </CanvasViewport>
      </div>

      {/* ── BOTTOM TOOLBAR ── */}
      <MobileToolbar
        activeSheet={activeSheet}
        onToggleSheet={setActiveSheet}
        currentSlideIndex={currentSlideIndex}
        totalSlides={presentation?.slides.length || 1}
        onPrev={() => usePresentationStore.getState().prevSlide()}
        onNext={() => usePresentationStore.getState().nextSlide()}
        onAddSlide={() => setShowLayouts(true)}
        onOpenAssets={handleOpenAssets}   // ← wired up
      />

      {/* ── BOTTOM SHEETS ── */}

      {/* Slides */}
      <BottomSheet
        isOpen={activeSheet === 'slides'}
        onClose={() => setActiveSheet(null)}
        title="🗂️ Slides"
        height="70vh"
      >
        <SlidePanel
          onAddSlide={() => { setActiveSheet(null); setShowLayouts(true); }}
        />
      </BottomSheet>

      {/* Elements (Add) */}
      <BottomSheet
        isOpen={activeSheet === 'elements'}
        onClose={() => setActiveSheet(null)}
        title="🔧 Add Element"
        height="auto"
      >
        <div className="p-4">
          <ElementToolbar />
        </div>
      </BottomSheet>

      {/* Properties */}
      <BottomSheet
        isOpen={activeSheet === 'properties'}
        onClose={() => setActiveSheet(null)}
        title="⚙️ Properties"
        height="75vh"
      >
        <PropertiesPanel />
      </BottomSheet>

      {/* Layers */}
      <BottomSheet
        isOpen={activeSheet === 'layers'}
        onClose={() => setActiveSheet(null)}
        title="📚 Layers"
        height="60vh"
      >
        <LayersPanel />
      </BottomSheet>

      {/* Layout picker */}
      <LayoutPickerSheet
        isOpen={showLayouts}
        onClose={() => setShowLayouts(false)}
        onSelect={handleAddSlideWithLayout}
      />

      {/* ── ASSET TARGET PICKER ── */}
      {/* Step 1: user picks what they want to do with the asset */}
      <AssetTargetSheet
        isOpen={showAssetTargetSheet}
        onClose={() => setShowAssetTargetSheet(false)}
        selectedElement={selectedElement}
        onSelectTarget={handleSelectAssetTarget}
      />

      {/* ── ASSET LIBRARY MODAL ── */}
      {/* Step 2: user picks an asset — reuses the same desktop AssetLibrary */}
      <AssetLibrary
        isOpen={showAssetLibrary}
        onClose={() => setShowAssetLibrary(false)}
        onSelect={handleAssetSelect}
        filter={assetFilter}
        forceDesktop
      />

      {/* New Presentation */}
      <NewPresentationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreate={(name) => createNewPresentation(name)}
      />

      {/* Archive progress */}
      <ArchiveProgressModal
        operation={archiveOperation}
        progress={archiveProgress}
        fileName={archiveFileName}
      />
    </div>
  );
};

export default MobileEditorPage;