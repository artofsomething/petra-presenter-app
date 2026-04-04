// src/renderer/components/Editor/AssetLibrary.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAssets } from '../../hooks/useAssets';
import type { AssetItem } from '../../store/useAssetStore';
import { uploadAsset } from '../../utils/assetUploader';

type AssetTab  = 'images' | 'videos';
type ViewMode  = 'grid'   | 'list';
type SortMode  = 'name'   | 'newest';
type PanelTab  = 'browse' | 'upload';

interface AssetLibraryProps {
  isOpen:        boolean;
  onClose:       () => void;
  onSelect?:     (asset: AssetItem) => void;
  filter?:       AssetTab;
  forceDesktop?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shortName(filename: string, max = 20): string {
  const name = filename.replace(/^\d+_[a-f0-9]+\./, 'asset.');
  return name.length > max ? name.slice(0, max - 3) + '...' : name;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (no hooks ordering issues — each is its own component)
// ─────────────────────────────────────────────────────────────────────────────
const UploadZone: React.FC<{
  type:       AssetTab;
  mobile?:    boolean;
  onUploaded: () => void;
}> = ({ type, mobile, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [dragging,  setDragging]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = type === 'images'
    ? 'image/png,image/jpeg,image/gif,image/webp'
    : 'video/mp4,video/webm,video/ogg,video/quicktime';

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setProgress(0);
    const total = files.length;
    let done = 0;
    for (const file of Array.from(files)) {
      try {
        const blobUrl = URL.createObjectURL(file);
        await uploadAsset(blobUrl, type);
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error('[AssetLibrary] Upload error:', err);
      }
      done++;
      setProgress(Math.round((done / total) * 100));
    }
    setUploading(false);
    setProgress(0);
    onUploaded();
  };

  if (mobile) {
    return (
      <div className="p-4 space-y-4">
        <input
          ref={inputRef} type="file" accept={accept} multiple className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="bg-gray-800/60 rounded-2xl px-4 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Uploading…</span>
              <span className="text-blue-400 text-sm font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300"
                   style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl
                       border-2 border-dashed border-gray-600 bg-gray-800/40
                       active:bg-gray-700/60 transition-colors"
          >
            <span className="text-4xl shrink-0">{type === 'images' ? '🖼️' : '🎬'}</span>
            <div className="text-left">
              <p className="text-white text-base font-semibold">
                Upload {type === 'images' ? 'Images' : 'Videos'}
              </p>
              <p className="text-gray-500 text-sm mt-0.5">
                {type === 'images' ? 'PNG, JPG, GIF, WebP' : 'MP4, WebM, OGG, MOV'}
              </p>
            </div>
            <span className="ml-auto text-2xl text-gray-500">+</span>
          </button>
        )}
        <div className="bg-gray-800/40 rounded-2xl p-4 space-y-2">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Tips</p>
          <ul className="text-gray-500 text-sm space-y-1 list-disc list-inside">
            <li>You can upload multiple files at once</li>
            {type === 'images'
              ? <li>Best results with 16:9 ratio images</li>
              : <li>MP4 (H.264) works best across browsers</li>}
            <li>Files are stored locally in your project</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
                  transition-all select-none
                  ${dragging
                    ? 'border-blue-400 bg-blue-950/30'
                    : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/30'}`}
    >
      <input
        ref={inputRef} type="file" accept={accept} multiple className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {uploading ? (
        <div className="space-y-2">
          <div className="text-gray-400 text-xs animate-pulse">Uploading… {progress}%</div>
          <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300"
                 style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <>
          <div className="text-2xl mb-1">{type === 'images' ? '🖼️' : '🎬'}</div>
          <p className="text-gray-400 text-xs">
            Drop {type} here or <span className="text-blue-400">click to browse</span>
          </p>
          <p className="text-gray-600 text-[10px] mt-1">
            {type === 'images' ? 'PNG, JPG, GIF, WebP' : 'MP4, WebM, OGG, MOV'}
          </p>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const ImageThumb: React.FC<{
  asset: AssetItem; viewMode: ViewMode; mobile: boolean;
  isSelected: boolean; onSelect: () => void;
  onUse: () => void; onDelete: () => Promise<void>;
}> = ({ asset, viewMode, mobile, isSelected, onSelect, onUse, onDelete }) => {
  const [imgError, setImgError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${asset.filename}"?`)) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  if (mobile) {
    return (
      <div
        onClick={onSelect}
        className={`relative rounded-2xl overflow-hidden border-2 transition-all
                    ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-transparent'}`}
      >
        <div className="aspect-video bg-gray-800">
          {imgError
            ? <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">🖼️</div>
            : <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover"
                   onError={() => setImgError(true)} />}
        </div>
        {isSelected && (
          <>
            <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">✓</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onUse(); }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-1.5
                         bg-blue-600 active:bg-blue-700 text-white text-xs font-bold rounded-full shadow-lg"
            >✓ Use This</button>
          </>
        )}
        <button
          onClick={handleDelete} disabled={deleting}
          className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 rounded-full
                     flex items-center justify-center text-sm backdrop-blur-sm active:bg-red-900/80"
        >{deleting ? '⏳' : '🗑️'}</button>
        <div className="px-2 py-1.5 bg-gray-900/90">
          <p className="text-white text-[11px] truncate" title={asset.filename}>
            {shortName(asset.filename, 24)}
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div
        onClick={onSelect}
        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group
                    ${isSelected ? 'bg-blue-900/50 border border-blue-500' : 'hover:bg-gray-800 border border-transparent'}`}
      >
        <div className="w-12 h-9 rounded overflow-hidden shrink-0 bg-gray-700">
          {imgError
            ? <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">🖼️</div>
            : <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover"
                   onError={() => setImgError(true)} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate" title={asset.filename}>
            {shortName(asset.filename, 30)}
          </p>
          <p className="text-gray-500 text-[10px]">{formatBytes(asset.size)}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onUse(); }}
                  className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Use</button>
          <button onClick={handleDelete} disabled={deleting}
                  className="px-2 py-1 text-[10px] bg-red-900/80 hover:bg-red-800 text-red-300 rounded">🗑️</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all
                  ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-transparent hover:border-gray-600'}`}
    >
      <div className="aspect-video bg-gray-800">
        {imgError
          ? <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">🖼️</div>
          : <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover"
                 onError={() => setImgError(true)} />}
      </div>
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity
                      flex flex-col items-center justify-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); onUse(); }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg">✓ Use This</button>
        <button onClick={handleDelete} disabled={deleting}
                className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-red-300 text-xs rounded-lg">🗑️ Delete</button>
      </div>
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-500 rounded-full
                        flex items-center justify-center text-white text-[10px]">✓</div>
      )}
      <div className="px-2 py-1.5 bg-gray-900/90">
        <p className="text-white text-[10px] truncate" title={asset.filename}>{shortName(asset.filename)}</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const VideoThumb: React.FC<{
  asset: AssetItem; viewMode: ViewMode; mobile: boolean;
  isSelected: boolean; onSelect: () => void;
  onUse: () => void; onDelete: () => Promise<void>;
}> = ({ asset, viewMode, mobile, isSelected, onSelect, onUse, onDelete }) => {
  const [deleting, setDeleting] = useState(false);
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${asset.filename}"?`)) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  const playOn  = () => videoRef.current?.play().catch(() => {});
  const pauseOn = () => {
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  };

  if (mobile) {
    return (
      <div
        onClick={onSelect}
        className={`relative rounded-2xl overflow-hidden border-2 transition-all
                    ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-transparent'}`}
      >
        <div className="aspect-video bg-gray-800 relative">
          <video ref={videoRef} src={asset.url} muted playsInline preload="metadata"
                 className="w-full h-full object-cover" />
          {!isSelected && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl backdrop-blur-sm">▶</div>
            </div>
          )}
        </div>
        {isSelected && (
          <>
            <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">✓</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onUse(); }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-1.5
                         bg-blue-600 active:bg-blue-700 text-white text-xs font-bold rounded-full shadow-lg"
            >✓ Use This</button>
          </>
        )}
        <button onClick={handleDelete} disabled={deleting}
                className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 rounded-full
                           flex items-center justify-center text-sm backdrop-blur-sm active:bg-red-900/80">
          {deleting ? '⏳' : '🗑️'}
        </button>
        <div className="px-2 py-1.5 bg-gray-900/90">
          <p className="text-white text-[11px] truncate">{shortName(asset.filename, 24)}</p>
          <p className="text-gray-500 text-[10px]">🎬 Video</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div onClick={onSelect}
           className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group
                       ${isSelected ? 'bg-blue-900/50 border border-blue-500' : 'hover:bg-gray-800 border border-transparent'}`}>
        <div className="w-12 h-9 rounded overflow-hidden shrink-0 bg-gray-700 flex items-center justify-center">
          <span className="text-xl">🎬</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate">{shortName(asset.filename, 30)}</p>
          <p className="text-gray-500 text-[10px]">Video · {formatBytes(asset.size)}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onUse(); }}
                  className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Use</button>
          <button onClick={handleDelete} disabled={deleting}
                  className="px-2 py-1 text-[10px] bg-red-900/80 hover:bg-red-800 text-red-300 rounded">🗑️</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => { setHovering(true); playOn(); }}
      onMouseLeave={() => { setHovering(false); pauseOn(); }}
      className={`relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all
                  ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-transparent hover:border-gray-600'}`}
    >
      <div className="aspect-video bg-gray-800 relative">
        <video ref={videoRef} src={asset.url} muted loop playsInline preload="metadata"
               className="w-full h-full object-cover" />
        {!hovering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl">▶</div>
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
                      flex flex-col items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
        <button onClick={(e) => { e.stopPropagation(); onUse(); }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg">✓ Use This</button>
        <button onClick={handleDelete} disabled={deleting}
                className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-red-300 text-xs rounded-lg">🗑️ Delete</button>
      </div>
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-500 rounded-full
                        flex items-center justify-center text-white text-[10px]">✓</div>
      )}
      <div className="px-2 py-1.5 bg-gray-900/90">
        <p className="text-white text-[10px] truncate">{shortName(asset.filename)}</p>
        <p className="text-gray-500 text-[10px]">🎬 Video</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const AssetDetail: React.FC<{
  asset: AssetItem; mobile: boolean;
  onUse: () => void; onDelete: () => void; onClose: () => void;
}> = ({ asset, mobile, onUse, onDelete, onClose }) => {
  const [copyToast, setCopyToast] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(asset.url).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    });
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${asset.filename}"?`)) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  const preview = (
    <div className="rounded-xl overflow-hidden bg-gray-800" style={{ aspectRatio: '16/9' }}>
      {asset.type === 'images'
        ? <img src={asset.url} alt={asset.filename} className="w-full h-full object-contain" />
        : <video src={asset.url} controls muted playsInline className="w-full h-full object-contain" />}
    </div>
  );

  if (mobile) {
    return (
      <div className="fixed inset-0 z-[70] flex items-end"
           style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
        <div className="w-full bg-gray-900 border-t border-gray-700 rounded-t-2xl overflow-hidden flex flex-col"
             style={{ maxHeight: '80dvh', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
             onClick={(e) => e.stopPropagation()}>
          <div className="relative flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-600 rounded-full" />
            <span className="text-white font-bold text-sm mt-1">Asset Details</span>
            <button onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 text-base mt-1">✕</button>
          </div>
          <div className="overflow-y-auto flex-1 px-4 space-y-3 pb-2">
            {preview}
            <div>
              <p className="text-white text-sm font-medium break-all">{asset.filename}</p>
              {asset.size && <p className="text-gray-500 text-xs mt-0.5">{formatBytes(asset.size)}</p>}
            </div>
            <button onClick={handleCopy}
                    className="w-full flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2.5 active:bg-gray-700">
              <span className="text-[10px] text-gray-500 font-mono truncate flex-1 text-left">{asset.url}</span>
              <span className="text-gray-400 text-sm shrink-0">{copyToast ? '✓' : '📋'}</span>
            </button>
            <div className="flex flex-col gap-2 pb-1">
              <button onClick={onUse}
                      className="w-full py-3.5 bg-blue-600 active:bg-blue-700 text-white text-sm font-bold rounded-xl">
                ✓ Use This Asset
              </button>
              <button onClick={handleCopy}
                      className="w-full py-3 bg-gray-700 active:bg-gray-800 text-gray-300 text-sm rounded-xl">
                {copyToast ? '✓ Copied!' : '📋 Copy URL'}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                      className="w-full py-3 bg-red-900/60 active:bg-red-950 text-red-400 text-sm rounded-xl disabled:opacity-50">
                {deleting ? '⏳ Deleting…' : '🗑️ Delete Asset'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 flex-1 overflow-y-auto space-y-2">
      <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Selected</p>
      {preview}
      <div>
        <p className="text-white text-[10px] font-medium break-all">{asset.filename}</p>
        {asset.size && <p className="text-gray-500 text-[10px]">{formatBytes(asset.size)}</p>}
      </div>
      <div className="bg-gray-800 rounded-lg px-2 py-1.5 flex items-center gap-1 cursor-pointer group"
           onClick={handleCopy}>
        <p className="text-gray-500 text-[9px] truncate flex-1 font-mono">{asset.url}</p>
        <span className="text-gray-600 group-hover:text-gray-300 text-[10px] shrink-0">
          {copyToast ? '✓' : '📋'}
        </span>
      </div>
      <div className="space-y-1.5">
        <button onClick={onUse}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg">
          ✓ Use This Asset
        </button>
        <button onClick={handleCopy}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg">
          {copyToast ? '✓ Copied!' : '📋 Copy URL'}
        </button>
        <button onClick={handleDelete} disabled={deleting}
                className="w-full py-2 bg-red-900/60 hover:bg-red-900 text-red-400 text-xs rounded-lg disabled:opacity-50">
          {deleting ? '⏳ Deleting…' : '🗑️ Delete'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// Every single hook is called unconditionally before any return statement.
// ─────────────────────────────────────────────────────────────────────────────
const AssetLibrary: React.FC<AssetLibraryProps> = ({
  isOpen,
  onClose,
  onSelect,
  filter,
  forceDesktop = false,
}) => {
  // ── STEP 1: ALL hooks — no conditions, no early returns above these ───────

  // Mobile detection (own hook, always runs)
  const [isMobileDetected, setIsMobileDetected] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobileDetected(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Data hook (always runs)
  const { images, videos, loading, error, fetchAssets, deleteAsset } = useAssets();

  // All state (always runs)
  const [tab,        setTab]        = useState<AssetTab>(filter ?? 'images');
  const [panelTab,   setPanelTab]   = useState<PanelTab>('browse');
  const [viewMode,   setViewMode]   = useState<ViewMode>('grid');
  const [sortMode,   setSortMode]   = useState<SortMode>('newest');
  const [search,     setSearch]     = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [copyToast,  setCopyToast]  = useState(false);
  const [mounted,    setMounted]    = useState(false);
  const [visible,    setVisible]    = useState(false);

  // All effects (always run)
  useEffect(() => {
    if (filter) setTab(filter);
  }, [filter]);

  useEffect(() => {
    // Compute isMobile inside the effect to avoid stale closure
    const mobile = !forceDesktop && isMobileDetected;

    if (isOpen) {
      setSelectedId(null);
      setSearch('');
      setShowDetail(false);
      setPanelTab('browse');
      fetchAssets();

      if (mobile) {
        setMounted(true);
        const t = setTimeout(() => setVisible(true), 16);
        return () => clearTimeout(t);
      }
    } else if (mobile) {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isMobileDetected, forceDesktop]);

  // All callbacks (always run)
  const handleUse = useCallback((asset: AssetItem) => {
    if (!onSelect) {
      console.warn('[AssetLibrary] onSelect prop not provided');
      return;
    }
    onSelect(asset);
    onClose();
  }, [onSelect, onClose]);

  const handleSelectCard = useCallback((asset: AssetItem, mobile: boolean) => {
    setSelectedId(asset.url);
    if (mobile) setShowDetail(true);
  }, []);

  const handleDelete = useCallback(async (asset: AssetItem) => {
    await deleteAsset(asset);
    setSelectedId((prev) => {
      if (prev === asset.url) { setShowDetail(false); return null; }
      return prev;
    });
  }, [deleteAsset]);

  const handleCopyUrl = useCallback((asset: AssetItem) => {
    navigator.clipboard.writeText(asset.url).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    });
  }, []);

  // ── STEP 2: Derived values (plain JS, not hooks) ──────────────────────────
  const isMobile  = !forceDesktop && isMobileDetected;
  const activeTab = filter ?? tab;
  const allItems  = activeTab === 'images' ? images : videos;

  const filtered = allItems
    .filter(a => a.filename.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortMode === 'name')   return a.filename.localeCompare(b.filename);
      if (sortMode === 'newest') return b.filename.localeCompare(a.filename);
      return 0;
    });

  const selectedAsset = filtered.find(a => a.url === selectedId) ?? null;

  // ── STEP 3: Conditional returns are NOW safe ──────────────────────────────
  if (!isMobile && !isOpen) return null;
  if (isMobile && !mounted)  return null;

  // ── Shared grid (JSX, not a hook) ─────────────────────────────────────────
  const assetGrid = (
    <div className="flex-1 overflow-y-auto overscroll-contain p-3">
      {loading && (
        <div className="flex items-center justify-center h-40 gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Loading assets…</span>
        </div>
      )}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <span className="text-3xl">⚠️</span>
          <p className="text-red-400 text-sm text-center">{error}</p>
          <button onClick={fetchAssets} className="px-4 py-2 bg-gray-700 text-white text-xs rounded-xl">
            Retry
          </button>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <span className="text-4xl opacity-40">{activeTab === 'images' ? '🖼️' : '🎬'}</span>
          <p className="text-gray-500 text-sm">
            {search ? `No ${activeTab} match "${search}"` : `No ${activeTab} yet — upload some!`}
          </p>
        </div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div
          className={isMobile || viewMode === 'grid' ? 'grid gap-2' : 'space-y-1'}
          style={isMobile || viewMode === 'grid'
            ? { gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }
            : undefined}
        >
          {filtered.map((asset) =>
            asset.type === 'images' ? (
              <ImageThumb
                key={asset.url} asset={asset} viewMode={viewMode} mobile={isMobile}
                isSelected={selectedId === asset.url}
                onSelect={() => handleSelectCard(asset, isMobile)}
                onUse={() => handleUse(asset)}
                onDelete={() => handleDelete(asset)}
              />
            ) : (
              <VideoThumb
                key={asset.url} asset={asset} viewMode={viewMode} mobile={isMobile}
                isSelected={selectedId === asset.url}
                onSelect={() => handleSelectCard(asset, isMobile)}
                onUse={() => handleUse(asset)}
                onDelete={() => handleDelete(asset)}
              />
            )
          )}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MOBILE RENDER
  // ══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 transition-opacity duration-300"
          style={{ background: 'rgba(0,0,0,0.6)', opacity: visible ? 1 : 0 }}
          onClick={onClose}
        />

        {/* Sheet */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t
                     border-gray-700 rounded-t-2xl flex flex-col transition-transform duration-300"
          style={{ height: '92dvh', transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-600 rounded-full pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-6 pb-3 border-b border-gray-800 shrink-0">
            <div>
              <h2 className="text-white font-bold text-sm">📁 Asset Library</h2>
              <p className="text-gray-500 text-[10px] mt-0.5">
                {images.length} image{images.length !== 1 ? 's' : ''} · {videos.length} video{videos.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}
                      className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 outline-none">
                <option value="newest">Newest</option>
                <option value="name">A–Z</option>
              </select>
              <button onClick={fetchAssets} disabled={loading}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 active:bg-gray-700">
                <span style={{ animation: loading ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }}>🔄</span>
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 text-base">✕</button>
            </div>
          </div>

          {/* Asset type tabs */}
          {!filter && (
            <div className="flex border-b border-gray-800 shrink-0">
              {(['images', 'videos'] as AssetTab[]).map((t) => (
                <button key={t} onClick={() => { setTab(t); setSelectedId(null); }}
                        className={`flex-1 py-2.5 text-xs font-semibold transition-colors
                                    ${activeTab === t ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/40' : 'text-gray-500'}`}>
                  {t === 'images' ? '🖼️ Images' : '🎬 Videos'}
                  <span className="ml-1 text-gray-600 text-[10px]">
                    ({t === 'images' ? images.length : videos.length})
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Browse / Upload tabs */}
          <div className="flex border-b border-gray-800 shrink-0 bg-gray-900">
            {(['browse', 'upload'] as PanelTab[]).map((pt) => (
              <button key={pt} onClick={() => setPanelTab(pt)}
                      className={`flex-1 py-2 text-xs font-semibold transition-colors
                                  ${panelTab === pt ? 'text-white bg-gray-800' : 'text-gray-500'}`}>
                {pt === 'browse' ? '🔍 Browse' : '⬆️ Upload'}
              </button>
            ))}
          </div>

          {/* Browse panel */}
          {panelTab === 'browse' && (
            <>
              <div className="px-3 py-2 border-b border-gray-800 shrink-0">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">🔍</span>
                  <input type="text" placeholder={`Search ${activeTab}…`} value={search}
                         onChange={(e) => setSearch(e.target.value)}
                         className="w-full bg-gray-800 text-white border border-gray-700 focus:border-blue-500
                                    outline-none rounded-xl pl-8 pr-8 py-2 text-sm placeholder-gray-600" />
                  {search && (
                    <button onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">✕</button>
                  )}
                </div>
              </div>
              {assetGrid}
              {filtered.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-800 shrink-0 flex items-center justify-between"
                     style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  <span className="text-gray-500 text-xs">
                    {filtered.length} {activeTab}{search ? ` matching "${search}"` : ''}
                  </span>
                  {selectedAsset && onSelect && (
                    <button onClick={() => handleUse(selectedAsset)}
                            className="px-5 py-2 bg-blue-600 active:bg-blue-700 text-white text-sm font-bold rounded-xl">
                      ✓ Use Selected
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Upload panel */}
          {panelTab === 'upload' && (
            <div className="flex-1 overflow-y-auto">
              <UploadZone type={activeTab} mobile onUploaded={() => { fetchAssets(); setPanelTab('browse'); }} />
            </div>
          )}
        </div>

        {/* Detail sheet */}
        {showDetail && selectedAsset && (
          <AssetDetail
            asset={selectedAsset} mobile
            onUse={() => { setShowDetail(false); handleUse(selectedAsset); }}
            onDelete={() => handleDelete(selectedAsset)}
            onClose={() => setShowDetail(false)}
          />
        )}
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DESKTOP RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 900, height: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">📁 Asset Library</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {images.length} image{images.length !== 1 ? 's' : ''} · {videos.length} video{videos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAssets} disabled={loading}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
              <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
            </button>
            <div className="flex bg-gray-800 rounded-lg overflow-hidden">
              {(['grid', 'list'] as ViewMode[]).map((m) => (
                <button key={m} onClick={() => setViewMode(m)}
                        className={`px-2.5 py-1.5 text-xs transition-colors
                                    ${viewMode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  {m === 'grid' ? '⊞' : '☰'}
                </button>
              ))}
            </div>
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5 border border-gray-700 outline-none">
              <option value="newest">Newest first</option>
              <option value="name">Name A–Z</option>
            </select>
            <button onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 border-r border-gray-800 flex flex-col shrink-0">
            {!filter && (
              <div className="flex border-b border-gray-800">
                {(['images', 'videos'] as AssetTab[]).map((t) => (
                  <button key={t} onClick={() => { setTab(t); setSelectedId(null); }}
                          className={`flex-1 py-2.5 text-xs font-semibold transition-colors
                                      ${activeTab === t
                                        ? 'text-blue-400 bg-gray-800/50 border-b-2 border-blue-400'
                                        : 'text-gray-500 hover:text-gray-300'}`}>
                    {t === 'images' ? '🖼️' : '🎬'}
                    <span className="ml-1 text-gray-600 text-[10px]">
                      ({t === 'images' ? images.length : videos.length})
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="p-3 border-b border-gray-800">
              <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Upload New</p>
              <UploadZone type={activeTab} onUploaded={fetchAssets} />
            </div>
            {selectedAsset && (
              <AssetDetail
                asset={selectedAsset} mobile={false}
                onUse={() => handleUse(selectedAsset)}
                onDelete={() => handleDelete(selectedAsset)}
                onClose={() => setSelectedId(null)}
              />
            )}
          </div>

          {/* Main */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 shrink-0">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">🔍</span>
                <input type="text" placeholder={`Search ${activeTab}…`} value={search}
                       onChange={(e) => setSearch(e.target.value)}
                       className="w-full bg-gray-800 text-white border border-gray-700 focus:border-blue-500
                                  outline-none rounded-xl pl-8 pr-4 py-2 text-sm placeholder-gray-600" />
                {search && (
                  <button onClick={() => setSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm">✕</button>
                )}
              </div>
            </div>

            {assetGrid}

            {filtered.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-800 shrink-0 flex items-center justify-between">
                <span className="text-gray-500 text-xs">
                  {filtered.length} {activeTab}{search ? ` matching "${search}"` : ''}
                </span>
                {selectedAsset && onSelect && (
                  <button onClick={() => handleUse(selectedAsset)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors">
                    ✓ Use Selected
                  </button>
                )}
                {selectedAsset && !onSelect && (
                  <span className="text-yellow-600 text-[10px]">⚠️ No action configured</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copy toast */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600
                        text-white text-xs px-4 py-2 rounded-full shadow-xl z-[60]">
          ✓ URL copied to clipboard
        </div>
      )}
    </div>
  );
};

export default AssetLibrary;
// // src/renderer/components/Editor/AssetLibrary.tsx
// import React, { useState, useCallback, useRef, useEffect } from 'react';
// import { useAssets } from '../../hooks/useAssets';
// import type { AssetItem } from '../../store/useAssetStore';
// import { uploadAsset } from '../../utils/assetUploader';

// type AssetTab  = 'images' | 'videos';
// type ViewMode  = 'grid'   | 'list';
// type SortMode  = 'name'   | 'newest';

// interface AssetLibraryProps {
//   isOpen:    boolean;
//   onClose:   () => void;
//   onSelect?: (asset: AssetItem) => void;
//   filter?:   AssetTab;
// }

// // ── Helpers ───────────────────────────────────────────────────────────────────
// function formatBytes(bytes?: number): string {
//   if (!bytes) return '';
//   if (bytes < 1024)         return `${bytes} B`;
//   if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
//   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
// }

// function shortName(filename: string, max = 20): string {
//   const name = filename.replace(/^\d+_[a-f0-9]+\./, 'asset.');
//   return name.length > max ? name.slice(0, max - 3) + '...' : name;
// }

// // ── Image thumbnail ───────────────────────────────────────────────────────────
// const ImageThumb: React.FC<{
//   asset:      AssetItem;
//   viewMode:   ViewMode;
//   isSelected: boolean;
//   onSelect:   () => void;
//   onUse:      () => void;
//   onDelete:   () => void;
// }> = ({ asset, viewMode, isSelected, onSelect, onUse, onDelete }) => {
//   const [imgError, setImgError] = useState(false);
//   const [deleting, setDeleting] = useState(false);

//   const handleDelete = async (e: React.MouseEvent) => {
//     e.stopPropagation();
//     if (!confirm(`Delete "${asset.filename}"?`)) return;
//     setDeleting(true);
//     await onDelete();
//     setDeleting(false);
//   };

//   if (viewMode === 'list') {
//     return (
//       <div
//         onClick={onSelect}
//         className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer
//                     transition-colors group
//                     ${isSelected
//                       ? 'bg-blue-900/50 border border-blue-500'
//                       : 'hover:bg-gray-800 border border-transparent'}`}
//       >
//         {/* Thumb */}
//         <div className="w-12 h-9 rounded overflow-hidden shrink-0 bg-gray-700">
//           {imgError
//             ? <div className="w-full h-full flex items-center justify-center
//                               text-gray-500 text-xs">🖼️</div>
//             : <img
//                 src={asset.url}
//                 alt={asset.filename}
//                 className="w-full h-full object-cover"
//                 onError={() => setImgError(true)}
//               />
//           }
//         </div>

//         {/* Name */}
//         <div className="flex-1 min-w-0">
//           <p className="text-white text-xs font-medium truncate" title={asset.filename}>
//             {shortName(asset.filename, 30)}
//           </p>
//           <p className="text-gray-500 text-[10px]">{formatBytes(asset.size)}</p>
//         </div>

//         {/* Actions */}
//         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100
//                         transition-opacity">
//           <button
//             onClick={(e) => { e.stopPropagation(); onUse(); }}
//             className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-500
//                        text-white rounded transition-colors font-bold"
//           >
//             Use
//           </button>
//           <button
//             onClick={handleDelete}
//             disabled={deleting}
//             className="px-2 py-1 text-[10px] bg-red-900/80 hover:bg-red-800
//                        text-red-300 rounded transition-colors"
//           >
//             🗑️
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // Grid mode
//   return (
//     <div
//       onClick={onSelect}
//       className={`relative group rounded-xl overflow-hidden cursor-pointer
//                   border-2 transition-all
//                   ${isSelected
//                     ? 'border-blue-500 ring-2 ring-blue-500/30'
//                     : 'border-transparent hover:border-gray-600'}`}
//     >
//       {/* Thumbnail */}
//       <div className="aspect-video bg-gray-800">
//         {imgError
//           ? <div className="w-full h-full flex items-center justify-center
//                             text-4xl text-gray-600">🖼️</div>
//           : <img
//               src={asset.url}
//               alt={asset.filename}
//               className="w-full h-full object-cover"
//               onError={() => setImgError(true)}
//             />
//         }
//       </div>

//       {/* Hover overlay */}
//       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
//                       transition-opacity flex flex-col items-center justify-center gap-2">
//         <button
//           onClick={(e) => { e.stopPropagation(); onUse(); }}
//           className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white
//                      text-xs font-bold rounded-lg transition-colors"
//         >
//           ✓ Use This
//         </button>
//         <button
//           onClick={handleDelete}
//           disabled={deleting}
//           className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-red-300
//                      text-xs rounded-lg transition-colors"
//         >
//           🗑️ Delete
//         </button>
//       </div>

//       {/* Selected badge */}
//       {isSelected && (
//         <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-500
//                         rounded-full flex items-center justify-center
//                         text-white text-[10px]">
//           ✓
//         </div>
//       )}

//       {/* Filename */}
//       <div className="px-2 py-1.5 bg-gray-900/90">
//         <p className="text-white text-[10px] truncate" title={asset.filename}>
//           {shortName(asset.filename)}
//         </p>
//       </div>
//     </div>
//   );
// };

// // ── Video thumbnail ───────────────────────────────────────────────────────────
// const VideoThumb: React.FC<{
//   asset:      AssetItem;
//   viewMode:   ViewMode;
//   isSelected: boolean;
//   onSelect:   () => void;
//   onUse:      () => void;
//   onDelete:   () => void;
// }> = ({ asset, viewMode, isSelected, onSelect, onUse, onDelete }) => {
//   const [deleting, setDeleting] = useState(false);
//   const [hovering, setHovering] = useState(false);
//   const videoRef = useRef<HTMLVideoElement>(null);

//   const handleMouseEnter = () => {
//     setHovering(true);
//     videoRef.current?.play().catch(() => {});
//   };
//   const handleMouseLeave = () => {
//     setHovering(false);
//     if (videoRef.current) {
//       videoRef.current.pause();
//       videoRef.current.currentTime = 0;
//     }
//   };

//   const handleDelete = async (e: React.MouseEvent) => {
//     e.stopPropagation();
//     if (!confirm(`Delete "${asset.filename}"?`)) return;
//     setDeleting(true);
//     await onDelete();
//     setDeleting(false);
//   };

//   if (viewMode === 'list') {
//     return (
//       <div
//         onClick={onSelect}
//         className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer
//                     transition-colors group
//                     ${isSelected
//                       ? 'bg-blue-900/50 border border-blue-500'
//                       : 'hover:bg-gray-800 border border-transparent'}`}
//       >
//         <div className="w-12 h-9 rounded overflow-hidden shrink-0 bg-gray-700
//                         flex items-center justify-center">
//           <span className="text-xl">🎬</span>
//         </div>
//         <div className="flex-1 min-w-0">
//           <p className="text-white text-xs font-medium truncate">
//             {shortName(asset.filename, 30)}
//           </p>
//           <p className="text-gray-500 text-[10px]">Video · {formatBytes(asset.size)}</p>
//         </div>
//         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100
//                         transition-opacity">
//           <button
//             onClick={(e) => { e.stopPropagation(); onUse(); }}
//             className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-500
//                        text-white rounded transition-colors font-bold"
//           >
//             Use
//           </button>
//           <button
//             onClick={handleDelete}
//             disabled={deleting}
//             className="px-2 py-1 text-[10px] bg-red-900/80 hover:bg-red-800
//                        text-red-300 rounded transition-colors"
//           >
//             🗑️
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // Grid mode
//   return (
//     <div
//       onClick={onSelect}
//       onMouseEnter={handleMouseEnter}
//       onMouseLeave={handleMouseLeave}
//       className={`relative group rounded-xl overflow-hidden cursor-pointer
//                   border-2 transition-all
//                   ${isSelected
//                     ? 'border-blue-500 ring-2 ring-blue-500/30'
//                     : 'border-transparent hover:border-gray-600'}`}
//     >
//       {/* Video preview */}
//       <div className="aspect-video bg-gray-800 relative">
//         <video
//           ref={videoRef}
//           src={asset.url}
//           muted
//           loop
//           playsInline
//           preload="metadata"
//           className="w-full h-full object-cover"
//         />
//         {/* Play icon when not hovering */}
//         {!hovering && (
//           <div className="absolute inset-0 flex items-center justify-center
//                           bg-black/40 pointer-events-none">
//             <div className="w-10 h-10 rounded-full bg-white/20 flex items-center
//                             justify-center text-white text-xl">
//               ▶
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Hover overlay */}
//       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
//                       transition-opacity flex flex-col items-center justify-center gap-2
//                       pointer-events-none group-hover:pointer-events-auto">
//         <button
//           onClick={(e) => { e.stopPropagation(); onUse(); }}
//           className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white
//                      text-xs font-bold rounded-lg transition-colors"
//         >
//           ✓ Use This
//         </button>
//         <button
//           onClick={handleDelete}
//           disabled={deleting}
//           className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-red-300
//                      text-xs rounded-lg transition-colors"
//         >
//           🗑️ Delete
//         </button>
//       </div>

//       {/* Selected badge */}
//       {isSelected && (
//         <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-500
//                         rounded-full flex items-center justify-center
//                         text-white text-[10px]">
//           ✓
//         </div>
//       )}

//       <div className="px-2 py-1.5 bg-gray-900/90">
//         <p className="text-white text-[10px] truncate">{shortName(asset.filename)}</p>
//         <p className="text-gray-500 text-[10px]">🎬 Video</p>
//       </div>
//     </div>
//   );
// };

// // ── Upload drop zone ──────────────────────────────────────────────────────────
// const UploadZone: React.FC<{
//   type:       AssetTab;
//   onUploaded: () => void;
// }> = ({ type, onUploaded }) => {
//   const [uploading, setUploading] = useState(false);
//   const [progress,  setProgress]  = useState(0);
//   const [dragging,  setDragging]  = useState(false);
//   const inputRef = useRef<HTMLInputElement>(null);

//   const accept = type === 'images'
//     ? 'image/png,image/jpeg,image/gif,image/webp'
//     : 'video/mp4,video/webm,video/ogg,video/quicktime';

//   const handleFiles = async (files: FileList | null) => {
//     if (!files || !files.length) return;
//     setUploading(true);
//     setProgress(0);

//     const total = files.length;
//     let   done  = 0;

//     for (const file of Array.from(files)) {
//       try {
//         const blobUrl = URL.createObjectURL(file);
//         await uploadAsset(blobUrl, type);
//         URL.revokeObjectURL(blobUrl);
//       } catch (err) {
//         console.error('[AssetLibrary] Upload error:', err);
//       }
//       done++;
//       setProgress(Math.round((done / total) * 100));
//     }

//     setUploading(false);
//     setProgress(0);
//     // ✅ Refresh the shared store after upload
//     onUploaded();
//   };

//   return (
//     <div
//       onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
//       onDragLeave={() => setDragging(false)}
//       onDrop={(e) => {
//         e.preventDefault();
//         setDragging(false);
//         handleFiles(e.dataTransfer.files);
//       }}
//       onClick={() => inputRef.current?.click()}
//       className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
//                   transition-all select-none
//                   ${dragging
//                     ? 'border-blue-400 bg-blue-950/30'
//                     : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/30'}`}
//     >
//       <input
//         ref={inputRef}
//         type="file"
//         accept={accept}
//         multiple
//         className="hidden"
//         onChange={(e) => handleFiles(e.target.files)}
//       />

//       {uploading ? (
//         <div className="space-y-2">
//           <div className="text-gray-400 text-xs animate-pulse">
//             Uploading... {progress}%
//           </div>
//           <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
//             <div
//               className="h-full bg-blue-500 rounded-full transition-all duration-300"
//               style={{ width: `${progress}%` }}
//             />
//           </div>
//         </div>
//       ) : (
//         <>
//           <div className="text-2xl mb-1">{type === 'images' ? '🖼️' : '🎬'}</div>
//           <p className="text-gray-400 text-xs">
//             Drop {type} here or{' '}
//             <span className="text-blue-400">click to browse</span>
//           </p>
//           <p className="text-gray-600 text-[10px] mt-1">
//             {type === 'images' ? 'PNG, JPG, GIF, WebP' : 'MP4, WebM, OGG, MOV'}
//           </p>
//         </>
//       )}
//     </div>
//   );
// };

// // ── Main AssetLibrary component ───────────────────────────────────────────────
// const AssetLibrary: React.FC<AssetLibraryProps> = ({
//   isOpen,
//   onClose,
//   onSelect,
//   filter,
// }) => {
//   const { images, videos, loading, error, fetchAssets, deleteAsset } = useAssets();

//   const [tab,        setTab]        = useState<AssetTab>(filter ?? 'images');
//   const [viewMode,   setViewMode]   = useState<ViewMode>('grid');
//   const [sortMode,   setSortMode]   = useState<SortMode>('newest');
//   const [search,     setSearch]     = useState('');
//   const [selectedId, setSelectedId] = useState<string | null>(null);
//   const [copyToast,  setCopyToast]  = useState(false);

//   // ✅ Fix: sync tab when filter prop changes (e.g. opening for image vs video)
//   useEffect(() => {
//     if (filter) setTab(filter);
//   }, [filter]);

//   // ✅ Fix: reset selection and search every time the modal opens
//   useEffect(() => {
//     if (isOpen) {
//       setSelectedId(null);
//       setSearch('');
//       // Refresh assets each time modal opens so list is always up to date
//       fetchAssets();
//     }
//   }, [isOpen]);

//   // Early return AFTER all hooks
//   if (!isOpen) return null;

//   const activeTab = filter ?? tab;
//   const allItems  = activeTab === 'images' ? images : videos;

//   // Filter + sort
//   const filtered = allItems
//     .filter(a => a.filename.toLowerCase().includes(search.toLowerCase()))
//     .sort((a, b) => {
//       if (sortMode === 'name')   return a.filename.localeCompare(b.filename);
//       if (sortMode === 'newest') return b.filename.localeCompare(a.filename);
//       return 0;
//     });

//   // ✅ Fix: use url as the unique key (more reliable than filename)
//   const selectedAsset = filtered.find(a => a.url === selectedId) ?? null;

//   // ✅ Fix: warn clearly when onSelect is missing, never silently fail
//   const handleUse = (asset: AssetItem) => {
//     if (!onSelect) {
//       console.warn(
//         '[AssetLibrary] ⚠️ "Use This" clicked but onSelect prop is not provided!\n' +
//         'Pass onSelect={(asset) => { ... }} to <AssetLibrary />.'
//       );
//       return;
//     }
//     console.log('[AssetLibrary] ✓ Using asset:', asset.filename, asset.url);
//     onSelect(asset);
//     onClose();
//   };

//   const handleCopyUrl = (asset: AssetItem) => {
//     navigator.clipboard.writeText(asset.url).then(() => {
//       setCopyToast(true);
//       setTimeout(() => setCopyToast(false), 2000);
//     });
//   };

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center"
//       style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
//       onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
//     >
//       <div
//         className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl
//                    flex flex-col overflow-hidden"
//         style={{ width: 900, height: '85vh' }}
//         onClick={(e) => e.stopPropagation()}
//       >

//         {/* ── Header ── */}
//         <div className="flex items-center justify-between px-5 py-3
//                         border-b border-gray-800 shrink-0">
//           <div>
//             <h2 className="text-white font-bold text-base">📁 Asset Library</h2>
//             <p className="text-gray-400 text-xs mt-0.5">
//               {images.length} image{images.length !== 1 ? 's' : ''} ·{' '}
//               {videos.length} video{videos.length !== 1 ? 's' : ''}
//             </p>
//           </div>

//           {/* Controls */}
//           <div className="flex items-center gap-2">
//             {/* Refresh */}
//             <button
//               onClick={fetchAssets}
//               disabled={loading}
//               className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700
//                          text-gray-400 hover:text-white transition-colors"
//               title="Refresh"
//             >
//               <span style={{
//                 display:   'inline-block',
//                 animation: loading ? 'spin 1s linear infinite' : 'none',
//               }}>
//                 🔄
//               </span>
//             </button>

//             {/* View mode */}
//             <div className="flex bg-gray-800 rounded-lg overflow-hidden">
//               {(['grid', 'list'] as ViewMode[]).map((m) => (
//                 <button
//                   key={m}
//                   onClick={() => setViewMode(m)}
//                   className={`px-2.5 py-1.5 text-xs transition-colors
//                               ${viewMode === m
//                                 ? 'bg-blue-600 text-white'
//                                 : 'text-gray-400 hover:text-white'}`}
//                 >
//                   {m === 'grid' ? '⊞' : '☰'}
//                 </button>
//               ))}
//             </div>

//             {/* Sort */}
//             <select
//               value={sortMode}
//               onChange={(e) => setSortMode(e.target.value as SortMode)}
//               className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5
//                          border border-gray-700 outline-none"
//             >
//               <option value="newest">Newest first</option>
//               <option value="name">Name A–Z</option>
//             </select>

//             {/* Close */}
//             <button
//               onClick={onClose}
//               className="w-8 h-8 flex items-center justify-center rounded-lg
//                          text-gray-400 hover:text-white hover:bg-gray-800
//                          transition-colors"
//             >
//               ✕
//             </button>
//           </div>
//         </div>

//         {/* ── Body ── */}
//         <div className="flex flex-1 overflow-hidden">

//           {/* ── Left sidebar ── */}
//           <div className="w-56 border-r border-gray-800 flex flex-col shrink-0">

//             {/* Tabs — only show if no filter is locked */}
//             {!filter && (
//               <div className="flex border-b border-gray-800">
//                 {(['images', 'videos'] as AssetTab[]).map((t) => (
//                   <button
//                     key={t}
//                     onClick={() => { setTab(t); setSelectedId(null); }}
//                     className={`flex-1 py-2.5 text-xs font-semibold transition-colors
//                                 ${activeTab === t
//                                   ? 'text-blue-400 bg-gray-800/50 border-b-2 border-blue-400'
//                                   : 'text-gray-500 hover:text-gray-300'}`}
//                   >
//                     {t === 'images' ? '🖼️ Images' : '🎬 Videos'}
//                     <span className="ml-1 text-gray-600 text-[10px]">
//                       ({t === 'images' ? images.length : videos.length})
//                     </span>
//                   </button>
//                 ))}
//               </div>
//             )}

//             {/* Upload zone */}
//             <div className="p-3 border-b border-gray-800">
//               <p className="text-gray-500 text-[10px] font-semibold uppercase
//                             tracking-wider mb-2">
//                 Upload New
//               </p>
//               <UploadZone type={activeTab} onUploaded={fetchAssets} />
//             </div>

//             {/* Selected asset info */}
//             {selectedAsset && (
//               <div className="p-3 flex-1 overflow-y-auto">
//                 <p className="text-gray-500 text-[10px] font-semibold uppercase
//                               tracking-wider mb-2">
//                   Selected
//                 </p>

//                 {/* Preview */}
//                 {selectedAsset.type === 'images' ? (
//                   <div
//                     className="rounded-lg overflow-hidden bg-gray-800 mb-2"
//                     style={{ aspectRatio: '16/9' }}
//                   >
//                     <img
//                       src={selectedAsset.url}
//                       alt={selectedAsset.filename}
//                       className="w-full h-full object-contain"
//                     />
//                   </div>
//                 ) : (
//                   <div
//                     className="rounded-lg overflow-hidden bg-gray-800 mb-2"
//                     style={{ aspectRatio: '16/9' }}
//                   >
//                     <video
//                       src={selectedAsset.url}
//                       controls
//                       muted
//                       className="w-full h-full object-contain"
//                     />
//                   </div>
//                 )}

//                 {/* Meta */}
//                 <div className="space-y-1 mb-3">
//                   <p className="text-white text-[10px] font-medium break-all">
//                     {selectedAsset.filename}
//                   </p>
//                   {selectedAsset.size && (
//                     <p className="text-gray-500 text-[10px]">
//                       {formatBytes(selectedAsset.size)}
//                     </p>
//                   )}
//                 </div>

//                 {/* URL copy */}
//                 <div
//                   className="bg-gray-800 rounded-lg px-2 py-1.5 mb-2
//                              flex items-center gap-1 group cursor-pointer"
//                   onClick={() => handleCopyUrl(selectedAsset)}
//                 >
//                   <p className="text-gray-500 text-[9px] truncate flex-1 font-mono">
//                     {selectedAsset.url}
//                   </p>
//                   <span className="text-gray-600 group-hover:text-gray-300
//                                    text-[10px] shrink-0">
//                     {copyToast ? '✓' : '📋'}
//                   </span>
//                 </div>

//                 {/* Action buttons */}
//                 <div className="space-y-1.5">
//                   <button
//                     onClick={() => handleUse(selectedAsset)}
//                     className="w-full py-2 bg-blue-600 hover:bg-blue-500
//                                text-white text-xs font-bold rounded-lg
//                                transition-colors"
//                   >
//                     ✓ Use This Asset
//                   </button>
//                   <button
//                     onClick={() => handleCopyUrl(selectedAsset)}
//                     className="w-full py-2 bg-gray-700 hover:bg-gray-600
//                                text-gray-300 text-xs rounded-lg transition-colors"
//                   >
//                     {copyToast ? '✓ Copied!' : '📋 Copy URL'}
//                   </button>
//                   <button
//                     onClick={() => {
//                       deleteAsset(selectedAsset);
//                       setSelectedId(null);
//                     }}
//                     className="w-full py-2 bg-red-900/60 hover:bg-red-900
//                                text-red-400 text-xs rounded-lg transition-colors"
//                   >
//                     🗑️ Delete
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* ── Main grid / list area ── */}
//           <div className="flex-1 flex flex-col overflow-hidden">

//             {/* Search bar */}
//             <div className="px-4 py-3 border-b border-gray-800 shrink-0">
//               <div className="relative">
//                 <span className="absolute left-3 top-1/2 -translate-y-1/2
//                                  text-gray-500 text-sm pointer-events-none">
//                   🔍
//                 </span>
//                 <input
//                   type="text"
//                   placeholder={`Search ${activeTab}…`}
//                   value={search}
//                   onChange={(e) => setSearch(e.target.value)}
//                   className="w-full bg-gray-800 text-white border border-gray-700
//                              focus:border-blue-500 outline-none rounded-xl
//                              pl-8 pr-4 py-2 text-sm transition-colors
//                              placeholder-gray-600"
//                 />
//                 {search && (
//                   <button
//                     onClick={() => setSearch('')}
//                     className="absolute right-3 top-1/2 -translate-y-1/2
//                                text-gray-500 hover:text-gray-300 text-sm"
//                   >
//                     ✕
//                   </button>
//                 )}
//               </div>
//             </div>

//             {/* Content area */}
//             <div className="flex-1 overflow-y-auto p-4">

//               {/* Loading */}
//               {loading && (
//                 <div className="flex items-center justify-center h-48 gap-3">
//                   <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent
//                                   rounded-full animate-spin" />
//                   <span className="text-gray-400 text-sm">Loading assets…</span>
//                 </div>
//               )}

//               {/* Error */}
//               {!loading && error && (
//                 <div className="flex flex-col items-center justify-center h-48 gap-3">
//                   <span className="text-3xl">⚠️</span>
//                   <p className="text-red-400 text-sm text-center">{error}</p>
//                   <button
//                     onClick={fetchAssets}
//                     className="px-4 py-2 bg-gray-700 hover:bg-gray-600
//                                text-white text-xs rounded-lg transition-colors"
//                   >
//                     Retry
//                   </button>
//                 </div>
//               )}

//               {/* Empty state */}
//               {!loading && !error && filtered.length === 0 && (
//                 <div className="flex flex-col items-center justify-center h-48 gap-3">
//                   <span className="text-4xl opacity-40">
//                     {activeTab === 'images' ? '🖼️' : '🎬'}
//                   </span>
//                   <p className="text-gray-500 text-sm">
//                     {search
//                       ? `No ${activeTab} match "${search}"`
//                       : `No ${activeTab} uploaded yet`}
//                   </p>
//                   {!search && (
//                     <p className="text-gray-600 text-xs">
//                       Use the upload zone on the left to add {activeTab}
//                     </p>
//                   )}
//                 </div>
//               )}

//               {/* Grid */}
//               {!loading && !error && filtered.length > 0 && viewMode === 'grid' && (
//                 <div
//                   className="grid gap-3"
//                   style={{
//                     gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
//                   }}
//                 >
//                   {filtered.map((asset) =>
//                     asset.type === 'images' ? (
//                       <ImageThumb
//                         key={asset.url}
//                         asset={asset}
//                         viewMode="grid"
//                         isSelected={selectedId === asset.url}
//                         onSelect={() => setSelectedId(asset.url)}
//                         onUse={() => handleUse(asset)}
//                         onDelete={async () => {
//                           await deleteAsset(asset);
//                           if (selectedId === asset.url) setSelectedId(null);
//                         }}
//                       />
//                     ) : (
//                       <VideoThumb
//                         key={asset.url}
//                         asset={asset}
//                         viewMode="grid"
//                         isSelected={selectedId === asset.url}
//                         onSelect={() => setSelectedId(asset.url)}
//                         onUse={() => handleUse(asset)}
//                         onDelete={async () => {
//                           await deleteAsset(asset);
//                           if (selectedId === asset.url) setSelectedId(null);
//                         }}
//                       />
//                     )
//                   )}
//                 </div>
//               )}

//               {/* List */}
//               {!loading && !error && filtered.length > 0 && viewMode === 'list' && (
//                 <div className="space-y-1">
//                   {filtered.map((asset) =>
//                     asset.type === 'images' ? (
//                       <ImageThumb
//                         key={asset.url}
//                         asset={asset}
//                         viewMode="list"
//                         isSelected={selectedId === asset.url}
//                         onSelect={() => setSelectedId(asset.url)}
//                         onUse={() => handleUse(asset)}
//                         onDelete={async () => {
//                           await deleteAsset(asset);
//                           if (selectedId === asset.url) setSelectedId(null);
//                         }}
//                       />
//                     ) : (
//                       <VideoThumb
//                         key={asset.url}
//                         asset={asset}
//                         viewMode="list"
//                         isSelected={selectedId === asset.url}
//                         onSelect={() => setSelectedId(asset.url)}
//                         onUse={() => handleUse(asset)}
//                         onDelete={async () => {
//                           await deleteAsset(asset);
//                           if (selectedId === asset.url) setSelectedId(null);
//                         }}
//                       />
//                     )
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* ── Footer ── */}
//             {filtered.length > 0 && (
//               <div className="px-4 py-2.5 border-t border-gray-800 shrink-0
//                               flex items-center justify-between">
//                 <span className="text-gray-500 text-xs">
//                   {filtered.length} {activeTab}
//                   {search ? ` matching "${search}"` : ''}
//                 </span>

//                 {/* ✅ Fix: "Use Selected" only shows when something is selected
//                          AND onSelect is provided */}
//                 {selectedAsset && onSelect && (
//                   <button
//                     onClick={() => handleUse(selectedAsset)}
//                     className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500
//                                text-white text-xs font-bold rounded-lg
//                                transition-colors"
//                   >
//                     ✓ Use Selected
//                   </button>
//                 )}

//                 {/* ✅ Show a hint when onSelect is missing */}
//                 {selectedAsset && !onSelect && (
//                   <span className="text-yellow-600 text-[10px]">
//                     ⚠️ No action configured for this context
//                   </span>
//                 )}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Copy toast */}
//       {copyToast && (
//         <div className="fixed bottom-6 left-1/2 -translate-x-1/2
//                         bg-gray-800 border border-gray-600 text-white
//                         text-xs px-4 py-2 rounded-full shadow-xl z-[60]">
//           ✓ URL copied to clipboard
//         </div>
//       )}
//     </div>
//   );
// };

// export default AssetLibrary;