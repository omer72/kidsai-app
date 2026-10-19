export const IS_ANDROID =
  typeof window !== 'undefined' && window.Capacitor?.getPlatform?.() === 'android';

export const INSET_TOP_MIN = IS_ANDROID ? 24 : 96;
export const INSET_BOTTOM_MIN = IS_ANDROID ? 16 : 56;

// env() is 0 in a desktop capture. Store shots set --shot-sat / --shot-sab /
// --shot-sax on :root so the same max() the device uses still clears the
// status bar, the home indicator, and the rounded corners.
export function safeTop(floorPx = 0) {
  return `max(${floorPx}px, env(safe-area-inset-top, 0px), var(--shot-sat, 0px))`;
}

export function safeBottom(floorPx = 0) {
  return `max(${floorPx}px, env(safe-area-inset-bottom, 0px), var(--shot-sab, 0px))`;
}
