// src/renderer/components/Editor/AlignmentToolbar.tsx
import React, { useCallback } from 'react';
import usePresentationStore from '../../store/usePresentation';

const SLIDE_W = 1920;
const SLIDE_H = 1080;

type AlignType =
  | 'left' | 'center-h' | 'right'
  | 'top'  | 'center-v' | 'bottom';

interface AlignmentToolbarProps {
  /** pass false to hide when nothing is selected */
  visible?: boolean;
}

const AlignmentToolbar: React.FC<AlignmentToolbarProps> = ({ visible = true }) => {
  const {
    currentSlideIndex,
    selectedElementId,
    presentation,
    updateElement,
  } = usePresentationStore();

  const align = useCallback(
    (type: AlignType) => {
      if (!selectedElementId || !presentation) return;

      const slide = presentation.slides[currentSlideIndex];
      const el = slide?.elements.find((e) => e.id === selectedElementId);
      if (!el) return;

      let updates: Partial<{ x: number; y: number }> = {};

      switch (type) {
        // ── Horizontal ──────────────────────────────────────
        case 'left':
          updates = { x: 0 };
          break;
        case 'center-h':
          updates = { x: (SLIDE_W - el.width) / 2 };
          break;
        case 'right':
          updates = { x: SLIDE_W - el.width };
          break;
        // ── Vertical ────────────────────────────────────────
        case 'top':
          updates = { y: 0 };
          break;
        case 'center-v':
          updates = { y: (SLIDE_H - el.height) / 2 };
          break;
        case 'bottom':
          updates = { y: SLIDE_H - el.height };
          break;
      }

      updateElement(currentSlideIndex, selectedElementId, updates);
    },
    [selectedElementId, presentation, currentSlideIndex, updateElement]
  );

  if (!visible || !selectedElementId) return null;

  return (
    <div className="alignment-toolbar">
      {/* ── Horizontal group ── */}
      <span className="align-group-label">H</span>

      <AlignBtn
        title="Align Left"
        onClick={() => align('left')}
        icon={<AlignLeftIcon />}
      />
      <AlignBtn
        title="Center Horizontal"
        onClick={() => align('center-h')}
        icon={<AlignCenterHIcon />}
      />
      <AlignBtn
        title="Align Right"
        onClick={() => align('right')}
        icon={<AlignRightIcon />}
      />

      <div className="align-divider" />

      {/* ── Vertical group ── */}
      <span className="align-group-label">V</span>

      <AlignBtn
        title="Align Top"
        onClick={() => align('top')}
        icon={<AlignTopIcon />}
      />
      <AlignBtn
        title="Center Vertical"
        onClick={() => align('center-v')}
        icon={<AlignCenterVIcon />}
      />
      <AlignBtn
        title="Align Bottom"
        onClick={() => align('bottom')}
        icon={<AlignBottomIcon />}
      />
    </div>
  );
};

// ── Small button wrapper ────────────────────────────────────────────────────
const AlignBtn: React.FC<{
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
}> = ({ title, onClick, icon }) => (
  <button
    title={title}
    onClick={onClick}
    className="align-btn"
    type="button"
  >
    {icon}
  </button>
);

// ── SVG Icons (inline, no extra deps) ──────────────────────────────────────
const s = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'currentColor' };

const AlignLeftIcon = () => (
  <svg {...s}>
    <rect x="1" y="3" width="2" height="10" />          {/* guide line */}
    <rect x="3" y="4" width="8" height="3" rx="0.5" />  {/* top bar */}
    <rect x="3" y="9" width="5" height="3" rx="0.5" />  {/* bottom bar */}
  </svg>
);

const AlignCenterHIcon = () => (
  <svg {...s}>
    <rect x="7" y="1" width="2" height="14" />
    <rect x="3" y="4" width="10" height="3" rx="0.5" />
    <rect x="4.5" y="9" width="7" height="3" rx="0.5" />
  </svg>
);

const AlignRightIcon = () => (
  <svg {...s}>
    <rect x="13" y="3" width="2" height="10" />
    <rect x="5" y="4" width="8" height="3" rx="0.5" />
    <rect x="8" y="9" width="5" height="3" rx="0.5" />
  </svg>
);

const AlignTopIcon = () => (
  <svg {...s}>
    <rect x="3" y="1" width="10" height="2" />
    <rect x="4" y="3" width="3" height="8" rx="0.5" />
    <rect x="9" y="3" width="3" height="5" rx="0.5" />
  </svg>
);

const AlignCenterVIcon = () => (
  <svg {...s}>
    <rect x="1" y="7" width="14" height="2" />
    <rect x="4" y="3" width="3" height="10" rx="0.5" />
    <rect x="9" y="4.5" width="3" height="7" rx="0.5" />
  </svg>
);

const AlignBottomIcon = () => (
  <svg {...s}>
    <rect x="3" y="13" width="10" height="2" />
    <rect x="4" y="5" width="3" height="8" rx="0.5" />
    <rect x="9" y="8" width="3" height="5" rx="0.5" />
  </svg>
);

export default AlignmentToolbar;