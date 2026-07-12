/**
 * ═══════════════════════════════════════════════════════════════
 * PAISA MITRA — DESIGN SYSTEM
 * Premium dark glassmorphic theme with consistent tokens
 * ═══════════════════════════════════════════════════════════════
 */

export const COLORS = {
  // ── Base ──
  bg:           '#0B0E14',
  bgCard:       '#1E293B',
  bgInput:      '#0f172a',
  bgElevated:   '#1a2332',
  surface:      'rgba(30, 41, 59, 0.85)',
  glass:        'rgba(30, 41, 59, 0.6)',
  glassBorder:  'rgba(255, 255, 255, 0.08)',
  
  // ── Text ──
  textPrimary:   '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted:     '#64748b',
  textInverse:   '#0f172a',

  // ── Accent ──
  primary:      '#A888FF',
  primaryDark:  '#9333EA',
  cyan:         '#06b6d4',
  green:        '#10b981',
  greenBright:  '#22c55e',
  orange:       '#f97316',
  red:          '#ef4444',
  yellow:       '#facc15',
  pink:         '#ec4899',
  blue:         '#3b82f6',

  // ── Gradients (as arrays for LinearGradient) ──
  gradPurple:   ['#A888FF', '#9333EA'],
  gradDeepPurp: ['#4c1d95', '#2e1065'],
  gradCyan:     ['#8b5cf6', '#06b6d4'],
  gradGreen:    ['#2dd4bf', '#10b981'],
  gradOrange:   ['#f97316', '#ea580c'],
  gradRed:      ['#ef4444', '#dc2626'],
  gradBlue:     ['#3b82f6', '#2563eb'],
  gradPink:     ['#ec4899', '#db2777'],

  // ── Border ──
  border:       '#334155',
  borderLight:  'rgba(255, 255, 255, 0.05)',
  borderAccent: '#06b6d4',

  // ── Status ──
  success:      '#10b981',
  warning:      '#f59e0b',
  error:        '#ef4444',
  info:         '#3b82f6',

  // ── WhatsApp ──
  whatsapp:     '#25D366',
};

export const CAT_COLORS = {
  food:          '#6c5ce7',
  transport:     '#00cec9',
  shopping:      '#fd79a8',
  health:        '#00b894',
  entertainment: '#fdcb6e',
  education:     '#74b9ff',
  utilities:     '#a29bfe',
  other:         '#dfe6e9',
};

export const CAT_ICONS = {
  food:          '🍜',
  transport:     '🚗',
  shopping:      '🛍️',
  health:        '💊',
  entertainment: '🎬',
  education:     '📚',
  utilities:     '⚡',
  other:         '📦',
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
  full: 999,
};

export const FONT = {
  xs:    11,
  sm:    12,
  base:  14,
  md:    16,
  lg:    18,
  xl:    20,
  xxl:   24,
  xxxl:  28,
  hero:  36,
  mega:  48,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  }),
};

// ── Common Styles ──
export const COMMON = {
  glassCard: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOW.md,
  },
  solidCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    color: COLORS.textPrimary,
    fontSize: FONT.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: FONT.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
};
