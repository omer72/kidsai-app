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
  // Semantic type scale. Spread into inline style objects:
  //   <div style={{ ...tokens.type.h2, color: tokens.ink }}>
  // Fonts (sans/serif) reference the keys above so theme swaps cascade.
  type: {
    h1:      { fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, lineHeight: 1.15, letterSpacing: -0.4, fontWeight: 500 },
    h2:      { fontFamily: "'Fraunces', Georgia, serif", fontSize: 26, lineHeight: 1.2,  letterSpacing: -0.3, fontWeight: 500 },
    h3:      { fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, lineHeight: 1.25, letterSpacing: -0.2, fontWeight: 600 },
    bodyLg:  { fontFamily: "'Inter', -apple-system, system-ui, sans-serif", fontSize: 16, lineHeight: 1.5, fontWeight: 500 },
    body:    { fontFamily: "'Inter', -apple-system, system-ui, sans-serif", fontSize: 14, lineHeight: 1.55, fontWeight: 400 },
    bodySm:  { fontFamily: "'Inter', -apple-system, system-ui, sans-serif", fontSize: 13, lineHeight: 1.5, fontWeight: 400 },
    caption: { fontFamily: "'Inter', -apple-system, system-ui, sans-serif", fontSize: 12, lineHeight: 1.4, fontWeight: 500 },
    label:   { fontFamily: "'Inter', -apple-system, system-ui, sans-serif", fontSize: 11, lineHeight: 1.2, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase' },
  },
};

export const THEMES = {
  clinical: { bg: '#F4F6FA', surface: '#FFFFFF', surfaceAlt: '#EDF1F8', ink: '#0B1D3A', ink2: '#415075', ink3: '#8591AD', line: '#DDE3EF', primary: '#2E5BFF', primarySoft: '#E6EEFB', primaryInk: '#1E3FB8' },
  // Refined: lighter bg, warmer-but-readable ink, gentler hierarchy, softer line
  warm:     { bg: '#FAF6EF', surface: '#FFFFFF', surfaceAlt: '#F2EBE0', ink: '#3A2A1B', ink2: '#6B5A48', ink3: '#A89886', line: '#E8DFD2', primary: '#B85C3E', primarySoft: '#F8E8DE', primaryInk: '#8A3E24' },
  dusk:     { bg: '#EEF0F7', surface: '#FFFFFF', surfaceAlt: '#E4E6F0', ink: '#1A1D3A', ink2: '#444A6B', ink3: '#8589A8', line: '#D8DAE8', primary: '#5B48D4', primarySoft: '#E5E1F7', primaryInk: '#3B2CA8' },
};

export function applyTheme(themeName) {
  const t = THEMES[themeName] || THEMES.warm;
  Object.assign(tokens, t);
  return tokens;
}
