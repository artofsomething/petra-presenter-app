// src/renderer/pages/MainMenuPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface MenuCard {
  path:        string;
  emoji:       string;
  label:       string;
  description: string;
  color:       string;   // accent color
}

const MENU_CARDS: MenuCard[] = [
  {
    path:        '/editor',
    emoji:       '✏️',
    label:       'Editor',
    description: 'Create and edit your presentations',
    color:       '#3d5afe',
  },
  {
    path:        '/stage',
    emoji:       '🎬',
    label:       'Stage Display',
    description: 'Load multiple files and control what\'s live on stage',
    color:       '#7c3aed',
  },
  {
    path:        '/presentation',
    emoji:       '📺',
    label:       'Present',
    description: 'Start full-screen presentation output',
    color:       '#0891b2',
  },
  {
    path:        '/controller',
    emoji:       '🎮',
    label:       'Controller',
    description: 'Control slides from this window',
    color:       '#059669',
  },
  // {
  //   path:        '/mobile-editor',
  //   emoji:       '📱',
  //   label:       'Mobile Editor',
  //   description: 'Edit presentations from a mobile browser',
  //   color:       '#d97706',
  // },
];

const MainMenuPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.root}>

      {/* ── background glow ── */}
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      {/* ── header ── */}
      <div style={styles.header}>
        <div style={styles.logoRow}>
          <span style={styles.logoEmoji}>🪨</span>
          <span style={styles.logoText}>Petra</span>
        </div>
        <span style={styles.tagline}>
          Presenter Software for Worship & Live Events
        </span>
      </div>

      {/* ── cards grid ── */}
      <div style={styles.grid}>
        {MENU_CARDS.map((card) => (
          <MenuCard
            key={card.path}
            card={card}
            onClick={() => navigate(card.path)}
          />
        ))}
      </div>

      {/* ── footer ── */}
      <div style={styles.footer}>
        <span style={styles.footerText}>Petra Presenter v1.0.0</span>
      </div>

    </div>
  );
};

// ── single card ───────────────────────────────────────────────────────────────
interface MenuCardProps {
  card:    MenuCard;
  onClick: () => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ card, onClick }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.card,
        borderColor: hovered ? card.color : '#2e3447',
        background:  hovered
          ? `linear-gradient(135deg, ${card.color}18 0%, #1e2330 100%)`
          : '#1e2330',
        transform:   hovered ? 'translateY(-4px)' : 'translateY(0px)',
        boxShadow:   hovered
          ? `0 8px 32px ${card.color}33`
          : '0 2px 8px #00000033',
      }}
    >
      {/* accent bar */}
      <div style={{
        ...styles.accentBar,
        background: card.color,
        opacity:    hovered ? 1 : 0.4,
      }} />

      {/* emoji */}
      <span style={{
        ...styles.cardEmoji,
        filter: hovered ? `drop-shadow(0 0 8px ${card.color})` : 'none',
      }}>
        {card.emoji}
      </span>

      {/* text */}
      <div style={styles.cardText}>
        <span style={{
          ...styles.cardLabel,
          color: hovered ? '#fff' : '#e2e8f0',
        }}>
          {card.label}
        </span>
        <span style={styles.cardDesc}>
          {card.description}
        </span>
      </div>

      {/* arrow */}
      <span style={{
        ...styles.cardArrow,
        color:     card.color,
        opacity:   hovered ? 1 : 0,
        transform: hovered ? 'translateX(0px)' : 'translateX(-6px)',
      }}>
        →
      </span>
    </div>
  );
};

export default MainMenuPage;

// ── styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    position:       'relative',
    width:          '100vw',
    height:         '100vh',
    background:     '#0f1117',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'hidden',
    gap:            40,
  },

  // ── background glows ──
  bgGlow1: {
    position:     'absolute',
    width:         600,
    height:        600,
    top:          '-200px',
    left:         '-150px',
    borderRadius: '50%',
    background:   'radial-gradient(circle, #3d5afe18 0%, transparent 70%)',
    pointerEvents:'none',
  },
  bgGlow2: {
    position:     'absolute',
    width:         500,
    height:        500,
    bottom:       '-150px',
    right:        '-100px',
    borderRadius: '50%',
    background:   'radial-gradient(circle, #7c3aed18 0%, transparent 70%)',
    pointerEvents:'none',
  },

  // ── header ──
  header: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:            8,
    zIndex:         1,
  },
  logoRow: {
    display:    'flex',
    alignItems: 'center',
    gap:         12,
  },
  logoEmoji: {
    fontSize: 42,
  },
  logoText: {
    fontSize:      48,
    fontWeight:    800,
    color:         '#fff',
    letterSpacing: '-0.02em',
  },
  tagline: {
    fontSize: 14,
    color:    '#64748b',
  },

  // ── grid ──
  grid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(3, 240px)',
    gap:                  16,
    zIndex:               1,
  },

  // ── card ──
  card: {
    position:      'relative',
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'flex-start',
    gap:            10,
    padding:       '20px 20px 20px 24px',
    borderRadius:   12,
    border:        '1px solid',
    cursor:        'pointer',
    transition:    'all 0.2s ease',
    overflow:      'hidden',
  },
  accentBar: {
    position:     'absolute',
    top:           0,
    left:          0,
    width:         4,
    height:       '100%',
    borderRadius: '4px 0 0 4px',
    transition:   'opacity 0.2s',
  },
  cardEmoji: {
    fontSize:   28,
    transition: 'filter 0.2s',
  },
  cardText: {
    display:       'flex',
    flexDirection: 'column',
    gap:            4,
  },
  cardLabel: {
    fontSize:   15,
    fontWeight: 700,
    transition: 'color 0.2s',
  },
  cardDesc: {
    fontSize:   11,
    color:      '#64748b',
    lineHeight: 1.5,
  },
  cardArrow: {
    position:   'absolute',
    right:       16,
    bottom:      16,
    fontSize:   16,
    transition: 'all 0.2s',
  },

  // ── footer ──
  footer: {
    zIndex: 1,
  },
  footerText: {
    fontSize: 11,
    color:    '#334155',
  },
};