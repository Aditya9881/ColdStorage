/**
 * ColdStorage — Premium Design Token System
 *
 * "Trusted Agri-Fintech, Premium & Calm"
 *
 * Inspired by Mercury/Wise/Stripe Dashboard, adapted for
 * rural/semi-urban Indian users.
 *
 * Changes from previous system:
 * - Warm off-white background (#F7F6F2) instead of stark white
 * - Gold accent (#D9A441) for money/rent values
 * - Gradient mesh tokens for headers
 * - Multi-layer card shadows for depth
 * - Glass-morphism tokens
 * - Refined dark mode with deep charcoal (#121714)
 */

export const Colors = {
  light: {
    // Primary palette — Deep forest greens
    primary: '#1B5E4A',
    primaryLight: '#2D7A5F',
    primaryDark: '#0F3D2E',
    primarySubtle: '#E6F2ED',

    // Accent — Warm gold for money/value
    accent: '#D9A441',
    accentLight: '#E8BE6A',
    accentSubtle: '#FBF5E8',

    // Buyer palette — Teal
    buyerPrimary: '#0F766E',
    buyerPrimaryLight: '#14B8A6',
    buyerPrimaryDark: '#134E4A',
    buyerSubtle: '#F0FDFA',

    // Money — Gold for financial values
    moneyGold: '#D9A441',
    moneyGoldDark: '#B8862D',
    moneyGoldBg: '#FBF5E8',

    // Semantic — Soft pastel chip backgrounds
    success: '#059669',
    successLight: '#ECFDF5',
    successChip: '#D1FAE5',
    warning: '#D97706',
    warningLight: '#FFFBEB',
    warningChip: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEF2F2',
    dangerChip: '#FECACA',
    info: '#0891B2',
    infoLight: '#ECFEFF',
    infoChip: '#CFFAFE',

    // Backgrounds — Warm, not sterile
    background: '#F7F6F2',
    card: '#FFFFFF',
    cardAlt: '#F5F3EE',
    cardElevated: '#FFFFFF',
    surface: '#FFFFFF',
    warmWhite: '#FEFDFB',
    overlay: 'rgba(15, 61, 46, 0.45)',

    // Glass
    glassBg: 'rgba(255, 255, 255, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.35)',
    glassDark: 'rgba(255, 255, 255, 0.12)',
    glassBgLight: 'rgba(255, 255, 255, 0.15)',
    glassBgMedium: 'rgba(255, 255, 255, 0.22)',
    glassBgHeavy: 'rgba(255, 255, 255, 0.35)',
    glassBorderTop: 'rgba(255, 255, 255, 0.35)',
    glassBorderBottom: 'rgba(255, 255, 255, 0.1)',

    // Text
    text: '#1A1A2E',
    textSecondary: '#5F6B7A',
    textTertiary: '#94A3B8',
    textInverse: '#FFFFFF',
    textLink: '#1B5E4A',
    textMoney: '#D9A441',
    textMuted: '#B0B8C4',

    // Borders
    border: '#E8E6E1',
    borderLight: '#F0EDE8',
    borderFocus: '#1B5E4A',

    // Tab bar
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#1B5E4A',

    // Skeleton
    skeletonBase: '#EAE7E1',
    skeletonHighlight: '#F5F3EE',

    tint: '#1B5E4A',
    icon: '#5F6B7A',
  },
  dark: {
    primary: '#2D7A5F',
    primaryLight: '#40916C',
    primaryDark: '#1B5E4A',
    primarySubtle: '#162E23',

    accent: '#E8BE6A',
    accentLight: '#F0D08A',
    accentSubtle: '#2A2210',

    buyerPrimary: '#14B8A6',
    buyerPrimaryLight: '#2DD4BF',
    buyerPrimaryDark: '#0F766E',
    buyerSubtle: '#0D3331',

    moneyGold: '#E8BE6A',
    moneyGoldDark: '#D9A441',
    moneyGoldBg: '#2A2210',

    success: '#34D399',
    successLight: '#0D3325',
    successChip: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#3D3000',
    warningChip: '#78350F',
    danger: '#F87171',
    dangerLight: '#3D1515',
    dangerChip: '#7F1D1D',
    info: '#22D3EE',
    infoLight: '#0D3133',
    infoChip: '#164E63',

    background: '#121714',
    card: '#1C2620',
    cardAlt: '#222E27',
    cardElevated: '#273830',
    surface: '#1C2620',
    warmWhite: '#1C2620',
    overlay: 'rgba(0, 0, 0, 0.65)',

    glassBg: 'rgba(28, 38, 32, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassDark: 'rgba(0, 0, 0, 0.25)',
    glassBgLight: 'rgba(255, 255, 255, 0.06)',
    glassBgMedium: 'rgba(255, 255, 255, 0.10)',
    glassBgHeavy: 'rgba(255, 255, 255, 0.18)',
    glassBorderTop: 'rgba(255, 255, 255, 0.12)',
    glassBorderBottom: 'rgba(255, 255, 255, 0.04)',

    text: '#F0F4F1',
    textSecondary: '#94A3B8',
    textTertiary: '#5F6B7A',
    textInverse: '#1A1A2E',
    textLink: '#40916C',
    textMoney: '#E8BE6A',
    textMuted: '#5F6B7A',

    border: '#2D3B33',
    borderLight: '#222E27',
    borderFocus: '#40916C',

    tabIconDefault: '#5F6B7A',
    tabIconSelected: '#40916C',

    skeletonBase: '#222E27',
    skeletonHighlight: '#2D3B33',

    tint: '#40916C',
    icon: '#94A3B8',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

/** Multi-layer shadow presets for rich depth */
export const Shadows = {
  sm: {
    shadowColor: '#0F3D2E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F3D2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  /** Premium card shadow — multi-layer depth */
  card: {
    shadowColor: '#0F3D2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#0F3D2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  /** Floating elements — tab bar, FAB */
  floating: {
    shadowColor: '#0F3D2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 12,
  },
  /** Colored glow — for primary buttons */
  glow: {
    shadowColor: '#1B5E4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  /** Glass card — soft dispersed depth */
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
};

/** Gradient presets — mesh-inspired */
export const Gradients = {
  /** Hero header mesh — deep forest → teal */
  mesh: ['#0F3D2E', '#14503B', '#1B5E4A'] as const,
  meshDark: ['#091F17', '#0F3D2E', '#14503B'] as const,
  primary: ['#1B5E4A', '#2D7A5F', '#40916C'] as const,
  primaryDark: ['#0F3D2E', '#1B5E4A', '#2D7A5F'] as const,
  buyer: ['#134E4A', '#0F766E', '#14B8A6'] as const,
  gold: ['#B8862D', '#D9A441', '#E8BE6A'] as const,
  /** Warm card gradient */
  card: ['#FFFFFF', '#FEFDFB'] as const,
  darkCard: ['#222E27', '#1C2620'] as const,
  /** Glass overlay on gradient backgrounds */
  glassOverlay: ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)'] as const,
  /** Owner dashboard — violet mesh */
  meshViolet: ['#2D1B69', '#4C1D95', '#7C3AED'] as const,
  meshVioletDark: ['#1A0F40', '#2D1B69', '#4C1D95'] as const,
  /** Buyer dashboard — teal mesh */
  meshTeal: ['#042F2E', '#0F766E', '#14B8A6'] as const,
  meshTealDark: ['#021716', '#042F2E', '#0F766E'] as const,
  /** Profile/settings — neutral mesh */
  meshNeutral: ['#1A1A2E', '#2D3B33', '#374151'] as const,
  meshNeutralDark: ['#0F0F1A', '#1A1A2E', '#2D3B33'] as const,
};

/** Animation durations (ms) */
export const AnimDuration = {
  fast: 150,
  normal: 300,
  slow: 500,
  entrance: 600,
};

/** Font family — uses Inter when loaded, falls back to system */
export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  system: undefined as string | undefined,
};

/** Type-safe theme color accessor */
export type ThemeColors = typeof Colors.light;

/** Helper to safely index Colors with useColorScheme() result */
export function useThemeColors(): ThemeColors {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useColorScheme } = require('react-native');
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

// Default export for backward compat with `import Colors from '...'`
export default Colors;
