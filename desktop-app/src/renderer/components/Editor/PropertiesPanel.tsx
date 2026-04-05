// src/renderer/components/Editor/PropertiesPanel.tsx

import React, { useState, useRef } from 'react';
import usePresentationStore from '../../store/usePresentation';
import { createBlobUrl, readFileAsDataUrl, pickFile } from '../../utils/fileManager';
import LayerControls from './LayerControls';
import TransitionControl from './TransitionControl';
import AlignmentToolbar from './AlignmentToolbar';
import FontPicker from './FontPicker';
import GradientPicker from './GradientPicker';
import AnimatedBgPicker from './AnimatedBgPicker';
import AlignmentPicker from './AlignmentPicker';
import type { TextPlacement } from '../../utils/alignmentUtils';


const PropertiesPanel: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    presentation, currentSlideIndex, selectedElementId,
    updateElement, deleteElement, updateSlide,
  } = usePresentationStore();



  // ✅ Persistent hidden file inputs — triggered synchronously so Electron allows them
  const bgImageInputRef    = useRef<HTMLInputElement>(null);
  const bgVideoInputRef    = useRef<HTMLInputElement>(null);
  const elementImageInputRef = useRef<HTMLInputElement>(null);

  const currentSlide    = presentation?.slides[currentSlideIndex];
  const selectedElement = currentSlide?.elements.find(
    (el) => el.id === selectedElementId
  );

  if (!currentSlide) return null;

  // ── Background video ───────────────────────────────────────────────────────
  const handleAddBackgroundVideo = () => {
    bgVideoInputRef.current?.click();
  };

const onBgVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // ✅ Read fresh slide index at call time
  const slideIdx = usePresentationStore.getState().currentSlideIndex;
  const blobUrl  = createBlobUrl(file);

  usePresentationStore.getState().updateSlide(slideIdx, {
    backgroundVideo:      blobUrl,
    backgroundVideoLoop:  true,
    backgroundVideoMuted: true,
  });

  e.target.value = '';
};

  // ── Background image ───────────────────────────────────────────────────────
  const handleAddBackgroundImage = () => {
    bgImageInputRef.current?.click();
  };

const onBgImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // ✅ Read fresh slide index at call time
  const slideIdx = usePresentationStore.getState().currentSlideIndex;

  const dataUrl = await readFileAsDataUrl(file);
  if (dataUrl) {
    usePresentationStore.getState().updateSlide(slideIdx, { backgroundImage: dataUrl });
  }

  e.target.value = '';
};

  // ── Element image ──────────────────────────────────────────────────────────
  const handleChangeElementImage = () => {
    // ✅ Synchronous click — Electron allows this
    elementImageInputRef.current?.click();
  };

const onElementImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // ✅ Read fresh state at call time — never rely on closed-over selectedElement
  const state     = usePresentationStore.getState();
  const elementId = state.selectedElementId;
  const slideIdx  = state.currentSlideIndex;

  if (!elementId) return;

  const dataUrl = await readFileAsDataUrl(file);

  if (dataUrl) {
    // ✅ Call updateElement from store directly — bypasses any stale closure
    state.updateElement(slideIdx, elementId, { src: dataUrl });
  }

  e.target.value = '';
};

  // ── Collapsed sidebar ──────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center bg-gray-900 h-full py-3 gap-3"
           style={{ width: 36 }}>
        <button
          onClick={() => setIsCollapsed(false)}
          title="Expand properties"
          className="w-7 h-7 flex items-center justify-center rounded bg-gray-700
                     hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <span
          className="text-gray-500 text-[10px] font-semibold tracking-widest select-none"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          PROPERTIES
        </span>

        <div className="flex flex-col gap-1.5 mt-auto mb-2">
          <div title="Slide background"
               className="w-2 h-2 rounded-full"
               style={{ background: currentSlide.backgroundColor || '#fff' }} />
          {selectedElement && (
            <div title={`${selectedElement.type} selected`}
                 className="w-2 h-2 rounded-full bg-blue-400" />
          )}
        </div>
      </div>
    );
  }

  // ── Expanded panel ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-gray-900 h-full" style={{ width: 256 }}>

      {/* ✅ Hidden persistent file inputs — always mounted, never async-created */}
      <input
        ref={bgVideoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg"
        style={{ display: 'none' }}
        onChange={onBgVideoSelected}
      />
      <input
        ref={bgImageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={onBgImageSelected}
      />
      <input
        ref={elementImageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onElementImageSelected}
      />

      

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">

        {/* ===== SLIDE BACKGROUND ===== */}
        <Section title="🖼️ Slide Background">

          <div>
            <label className="text-gray-400 text-xs block mb-1">Color</label>
            <input
              type="color"
              value={currentSlide.backgroundColor || '#ffffff'}
              onChange={(e) => updateSlide(currentSlideIndex, { backgroundColor: e.target.value })}
              className="w-full h-8 rounded cursor-pointer"
            />
          </div>

          <GradientPicker
            label="Background Color"
            solidColor={currentSlide.backgroundColor || '#ffffff'}
            gradient={currentSlide.backgroundGradient}
            onSolidChange={(color) =>
              updateSlide(currentSlideIndex, {
                backgroundColor:    color,
                backgroundGradient: undefined,
              })
            }
            onGradientChange={(gradient) =>
              updateSlide(currentSlideIndex, {
                backgroundGradient: gradient,
                backgroundColor:    gradient
                  ? undefined
                  : (currentSlide.backgroundColor ?? '#ffffff'),
              })
            }
          />

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8 }}>
            <AnimatedBgPicker />
          </div>

          {/* Video Background */}
          <div>
            <label className="text-gray-400 text-xs block mb-1">🎬 Video Background</label>
            {currentSlide.backgroundVideo ? (
              <div className="space-y-2">
                <div className="relative bg-black rounded overflow-hidden"
                     style={{ aspectRatio: '16/9' }}>
                  <video
                    src={currentSlide.backgroundVideo}
                    loop muted autoPlay playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span className="absolute top-1 right-1 bg-green-900 text-green-400
                                   text-[9px] px-1.5 py-0.5 rounded">
                    ▶ Active
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-gray-400 text-xs cursor-pointer">
                    <input type="checkbox"
                      checked={currentSlide.backgroundVideoLoop ?? true}
                      onChange={(e) =>
                        updateSlide(currentSlideIndex, { backgroundVideoLoop: e.target.checked })
                      }
                    /> Loop
                  </label>
                  <label className="flex items-center gap-1 text-gray-400 text-xs cursor-pointer">
                    <input type="checkbox"
                      checked={currentSlide.backgroundVideoMuted ?? true}
                      onChange={(e) =>
                        updateSlide(currentSlideIndex, { backgroundVideoMuted: e.target.checked })
                      }
                    /> Muted
                  </label>
                </div>
                <div className="flex gap-2">
                  {/* ✅ Calls synchronous handler */}
                  <button
                    onClick={handleAddBackgroundVideo}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                  >
                    🔄 Change
                  </button>
                  <button
                    onClick={() => updateSlide(currentSlideIndex, {
                      backgroundVideo:       undefined,
                      backgroundVideoLoop:   undefined,
                      backgroundVideoMuted:  undefined,
                    })}
                    className="flex-1 px-2 py-1 bg-red-900 text-red-300 rounded text-xs hover:bg-red-800"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleAddBackgroundVideo}
                className="w-full px-2 py-2 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
              >
                🎬 Add Video Background
              </button>
            )}
          </div>

          {/* Image Background */}
          <div>
            <label className="text-gray-400 text-xs block mb-1">📷 Image Background</label>
            {currentSlide.backgroundImage ? (
              <div className="space-y-2">
                <img
                  src={currentSlide.backgroundImage} alt="bg"
                  className="w-full rounded"
                  style={{ aspectRatio: '16/9', objectFit: 'cover' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddBackgroundImage}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                  >
                    🔄 Change
                  </button>
                  <button
                    onClick={() => updateSlide(currentSlideIndex, { backgroundImage: undefined })}
                    className="flex-1 px-2 py-1 bg-red-900 text-red-300 rounded text-xs hover:bg-red-800"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleAddBackgroundImage}
                className="w-full px-2 py-2 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
              >
                📷 Add Background Image
              </button>
            )}
          </div>
        </Section>

        {/* ===== TRANSITION ===== */}
        <TransitionControl />

        {/* ===== ELEMENT PROPERTIES ===== */}
        {selectedElement && (
          <Section title={`${selectedElement.type.toUpperCase()} PROPERTIES`}>

            {/* Position */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 text-xs">X</label>
                <input type="number" value={Math.round(selectedElement.x)}
                  onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { x: Number(e.target.value) })}
                  className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
              </div>
              <div>
                <label className="text-gray-400 text-xs">Y</label>
                <input type="number" value={Math.round(selectedElement.y)}
                  onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { y: Number(e.target.value) })}
                  className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
              </div>
            </div>

            {/* Size */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 text-xs">Width</label>
                <input type="number" value={Math.round(selectedElement.width)}
                  onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { width: Number(e.target.value) })}
                  className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
              </div>
              <div>
                <label className="text-gray-400 text-xs">Height</label>
                <input type="number" value={Math.round(selectedElement.height)}
                  onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { height: Number(e.target.value) })}
                  className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
              </div>
            </div>

            {/* Opacity */}
            <div>
              <label className="text-gray-400 text-xs">
                Opacity: {((selectedElement.opacity ?? 1) * 100).toFixed(0)}%
              </label>
              <input type="range" min="0" max="1" step="0.05"
                value={selectedElement.opacity ?? 1}
                onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { opacity: Number(e.target.value) })}
                className="w-full" />
            </div>

            {/* Rotation */}
            <div>
              <label className="text-gray-400 text-xs">
                Rotation: {selectedElement.rotation || 0}°
              </label>
              <input type="range" min="0" max="360" step="1"
                value={selectedElement.rotation || 0}
                onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { rotation: Number(e.target.value) })}
                className="w-full" />
            </div>

            {/* TEXT */}
            {selectedElement.type === 'text' && (
              <>
                <hr className="border-gray-700" />
                <div>
                  <label className="text-gray-400 text-xs">Font Size</label>
                  <input type="number" value={selectedElement.fontSize || 24}
                    onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { fontSize: Number(e.target.value) })}
                    className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Font Family</label>
                  <FontPicker
                    value={selectedElement.fontFamily || 'Arial'}
                    onChange={(fontFamily) =>
                      updateElement(currentSlideIndex, selectedElement.id, { fontFamily })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 text-xs">Text Color</label>
                    <input type="color" value={selectedElement.fontColor || '#000000'}
                      onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { fontColor: e.target.value })}
                      className="w-full h-7 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs">Stroke</label>
                    <input type="color" value={selectedElement.strokeColor || '#000000'}
                      onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { strokeColor: e.target.value })}
                      className="w-full h-7 rounded cursor-pointer" />
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-xs">Stroke Width</label>
                  <input type="number" min="0" max="20" value={selectedElement.strokeWidth || 0}
                    onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { strokeWidth: Number(e.target.value) })}
                    className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
                </div>
                <div className="flex gap-1">
                  {[
                    { label: 'B', prop: 'fontWeight', active: selectedElement.fontWeight === 'bold',   val: 'bold',   off: 'normal' },
                    { label: 'I', prop: 'fontStyle',  active: selectedElement.fontStyle  === 'italic', val: 'italic', off: 'normal' },
                  ].map(btn => (
                    <button key={btn.label}
                      onClick={() => updateElement(currentSlideIndex, selectedElement.id, {
                        [btn.prop]: btn.active ? btn.off : btn.val,
                      })}
                      className={`flex-1 px-2 py-1 rounded text-xs font-bold ${
                        btn.active ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
                      }`}>
                      {btn.label}
                    </button>
                  ))}
                 
                  {/* {['left', 'center', 'right'].map(align => (
                    <button key={align}
                      onClick={() => updateElement(currentSlideIndex, selectedElement.id, { textAlign: align })}
                      className={`flex-1 px-2 py-1 rounded text-xs ${
                        selectedElement.textAlign === align
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                      {align === 'left' ? '≡←' : align === 'center' ? '≡↔' : '→≡'}
                    </button>
                  ))} */}
                </div>
                <div className="flex column gap-1">
                  <div className="w-full">
                   <AlignmentPicker
                    value={selectedElement.textPlacement ?? 'topLeft'}
                    onChange={(placement: TextPlacement)=>{
                      updateElement(currentSlideIndex,selectedElement.id,{textPlacement:placement});
                    }}
                    />
                    </div>
                </div>
              </>
            )}

            {/* SHAPE */}
            {selectedElement.type === 'shape' && (
              <>
                <hr className="border-gray-700" />
                <GradientPicker
                  label="Fill"
                  solidColor={selectedElement.fill || '#3b82f6'}
                  gradient={selectedElement.fillGradient}
                  onSolidChange={(color) =>
                    updateElement(currentSlideIndex, selectedElement.id, {
                      fill:         color,
                      fillGradient: undefined,
                    })
                  }
                  onGradientChange={(gradient) =>
                    updateElement(currentSlideIndex, selectedElement.id, {
                      fillGradient: gradient,
                      fill:         gradient ? undefined : (selectedElement.fill ?? '#3b82f6'),
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 text-xs">Stroke</label>
                    <input type="color" value={selectedElement.stroke || '#000000'}
                      onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { stroke: e.target.value })}
                      className="w-full h-7 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs">Stroke Width</label>
                    <input type="number" min="0" max="20" value={selectedElement.strokeWidth || 0}
                      onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { strokeWidth: Number(e.target.value) })}
                      className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
                  </div>
                </div>
              </>
            )}

            {selectedElement.type === 'shape' &&
             selectedElement.shapeType === 'rounded-rect' && (
              <div className="space-y-1">
                <label className="text-xs text-gray-400">
                  Corner Radius: {selectedElement.cornerRadius ?? 20}px
                </label>
                <input
                  type="range" min={0} max={100}
                  value={selectedElement.cornerRadius ?? 20}
                  onChange={(e) =>
                    updateElement(currentSlideIndex, selectedElement.id, {
                      cornerRadius: Number(e.target.value),
                    })
                  }
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>0 (square)</span>
                  <span>100 (pill)</span>
                </div>
              </div>
            )}

            {/* VIDEO */}
            {selectedElement.type === 'video' && (
              <>
                <hr className="border-gray-700" />
                <div className="flex gap-3">
                  <label className="flex items-center gap-1 text-gray-400 text-xs cursor-pointer">
                    <input type="checkbox"
                      checked={selectedElement.autoplay ?? false}
                      onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { autoplay: e.target.checked })}
                    /> Autoplay
                  </label>
                  <label className="flex items-center gap-1 text-gray-400 text-xs cursor-pointer">
                    <input type="checkbox"
                      checked={selectedElement.loop ?? false}
                      onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { loop: e.target.checked })}
                    /> Loop
                  </label>
                </div>
              </>
            )}

            {/* IMAGE */}
            {selectedElement.type === 'image' && (
              <>
                <hr className="border-gray-700" />

                {/* Preview of current image */}
                {selectedElement.src && (
                  <div className="rounded overflow-hidden border border-gray-700"
                       style={{ aspectRatio: '16/9' }}>
                    <img
                      src={selectedElement.src}
                      alt="current"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* ✅ Synchronous click on persistent ref — works in Electron */}
                <button
                  onClick={handleChangeElementImage}
                  className="w-full px-2 py-2 bg-gray-700 text-white rounded
                             text-xs hover:bg-gray-600 transition-colors"
                >
                  🔄 Change Image
                </button>
              </>
            )}

            <AlignmentToolbar visible={!!selectedElementId} />
            <LayerControls />

            <button
              onClick={() => deleteElement(currentSlideIndex, selectedElement.id)}
              className="w-full mt-2 px-3 py-2 bg-red-600 text-white rounded
                         hover:bg-red-700 text-sm"
            >
              🗑️ Delete Element
            </button>
          </Section>
        )}

        {/* ===== SPEAKER NOTES ===== */}
        <Section title="📝 Speaker Notes">
          <textarea
            value={currentSlide.notes || ''}
            onChange={(e) => updateSlide(currentSlideIndex, { notes: e.target.value })}
            className="w-full h-24 bg-gray-700 text-white p-2 rounded text-xs resize-none"
            placeholder="Add speaker notes..."
          />
        </Section>

      </div>
    </div>
  );
};

