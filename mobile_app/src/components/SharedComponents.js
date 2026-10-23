/**
 * ═══════════════════════════════════════════════════════════════
 * SHARED UI COMPONENTS — ExpenseTracker
 * Light Theme Components matching Target Design (Image 2)
 * Pure white cards, soft 0 8px 24px shadows, vivid accents
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, FONT, SHADOW } from '../utils/theme';
import { useTheme } from '../theme/ThemeContext';

// ═══════════════════════════════════════════════
// GLASS CARD — Pure White / Dark Slate Card with Soft Elevation
// ═══════════════════════════════════════════════
export function GlassCard({ children, style, onPress }) {
  const { isDark, colors } = useTheme();
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[
        styles.glassCard,
        style,
        isDark && {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOpacity: 0.35,
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      {children}
    </Wrapper>
  );
}

// ═══════════════════════════════════════════════
// GRADIENT BUTTON — Animated Vivid Button
// ═══════════════════════════════════════════════
export function GradientButton({
  title,
  onPress,
  colors,
  loading,
  disabled,
  style,
  textStyle,
  icon,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={colors || COLORS.gradPurple}
          style={styles.gradientButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.gradBtnContent}>
              {icon && <Text style={{ marginRight: 8 }}>{icon}</Text>}
              <Text style={[styles.gradBtnText, textStyle]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════
// CATEGORY BADGE — Pill style
// ═══════════════════════════════════════════════
export function CategoryBadge({ category, icon, color, selected, onPress, size = 'md' }) {
  const { isDark, colors } = useTheme();
  const sizeMd = size === 'md';
  return (
    <TouchableOpacity
      style={[
        styles.catBadge,
        {
          backgroundColor: selected 
            ? (color || colors.primary) 
            : (isDark ? colors.surface : '#FFFFFF'),
          borderColor: selected 
            ? (color || colors.primary) 
            : (isDark ? colors.border : COLORS.border),
          paddingHorizontal: sizeMd ? 14 : 10,
          paddingVertical: sizeMd ? 8 : 6,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon && <Text style={{ fontSize: sizeMd ? 15 : 12, marginRight: 6 }}>{icon}</Text>}
      <Text
        style={[
          styles.catBadgeText,
          {
            color: selected 
              ? '#FFFFFF' 
              : (isDark ? colors.textPrimary : COLORS.textPrimary),
            fontSize: sizeMd ? 13 : 11,
          },
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════
// ANIMATED NUMBER — Smooth counter
// ═══════════════════════════════════════════════
export function AnimatedNumber({ value, prefix = '', suffix = '', style }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [displayVal, setDisplayVal] = React.useState(0);

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, {
      toValue: value,
      duration: 800,
      useNativeDriver: false,
    }).start();

    const listener = animVal.addListener(({ value: v }) => {
      setDisplayVal(Math.round(v));
    });

    return () => animVal.removeListener(listener);
  }, [value]);

  return (
    <Text style={style}>
      {prefix}
      {displayVal.toLocaleString('en-IN')}
      {suffix}
    </Text>
  );
}

// ═══════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════
export function EmptyState({ icon = '📭', title, message, actionText, onAction }) {
  const { isDark, colors } = useTheme();
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={[styles.emptyTitle, isDark && { color: colors.textPrimary }]}>{title}</Text>
      {message && <Text style={[styles.emptyMessage, isDark && { color: colors.textSecondary }]}>{message}</Text>}
      {actionText && onAction && (
        <TouchableOpacity 
          style={[styles.emptyAction, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]} 
          onPress={onAction} 
          activeOpacity={0.85}
        >
          <Text style={[styles.emptyActionText, isDark && { color: colors.primary }]}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════
// LOADING SCREEN
// ═══════════════════════════════════════════════
export function LoadingScreen({ message = 'Loading...' }) {
  const { isDark, colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.loadingContainer, isDark && { backgroundColor: colors.bg }]}>
      <Animated.Text style={[styles.loadingLogo, { opacity: pulse }]}>💳</Animated.Text>
      <Text style={[styles.loadingBrand, isDark && { color: colors.textPrimary }]}>ExpenseTracker</Text>
      <ActivityIndicator color={colors.primary} size="small" style={{ marginTop: 16 }} />
      <Text style={[styles.loadingMsg, isDark && { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════
// STAT CARD — Clean white / dark slate mini-card
// ═══════════════════════════════════════════════
export function StatCard({ label, value, color, icon }) {
  const { isDark, colors } = useTheme();
  return (
    <View style={[styles.statCard, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {icon && <Text style={{ fontSize: 16, marginBottom: 4 }}>{icon}</Text>}
      <Text style={[styles.statLabel, isDark && { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: color || (isDark ? colors.textPrimary : '#1F2937') }]}>{value}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════
// SECTION HEADER — With Orange / Luminous Accent Link
// ═══════════════════════════════════════════════
export function SectionHeader({ title, actionText = 'View All >', onAction }) {
  const { isDark, colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, isDark && { color: colors.textPrimary }]}>{title}</Text>
      {onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.sectionAction, isDark && { color: colors.primary }]}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Pure White Card ──
  glassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    padding: SPACING.lg,
    ...SHADOW.card,
  },

  // ── Gradient Button ──
  gradientButton: {
    borderRadius: RADIUS.pill,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  gradBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradBtnText: {
    color: '#FFFFFF',
    fontSize: FONT.md,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Category Badge ──
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  catBadgeText: {
    fontWeight: '600',
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 14,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyMessage: {
    color: COLORS.textSecondary,
    fontSize: FONT.base,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    ...SHADOW.sm,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: FONT.base,
  },

  // ── Loading Screen ──
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    fontSize: 48,
    marginBottom: 8,
  },
  loadingBrand: {
    color: COLORS.textPrimary,
    fontSize: FONT.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  loadingMsg: {
    color: COLORS.textSecondary,
    fontSize: FONT.sm,
    marginTop: 8,
  },

  // ── Stat Card ──
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    ...SHADOW.sm,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: FONT.lg,
    fontWeight: '800',
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT.md,
    fontWeight: '700',
  },
  sectionAction: {
    color: COLORS.orange,
    fontSize: FONT.sm,
    fontWeight: '700',
  },
});
