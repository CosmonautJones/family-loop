export const palette = {
  bg: '#FFF3EA',
  bgWarm: '#FFE7D6',
  bgRose: '#FFE1E9',
  surface: '#FFF9F4',
  surfaceStrong: '#FFFFFF',
  glass: 'rgba(255,249,244,0.78)',
  text: '#24151A',
  muted: '#7A6262',
  plum: '#71365D',
  berry: '#B33E6D',
  coral: '#F06F67',
  tangerine: '#F7A35C',
  peach: '#FFD1B8',
  sage: '#AAC5B1',
  sky: '#C6D9F6',
  inkSoft: 'rgba(36,21,26,0.12)',
  white: '#FFFFFF',
} as const;

export const gradients = {
  app: [palette.bg, palette.bgWarm, palette.bgRose] as const,
  sunset: [palette.plum, palette.berry, palette.coral] as const,
  peach: [palette.tangerine, palette.coral, palette.berry] as const,
  glass: ['rgba(255,255,255,0.92)', 'rgba(255,243,234,0.76)'] as const,
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
} as const;

export const radii = {
  sm: 14,
  md: 18,
  pill: 999,
  card: 26,
  hero: 34,
} as const;

export const shadow = {
  soft: {
    shadowColor: '#7A3B4C',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  glow: {
    shadowColor: '#F06F67',
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
} as const;