export default PropertiesPanel;

// ── Reusable collapsible section ──────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title, children,
}) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2
                   hover:bg-gray-700 transition-colors text-left"
      >
        <span className="text-gray-300 text-xs font-bold">{title}</span>
        <svg
          viewBox="0 0 24 24" width="12" height="12" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            transition: 'transform 0.2s',
            transform:  open ? 'rotate(0deg)' : 'rotate(-90deg)',
            color:      '#9ca3af',
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 pt-1">
          {children}
        </div>
      )}
    </div>
  );
};
// import React from 'react';
// import usePresentationStore from '../../store/usePresentation';
// import { createBlobUrl, readFileAsDataUrl, pickFile } from '../../utils/fileManager';
// import LayerControls from './LayerControls';
// import TransitionControl from './TransitionControl';
// import AlignmentToolbar from './AlignmentToolbar';
// import FontPicker from './FontPicker';
// import GradientPicker from './GradientPicker';
// import AnimatedBgPicker from './AnimatedBgPicker';

// const PropertiesPanel: React.FC = () => {
//   const {
//     presentation, currentSlideIndex, selectedElementId,
//     updateElement, deleteElement, updateSlide,
//   } = usePresentationStore();

//   const currentSlide = presentation?.slides[currentSlideIndex];
//   const selectedElement = currentSlide?.elements.find(
//     (el) => el.id === selectedElementId
//   );

