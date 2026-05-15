// Design tokens. The `tokens` object is mutated at runtime when the theme
// changes — parent re-renders cascade so components pick up new values.

export const tokens = {
  bg: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1F8',
  ink: '#0B1D3A',
  ink2: '#415075',
  ink3: '#8591AD',
  line: '#DDE3EF',
  primary: '#2E5BFF',
  primarySoft: '#E6EEFB',
  primaryInk: '#1E3FB8',
  success: '#4AAE8C',
  warn: '#E5A64B',
  danger: '#D94A5C',
  sans: "'Inter', -apple-system, system-ui, sans-serif",
  serif: "'Fraunces', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

export const THEMES = {
  clinical: { bg: '#F4F6FA', ink: '#0B1D3A', ink2: '#415075', ink3: '#8591AD', primary: '#2E5BFF', primarySoft: '#E6EEFB', primaryInk: '#1E3FB8' },
  warm: { bg: '#F7F3EC', ink: '#2A1F14', ink2: '#5C4A38', ink3: '#9C8A75', primary: '#B85C3E', primarySoft: '#F5E4DB', primaryInk: '#8A3E24' },
  dusk: { bg: '#EEF0F7', ink: '#1A1D3A', ink2: '#444A6B', ink3: '#8589A8', primary: '#5B48D4', primarySoft: '#E5E1F7', primaryInk: '#3B2CA8' },
};

export function applyTheme(themeName) {
  const t = THEMES[themeName] || THEMES.warm;
  Object.assign(tokens, t);
  return tokens;
}
