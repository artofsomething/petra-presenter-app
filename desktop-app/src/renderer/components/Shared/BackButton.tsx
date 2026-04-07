// src/renderer/components/UI/BackButton.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  to?:    string;   // default: '/'
  label?: string;   // default: 'Menu'
}

const BackButton: React.FC<BackButtonProps> = ({
  to    = '/',
  label = 'Menu',
}) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={() => navigate(to)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Back to Main Menu"
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:           5,
        background:    hovered ? '#2e3447' : 'none',
        border:       '1px solid',
        borderColor:   hovered ? '#3a4155' : 'transparent',
        color:         hovered ? '#e2e8f0' : '#64748b',
        cursor:       'pointer',
        fontSize:      12,
        padding:      '4px 10px',
        borderRadius:  6,
        transition:   'all 0.15s',
      }}
    >
      {/* back arrow */}
      <svg
        viewBox="0 0 24 24" width="12" height="12"
        fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {label}
    </button>
  );
};

export default BackButton;