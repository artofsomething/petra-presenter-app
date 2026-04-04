// src/renderer/types/transitions.ts
export type TransitionType = 
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'flip';

export const TRANSITIONS: { value: TransitionType; label: string; icon: string }[] = [
  { value: 'none', label: 'None', icon: '⏩' },
  { value: 'fade', label: 'Fade', icon: '🌫️' },
  { value: 'slide-left', label: 'Slide Left', icon: '⬅️' },
  { value: 'slide-right', label: 'Slide Right', icon: '➡️' },
  { value: 'slide-up', label: 'Slide Up', icon: '⬆️' },
  { value: 'slide-down', label: 'Slide Down', icon: '⬇️' },
  { value: 'zoom-in', label: 'Zoom In', icon: '🔍' },
  { value: 'zoom-out', label: 'Zoom Out', icon: '🔎' },
  { value: 'flip', label: 'Flip', icon: '🔄' },
];

export const DEFAULT_TRANSITION: TransitionType = 'fade';
export const DEFAULT_TRANSITION_DURATION = 500; // ms