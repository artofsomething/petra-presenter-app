
// src/renderer/pages/EditorPage.tsx
// REPLACE ENTIRE FILE

import React, { useState, useEffect, useRef, useCallback } from 'react';
import SlideCanvas from '../components/Editor/SlideCanvas';
import ElementToolbar from '../components/Editor/ElementToolbar';
import SlidePanel from '../components/Editor/SlidePanel';
import PropertiesPanel from '../components/Editor/PropertiesPanel';
import LayersPanel from '../components/Editor/LayersPanel';
import ConnectionPanel from '../components/Controller/ConnectionPanel';
import usePresentationStore from '../store/usePresentation';
import { useSocket } from '../hooks/useSocket';
import DisplaySettings from '../components/Editor/DisplaySettings';

type RightPanelTab = 'properties' | 'layers';

const EditorPage: React.FC = () => {

  const {
    emitUpdatePresentation,
    emitStartPresentation,
    emitStopPresentation,
    emitToggleBlackScreen,
    emitSyncSlideIndex,
    isConnected,
  } = useSocket({ role: 'editor', name: 'Desktop Editor' });

  const {
    presentation, currentSlideIndex,
    createNewPresentation, saveToJSON, loadFromJSON, setIsPresenting,
    selectedElementId, copyElement, toggleLockElement,
  } = usePresentationStore();

  const [showConnection, setShowConnection]     = useState(false);
  const [rightPanelTab, setRightPanelTab]       = useState<RightPanelTab>('properties');
  const [isEditingName, setIsEditingName]       = useState(false);
  const [editingName, setEditingName]           = useState('');
  const [isDirectControlEnabled, setDirectControl] = useState(false);

  const nameInputRef    = useRef<HTMLInputElement>(null);
  const syncTimerRef    = useRef<number | null>(null);
  const slideCountRef   = useRef<number>(0);
  const connectedRef    = useRef(false);  // track connection without re-render

  const currentSlide    = presentation?.slides[currentSlideIndex];
  const selectedElement = currentSlide?.elements.find(el => el.id === selectedElementId);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);


  // ── Keep connectedRef in sync ───────────────────────────────────────────
  useEffect(() => {
    connectedRef.current = isConnected;
  }, [isConnected]);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!presentation) createNewPresentation('Untitled Presentation');
  }, []);

  // ── Push full presentation whenever it changes ────────────────────────────
  // Use JSON.stringify to detect ACTUAL content changes, not just reference
  const lastSentJsonRef = useRef<string>('');

  const syncPresentation = useCallback(() => {
    const state = usePresentationStore.getState();
    if (!state.presentation || !connectedRef.current) return;

    // Serialize to detect real changes
    const json = JSON.stringify({
      slides:      state.presentation.slides.map(s => ({
        id:       s.id,
        elements: s.elements.length,
        bg:       s.backgroundColor,
      })),
      name: state.presentation.name,
    });

    if (json === lastSentJsonRef.current) return; // no real change
    lastSentJsonRef.current = json;

    console.log('[EditorPage] Syncing presentation —',
      state.presentation.slides.length, 'slides');

    emitUpdatePresentation(state.presentation,isDirectControlEnabled? state.currentSlideIndex:null);
  }, [emitUpdatePresentation]);

  // Debounced sync on any presentation change
  useEffect(() => {
    if (!presentation || !isConnected) return;

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = window.setTimeout(() => {
      syncPresentation();
    }, 250);

    return () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, [
    // ✅ Track actual slide content, not just the reference
    presentation?.slides.length,
    presentation?.name,
    // Stringify elements to catch content changes
    JSON.stringify(presentation?.slides.map(s => s.elements.map(e => e.id))),
    isConnected,isDirectControlEnabled,syncPresentation
  ]);

  // ── Also sync immediately when connection is established ──────────────────
  useEffect(() => {
    if (!isConnected || !presentation) return;

    // Push full state on connect
    console.log('[EditorPage] Connected — pushing presentation state');
    lastSentJsonRef.current = ''; // reset so it sends
    setTimeout(() => {
      syncPresentation();
    }, 200);
  }, [isConnected]);

  // ── Sync slide index ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected) return;

    if (!isDirectControlEnabled) return; 
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
    if (trimmed && trimmed !== presentation?.name) {
      usePresentationStore.getState().updatePresentationName(trimmed);
    }
    setIsEditingName(false);
  };

  const handleCancelName = () => {
    setIsEditingName(false);
    setEditingName('');
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  handleConfirmName();
    if (e.key === 'Escape') handleCancelName();
  };

  // Add this handler near your other handlers
  const handleForceSync = useCallback(() => {
    if (!presentation || !isConnected) return;

    setIsSyncing(true);

    // Reset the change detector so it always sends
    lastSentJsonRef.current = '';

    const state = usePresentationStore.getState();

    console.log('[EditorPage] Force sync —', state.presentation?.slides.length, 'slides');

    emitUpdatePresentation(
      state.presentation!,
      state.currentSlideIndex,
    );

    // Show feedback for 1.5s then clear
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date());
    }, 1500);
  }, [presentation, isConnected, emitUpdatePresentation]);

  // ── File operations ───────────────────────────────────────────────────────
  const handleSave = () => {
    const json = saveToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${presentation?.name || 'presentation'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader    = new FileReader();
      reader.onload   = (ev) => loadFromJSON(ev.target?.result as string);
      reader.readAsText(file);
    };
    input.click();
  };

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
    try {
      if (window.electronAPI) await window.electronAPI.closePresentation();
    } catch {}
    setIsPresenting(false);
    emitStopPresentation();
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's': e.preventDefault(); handleSave(); break;
          case 'o': e.preventDefault(); handleLoad(); break;
          case 'd':
            e.preventDefault();
            if (selectedElementId) copyElement(selectedElementId);
            break;
          case 'l':
            e.preventDefault();
            if (selectedElementId) toggleLockElement(selectedElementId);
            break;
        }
      }
      if (e.key === 'F5') { e.preventDefault(); handleStartPresentation(); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentation, selectedElementId]);

  // ── Electron IPC listeners ────────────────────────────────────────────────
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
          <h1 className="text-sm font-bold text-blue-400">🎤 Presenter App</h1>

          {/* Editable presentation name */}
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
              <button onMouseDown={(e) => e.preventDefault()}
                onClick={handleConfirmName}
                className="text-green-400 hover:text-green-300 text-xs px-1">✓</button>
              <button onMouseDown={(e) => e.preventDefault()}
                onClick={handleCancelName}
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

          {/* Slide count indicator */}
          <span className="text-[10px] text-gray-500">
            {presentation?.slides.length ?? 0} slides
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DisplaySettings />
          <button onClick={() => { const n = prompt('Name:'); if (n) createNewPresentation(n); }}
            className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">
            📄 New
          </button>
          <button onClick={handleLoad}
            className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">
            📂 Open
          </button>
          <button onClick={handleSave}
            className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">
            💾 Save
          </button>
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
            title={
              !isConnected
                ? 'Not connected'
                : lastSyncTime
                  ? `Last synced: ${lastSyncTime.toLocaleTimeString()}`
                  : 'Force push slides to all clients'
            }
          >
            <span
              style={{
                display:         'inline-block',
                animation:       isSyncing ? 'spin 0.8s linear infinite' : 'none',
              }}
            >
              🔄
            </span>
            {isSyncing ? 'Syncing...' : 'Sync All'}
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
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded
              border ${selectedElement.isLocked
                ? 'bg-yellow-700/50 hover:bg-yellow-600/80 border-yellow-600/50 text-yellow-200'
                : 'bg-gray-700/50 hover:bg-gray-600/80 border-gray-600/50 text-gray-200'}`}
            title={selectedElement.isLocked ? 'Unlock (Ctrl+L)' : 'Lock (Ctrl+L)'}>
            <span>{selectedElement.isLocked ? '🔒' : '🔓'}</span>
            <span>{selectedElement.isLocked ? 'Unlock' : 'Lock'}</span>
            <kbd className="text-[9px] text-gray-400 bg-gray-900/50 px-1 rounded">Ctrl+L</kbd>
          </button>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden">
        <SlidePanel />

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

      <ConnectionPanel isOpen={showConnection} onClose={() => setShowConnection(false)} />
    </div>
  );
};

export default EditorPage;
// import React, { useState, useEffect, useRef } from 'react';
// import SlideCanvas from '../components/Editor/SlideCanvas';
// import ElementToolbar from '../components/Editor/ElementToolbar';
// import SlidePanel from '../components/Editor/SlidePanel';
// import PropertiesPanel from '../components/Editor/PropertiesPanel';
// import LayersPanel from '../components/Editor/LayersPanel';
// import ConnectionPanel from '../components/Controller/ConnectionPanel';
// import usePresentationStore from '../store/usePresentation';
// import { useSocket } from '../hooks/useSocket';

// type RightPanelTab = 'properties' | 'layers';

// const EditorPage: React.FC = () => {
//   const {
//     presentation, currentSlideIndex,
//     createNewPresentation, saveToJSON, loadFromJSON, setIsPresenting,
//   } = usePresentationStore();

//   const {
//     emitUpdatePresentation, emitStartPresentation, emitStopPresentation,
//     emitToggleBlackScreen, emitNextSlide, emitPrevSlide, emitSyncSlideIndex,
//     emitGoToSlide, isConnected,
//   } = useSocket({ role: 'editor', name: 'Desktop Editor' });

//   const [showConnection, setShowConnection] = useState(false);
//   const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('properties');

//   // ✅ NEW: Presentation name editing state
//   const [isEditingName, setIsEditingName] = useState(false);
//   const [editingName, setEditingName] = useState('');
//   const nameInputRef = useRef<HTMLInputElement>(null);

//   // Track previous values to avoid unnecessary emits
//   const prevSlideIndexRef = useRef(currentSlideIndex);
//   const prevPresentationRef = useRef(presentation);

//   // Create default presentation on first load
//   useEffect(() => {
//     if (!presentation) createNewPresentation('Untitled Presentation');
//   }, []);

//   // ✅ NEW: Focus input when editing starts
//   useEffect(() => {
//     if (isEditingName && nameInputRef.current) {
//       nameInputRef.current.focus();
//       nameInputRef.current.select(); // Select all text for easy replace
//     }
//   }, [isEditingName]);

//   // Sync presentation changes to WebSocket (debounced)
//   useEffect(() => {
//     if (!presentation || !isConnected) return;
//     if (prevPresentationRef.current !== presentation) {
//       const timer = setTimeout(() => {
//         emitUpdatePresentation(presentation);
//       }, 300);
//       prevPresentationRef.current = presentation;
//       return () => clearTimeout(timer);
//     }
//   }, [presentation, isConnected]);

//   // Keyboard shortcuts
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if ((e.target as HTMLElement).tagName === 'INPUT' ||
//           (e.target as HTMLElement).tagName === 'TEXTAREA' ||
//           (e.target as HTMLElement).tagName === 'SELECT') return;

//       if (e.ctrlKey || e.metaKey) {
//         switch (e.key) {
//           case 's': e.preventDefault(); handleSave(); break;
//           case 'o': e.preventDefault(); handleLoad(); break;
//         }
//       }
//       if (e.key === 'F5') { e.preventDefault(); handleStartPresentation(); }
//     };
//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [presentation]);

//   // Listen for remote events from mobile/web
//   useEffect(() => {
//     if (!window.electronAPI) return;
//     window.electronAPI.onRemotePresentationStarted?.(() => setIsPresenting(true));
//     window.electronAPI.onRemotePresentationStopped?.(() => setIsPresenting(false));
//     window.electronAPI.onPresentationClosed?.(() => setIsPresenting(false));
//   }, []);

//   // ✅ NEW: Start editing name
//   const handleStartEditingName = () => {
//     setEditingName(presentation?.name || 'Untitled Presentation');
//     setIsEditingName(true);
//   };

//   // ✅ NEW: Confirm name change
//   const handleConfirmName = () => {
//     const trimmed = editingName.trim();
//     if (trimmed && trimmed !== presentation?.name) {
//       usePresentationStore.getState().updatePresentationName(trimmed);
//     }
//     setIsEditingName(false);
//   };

//   // ✅ NEW: Cancel name editing
//   const handleCancelName = () => {
//     setIsEditingName(false);
//     setEditingName('');
//   };

//   // ✅ NEW: Handle key events in name input
//   const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === 'Enter') handleConfirmName();
//     if (e.key === 'Escape') handleCancelName();
//   };

//   const handleSave = () => {
//     const json = saveToJSON();
//     const blob = new Blob([json], { type: 'application/json' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `${presentation?.name || 'presentation'}.json`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   const handleLoad = () => {
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = '.json';
//     input.onchange = (e) => {
//       const file = (e.target as HTMLInputElement).files?.[0];
//       if (file) {
//         const reader = new FileReader();
//         reader.onload = (event) => loadFromJSON(event.target?.result as string);
//         reader.readAsText(file);
//       }
//     };
//     input.click();
//   };

//   const handleStartPresentation = async () => {
//     try {
//       if (window.electronAPI) await window.electronAPI.openPresentation();
//       setIsPresenting(true);
//       emitStartPresentation();
//     } catch {
//       window.open('/#/presentation', '_blank', 'fullscreen=yes');
//     }
//   };

//   const handleStopPresentation = async () => {
//     try {
//       if (window.electronAPI) await window.electronAPI.closePresentation();
//     } catch {}
//     setIsPresenting(false);
//     emitStopPresentation();
//   };

//   return (
//     <div className="h-screen flex flex-col bg-gray-950 text-white">
//       {/* Header */}
//       <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
//         <div className="flex items-center gap-3">
//           <h1 className="text-sm font-bold text-blue-400">🎤 Presenter App</h1>

//           {/* ✅ NEW: Editable Presentation Name */}
//           {isEditingName ? (
//             <div className="flex items-center gap-1">
//               <input
//                 ref={nameInputRef}
//                 type="text"
//                 value={editingName}
//                 onChange={(e) => setEditingName(e.target.value)}
//                 onKeyDown={handleNameKeyDown}
//                 onBlur={handleConfirmName}
//                 maxLength={60}
//                 className="
//                   text-xs bg-gray-800 text-white border border-blue-500
//                   rounded px-2 py-0.5 w-48 outline-none
//                   focus:ring-1 focus:ring-blue-500
//                 "
//               />
//               {/* Confirm Button */}
//               <button
//                 onMouseDown={(e) => e.preventDefault()} // prevent blur before click
//                 onClick={handleConfirmName}
//                 className="text-green-400 hover:text-green-300 text-xs px-1"
//                 title="Confirm (Enter)"
//               >
//                 ✓
//               </button>
//               {/* Cancel Button */}
//               <button
//                 onMouseDown={(e) => e.preventDefault()} // prevent blur before click
//                 onClick={handleCancelName}
//                 className="text-red-400 hover:text-red-300 text-xs px-1"
//                 title="Cancel (Escape)"
//               >
//                 ✕
//               </button>
//             </div>
//           ) : (
//             <button
//               onClick={handleStartEditingName}
//               className="
//                 text-xs text-gray-300 hover:text-white
//                 hover:bg-gray-700 rounded px-2 py-0.5
//                 transition-colors group flex items-center gap-1
//               "
//               title="Click to rename presentation"
//             >
//               {presentation?.name || 'Untitled'}
//               {/* ✅ Pencil icon appears on hover */}
//               <span className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
//                 ✏️
//               </span>
//             </button>
//           )}

//           <span className={`text-[10px] px-1.5 py-0.5 rounded ${
//             isConnected ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
//           }`}>
//             {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
//           </span>
//         </div>

//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => { const n = prompt('Name:'); if (n) createNewPresentation(n); }}
//             className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">
//             📄 New
//           </button>
//           <button onClick={handleLoad} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">📂 Open</button>
//           <button onClick={handleSave} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">💾 Save</button>
//           <div className="w-px h-6 bg-gray-700" />
//           <button onClick={handleStartPresentation} className="px-3 py-1 text-xs bg-green-600 rounded hover:bg-green-700 font-bold">▶ Present</button>
//           <button onClick={handleStopPresentation} className="px-3 py-1 text-xs bg-red-600 rounded hover:bg-red-700">⏹ Stop</button>
//           <button onClick={() => emitToggleBlackScreen()} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">🖥️ Black</button>
//           <div className="w-px h-6 bg-gray-700" />
//           <button onClick={() => setShowConnection(true)} className="px-3 py-1 text-xs bg-purple-600 rounded hover:bg-purple-700 font-bold">📱 Connect</button>
//         </div>
//       </header>

//       {/* Toolbar */}
//       <div className="px-4 py-2 border-b border-gray-800">
//         <ElementToolbar />
//       </div>

//       {/* Main Content */}
//       <div className="flex flex-1 overflow-hidden">
//         <SlidePanel />

//         <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto bg-gray-950">
//           <div className="mb-3 text-xs text-gray-500">
//             Slide {currentSlideIndex + 1} of {presentation?.slides.length || 0}
//           </div>
//           <SlideCanvas editable={true} />
//           <div className="flex items-center gap-4 mt-4">
//             <button
//               onClick={() => usePresentationStore.getState().prevSlide()}
//               className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm"
//               disabled={currentSlideIndex === 0}>
//               ◀ Previous
//             </button>
//             <span className="text-gray-400 text-sm">
//               {currentSlideIndex + 1} / {presentation?.slides.length || 0}
//             </span>
//             <button
//               onClick={() => usePresentationStore.getState().nextSlide()}
//               className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm"
//               disabled={currentSlideIndex === (presentation?.slides.length || 1) - 1}>
//               Next ▶
//             </button>
//           </div>
//         </div>

//         {/* Right Panel */}
//         <div className="w-64 bg-gray-900 flex flex-col border-l border-gray-800">
//           <div className="flex border-b border-gray-800">
//             <button onClick={() => setRightPanelTab('properties')}
//               className={`flex-1 px-3 py-2 text-xs font-bold ${
//                 rightPanelTab === 'properties' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'
//               }`}>⚙️ Properties</button>
//             <button onClick={() => setRightPanelTab('layers')}
//               className={`flex-1 px-3 py-2 text-xs font-bold ${
//                 rightPanelTab === 'layers' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'
//               }`}>📚 Layers</button>
//           </div>
//           <div className="flex-1 overflow-hidden">
//             {rightPanelTab === 'properties' ? <PropertiesPanel /> : <LayersPanel />}
//           </div>
//         </div>
//       </div>

//       <ConnectionPanel isOpen={showConnection} onClose={() => setShowConnection(false)} />
//     </div>
//   );
// };

// export default EditorPage;




// // src/renderer/pages/EditorPage.tsx
// // REPLACE ENTIRE FILE

// import React, { useState, useEffect, useRef } from 'react';
// import SlideCanvas from '../components/Editor/SlideCanvas';
// import ElementToolbar from '../components/Editor/ElementToolbar';
// import SlidePanel from '../components/Editor/SlidePanel';
// import PropertiesPanel from '../components/Editor/PropertiesPanel';
// import LayersPanel from '../components/Editor/LayersPanel';
// import ConnectionPanel from '../components/Controller/ConnectionPanel';
// import usePresentationStore from '../store/usePresentation';
// import { useSocket } from '../hooks/useSocket';

// type RightPanelTab = 'properties' | 'layers';

// const EditorPage: React.FC = () => {
//   const {
//     presentation, currentSlideIndex,
//     createNewPresentation, saveToJSON, loadFromJSON, setIsPresenting,
//   } = usePresentationStore();

//   const {
//     emitUpdatePresentation, emitStartPresentation, emitStopPresentation,
//     emitToggleBlackScreen, emitNextSlide, emitPrevSlide, emitSyncSlideIndex,
//     emitGoToSlide, isConnected,
//   } = useSocket({ role: 'editor', name: 'Desktop Editor' });

//   const [showConnection, setShowConnection] = useState(false);
//   const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('properties');

//   // Track previous values to avoid unnecessary emits
//   const prevSlideIndexRef = useRef(currentSlideIndex);
//   const prevPresentationRef = useRef(presentation);

//   // Create default presentation on first load
//   useEffect(() => {
//     if (!presentation) createNewPresentation('Untitled Presentation');
//   }, []);

//   // *** Sync presentation changes to WebSocket (debounced) ***
//   useEffect(() => {
//     if (!presentation || !isConnected) return;

//     // Only emit if presentation actually changed (not just slide index)
//     if (prevPresentationRef.current !== presentation) {
//       const timer = setTimeout(() => {
//         emitUpdatePresentation(presentation);
//       }, 300); // Debounce 300ms to avoid flooding

//       prevPresentationRef.current = presentation;
//       return () => clearTimeout(timer);
//     }
//   }, [presentation, isConnected]);

//   // *** BUG 2 FIX: Sync slide index changes to server ***
// //   useEffect(() => {
// //     if (prevSlideIndexRef.current !== currentSlideIndex && isConnected) {
// //       emitSyncSlideIndex(currentSlideIndex);
// //       prevSlideIndexRef.current = currentSlideIndex;
// //     }
// //   }, [currentSlideIndex, isConnected, emitSyncSlideIndex]);

//   // Keyboard shortcuts
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if ((e.target as HTMLElement).tagName === 'INPUT' ||
//           (e.target as HTMLElement).tagName === 'TEXTAREA' ||
//           (e.target as HTMLElement).tagName === 'SELECT') return;

//       if (e.ctrlKey || e.metaKey) {
//         switch (e.key) {
//           case 's': e.preventDefault(); handleSave(); break;
//           case 'o': e.preventDefault(); handleLoad(); break;
//         }
//       }
//       if (e.key === 'F5') { e.preventDefault(); handleStartPresentation(); }
//     };
//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [presentation]);

//   // Listen for remote events from mobile/web
//   useEffect(() => {
//     if (!window.electronAPI) return;
//     window.electronAPI.onRemotePresentationStarted?.(() => setIsPresenting(true));
//     window.electronAPI.onRemotePresentationStopped?.(() => setIsPresenting(false));
//     window.electronAPI.onPresentationClosed?.(() => setIsPresenting(false));
//   }, []);

//   const handleSave = () => {
//     const json = saveToJSON();
//     const blob = new Blob([json], { type: 'application/json' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `${presentation?.name || 'presentation'}.json`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   const handleLoad = () => {
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = '.json';
//     input.onchange = (e) => {
//       const file = (e.target as HTMLInputElement).files?.[0];
//       if (file) {
//         const reader = new FileReader();
//         reader.onload = (event) => loadFromJSON(event.target?.result as string);
//         reader.readAsText(file);
//       }
//     };
//     input.click();
//   };

//   const handleStartPresentation = async () => {
//     try {
//       if (window.electronAPI) await window.electronAPI.openPresentation();
//       setIsPresenting(true);
//       emitStartPresentation();
//     } catch {
//       window.open('/#/presentation', '_blank', 'fullscreen=yes');
//     }
//   };

//   const handleStopPresentation = async () => {
//     try {
//       if (window.electronAPI) await window.electronAPI.closePresentation();
//     } catch {}
//     setIsPresenting(false);
//     emitStopPresentation();
//   };

//   return (
//     <div className="h-screen flex flex-col bg-gray-950 text-white">
//       {/* Header */}
//       <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
//         <div className="flex items-center gap-3">
//           <h1 className="text-sm font-bold text-blue-400">🎤 Presenter App</h1>
//           <span className="text-xs text-gray-400">{presentation?.name || 'Untitled'}</span>
//           <span className={`text-[10px] px-1.5 py-0.5 rounded ${
//             isConnected ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
//           }`}>
//             {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
//           </span>
//         </div>
//         <div className="flex items-center gap-2">
//           <button onClick={() => { const n = prompt('Name:'); if (n) createNewPresentation(n); }}
//             className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">📄 New</button>
//           <button onClick={handleLoad} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">📂 Open</button>
//           <button onClick={handleSave} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">💾 Save</button>
//           <div className="w-px h-6 bg-gray-700" />
//           <button onClick={handleStartPresentation} className="px-3 py-1 text-xs bg-green-600 rounded hover:bg-green-700 font-bold">▶ Present</button>
//           <button onClick={handleStopPresentation} className="px-3 py-1 text-xs bg-red-600 rounded hover:bg-red-700">⏹ Stop</button>
//           <button onClick={() => emitToggleBlackScreen()} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">🖥️ Black</button>
//           <div className="w-px h-6 bg-gray-700" />
//           <button onClick={() => setShowConnection(true)} className="px-3 py-1 text-xs bg-purple-600 rounded hover:bg-purple-700 font-bold">📱 Connect</button>
//         </div>
//       </header>

//       {/* Toolbar */}
//       <div className="px-4 py-2 border-b border-gray-800">
//         <ElementToolbar />
//       </div>

//       {/* Main Content */}
//       <div className="flex flex-1 overflow-hidden">
//         <SlidePanel />

//         <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto bg-gray-950">
//           <div className="mb-3 text-xs text-gray-500">
//             Slide {currentSlideIndex + 1} of {presentation?.slides.length || 0}
//           </div>
//           <SlideCanvas editable={true} />
//           <div className="flex items-center gap-4 mt-4">
//             <button
//               onClick={() => usePresentationStore.getState().prevSlide()}
//               className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm"
//               disabled={currentSlideIndex === 0}>
//               ◀ Previous
//             </button>
//             <span className="text-gray-400 text-sm">
//               {currentSlideIndex + 1} / {presentation?.slides.length || 0}
//             </span>
//             <button
//               onClick={() => usePresentationStore.getState().nextSlide()}
//               className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm"
//               disabled={currentSlideIndex === (presentation?.slides.length || 1) - 1}>
//               Next ▶
//             </button>
//           </div>
//         </div>

//         {/* Right Panel */}
//         <div className="w-64 bg-gray-900 flex flex-col border-l border-gray-800">
//           <div className="flex border-b border-gray-800">
//             <button onClick={() => setRightPanelTab('properties')}
//               className={`flex-1 px-3 py-2 text-xs font-bold ${
//                 rightPanelTab === 'properties' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'
//               }`}>⚙️ Properties</button>
//             <button onClick={() => setRightPanelTab('layers')}
//               className={`flex-1 px-3 py-2 text-xs font-bold ${
//                 rightPanelTab === 'layers' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'
//               }`}>📚 Layers</button>
//           </div>
//           <div className="flex-1 overflow-hidden">
//             {rightPanelTab === 'properties' ? <PropertiesPanel /> : <LayersPanel />}
//           </div>
//         </div>
//       </div>

//       <ConnectionPanel isOpen={showConnection} onClose={() => setShowConnection(false)} />
//     </div>
//   );
// };

// export default EditorPage;