/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — DESIGN SYSTEM & THEME TOKENS
 * Matches Target Style (Image 2): Clean Light Theme, Vivid Accents,
 * Floating Dark Nav, Crisp Cards with Soft Elevation.
 * Centralized theme file for easy customization.
 * ═══════════════════════════════════════════════════════════════
 */

export const COLORS = {
  // ── Light Theme Base ──
  bg:            '#F7F7FB', // Soft off-white
  bgSoft:        '#F0F2F8',
  bgCard:        '#FFFFFF', // Pure white card
  bgCardAlt:     '#F9FAFB',
  bgInput:       '#F3F4F6', // Soft light input background
  bgElevated:    '#FFFFFF',
  surface:       '#FFFFFF',
  glass:         '#FFFFFF',
  glassBorder:   'rgba(0, 0, 0, 0.04)',

  // ── Typography ──
  textPrimary:   '#1F2937', // Dark navy / charcoal (primary text)
  textSecondary: '#6B7280', // Medium grey (secondary text)
  textMuted:     '#9CA3AF', // Light grey (labels, hints)
  textInverse:   '#FFFFFF', // White text on dark/colored cards

  // ── Brand Colors ──
  primary:       '#7C3AED', // Vivid purple (active action, center FAB)
  primaryLight:  '#EDE9FE',
  primaryDark:   '#6D28D9',
  accent:        '#FF6B35', // Warm orange (active tab, "View All" links)
  orange:        '#FF6B35',
  orangeLight:   '#FFF2EB',

  // ── System Accents ──
  cyan:          '#3B82F6', // Vibrant blue
  blue:          '#4F7CFF',
  green:         '#22C55E', // Success green
  greenBright:   '#22C55E',
  greenLight:    '#DCFCE7',
  red:           '#EF4444', // Danger red
  redLight:      '#FEE2E2',
  yellow:        '#F59E0B',
  pink:          '#EC4899',

  // ── Bottom Navigation Bar ──
  navBg:         '#111827', // Deep dark floating bar
  navBorder:     'rgba(255, 255, 255, 0.08)',
  navActive:     '#FF6B35', // Orange active tab
  navInactive:   '#9CA3AF', // Grey inactive tab
  navFabRing:    '#FFFFFF', // White ring around center purple FAB

  // ── Gradients (for LinearGradient) ──
  gradHero:      ['#4F7CFF', '#3B5BDB'], // Blue hero balance card
  gradPurple:    ['#7C3AED', '#6D28D9'], // Primary purple
  gradOrange:    ['#FF6B35', '#F97316'], // Orange accent
  gradGreen:     ['#22C55E', '#16A34A'],
  gradRed:       ['#EF4444', '#DC2626'],
  gradPink:      ['#EC4899', '#DB2777'],
  gradCyan:      ['#38BDF8', '#0284C7'],
  gradDeepPurp:  ['#7C3AED', '#4C1D95'],
  gradCardLight: ['#FFFFFF', '#FAF5FF'],
  gradPastelMint:['#E6FFFA', '#F0FDF4'],
  gradPastelPeach:['#FFF7ED', '#FEF2F2'],

  // ── Borders & Dividers ──
  border:        '#E5E7EB',
  borderLight:   '#F1F3F9',
  borderAccent:  '#FF6B35',

  // ── Status Indicators ──
  success:       '#22C55E',
  warning:       '#F59E0B',
  error:         '#EF4444',
  info:          '#3B82F6',

  // ── WhatsApp Brand ──
  whatsapp:      '#25D366',
};

export const CAT_COLORS = {
  food:          '#7C3AED', // Purple
  transport:     '#22C55E', // Green
  shopping:      '#FF6B35', // Orange
  health:        '#EC4899', // Pink
  entertainment: '#F59E0B', // Amber
  education:     '#3B82F6', // Blue
  utilities:     '#06B6D4', // Cyan
  groceries:     '#EF4444', // Red
  fuel:          '#3B82F6', // Blue
  cng:           '#3B82F6',
  other:         '#8B5CF6',
};

export const CAT_ICONS = {
  food:          'restaurant',
  transport:     'car',
  shopping:      'cart',
  health:        'medkit',
  entertainment: 'film',
  education:     'book',
  utilities:     'flash',
  groceries:     'basket',
  other:         'cube',
};

export const CAT_EMOJIS = {
  food:          '🍜',
  transport:     '🚗',
  shopping:      '🛍️',
  health:        '💊',
  entertainment: '🎬',
  education:     '📚',
  utilities:     '⚡',
  groceries:     '🛒',
  other:         '📦',
};

const FALLBACK_EMOJIS = ['✨', '💎', '📌', '🏷️', '🧩', '🎈', '🔮', '💡', '🔔', '🎭'];
export const getFallbackIcon = (category) => {
  if (!category) return '📦';
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_EMOJIS[Math.abs(hash) % FALLBACK_EMOJIS.length];
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  card: 22,
  pill: 999,
  full: 999,
};

export const FONT = {
  xs:    11,
  sm:    12,
  base:  14,
  md:    16,
  lg:    18,
  xl:    20,
  xxl:   24, // Greeting bold 24px
  xxxl:  28,
  hero:  36,
  mega:  48,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 6,
  },
  nav: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  }),
};