//   if (!currentSlide) return null;

//   const handleAddBackgroundVideo = async () => {
//     const file = await pickFile('video/mp4,video/webm,video/ogg', 200);
//     if (!file) return;
//     const blobUrl = createBlobUrl(file);
//     updateSlide(currentSlideIndex, {
//       backgroundVideo: blobUrl,
//       backgroundVideoLoop: true,
//       backgroundVideoMuted: true,
//     });
//   };

//   const handleAddBackgroundImage = async () => {
//     const file = await pickFile('image/png,image/jpeg,image/gif,image/webp', 10);
//     if (!file) return;
//     const dataUrl = await readFileAsDataUrl(file);
//     if (dataUrl) {
//       updateSlide(currentSlideIndex, { backgroundImage: dataUrl });
//     }
//   };

//   return (
//     <div className="w-64 bg-gray-900 p-3 overflow-y-auto h-full">
//       <h3 className="text-white text-sm font-bold mb-3">Properties</h3>

//       {/* ===== SLIDE BACKGROUND ===== */}
//       <div className="mb-4 p-3 bg-gray-800 rounded-lg space-y-3">
//         <h4 className="text-gray-300 text-xs font-bold">🖼️ Slide Background</h4>

//         {/* Color */}
//         <div>
//           <label className="text-gray-400 text-xs block mb-1">Color</label>
//           <input
//             type="color"
//             value={currentSlide.backgroundColor || '#ffffff'}
//             onChange={(e) => updateSlide(currentSlideIndex, { backgroundColor: e.target.value })}
//             className="w-full h-8 rounded cursor-pointer"
//           />
//         </div>

