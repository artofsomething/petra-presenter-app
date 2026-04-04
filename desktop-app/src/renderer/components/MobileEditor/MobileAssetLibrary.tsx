// src/renderer/components/Editor/AssetLibrary.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAssets } from '../../hooks/useAssets';
import type { AssetItem } from '../../store/useAssetStore';
import { uploadAsset } from '../../utils/assetUploader';

type AssetTab  = 'images' | 'videos';
type ViewMode  = 'grid'   | 'list';
type SortMode  = 'name'   | 'newest';
type PanelTab  = 'browse' | 'upload';   // mobile-only top-level tabs

interface AssetLibraryProps {
  isOpen:    boolean;
  onClose:   () => void;
  onSelect?: (asset: AssetItem) => void;
  filter?:   AssetTab;
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
// Hook — detect mobile once at mount
// ─────────────────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload Zone  (shared desktop + mobile)
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

  // ── Mobile upload button ──────────────────────────────────────────────────
  if (mobile) {
    return (
      <div className="p-4 space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {uploading ? (
          <div className="bg-gray-800/60 rounded-2xl px-4 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Uploading…</span>
              <span className="text-blue-400 text-sm font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl
                       border-2 border-dashed border-gray-600 bg-gray-800/40
                       active:bg-gray-700/60 transition-colors"
          >
            <span className="text-4xl shrink-0">
              {type === 'images' ? '🖼️' : '🎬'}
            </span>
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

        {/* Tips */}
        <div className="bg-gray-800/40 rounded-2xl p-4 space-y-2">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
            Tips
          </p>
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

  // ── Desktop drop zone ─────────────────────────────────────────────────────
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
                  transition-all select-none
                  ${dragging
                    ? 'border-blue-400 bg-blue-950/30'
                    : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/30'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {uploading ? (
        <div className="space-y-2">
          <div className="text-gray-400 text-xs animate-pulse">
            Uploading… {progress}%
          </div>
          <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="text-2xl mb-1">{type === 'images' ? '🖼️' : '🎬'}</div>
          <p className="text-gray-400 text-xs">
            Drop {type} here or{' '}
            <span className="text-blue-400">click to browse</span>
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
// Image Thumbnail
// ─────────────────────────────────────────────────────────────────────────────
const ImageThumb: React.FC<{
  asset:      AssetItem;
  viewMode:   ViewMode;
  mobile:     boolean;
  isSelected: boolean;
  onSelect:   () => void;
  onUse:      () => void;
  onDelete:   () => Promise<void>;
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

  // ── Mobile card ───────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <div
        onClick={onSelect}
        className={`relative rounded-2xl overflow-hidden border-2 transition-all
                    ${isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : 'border-transparent'}`}
      >
        <div className="aspect-video bg-gray-800">
          {imgError
            ? <div className="w-full h-full flex items-center justify-center
                              text-4xl text-gray-600">🖼️</div>
            : <img
                src={asset.url}
                alt={asset.filename}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />}
        </div>

        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-blue-900/40 flex items-center
                          justify-center pointer-events-none">
            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center
                            justify-center text-white text-lg">✓</div>
          </div>
        )}

        {/* Use button — visible when selected */}
        {isSelected && (
          <button
            onClick={(e) => { e.stopPropagation(); onUse(); }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2
                       px-4 py-1.5 bg-blue-600 active:bg-blue-700 text-white
                       text-xs font-bold rounded-full shadow-lg"
          >
            ✓ Use This
          </button>
        )}

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 rounded-full
                     flex items-center justify-center text-sm backdrop-blur-sm
                     active:bg-red-900/80"
        >
          {deleting ? '⏳' : '🗑️'}
        </button>

        {/* Filename bar */}
        <div className="px-2 py-1.5 bg-gray-900/90">
          <p className="text-white text-[11px] truncate" title={asset.filename}>
            {shortName(asset.filename, 24)}
          </p>
        </div>
      </div>
    );
  }

  // ── Desktop list row ──────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        onClick={onSelect}
        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer
                    transition-colors group
                    ${isSelected
                      ? 'bg-blue-900/50 border border-blue-500'
                      : 'hover:bg-gray-800 border border-transparent'}`}
      >
        <div className="w-12 h-9 rounded overflow-hidden shrink-0 bg-gray-700">
          {imgError
            ? <div className="w-full h-full flex items-center justify-center
                              text-gray-500 text-xs">🖼️</div>
            : <img src={asset.url} alt={asset.filename}
                   className="w-full h-full object-cover"
                   onError={() => setImgError(true)} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate" title={asset.filename}>
            {shortName(asset.filename, 30)}
          </p>
          <p className="text-gray-500 text-[10px]">{formatBytes(asset.size)}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100
                        transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onUse(); }}
            className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-500
                       text-white rounded transition-colors font-bold"
          >Use</button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2 py-1 text-[10px] bg-red-900/80 hover:bg-red-800
                       text-red-300 rounded transition-colors"
          >🗑️</button>
        </div>
      </div>
    );
  }

  // ── Desktop grid card ─────────────────────────────────────────────────────
  return (
    <div
      onClick={onSelect}
      className={`relative group rounded-xl overflow-hidden cursor-pointer
                  border-2 transition-all
                  ${isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                    : 'border-transparent hover:border-gray-600'}`}
    >
      <div className="aspect-video bg-gray-800">
        {imgError
          ? <div className="w-full h-full flex items-center justify-center
                            text-4xl text-gray-600">🖼️</div>
          : <img src={asset.url} alt={asset.filename}
                 className="w-full h-full object-cover"
                 onError={() => setImgError(true)} />}
      </div>
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                      transition-opacity flex flex-col items-center justify-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onUse(); }}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white
                     text-xs font-bold rounded-lg transition-colors"
        >✓ Use This</button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-red-300
                     text-xs rounded-lg transition-colors"
        >🗑️ Delete</button>
      </div>
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-500
                        rounded-full flex items-center justify-center
                        text-white text-[10px]">✓</div>
      )}
      <div className="px-2 py-1.5 bg-gray-900/90">
        <p className="text-white text-[10px] truncate" title={asset.filename}>
          {shortName(asset.filename)}
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Video Thumbnail
// ─────────────────────────────────────────────────────────────────────────────
const VideoThumb: React.FC<{
  asset:      AssetItem;
  viewMode:   ViewMode;
  mobile:     boolean;
  isSelected: boolean;
  onSelect:   () => void;
  onUse:      () => void;
  onDelete:   () => Promise<void>;
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
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // ── Mobile card ───────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <div
        onClick={onSelect}
        className={`relative rounded-2xl overflow-hidden border-2 transition-all
                    ${isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : 'border-transparent'}`}
      >
        <div className="aspect-video bg-gray-800 relative">
          <video
            ref={videoRef}
            src={asset.url}
            muted playsInline preload="metadata"
            className="w-full h-full object-cover"
          />
          {!isSelected && (
            <div className="absolute inset-0 flex items-center justify-center
                            bg-black/40 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center
                              justify-center text-white text-xl backdrop-blur-sm">▶</div>
            </div>
          )}
        </div>

        {isSelected && (
          <div className="absolute inset-0 bg-blue-900/40 flex items-center
                          justify-center pointer-events-none">
            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center
                            justify-center text-white text-lg">✓</div>
          </div>
        )}

        {isSelected && (
          <button
            onClick={(e) => { e.stopPropagation(); onUse(); }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2
                       px-4 py-1.5 bg-blue-600 active:bg-blue-700 text-white
                       text-xs font-bold rounded-full shadow-lg"
          >✓ Use This</button>
        )}

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 rounded-full
                     flex items-center justify-center text-sm backdrop-blur-sm
                     active:bg-red-900/80"
        >{deleting ? '⏳' : '🗑️'}</button>

        <div className="px-2 py-1.5 bg-gray-900/90">
          <p className="text-white text-[11px] truncate">{shortName(asset.filename, 24)}</p>
          <p className="text-gray-500 text-[10px]">🎬 Video</p>
        </div>
      </div>
    );
  }

  // ── Desktop list row ──────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        onClick={onSelect}
        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer
                    transition-colors group
                    ${isSelected
                      ? 'bg-blue-900/50 border border-blue-500'
                      : 'hover:bg-gray-800 border border-transparent'}`}
      >
        <div className="w-12 h-9 rounded overflow-hidden shrink-0 bg-gray-700
                        flex items-center justify-center">
          <span className="text-xl">🎬</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate">
            {shortName(asset.filename, 30)}
          </p>
          <p className="text-gray-500 text-[10px]">Video · {formatBytes(asset.size)}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100
                        transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onUse(); }}
            className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-500
                       text-white rounded transition-colors font-bold"
          >Use</button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2 py-1 text-[10px] bg-red-900/80 hover:bg-red-800
                       text-red-300 rounded transition-colors"
          >🗑️</button>
        </div>
      </div>
    );
  }

  // ── Desktop grid card ─────────────────────────────────────────────────────
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => { setHovering(true);  playOn();  }}
      onMouseLeave={() => { setHovering(false); pauseOn(); }}
      className={`relative group rounded-xl overflow-hidden cursor-pointer
                  border-2 transition-all
                  ${isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                    : 'border-transparent hover:border-gray-600'}`}
    >
      <div className="aspect-video bg-gray-800 relative">
        <video
          ref={videoRef}
          src={asset.url}
          muted loop playsInline preload="metadata"
          className="w-full h-full object-cover"
        />
        {!hovering && (
          <div className="absolute inset-0 flex items-center justify-center
                          bg-black/40 pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center
                            justify-center text-white text-xl">▶</div>
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                      transition-opacity flex flex-col items-center justify-center gap-2
                      pointer-events-none group-hover:pointer-events-auto">
        <button
          onClick={(e) => { e.stopPropagation(); onUse(); }}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white
                     text-xs font-bold rounded-lg transition-colors"
        >✓ Use This</button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-red-300
                     text-xs rounded-lg transition-colors"
        >🗑️ Delete</button>
      </div>
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-blue-500
                        rounded-full flex items-center justify-center
                        text-white text-[10px]">✓</div>
      )}
      <div className="px-2 py-1.5 bg-gray-900/90">
        <p className="text-white text-[10px] truncate">{shortName(asset.filename)}</p>
        <p className="text-gray-500 text-[10px]">🎬 Video</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Selected Asset Detail Panel  (desktop sidebar / mobile bottom sheet)
