// src/renderer/components/Editor/TextEditOverlay.tsx
// REPLACE ENTIRE FILE

import React, { useRef, useEffect, useState } from 'react';

interface TextEditOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  onSave: (newText: string) => void;
  onCancel: () => void;
  stageContainer: HTMLDivElement | null;
}

const TextEditOverlay: React.FC<TextEditOverlayProps> = ({
  x, y, width, height, rotation,
  text, fontSize, fontFamily, fontColor,
  fontWeight, fontStyle, textAlign,
  onSave, onCancel, stageContainer,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(text);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    setTimeout(() => {
      textarea.focus();
      textarea.select();
      // Auto-resize
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight + 4}px`;
    }, 50);
  }, []);

  const handleAutoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight + 4}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // Prevent canvas shortcuts

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(value);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    onSave(value);
  };

  // Determine if text color is light or dark to set contrasting outline
  const isLightColor = (color: string): boolean => {
    try {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 128;
    } catch {
      return false;
    }
  };

  const textIsLight = isLightColor(fontColor || '#000000');

  return (
    <>
      {/* Semi-transparent backdrop - click to save */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.15)',
          zIndex: 998,
          borderRadius: 6,
        }}
        onClick={() => onSave(value)}
      />

      {/* Hint badges */}
      <div style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${Math.max(y - 28, 0)}px`,
        zIndex: 1000,
        display: 'flex', gap: 6, fontSize: 10,
      }}>
        <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: 3 }}>
          Enter = Save
        </span>
        <span style={{ background: '#555', color: '#fff', padding: '2px 6px', borderRadius: 3 }}>
          Shift+Enter = New Line
        </span>
        <span style={{ background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: 3 }}>
          Esc = Cancel
        </span>
      </div>

      {/* ========================================
          BUG 5 FIX: Transparent background with 
          subtle border. Text is visible on any
          slide background color.
          ======================================== */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleAutoResize}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${Math.max(width + 20, 120)}px`,
          minHeight: `${Math.max(height + 10, 40)}px`,
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily || 'Arial',
          color: fontColor || '#000000',
          fontWeight: fontWeight || 'normal',
          fontStyle: fontStyle || 'normal',
          textAlign: (textAlign as any) || 'left',
          lineHeight: '1.3',

          // *** TRANSPARENT background with visible border ***
          background: 'transparent',
          border: '2px dashed #3b82f6',
          borderRadius: '4px',
          padding: '4px 6px',
          margin: 0,
          outline: 'none',
          resize: 'both',
          overflow: 'hidden',
          zIndex: 999,

          // Text shadow for readability on any background
          textShadow: textIsLight
            ? '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)'
            : '0 0 4px rgba(255,255,255,0.8), 0 0 8px rgba(255,255,255,0.5)',

          caretColor: '#3b82f6',
          transformOrigin: 'top left',
          transform: rotation ? `rotate(${rotation}deg)` : 'none',

          // Subtle backdrop for just the text area
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          boxShadow: '0 0 0 1000px rgba(128, 128, 128, 0.08)',
        }}
      />
    </>
  );
};

export default TextEditOverlay;