//         <div>
//         <GradientPicker
//           label="Background Color"
//           solidColor={currentSlide.backgroundColor || '#ffffff'}
//           gradient={currentSlide.backgroundGradient}
//           onSolidChange={(color) =>
//             updateSlide(currentSlideIndex, {
//               backgroundColor: color,
//               backgroundGradient: undefined,
//             })
//           }
//           onGradientChange={(gradient) =>
//             updateSlide(currentSlideIndex, {
//               backgroundGradient: gradient,
//               backgroundColor: gradient ? undefined : (currentSlide.backgroundColor ?? '#ffffff'),
//             })
//           }
//         />
//       </div>
//           <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8, marginTop: 8 }}>
//           <AnimatedBgPicker />
//         </div>
//         {/* Video Background */}
//         <div>
//           <label className="text-gray-400 text-xs block mb-1">🎬 Video Background</label>
//           {currentSlide.backgroundVideo ? (
//             <div className="space-y-2">
//               <div className="relative bg-black rounded overflow-hidden" style={{ aspectRatio: '16/9' }}>
//                 <video
//                   src={currentSlide.backgroundVideo}
//                   loop muted autoPlay playsInline
//                   style={{ width: '100%', height: '100%', objectFit: 'cover' }}
//                 />
//                 <span className="absolute top-1 right-1 bg-green-900 text-green-400 text-[9px] px-1.5 py-0.5 rounded">
//                   ▶ Active
//                 </span>
//               </div>
//               <div className="flex items-center gap-3">
//                 <label className="flex items-center gap-1 text-gray-400 text-xs cursor-pointer">
//                   <input type="checkbox"
//                     checked={currentSlide.backgroundVideoLoop ?? true}
//                     onChange={(e) => updateSlide(currentSlideIndex, { backgroundVideoLoop: e.target.checked })}
//                   /> Loop
//                 </label>
//                 <label className="flex items-center gap-1 text-gray-400 text-xs cursor-pointer">
//                   <input type="checkbox"
//                     checked={currentSlide.backgroundVideoMuted ?? true}
//                     onChange={(e) => updateSlide(currentSlideIndex, { backgroundVideoMuted: e.target.checked })}
//                   /> Muted
//                 </label>
//               </div>
//               <div className="flex gap-2">
//                 <button onClick={handleAddBackgroundVideo}
//                   className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600">
//                   🔄 Change
//                 </button>
//                 <button onClick={() => updateSlide(currentSlideIndex, {
//                   backgroundVideo: undefined, backgroundVideoLoop: undefined, backgroundVideoMuted: undefined,
//                 })}
//                   className="flex-1 px-2 py-1 bg-red-900 text-red-300 rounded text-xs hover:bg-red-800">
//                   🗑️ Remove
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <button onClick={handleAddBackgroundVideo}
//               className="w-full px-2 py-2 bg-gray-700 text-white rounded text-xs hover:bg-gray-600">
//               🎬 Add Video Background
//             </button>
//           )}
//         </div>