// ─────────────────────────────────────────────────────────────────────────────
const AssetDetail: React.FC<{
  asset:    AssetItem;
  mobile:   boolean;
  onUse:    () => void;
  onDelete: () => void;
  onClose:  () => void;
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
        ? <img src={asset.url} alt={asset.filename}
               className="w-full h-full object-contain" />
        : <video src={asset.url} controls muted playsInline
                 className="w-full h-full object-contain" />}
    </div>
  );

  // ── Mobile bottom sheet ───────────────────────────────────────────────────
  if (mobile) {
    return (
      <div
        className="fixed inset-0 z-[70] flex items-end"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={onClose}
      >
        <div
          className="w-full bg-gray-900 border-t border-gray-700 rounded-t-2xl
                     overflow-hidden flex flex-col"
          style={{
            maxHeight: '80dvh',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle + header */}
          <div className="relative flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
            <div className="absolute top-2 left-1/2 -translate-x-1/2
                            w-10 h-1 bg-gray-600 rounded-full" />
            <span className="text-white font-bold text-sm mt-1">Asset Details</span>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         text-gray-400 text-base mt-1"
            >✕</button>
          </div>

          <div className="overflow-y-auto flex-1 px-4 space-y-3 pb-2">
            {preview}
            <div>
              <p className="text-white text-sm font-medium break-all">{asset.filename}</p>
              {asset.size && (
                <p className="text-gray-500 text-xs mt-0.5">{formatBytes(asset.size)}</p>
              )}
            </div>

            {/* URL row */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2 bg-gray-800 rounded-xl
                         px-3 py-2.5 active:bg-gray-700 transition-colors"
            >
              <span className="text-[10px] text-gray-500 font-mono truncate flex-1 text-left">
                {asset.url}
              </span>
              <span className="text-gray-400 text-sm shrink-0">
                {copyToast ? '✓' : '📋'}
              </span>
            </button>

            {/* Actions */}
            <div className="flex flex-col gap-2 pb-1">
              <button
                onClick={onUse}
                className="w-full py-3.5 bg-blue-600 active:bg-blue-700
                           text-white text-sm font-bold rounded-xl transition-colors"
              >✓ Use This Asset</button>
              <button
                onClick={handleCopy}
                className="w-full py-3 bg-gray-700 active:bg-gray-800
                           text-gray-300 text-sm rounded-xl transition-colors"
              >{copyToast ? '✓ Copied!' : '📋 Copy URL'}</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-3 bg-red-900/60 active:bg-red-950
                           text-red-400 text-sm rounded-xl transition-colors
                           disabled:opacity-50"
              >{deleting ? '⏳ Deleting…' : '🗑️ Delete Asset'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop sidebar panel ─────────────────────────────────────────────────
  return (
    <div className="p-3 flex-1 overflow-y-auto space-y-2">
      <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">
        Selected
      </p>
      {preview}
      <div>
        <p className="text-white text-[10px] font-medium break-all">{asset.filename}</p>
        {asset.size && (
          <p className="text-gray-500 text-[10px]">{formatBytes(asset.size)}</p>
        )}
      </div>
      <div
        className="bg-gray-800 rounded-lg px-2 py-1.5 flex items-center gap-1
                   cursor-pointer group"
        onClick={handleCopy}
      >
        <p className="text-gray-500 text-[9px] truncate flex-1 font-mono">{asset.url}</p>
        <span className="text-gray-600 group-hover:text-gray-300 text-[10px] shrink-0">
          {copyToast ? '✓' : '📋'}
        </span>
      </div>
      <div className="space-y-1.5">
        <button
          onClick={onUse}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500
                     text-white text-xs font-bold rounded-lg transition-colors"
        >✓ Use This Asset</button>
        <button
          onClick={handleCopy}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600
                     text-gray-300 text-xs rounded-lg transition-colors"
        >{copyToast ? '✓ Copied!' : '📋 Copy URL'}</button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-2 bg-red-900/60 hover:bg-red-900
                     text-red-400 text-xs rounded-lg transition-colors
                     disabled:opacity-50"
        >{deleting ? '⏳ Deleting…' : '🗑️ Delete'}</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const AssetLibrary: React.FC<AssetLibraryProps> = ({
  isOpen,
  onClose,
  onSelect,
  filter,
}) => {
  const isMobile = useIsMobile();
  const { images, videos, loading, error, fetchAssets, deleteAsset } = useAssets();

  const [tab,        setTab]        = useState<AssetTab>(filter ?? 'images');
  const [panelTab,   setPanelTab]   = useState<PanelTab>('browse');
  const [viewMode,   setViewMode]   = useState<ViewMode>('grid');
  const [sortMode,   setSortMode]   = useState<SortMode>('newest');
  const [search,     setSearch]     = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Mobile sheet animation
  const [mounted, setMounted]   = useState(false);
  const [visible, setVisible]   = useState(false);

  useEffect(() => {
    if (filter) setTab(filter);
  }, [filter]);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
      setSearch('');
      setShowDetail(false);
      setPanelTab('browse');
      fetchAssets();

      if (isMobile) {
        setMounted(true);
        const t = setTimeout(() => setVisible(true), 16);
        return () => clearTimeout(t);
      }
    } else if (isMobile) {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Desktop: simple early return
  if (!isMobile && !isOpen) return null;
  // Mobile: wait for mount
  if (isMobile && !mounted) return null;

  const activeTab    = filter ?? tab;
  const allItems     = activeTab === 'images' ? images : videos;

  const filtered = allItems
    .filter(a => a.filename.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortMode === 'name')   return a.filename.localeCompare(b.filename);
      if (sortMode === 'newest') return b.filename.localeCompare(a.filename);
      return 0;
    });

  const selectedAsset = filtered.find(a => a.url === selectedId) ?? null;

  const handleUse = useCallback((asset: AssetItem) => {
    if (!onSelect) {
      console.warn('[AssetLibrary] onSelect prop not provided');
      return;
    }
    onSelect(asset);
    onClose();
  }, [onSelect, onClose]);

  const handleSelectCard = (asset: AssetItem) => {
    setSelectedId(asset.url);
    if (isMobile) setShowDetail(true);
  };

  const handleDelete = async (asset: AssetItem) => {
    await deleteAsset(asset);
    if (selectedId === asset.url) {
      setSelectedId(null);
      setShowDetail(false);
    }
  };

  // ── Shared asset grid/list ──────────────────────────────────────────────
  const assetGrid = (
    <div className="flex-1 overflow-y-auto overscroll-contain p-3">
      {loading && (
        <div className="flex items-center justify-center h-40 gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent
                          rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Loading assets…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <span className="text-3xl">⚠️</span>
          <p className="text-red-400 text-sm text-center">{error}</p>
          <button
            onClick={fetchAssets}
            className="px-4 py-2 bg-gray-700 text-white text-xs rounded-xl"
          >Retry</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 gap-3">
          <span className="text-4xl opacity-40">
            {activeTab === 'images' ? '🖼️' : '🎬'}
          </span>
          <p className="text-gray-500 text-sm">
            {search
              ? `No ${activeTab} match "${search}"`
              : `No ${activeTab} yet — upload some!`}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div
          className={isMobile || viewMode === 'grid'
            ? 'grid gap-2'
            : 'space-y-1'}
          style={isMobile || viewMode === 'grid'
            ? { gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }
            : undefined}
        >
          {filtered.map((asset) =>
            asset.type === 'images' ? (
              <ImageThumb
                key={asset.url}
                asset={asset}
                viewMode={viewMode}
                mobile={isMobile}
                isSelected={selectedId === asset.url}
                onSelect={() => handleSelectCard(asset)}
                onUse={() => handleUse(asset)}
                onDelete={() => handleDelete(asset)}
              />
            ) : (
              <VideoThumb
                key={asset.url}
                asset={asset}
                viewMode={viewMode}
                mobile={isMobile}
                isSelected={selectedId === asset.url}
                onSelect={() => handleSelectCard(asset)}
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
  // MOBILE LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 transition-opacity duration-300"
          style={{
            background: 'rgba(0,0,0,0.6)',
            opacity:    visible ? 1 : 0,
          }}
          onClick={onClose}
        />

        {/* Sheet */}
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900
                     border-t border-gray-700 rounded-t-2xl flex flex-col
                     transition-transform duration-300"
          style={{
            height:    '92dvh',
            transform: visible ? 'translateY(0)' : 'translateY(100%)',
          }}
        >
          {/* Drag handle */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2
                          w-10 h-1 bg-gray-600 rounded-full pointer-events-none" />

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 pt-6 pb-3
                          border-b border-gray-800 shrink-0">
            <div>
              <h2 className="text-white font-bold text-sm">📁 Asset Library</h2>
              <p className="text-gray-500 text-[10px] mt-0.5">
                {images.length} image{images.length !== 1 ? 's' : ''} ·{' '}
                {videos.length} video{videos.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="bg-gray-800 text-gray-300 text-xs rounded-lg
                           px-2 py-1.5 border border-gray-700 outline-none"
              >
                <option value="newest">Newest</option>
                <option value="name">A–Z</option>
              </select>
              <button
                onClick={fetchAssets}
                disabled={loading}
                className="w-8 h-8 flex items-center justify-center rounded-lg
                           bg-gray-800 text-gray-400 active:bg-gray-700"
              >
                <span style={{ animation: loading ? 'spin 1s linear infinite' : 'none',
                               display: 'inline-block' }}>🔄</span>
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center
                           text-gray-400 text-base"
              >✕</button>
            </div>
          </div>

          {/* ── Asset type tabs (images / videos) ── */}
          {!filter && (
            <div className="flex border-b border-gray-800 shrink-0">
              {(['images', 'videos'] as AssetTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setSelectedId(null); }}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors
                              ${activeTab === t
                                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/40'
                                : 'text-gray-500'}`}
                >
                  {t === 'images' ? '🖼️ Images' : '🎬 Videos'}
                  <span className="ml-1 text-gray-600 text-[10px]">
                    ({t === 'images' ? images.length : videos.length})
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ── Browse / Upload panel tabs ── */}
          <div className="flex border-b border-gray-800 shrink-0 bg-gray-900">
            {(['browse', 'upload'] as PanelTab[]).map((pt) => (
              <button
                key={pt}
                onClick={() => setPanelTab(pt)}
                className={`flex-1 py-2 text-xs font-semibold transition-colors
                            ${panelTab === pt
                              ? 'text-white bg-gray-800'
                              : 'text-gray-500'}`}
              >
                {pt === 'browse' ? '🔍 Browse' : '⬆️ Upload'}
              </button>
            ))}
          </div>

          {/* ── Browse panel ── */}
          {panelTab === 'browse' && (
            <>
              {/* Search */}
              <div className="px-3 py-2 border-b border-gray-800 shrink-0">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2
                                   text-gray-500 text-sm pointer-events-none">🔍</span>
                  <input
                    type="text"
                    placeholder={`Search ${activeTab}…`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-gray-800 text-white border border-gray-700
                               focus:border-blue-500 outline-none rounded-xl
                               pl-8 pr-8 py-2 text-sm placeholder-gray-600"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2
                                 text-gray-500 text-sm"
                    >✕</button>
                  )}
                </div>
              </div>

              {/* Grid */}
              {assetGrid}

              {/* Footer */}
              {filtered.length > 0 && (
                <div
                  className="px-4 py-3 border-t border-gray-800 shrink-0
                             flex items-center justify-between"
                  style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
                >
                  <span className="text-gray-500 text-xs">
                    {filtered.length} {activeTab}
                    {search ? ` matching "${search}"` : ''}
                  </span>
                  {selectedAsset && onSelect && (
                    <button
                      onClick={() => handleUse(selectedAsset)}
                      className="px-5 py-2 bg-blue-600 active:bg-blue-700
                                 text-white text-sm font-bold rounded-xl"
                    >✓ Use Selected</button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Upload panel ── */}
          {panelTab === 'upload' && (
            <div className="flex-1 overflow-y-auto">
              <UploadZone
                type={activeTab}
                mobile
                onUploaded={() => {
                  fetchAssets();
                  setPanelTab('browse');   // jump to browse after upload
                }}
              />
            </div>
          )}
        </div>

        {/* ── Asset detail bottom sheet ── */}
        {showDetail && selectedAsset && (
          <AssetDetail
            asset={selectedAsset}
            mobile
            onUse={() => {
              setShowDetail(false);
              handleUse(selectedAsset);
            }}
            onDelete={() => handleDelete(selectedAsset)}
            onClose={() => setShowDetail(false)}
          />
        )}
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT  (unchanged behaviour from original)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl
                   flex flex-col overflow-hidden"
        style={{ width: 900, height: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3
                        border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">📁 Asset Library</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {images.length} image{images.length !== 1 ? 's' : ''} ·{' '}
              {videos.length} video{videos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAssets}
              disabled={loading}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700
                         text-gray-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <span style={{ display: 'inline-block',
                             animation: loading ? 'spin 1s linear infinite' : 'none' }}>
                🔄
              </span>
            </button>
            <div className="flex bg-gray-800 rounded-lg overflow-hidden">
              {(['grid', 'list'] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-2.5 py-1.5 text-xs transition-colors
                              ${viewMode === m
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-white'}`}
                >{m === 'grid' ? '⊞' : '☰'}</button>
              ))}
            </div>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="bg-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1.5
                         border border-gray-700 outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="name">Name A–Z</option>
            </select>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                         text-gray-400 hover:text-white hover:bg-gray-800"
            >✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 border-r border-gray-800 flex flex-col shrink-0">
            {!filter && (
              <div className="flex border-b border-gray-800">
                {(['images', 'videos'] as AssetTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setSelectedId(null); }}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors
                                ${activeTab === t
                                  ? 'text-blue-400 bg-gray-800/50 border-b-2 border-blue-400'
                                  : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {t === 'images' ? '🖼️' : '🎬'}
                    <span className="ml-1 text-gray-600 text-[10px]">
                      ({t === 'images' ? images.length : videos.length})
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="p-3 border-b border-gray-800">
              <p className="text-gray-500 text-[10px] font-semibold uppercase
                            tracking-wider mb-2">Upload New</p>
              <UploadZone type={activeTab} onUploaded={fetchAssets} />
            </div>
            {selectedAsset && (
              <AssetDetail
                asset={selectedAsset}
                mobile={false}
                onUse={() => handleUse(selectedAsset)}
                onDelete={() => handleDelete(selectedAsset)}
                onClose={() => setSelectedId(null)}
              />
            )}
          </div>

          {/* Main area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 shrink-0">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2
                                 text-gray-500 text-sm pointer-events-none">🔍</span>
                <input
                  type="text"
                  placeholder={`Search ${activeTab}…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700
                             focus:border-blue-500 outline-none rounded-xl
                             pl-8 pr-4 py-2 text-sm placeholder-gray-600"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                               text-gray-500 hover:text-gray-300 text-sm"
                  >✕</button>
                )}
              </div>
            </div>

            {assetGrid}

            {filtered.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-800 shrink-0
                              flex items-center justify-between">
                <span className="text-gray-500 text-xs">
                  {filtered.length} {activeTab}
                  {search ? ` matching "${search}"` : ''}
                </span>
                {selectedAsset && onSelect && (
                  <button
                    onClick={() => handleUse(selectedAsset)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500
                               text-white text-xs font-bold rounded-lg transition-colors"
                  >✓ Use Selected</button>
                )}
                {selectedAsset && !onSelect && (
                  <span className="text-yellow-600 text-[10px]">
                    ⚠️ No action configured
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetLibrary;