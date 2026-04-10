// src/renderer/components/Shared/DropdownPortal.tsx

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
  anchorRef:  React.RefObject<HTMLElement>;
  isOpen:     boolean;
  onClose:    () => void;
  children:   React.ReactNode;
  minWidth?:  number;
  maxHeight?: number;
}

const DropdownPortal: React.FC<DropdownPortalProps> = ({
  anchorRef,
  isOpen,
  onClose,
  children,
  minWidth,
  maxHeight = 320,
}) => {
  const [rect, setRect]       = React.useState<DOMRect | null>(null);
  const portalRef             = useRef<HTMLDivElement>(null);

  // ── Recalculate position whenever it opens ────────────────────────────────
  React.useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setRect(r);
  }, [isOpen]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;

      // ✅ Don't close if clicking inside the portal itself
      if (portalRef.current?.contains(target)) return;

      // ✅ Don't close if clicking the trigger button
      if (anchorRef.current?.contains(target)) return;

      onClose();
    };

    // ✅ Use 'mousedown' so it fires before onClick
    // but add a small delay so the trigger's own onClick 
    // has time to toggle isOpen first
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !rect) return null;

  // ── Decide if dropdown goes down or up ────────────────────────────────────
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const goUp       = spaceBelow < maxHeight && spaceAbove > spaceBelow;

  const style: React.CSSProperties = {
    position:     'fixed',
    zIndex:       99999,
    left:         rect.left,
    width:        Math.max(rect.width, minWidth ?? rect.width),
    background:   '#111827',
    border:       '1px solid #2e3447',
    borderRadius: 10,
    boxShadow:    '0 8px 32px rgba(0,0,0,0.7)',
    overflow:     'hidden',
    maxHeight,
    overflowY:    'auto',
  };

  if (goUp) {
    style.bottom = window.innerHeight - rect.top + 4;
  } else {
    style.top = rect.bottom + 4;
  }

  return createPortal(
    <div ref={portalRef} style={style}>
      {children}
    </div>,
    document.body,
  );
};

export default DropdownPortal;