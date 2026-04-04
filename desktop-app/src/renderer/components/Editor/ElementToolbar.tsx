
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import usePresentationStore from '../../store/usePresentation';
import type { SlideElement } from '../../../server/types';
import { createBlobUrl, readFileAsDataUrl, pickFile } from '../../utils/fileManager';

const ElementToolbar: React.FC = () => {
  const { currentSlideIndex, addElement } = usePresentationStore();

  const addText = () => {
    const element: SlideElement = {
      id: uuidv4(),
      type: 'text',
      x: 100, y: 100, width: 400, height: 60,
      rotation: 0, opacity: 1,
      text: 'New Text',
      fontSize: 32, fontFamily: 'Arial',
      fontColor: '#000000', fontWeight: 'normal',
      fontStyle: 'normal', textAlign: 'center',
    };
    addElement(currentSlideIndex, element);
  };

  const addBorderedText = () => {
    const element: SlideElement = {
      id: uuidv4(),
      type: 'text',
      x: 100, y: 200, width: 400, height: 60,
      rotation: 0, opacity: 1,
      text: 'Bordered Text',
      fontSize: 36, fontFamily: 'Arial',
      fontColor: '#ffffff', fontWeight: 'bold',
      strokeColor: '#000000', strokeWidth: 2,
      shadowColor: '#000000', shadowBlur: 4,
      shadowOffsetX: 2, shadowOffsetY: 2,
    };
    addElement(currentSlideIndex, element);
  };

  const addShape = (shapeType: 'rect' | 'circle' | 'ellipse' | 'star'|'rounded-rect'|'arrow') => {
    const element: SlideElement = {
      id: uuidv4(),
      type: 'shape',
      x: 300, y: 300, width: 200, height: 200,
      rotation: 0, opacity: 1,
      shapeType, fill: '#3b82f6',
      stroke: '#1e40af', strokeWidth: 2,
      cornerRadius: shapeType==='rounded-rect'?20:0
    };
    addElement(currentSlideIndex, element);
  };

  const addImage = async () => {
    const file = await pickFile('image/png,image/jpeg,image/gif,image/webp,image/svg+xml', 10);
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);
    if (!dataUrl) return;

    // Get dimensions for proper aspect ratio
    const img = new window.Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const maxW = 800, maxH = 600;
      if (w > maxW) { h = (h * maxW) / w; w = maxW; }
      if (h > maxH) { w = (w * maxH) / h; h = maxH; }

      addElement(currentSlideIndex, {
        id: uuidv4(),
        type: 'image',
        x: (1920 - w) / 2, y: (1080 - h) / 2,
        width: w, height: h,
        rotation: 0, opacity: 1,
        src: dataUrl,
      });
    };
    img.src = dataUrl;
  };

  const addVideo = async () => {
    const file = await pickFile('video/mp4,video/webm,video/ogg', 100);
    if (!file) return;

    // Use blob URL for videos (data URLs are too large)
    const blobUrl = createBlobUrl(file);

    // Get video dimensions
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      let w = video.videoWidth || 640;
      let h = video.videoHeight || 360;
      const maxW = 800, maxH = 600;
      if (w > maxW) { h = (h * maxW) / w; w = maxW; }
      if (h > maxH) { w = (w * maxH) / h; h = maxH; }

      addElement(currentSlideIndex, {
        id: uuidv4(),
        type: 'video',
        x: (1920 - w) / 2, y: (1080 - h) / 2,
        width: w, height: h,
        rotation: 0, opacity: 1,
        videoSrc: blobUrl,
        autoplay: true,
        loop: true,
      });

      // Cleanup metadata loader
      video.removeAttribute('src');
      video.load();
    };

    video.onerror = () => {
      alert('Failed to load video file.');
    };

    video.src = blobUrl;
  };
  return (
  <div className="flex gap-2 p-2 bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700 w-fit flex-wrap shadow-2xl">
    {[
      { label: "Text", icon: <path d="M3 6h14M3 10h14M3 14h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>, onClick: addText, color: "hover:text-blue-400" },
      { label: "B-Text", icon: <><rect x="2" y="4" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.5"/><text x="10" y="11" dominantBaseline="middle" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fontWeight="bold" fill="currentColor">T</text></>, onClick: addBorderedText, color: "hover:text-purple-400" },
      { label: "Rect", icon: <rect x="3" y="5" width="14" height="10" stroke="currentColor" strokeWidth="1.5" rx="0.5"/>, onClick: () => addShape('rect'), color: "hover:text-green-400" },
      { label: "Round", icon: <rect x="2" y="4" width="16" height="12" rx="4" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1.5"/>, onClick: () => addShape('rounded-rect'), color: "hover:text-emerald-400" },
      { label: "Circle", icon: <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>, onClick: () => addShape('circle'), color: "hover:text-yellow-400" },
      { label: "Star", icon: <path d="M10 2l2.5 5h5.5l-4 4 1.5 6-5-3-5 3 1.5-6-4-4h5.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>, onClick: () => addShape('star'), color: "hover:text-orange-400" },
      { label: "Image", icon: <><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 14l4.5-5 4 4 2.5-2.5 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13" cy="7.5" r="1.2" fill="currentColor"/></>, onClick: addImage, color: "hover:text-pink-400" },
      { label: "Video", icon: <><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8.5 7.5L13 10l-4.5 2.5v-5z" fill="currentColor"/></>, onClick: addVideo, color: "hover:text-red-400" },
    ].map((item, idx) => (
      <button
        key={idx}
        onClick={item.onClick}
        className={`group flex flex-col items-center justify-center w-14 h-14 bg-gray-800 hover:bg-gray-700 text-gray-400 ${item.color} rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95`}
        title={item.label}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org" className="transition-colors">
          {item.icon}
        </svg>
        <span className="text-[10px] mt-1 font-medium text-gray-500 group-hover:text-inherit">
          {item.label}
        </span>
      </button>
    ))}
  </div>
);

  // return (
  //   <div className="flex gap-2 p-3 bg-gray-800 rounded-lg flex-wrap">
  //     <button onClick={addText}
  //       className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-blue-700 text-sm">
  //      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
  //       <rect x="3" y="6" width="14" height="2" rx="1" fill="currentColor" opacity="0.8"/>
  //       <rect x="3" y="10" width="14" height="2" rx="1" fill="currentColor" opacity="0.8"/>
  //       <rect x="3" y="14" width="9" height="2" rx="1" fill="currentColor" opacity="0.8"/>
  //     </svg> Text
  //     </button>
  //     <button onClick={addBorderedText}
  //       className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-purple-700 text-sm">
  //       <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
  //       <rect 
  //         x="2" y="4" 
  //         width="16" height="12" 
  //         rx="3" ry="3" 
  //         stroke="currentColor" 
  //         stroke-width="1.5" 
  //         opacity="0.8"
  //       />
  //       <text 
  //         x="10" y="11" 
  //         dominant-baseline="middle" 
  //         text-anchor="middle" 
  //         font-family="Arial, sans-serif" 
  //         font-size="9" 
  //         font-weight="bold" 
  //         fill="currentColor" 
  //         opacity="0.8">
  //         T
  //       </text>
  //     </svg> Bordered Text
  //     </button>
  //     <button onClick={() => addShape('rect')}
  //       className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-green-700 text-sm">
  //       <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
  //       <rect 
  //         x="1.5" y="4.5" 
  //         width="17" height="11" 
  //         rx="0" ry="0" 
  //         stroke="currentColor" 
  //         stroke-width="1.5" 
  //         opacity="0.8"
  //       />
  //     </svg> Rectangle
  //     </button>
  //     <button
  //       onClick={() => addShape('rounded-rect')}
  //       className="flex flex-col items-center gap-1 px-3 py-2 bg-gray-600
  //           hover:bg-gray-500 rounded text-xs transition-colors"
  //       title="Rounded Rectangle"
  //       >
  //       {/* ✅ SVG icon for rounded rect */}
  //       <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
  //           <rect
  //           x="1" y="4"
  //           width="18" height="12"
  //           rx="4" ry="4"
  //           fill="currentColor"
  //           opacity="0.8"
  //           />
  //       </svg>
  //       <span>Rounded</span>
  //       </button>
  //     <button onClick={() => addShape('circle')}
  //       className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-yellow-700 text-sm">
  //       <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
  //       <circle 
  //         cx="10" cy="10" 
  //         r="8" 
  //         stroke="currentColor" 
  //         stroke-width="1.5" 
  //         opacity="0.8"
  //       />
  //     </svg> Circle
  //     </button>
  //      <button onClick={() => addShape('ellipse')}
  //       className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-yellow-700 text-sm">
  //       <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
  //         <ellipse 
  //           cx="10" cy="10" 
  //           rx="8" ry="5" 
  //           stroke="currentColor" 
  //           stroke-width="1.5" 
  //           opacity="0.8"
  //         />
  //       </svg> Ellipse
  //     </button>
  //     <button onClick={() => addShape('star')}
  //       className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-orange-700 text-sm">
  //       <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
  //     <path 
  //       d="M10 2L12.45 7.11L18 7.92L14 11.95L14.95 17.65L10 14.96L5.05 17.65L6 11.95L2 7.92L7.55 7.11L10 2Z" 
  //       stroke="currentColor" 
  //       stroke-width="1.5" 
  //       stroke-linejoin="round" 
  //       opacity="0.8"
  //     />
  //   </svg> Star
  //     </button>
  //     <button onClick={addImage}
  //       className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-pink-700 text-sm">
  //       <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
  //       <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.8"/>
  //       <path d="M2.5 14L7 9L11 13L13.5 10.5L17.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
  //       <circle cx="13" cy="7.5" r="1.5" stroke="currentColor" stroke-width="1.2" opacity="0.8"/>
  //     </svg> Image
  //     </button>
  //     <button onClick={addVideo}
  //       className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-red-700 text-sm">
  //       <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
  //       <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.8"/>
  //       <path d="M8.5 7.5L13 10L8.5 12.5V7.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" opacity="0.8"/>
  //     </svg> Video
  //     </button>
  //   </div>
  // );
};

export default ElementToolbar;