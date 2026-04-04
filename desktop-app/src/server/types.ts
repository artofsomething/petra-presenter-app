// src/server/types.ts
// src/server/types.ts (or src/types/slide.ts)
export interface SlideElement {
  id: string;
  type: 'text' | 'shape' | 'image' | 'video';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shapeType?: 'rect' | 'circle' | 'ellipse' | 'triangle' | 'star' | 'arrow' | 'rounded-rect';
  fill?: string;
  stroke?: string;
  src?: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  videoSrc?: string;
  autoplay?: boolean;
  loop?: boolean;
  isLocked?: boolean;
  cornerRadius?: number;
  fillGradient?: GradientConfig;
}

// ... rest of types

export interface Slide {
  id: string;
  order: number;
  backgroundColor: string;
  backgroundImage?: string;
  backgroundVideo?: string;
  backgroundVideoLoop?:boolean;
  backgroundVideoMuted?:boolean;
  elements: SlideElement[];
  thumbnail?: string;        // base64 thumbnail for controller preview
  notes?: string;
  duration?: number;         // auto-advance in ms
  transition?: string;
  transitionDuration?: number;
  backgroundGradient?: GradientConfig;
  animatedBackground?: AnimatedBackground;
}

export interface Presentation {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  slides: Slide[];
  settings: {
    width: number;           // default 1920
    height: number;          // default 1080
    defaultTransition: string;
  };
}

// WebSocket Message Types
export type WSMessageType =
  | 'CONNECT'
  | 'DISCONNECT'
  | 'SYNC_STATE'
  | 'GO_TO_SLIDE'
  | 'NEXT_SLIDE'
  | 'PREV_SLIDE'
  | 'UPDATE_SLIDE'
  | 'ADD_SLIDE'
  | 'DELETE_SLIDE'
  | 'DUPLICATE_SLIDE'
  | 'REORDER_SLIDES'
  | 'START_PRESENTATION'
  | 'STOP_PRESENTATION'
  | 'TOGGLE_BLACK_SCREEN'
  | 'CLIENT_LIST'
  | 'PING'
  | 'PONG';

export interface WSMessage {
  type: WSMessageType;
  payload?: any;
  senderId?: string;
  timestamp: number;
}

export interface ConnectedClient {
  id: string;
  name: string;
  role: 'editor' | 'controller' | 'display';
  connectedAt: number;
}

export interface GradientStop{
  offset:number;
  color:string;
}

export interface GradientConfig{
  type: 'linear' | 'radial';
  angle: number;
  stops: GradientStop[];
}

export type AnimatedBgType =
  | 'aurora'
  | 'particles'
  | 'waves'
  | 'matrix'
  | 'starfield'
  | 'bubbles'
  | 'neon-pulse'
  | 'fire'
  | 'snowfall'
  | 'geometric'
  | 'lava-lamp'
  | 'lightning'
  | 'galaxy'
  | 'cyberpunk-grid'
  | 'dna-helix'
  | 'confetti'
  | 'plasma'
  | 'vortex'
  | 'glitch'
  | 'underwater';

export interface AnimatedBackground {
  type:    AnimatedBgType;
  speed?:  number;   // 0.5 = slow, 1 = normal, 2 = fast
  color1?: string;   // primary color
  color2?: string;   // secondary color
  color3?: string;   // accent color
  opacity?: number;  // 0–1
}