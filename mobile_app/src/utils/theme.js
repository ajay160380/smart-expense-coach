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
  primary:       '#2563EB', // Logo Royal Blue (was purple)
  primaryLight:  '#EFF6FF', // Soft Sky Blue tint
  primaryDark:   '#1D4ED8', // Deep Royal Blue
  accent:        '#FF6B35', // Warm orange (active tab, "View All" links)
  orange:        '#FF6B35',
  orangeLight:   '#FFF2EB',

  // ── System Accents ──
  cyan:          '#38BDF8', // Sky blue
  blue:          '#2563EB', // Logo Royal Blue
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
  gradHero:      ['#2563EB', '#1D4ED8'], // Blue hero balance card
  gradPurple:    ['#3B82F6', '#2563EB'], // Primary Brand Blue
  gradOrange:    ['#FF6B35', '#F97316'], // Orange accent
  gradGreen:     ['#22C55E', '#16A34A'],
  gradRed:       ['#EF4444', '#DC2626'],
  gradPink:      ['#EC4899', '#DB2777'],
  gradCyan:      ['#38BDF8', '#0284C7'],
  gradDeepPurp:  ['#2563EB', '#1E40AF'],
  gradCardLight: ['#FFFFFF', '#F0F9FF'],
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

export const DARK_COLORS = {
  // ── Dark Slate Base (Layered Depth) ──
  bg:            '#0F172A', // Base App Background: Deep Dark Slate
  bgSoft:        '#1E293B',
  bgCard:        '#1E293B', // Widget Surface (Base Card)
  bgCardAlt:     '#243047',
  bgInput:       '#334155', // Elevated Input Surface
  bgElevated:    '#334155', // Elevated Elements (Popovers, Dropdowns)
  surface:       '#1E293B',
  glass:         '#1E293B',
  glassBorder:   '#334155',

  // ── Typography ──
  textPrimary:   '#F8FAFC', // High-contrast primary values
  textSecondary: '#94A3B8', // Muted secondary labels
  textMuted:     '#64748B', // Tertiary / subtle
  textInverse:   '#0F172A', // Inverted text on bright elements

  // ── Brand Colors ──
  primary:       '#3B82F6', // Vibrant Blue accent
  primaryLight:  'rgba(59, 130, 246, 0.15)', // Subtle dark-mode glow
  primaryDark:   '#2563EB',
  accent:        '#60A5FA',
  orange:        '#FB923C',
  orangeLight:   'rgba(251, 146, 60, 0.15)',

  // ── System Accents ──
  cyan:          '#38BDF8',
  blue:          '#60A5FA',
  green:         '#34D399', // Readable positive trend value
  greenBright:   '#34D399',
  greenLight:    'rgba(16, 185, 129, 0.15)', // Readable positive trend pill
  red:           '#F87171', // Readable negative trend value
  redLight:      'rgba(239, 68, 68, 0.15)', // Readable negative trend pill
  yellow:        '#FBBF24',
  pink:          '#F472B6',

  // ── Bottom Navigation Bar ──
  navBg:         '#090D16', // Ultra-dark crisp navigation bar
  navBorder:     '#334155',
  navActive:     '#3B82F6',
  navInactive:   '#64748B',
  navFabRing:    '#0F172A',

  // ── Gradients (for LinearGradient) ──
  gradHero:      ['#1E293B', '#0F172A'],
  gradPurple:    ['#3B82F6', '#2563EB'],
  gradOrange:    ['#F97316', '#EA580C'],
  gradGreen:     ['#10B981', '#059669'],
  gradRed:       ['#EF4444', '#DC2626'],
  gradPink:      ['#EC4899', '#DB2777'],
  gradCyan:      ['#06B6D4', '#0891B2'],
  gradDeepPurp:  ['#2563EB', '#1D4ED8'],
  gradCardLight: ['#1E293B', '#243047'],
  gradPastelMint:['rgba(16, 185, 129, 0.12)', 'rgba(5, 150, 105, 0.08)'],
  gradPastelPeach:['rgba(249, 115, 22, 0.12)', 'rgba(234, 88, 12, 0.08)'],

  // ── Borders & Dividers ──
  border:        '#334155', // 1px subtle separation
  borderLight:   '#334155',
  borderAccent:  '#818CF8',

  // ── Status Indicators ──
  success:       '#34D399',
  warning:       '#FBBF24',
  error:         '#F87171',
  info:          '#60A5FA',

  // ── Backdrops & Glows ──
  badgeGlow:     'rgba(99, 102, 241, 0.15)',
  chartGrid:     'rgba(51, 65, 85, 0.5)',

  // ── WhatsApp Brand ──
  whatsapp:      '#25D366',
};

export const getThemeColors = (isDark) => (isDark ? DARK_COLORS : COLORS);

export const CAT_COLORS = {
  food:          '#F97316', // Vibrant Warm Orange
  transport:     '#06B6D4', // Cyan / Sky Blue
  shopping:      '#EC4899', // Hot Pink
  health:        '#10B981', // Emerald Green
  entertainment: '#8B5CF6', // Vivid Purple
  education:     '#3B82F6', // Royal Blue
  utilities:     '#EAB308', // Electric Gold
  groceries:     '#14B8A6', // Teal
  fuel:          '#0284C7', // Ocean Blue
  cng:           '#0284C7',
  other:         '#64748B', // Cool Slate
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