//         {/* Image Background */}
//         <div>
//           <label className="text-gray-400 text-xs block mb-1">📷 Image Background</label>
//           {currentSlide.backgroundImage ? (
//             <div className="space-y-2">
//               <img src={currentSlide.backgroundImage} alt="bg"
//                 className="w-full rounded" style={{ aspectRatio: '16/9', objectFit: 'cover' }} />
//               <div className="flex gap-2">
//                 <button onClick={handleAddBackgroundImage}
//                   className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600">
//                   🔄 Change
//                 </button>
//                 <button onClick={() => updateSlide(currentSlideIndex, { backgroundImage: undefined })}
//                   className="flex-1 px-2 py-1 bg-red-900 text-red-300 rounded text-xs hover:bg-red-800">
//                   🗑️ Remove
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <button onClick={handleAddBackgroundImage}
//               className="w-full px-2 py-2 bg-gray-700 text-white rounded text-xs hover:bg-gray-600">
//               📷 Add Background Image
//             </button>
//           )}
//         </div>
//       </div>
//       {/* ===== TRANSITION (NEW) ===== */}
//       <div className="mb-4">
//         <TransitionControl />
//       </div>

//       {/* ===== ELEMENT PROPERTIES ===== */}
//       {selectedElement && (
//         <div className="space-y-3 p-3 bg-gray-800 rounded-lg">
//           <h4 className="text-white text-xs font-bold">
//             {selectedElement.type.toUpperCase()} PROPERTIES
//           </h4>

//           {/* Position */}
//           <div className="grid grid-cols-2 gap-2">
//             <div>
//               <label className="text-gray-400 text-xs">X</label>
//               <input type="number" value={Math.round(selectedElement.x)}
//                 onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { x: Number(e.target.value) })}
//                 className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
//             </div>
//             <div>
//               <label className="text-gray-400 text-xs">Y</label>
//               <input type="number" value={Math.round(selectedElement.y)}
//                 onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { y: Number(e.target.value) })}
//                 className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
//             </div>
//           </div>

//           {/* Size */}
//           <div className="grid grid-cols-2 gap-2">
//             <div>
//               <label className="text-gray-400 text-xs">Width</label>
//               <input type="number" value={Math.round(selectedElement.width)}
//                 onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { width: Number(e.target.value) })}
//                 className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
//             </div>
//             <div>
//               <label className="text-gray-400 text-xs">Height</label>
//               <input type="number" value={Math.round(selectedElement.height)}
//                 onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { height: Number(e.target.value) })}
//                 className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
//             </div>
//           </div>

