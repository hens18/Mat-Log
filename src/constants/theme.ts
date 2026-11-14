export const colors = {
  background: '#0B0D11',
  surface: '#161A21',
  surfaceRaised: '#1F242D',
  border: '#272C36',
  text: '#F5F6F8',
  textMuted: '#959BA7',
  primary: '#E4572E',
  primarySoft: 'rgba(228, 87, 46, 0.14)',
  onPrimary: '#FFFFFF',
  danger: '#FF6B6B',
  success: '#3FB27F',
  warning: '#F5B841',
} as const;

// Inter for UI text; Barlow Condensed for big scoreboard-style numbers.
// Each weight is its own font family because Android ignores fontWeight on
// custom fonts.
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  display: 'BarlowCondensed_700Bold',
  displaySemibold: 'BarlowCondensed_600SemiBold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;
