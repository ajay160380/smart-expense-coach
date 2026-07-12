/**
 * ═══════════════════════════════════════════════════════════════
 * SHARED UI COMPONENTS — PaisaMitra Premium
 * Reusable components for the glassmorphic dark theme
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, FONT, SHADOW } from '../utils/theme';

// ═══════════════════════════════════════════════
// GLASS CARD — Glassmorphic container
// ═══════════════════════════════════════════════
export function GlassCard({ children, style, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.glassCard, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </Wrapper>
  );
}

// ═══════════════════════════════════════════════
// GRADIENT BUTTON — Animated gradient button
// ═══════════════════════════════════════════════
export function GradientButton({
  title, onPress, colors, loading, disabled, style, textStyle, icon,
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
// CATEGORY BADGE — Icon + Color for categories
// ═══════════════════════════════════════════════
export function CategoryBadge({ category, icon, color, selected, onPress, size = 'md' }) {
  const sizeMd = size === 'md';
  return (
    <TouchableOpacity
      style={[
        styles.catBadge,
        {
          backgroundColor: selected ? color : 'rgba(255,255,255,0.06)',
          borderColor: selected ? color : COLORS.border,
          paddingHorizontal: sizeMd ? 14 : 10,
          paddingVertical: sizeMd ? 10 : 6,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: sizeMd ? 16 : 13, marginRight: 6 }}>{icon}</Text>
      <Text
        style={[
          styles.catBadgeText,
          { color: selected ? '#fff' : COLORS.textSecondary, fontSize: sizeMd ? 13 : 11 },
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════
// PROGRESS RING — Circular progress indicator
// ═══════════════════════════════════════════════
export function ProgressRing({ percent = 0, size = 120, strokeWidth = 10, color = COLORS.primary }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: Math.min(percent, 100),
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const clampedPct = Math.min(percent, 100);
  const dashOffset = circumference - (circumference * clampedPct) / 100;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background circle */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      />
      {/* Progress arc (using a border hack for simple implementation) */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: clampedPct > 25 ? color : 'transparent',
          borderBottomColor: clampedPct > 50 ? color : 'transparent',
          borderLeftColor: clampedPct > 75 ? color : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }}
      />
      {/* Center content */}
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: COLORS.textPrimary, fontSize: size * 0.22, fontWeight: 'bold' }}>
          {Math.round(clampedPct)}%
        </Text>
        <Text style={{ color: COLORS.textMuted, fontSize: size * 0.1 }}>used</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════
// ANIMATED NUMBER — Count-up animation
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
      {prefix}{displayVal.toLocaleString('en-IN')}{suffix}
    </Text>
  );
}

// ═══════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════
export function EmptyState({ icon = '📭', title, message, actionText, onAction }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
      {actionText && onAction && (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction}>
          <Text style={styles.emptyActionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════
// LOADING SCREEN — Branded shimmer
// ═══════════════════════════════════════════════
export function LoadingScreen({ message = 'Loading...' }) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <Animated.Text style={[styles.loadingLogo, { opacity: pulse }]}>✨</Animated.Text>
      <Text style={styles.loadingBrand}>PaisaMitra</Text>
      <ActivityIndicator color={COLORS.cyan} size="small" style={{ marginTop: 16 }} />
      <Text style={styles.loadingMsg}>{message}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════
// STAT CARD — Mini stat display
// ═══════════════════════════════════════════════
export function StatCard({ label, value, color, icon }) {
  return (
    <View style={styles.statCard}>
      {icon && <Text style={{ fontSize: 16, marginBottom: 4 }}>{icon}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════
// SECTION HEADER
// ═══════════════════════════════════════════════
export function SectionHeader({ title, actionText, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionText && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  // ── Glass Card ──
  glassCard: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.lg,
    ...SHADOW.md,
  },

  // ── Gradient Button ──
  gradientButton: {
    borderRadius: RADIUS.md,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradBtnText: {
    color: '#fff',
    fontSize: FONT.md,
    fontWeight: 'bold',
  },

  // ── Category Badge ──
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  catBadgeText: {
    fontWeight: '600',
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT.lg,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyMessage: {
    color: COLORS.textSecondary,
    fontSize: FONT.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAction: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
  },
  emptyActionText: {
    color: '#fff',
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  loadingMsg: {
    color: COLORS.textMuted,
    fontSize: FONT.sm,
    marginTop: 8,
  },

  // ── Stat Card ──
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT.xs,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: FONT.xl,
    fontWeight: 'bold',
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT.md,
    fontWeight: 'bold',
  },
  sectionAction: {
    color: COLORS.cyan,
    fontSize: FONT.sm,
    fontWeight: '600',
  },
});