//           {/* Opacity & Rotation */}
//           <div>
//             <label className="text-gray-400 text-xs">Opacity: {((selectedElement.opacity ?? 1) * 100).toFixed(0)}%</label>
//             <input type="range" min="0" max="1" step="0.05" value={selectedElement.opacity ?? 1}
//               onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { opacity: Number(e.target.value) })}
//               className="w-full" />
//           </div>
//           <div>
//             <label className="text-gray-400 text-xs">Rotation: {selectedElement.rotation || 0}°</label>
//             <input type="range" min="0" max="360" step="1" value={selectedElement.rotation || 0}
//               onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { rotation: Number(e.target.value) })}
//               className="w-full" />
//           </div>

//           {/* TEXT */}
//           {selectedElement.type === 'text' && (
//             <>
//               <hr className="border-gray-700" />
//               <div>
//                 <label className="text-gray-400 text-xs">Font Size</label>
//                 <input type="number" value={selectedElement.fontSize || 24}
//                   onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { fontSize: Number(e.target.value) })}
//                   className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
//               </div>
//               {/* <div>
//                 <label className="text-gray-400 text-xs">Font Family</label>
//                 <select value={selectedElement.fontFamily || 'Arial'}
//                   onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { fontFamily: e.target.value })}
//                   className="w-full bg-gray-700 text-white p-1 rounded text-xs">
//                   {['Arial','Helvetica','Times New Roman','Georgia','Courier New','Verdana','Impact','Trebuchet MS'].map(f =>
//                     <option key={f} value={f}>{f}</option>
//                   )}
//                 </select>
//               </div> */}
//               <div>
//               <label className="text-gray-400 text-xs block mb-1">Font Family</label>
//               <FontPicker
//                 value={selectedElement.fontFamily || 'Arial'}
//                 onChange={(fontFamily) =>
//                   updateElement(currentSlideIndex, selectedElement.id, { fontFamily })
//                 }
//               />
//             </div>
//               <div className="grid grid-cols-2 gap-2">
//                 <div>
//                   <label className="text-gray-400 text-xs">Text Color</label>
//                   <input type="color" value={selectedElement.fontColor || '#000000'}
//                     onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { fontColor: e.target.value })}
//                     className="w-full h-7 rounded cursor-pointer" />
//                 </div>
//                 <div>
//                   <label className="text-gray-400 text-xs">Stroke</label>
//                   <input type="color" value={selectedElement.strokeColor || '#000000'}
//                     onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { strokeColor: e.target.value })}
//                     className="w-full h-7 rounded cursor-pointer" />
//                 </div>
//               </div>
//               <div>
//                 <label className="text-gray-400 text-xs">Stroke Width</label>
//                 <input type="number" min="0" max="20" value={selectedElement.strokeWidth || 0}
//                   onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { strokeWidth: Number(e.target.value) })}
//                   className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
//               </div>
//               <div className="flex gap-1">
//                 {[
//                   { label: 'B', prop: 'fontWeight', active: selectedElement.fontWeight === 'bold', val: 'bold', off: 'normal' },
//                   { label: 'I', prop: 'fontStyle', active: selectedElement.fontStyle === 'italic', val: 'italic', off: 'normal' },
//                 ].map(btn => (
//                   <button key={btn.label}
//                     onClick={() => updateElement(currentSlideIndex, selectedElement.id, { [btn.prop]: btn.active ? btn.off : btn.val })}
//                     className={`flex-1 px-2 py-1 rounded text-xs font-bold ${btn.active ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
//                     {btn.label}
//                   </button>
//                 ))}
//                 {['left', 'center', 'right'].map(align => (
//                   <button key={align}
//                     onClick={() => updateElement(currentSlideIndex, selectedElement.id, { textAlign: align })}
//                     className={`flex-1 px-2 py-1 rounded text-xs ${selectedElement.textAlign === align ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
//                     {align === 'left' ? '≡←' : align === 'center' ? '≡↔' : '→≡'}
//                   </button>
//                 ))}
//               </div>
//             </>
//           )}

//           {/* SHAPE */}
//           {selectedElement.type === 'shape' && (
//             <>
//               <hr className="border-gray-700" />
//               <GradientPicker
//                   label="Fill"
//                   solidColor={selectedElement.fill || '#3b82f6'}
//                   gradient={selectedElement.fillGradient}
//                   onSolidChange={(color) =>
//                     updateElement(currentSlideIndex, selectedElement.id, {
//                       fill: color,
//                       fillGradient: undefined,
//                     })
//                   }
//                   onGradientChange={(gradient) =>
//                     updateElement(currentSlideIndex, selectedElement.id, {
//                       fillGradient: gradient,
//                       fill: gradient ? undefined : (selectedElement.fill ?? '#3b82f6'),
//                     })
//                   }
//                 />
//               <div className="grid grid-cols-2 gap-2">
                
