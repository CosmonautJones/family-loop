export const palette = {
  bg: '#FDF8F3', // porcelain — the only app background
  bgWarm: '#FDF8F3', // legacy alias (kept so un-reskinned screens compile)
  bgRose: '#FDF8F3', // legacy alias
  surface: '#FFFFFF',
  surfaceStrong: '#FFFFFF',
  well: '#FBF3EC', // tinted panels (activity, invite link)
  hairline: 'rgba(38,22,28,0.06)',
  glass: 'rgba(255,255,255,0.88)', // tab bar only
  text: '#26161C',
  muted: '#8A7076',
  faint: '#A6929A',
  plum: '#71365D',
  berry: '#B33E6D',
  coral: '#F06F67',
  tangerine: '#F7A35C',
  peach: '#FFD1B8', // legacy
  sage: '#AAC5B1', // legacy palette value (status uses eventAccents/statusChip)
  sky: '#C6D9F6', // legacy
  inkSoft: 'rgba(38,22,28,0.12)',
  white: '#FFFFFF',
} as const;

// Fixed status-chip colors (independent of event accent). Per Dev Handoff §2.
export const statusChip = {
  going: { bg: '#E4EEE7', fg: '#3E5C50' },
  maybe: { bg: '#F3E8D9', fg: '#8A6A3B' },
  cantGo: { bg: '#EEE7E4', fg: '#7A6262' },
  pending: { bg: 'rgba(113,54,93,0.10)', fg: '#71365D' },
} as const;

export type EventAccent = 'coral' | 'sage' | 'sky' | 'butter' | 'berry';

export const eventAccents: Record<
  EventAccent,
  { tint: string; deep: string; dot: string; cover: readonly [string, string, string] }
> = {
  coral: { tint: '#FBEAE4', deep: '#B8473F', dot: '#F06F67', cover: ['#F7A35C', '#F06F67', '#B33E6D'] },
  sage: { tint: '#E4EEE7', deep: '#3E5C50', dot: '#7FA98C', cover: ['#AAC5B1', '#7FA98C', '#4F7A61'] },
  sky: { tint: '#E3EBF8', deep: '#44618F', dot: '#8FA9D8', cover: ['#C6D9F6', '#9DB8E8', '#5F7FB4'] },
  butter: { tint: '#F7EBDA', deep: '#8A6A3B', dot: '#DFA455', cover: ['#F7D9A8', '#E2A85C', '#C08442'] },
  berry: { tint: '#F5E3EC', deep: '#B33E6D', dot: '#B33E6D', cover: ['#F06F67', '#B33E6D', '#71365D'] },
};

const ACCENT_ORDER: readonly EventAccent[] = ['coral', 'sage', 'sky', 'butter', 'berry'];

export const accentOf = (a?: string | null) =>
  eventAccents[(a as EventAccent) ?? 'coral'] ?? eventAccents.coral;

// Stable pseudo-accent from an id, used until events carry a real `accent` column.
export const accentForId = (id?: string | null): EventAccent => {
  if (!id) return 'coral';
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENT_ORDER[hash % ACCENT_ORDER.length];
};

// Instrument Sans family names (as registered by @expo-google-fonts/instrument-sans).
// Fall back to the system UI face while fonts load or on unsupported targets.
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const fonts = {
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
  fallback: SANS,
} as const;

export const gradients = {
  app: [palette.bg, palette.bg, palette.bg] as const, // retired — flat porcelain
  sunset: [palette.berry, palette.plum] as const, // FAB / submit only
  peach: [palette.tangerine, palette.coral, palette.berry] as const, // legacy
  glass: ['rgba(255,255,255,0.92)', 'rgba(255,249,244,0.76)'] as const, // legacy
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
} as const;

// Bottom clearance every in-shell scroll surface must reserve so its last element
// isn't hidden under the fixed floating tab bar (AppShell). Matches Home's inset.
export const tabBarInset = 120;

export const radii = {
  sm: 14,
  md: 18,
  pill: 999,
  card: 22,
  hero: 24,
} as const;

export const shadow = {
  soft: {
    shadowColor: 'rgba(38,22,28,0.5)',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  glow: {
    // legacy alias (kept for un-reskinned screens); tuned down to match the calm system
    shadowColor: 'rgba(38,22,28,0.5)',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
