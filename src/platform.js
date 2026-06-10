export const IS_ANDROID =
  typeof window !== 'undefined' && window.Capacitor?.getPlatform?.() === 'android';

export const INSET_TOP_MIN = IS_ANDROID ? 24 : 96;
export const INSET_BOTTOM_MIN = IS_ANDROID ? 16 : 56;