//                 <div>
//                   <label className="text-gray-400 text-xs">Stroke</label>
//                   <input type="color" value={selectedElement.stroke || '#000000'}
//                     onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { stroke: e.target.value })}
//                     className="w-full h-7 rounded cursor-pointer" />
//                 </div>
//                 <div>
//                     <label className="text-gray-400 text-xs">Stroke Width</label>
//                     <input type="number" min="0" max="20" value={selectedElement.strokeWidth || 0}
//                     onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { strokeWidth: Number(e.target.value) })}
//                     className="w-full bg-gray-700 text-white p-1 rounded text-xs" />
//                 </div>
              
//               </div>
             
//             </>
//           )}
//           {selectedElement?.type === 'shape' &&
//             selectedElement?.shapeType === 'rounded-rect' && (
//             <div className="space-y-1">
//                 <label className="text-xs text-gray-400">
//                 Corner Radius: {selectedElement.cornerRadius ?? 20}px
//                 </label>
//                 <input
//                 type="range"
//                 min={0}
//                 max={100}
//                 value={selectedElement.cornerRadius ?? 20}
//                 onChange={(e) =>
//                     updateElement(currentSlideIndex, selectedElement.id, {
//                     cornerRadius: Number(e.target.value),
//                     })
//                 }
//                 className="w-full accent-blue-500"
//                 />
//                 <div className="flex justify-between text-[10px] text-gray-500">
//                 <span>0 (square)</span>
//                 <span>100 (pill)</span>
//                 </div>
//             </div>
//             )}

//           {/* VIDEO */}
//           {selectedElement.type === 'video' && (
//             <>
//               <hr className="border-gray-700" />
//               <div className="flex gap-3">
//                 <label className="flex items-center gap-1 text-gray-400 text-xs cursor-pointer">
//                   <input type="checkbox" checked={selectedElement.autoplay ?? false}
//                     onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { autoplay: e.target.checked })} />
//                   Autoplay
//                 </label>
//                 <label className="flex items-center gap-1 text-gray-400 text-xs cursor-pointer">
//                   <input type="checkbox" checked={selectedElement.loop ?? false}
//                     onChange={(e) => updateElement(currentSlideIndex, selectedElement.id, { loop: e.target.checked })} />
//                   Loop
//                 </label>
//               </div>
//             </>
//           )}

//           {/* IMAGE */}
//           {selectedElement.type === 'image' && (
//             <>
//               <hr className="border-gray-700" />
//               <button onClick={async () => {
//                 const file = await pickFile('image/*', 10);
//                 if (!file) return;
//                 const dataUrl = await readFileAsDataUrl(file);
//                 if (dataUrl) updateElement(currentSlideIndex, selectedElement.id, { src: dataUrl });
//               }}
//                 className="w-full px-2 py-2 bg-gray-700 text-white rounded text-xs hover:bg-gray-600">
//                 🔄 Change Image
//               </button>
//             </>
//           )}
//           {/* === LAYER CONTROLS (NEW) === */}
//           <AlignmentToolbar visible={!!selectedElementId}/>
//           <LayerControls />

//           {/* DELETE */}
//           <button onClick={() => deleteElement(currentSlideIndex, selectedElement.id)}
//             className="w-full mt-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
//             🗑️ Delete Element
//           </button>
//         </div>

        
//       )}

//       {/* NOTES */}
//       <div className="mt-4 p-3 bg-gray-800 rounded-lg">
//         <label className="text-gray-300 text-xs font-bold block mb-1">📝 Speaker Notes</label>
//         <textarea value={currentSlide.notes || ''}
//           onChange={(e) => updateSlide(currentSlideIndex, { notes: e.target.value })}
//           className="w-full h-24 bg-gray-700 text-white p-2 rounded text-xs resize-none"
//           placeholder="Add speaker notes..." />
//       </div>
//     </div>


//   );
// };

// export default PropertiesPanel;