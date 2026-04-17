// src/renderer/components/Editor/FloatingElementActions.tsx
import React, { useEffect, useRef, useState } from 'react';
import type { SlideElement } from '../../../server/types';

interface ContextMenuProps {
  element:      SlideElement;
  x:            number;            // mouse X (viewport px)
  y:            number;            // mouse Y (viewport px)
  onDuplicate:  () => void;
  onToggleLock: () => void;
  onDelete:     () => void;
  onClose:      () => void;
}

const ElementContextMenu: React.FC<ContextMenuProps> = ({
  element, x, y,
  onDuplicate, onToggleLock, onDelete, onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Clamp to viewport so menu never goes off-screen ───────────────────────
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect   = menu.getBoundingClientRect();
    const clampX = Math.min(x, window.innerWidth  - rect.width  - 8);
    const clampY = Math.min(y, window.innerHeight - rect.height - 8);
    setPos({ x: Math.max(8, clampX), y: Math.max(8, clampY) });
  }, [x, y]);

  // ── Close on outside click or Escape ──────────────────────────────────────
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Small delay so the same right-click that opened the menu doesn't close it
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onDown);
      document.addEventListener('keydown',   onKey);
    }, 50);

    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown',   onKey);
    };
  }, [onClose]);

  const type = element.type;

  return (
    <div
      ref={menuRef}
      style={{
        position:     'fixed',
        left:         pos.x,
        top:          pos.y,
        zIndex:       9999,
        background:   '#0f172a',
        border:       '1px solid #1e293b',
        borderRadius: 10,
        boxShadow:    '0 8px 32px rgba(0,0,0,0.7)',
        minWidth:     180,
        overflow:     'hidden',
        fontFamily:   'system-ui, sans-serif',
        userSelect:   'none',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding:      '8px 12px 6px',
        borderBottom: '1px solid #1e293b',
        display:      'flex',
        alignItems:   'center',
        gap:          6,
      }}>
        <span style={{ fontSize: 13 }}>
          {type === 'text'  ? '📝' :
           type === 'shape' ? '🔷' :
           type === 'image' ? '🖼️' :
           type === 'video' ? '🎬' : '▪️'}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
          {type.charAt(0).toUpperCase() + type.slice(1)} Element
        </span>
        {element.isLocked && (
          <span style={{
            marginLeft:   'auto',
            fontSize:     9,
            color:        '#f59e0b',
            background:   '#451a03',
            border:       '1px solid #92400e',
            borderRadius: 3,
            padding:      '1px 5px',
          }}>
            LOCKED
          </span>
        )}
      </div>

      {/* ── Menu items ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '4px 0' }}>

        <MenuItem
          icon="⧉"
          label="Duplicate"
          kbd="Ctrl+D"
          color="#3b82f6"
          onClick={() => { onDuplicate(); onClose(); }}
        />

        <MenuItem
          icon={element.isLocked ? '🔓' : '🔒'}
          label={element.isLocked ? 'Unlock' : 'Lock'}
          kbd="Ctrl+L"
          color={element.isLocked ? '#f59e0b' : '#94a3b8'}
          onClick={() => { onToggleLock(); onClose(); }}
        />

        {/* Divider */}
        <div style={{ height: 1, background: '#1e293b', margin: '4px 0' }} />

        <MenuItem
          icon="🗑️"
          label="Delete"
          kbd="Del"
          color="#ef4444"
          danger
          onClick={() => { onDelete(); onClose(); }}
        />
      </div>
    </div>
  );
};

// ── MenuItem ──────────────────────────────────────────────────────────────────
interface MenuItemProps {
  icon:    string;
  label:   string;
  kbd:     string;
  color:   string;
  onClick: () => void;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon, label, kbd, color, onClick, danger,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        8,
        width:      '100%',
        padding:    '7px 12px',
        background: hovered
          ? danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)'
          : 'transparent',
        border:     'none',
        cursor:     'pointer',
        textAlign:  'left',
        transition: 'background 0.1s',
        fontFamily: 'system-ui',
      }}
    >
      <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{
        fontSize:  12,
        color:     hovered ? color : '#cbd5e1',
        fontWeight: 500,
        flex:       1,
        transition: 'color 0.1s',
      }}>
        {label}
      </span>
      <kbd style={{
        fontSize:     9,
        color:        '#475569',
        background:   '#0f172a',
        border:       '1px solid #1e293b',
        borderRadius: 3,
        padding:      '1px 4px',
        fontFamily:   'monospace',
        flexShrink:   0,
      }}>
        {kbd}
      </kbd>
    </button>
  );
};

export default ElementContextMenu;