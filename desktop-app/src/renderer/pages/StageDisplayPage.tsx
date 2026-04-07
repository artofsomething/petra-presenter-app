// src/renderer/pages/StageDisplayPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import StageDisplay from '../components/Stage/StageDisplay';

const StageDisplayPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── top bar ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:             12,
        padding:        '8px 16px',
        background:     '#1e2330',
        borderBottom:   '1px solid #2e3447',
        flexShrink:      0,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background:   'none',
            border:       'none',
            color:        '#64748b',
            cursor:       'pointer',
            fontSize:     13,
            display:      'flex',
            alignItems:   'center',
            gap:           4,
            padding:      '4px 8px',
            borderRadius: 6,
          }}
        >
          ← Back
        </button>
        <span style={{
          fontSize:   13,
          fontWeight: 700,
          color:      '#e2e8f0',
        }}>
          🎬 Stage Display
        </span>
      </div>

      {/* ── stage display ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <StageDisplay />
      </div>

    </div>
  );
};

export default StageDisplayPage;