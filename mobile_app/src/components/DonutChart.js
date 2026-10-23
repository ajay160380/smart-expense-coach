/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — DONUT CHART COMPONENT
 * Pure React Native multi-segment donut chart (zero native dependencies)
 * Compatible with OTA updates & Web/iOS/Android
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';
import { useTheme } from '../theme/ThemeContext';

const PALETTE = [
  '#FF6B35', // Orange (Shopping)
  '#7C3AED', // Vivid Purple (Food)
  '#22C55E', // Green (Transport)
  '#3B82F6', // Blue (Education/Bills)
  '#EC4899', // Pink (Entertainment)
  '#F59E0B', // Amber (Health)
  '#06B6D4', // Cyan (Utilities)
  '#EF4444', // Red (Groceries)
];

export default function DonutChart({ data = [], size = 130, holeRatio = 0.55 }) {
  const { isDark, colors } = useTheme();
  const total = data.reduce((sum, item) => sum + (parseFloat(item.amount || item.total || 0) || 0), 0);

  if (total <= 0 || data.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View
          style={[
            styles.emptyRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: size * ((1 - holeRatio) / 2),
              borderColor: isDark ? colors.border : '#E5E7EB',
            },
          ]}
        />
        <View
          style={[
            styles.hole,
            {
              width: size * holeRatio,
              height: size * holeRatio,
              borderRadius: (size * holeRatio) / 2,
              backgroundColor: isDark ? colors.surface : '#FFFFFF',
            },
          ]}
        >
          <Text style={[styles.emptyText, isDark && { color: colors.textSecondary }]}>No data</Text>
        </View>
      </View>
    );
  }

  // Generate 48 discrete radial slices for smooth donut ring
  const SLICES_COUNT = 48;
  const radius = size / 2;
  const ringThickness = (size * (1 - holeRatio)) / 2;
  const innerRadius = (size * holeRatio) / 2;

  // Build cumulative distribution
  let runningPercent = 0;
  const segmentRanges = data.map((item, index) => {
    const value = parseFloat(item.amount || item.total || 0) || 0;
    const pct = value / total;
    const startPct = runningPercent;
    runningPercent += pct;
    return {
      color: item.color || PALETTE[index % PALETTE.length],
      startPct,
      endPct: runningPercent,
    };
  });

  const slices = [];
  for (let i = 0; i < SLICES_COUNT; i++) {
    const slicePct = i / SLICES_COUNT;
    const match = segmentRanges.find(
      (seg) => slicePct >= seg.startPct && (slicePct < seg.endPct || i === SLICES_COUNT - 1)
    ) || segmentRanges[segmentRanges.length - 1];

    const angleDeg = (i * 360) / SLICES_COUNT - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const midRadius = (radius + innerRadius) / 2;
    const x = radius + midRadius * Math.cos(angleRad) - ringThickness / 2;
    const y = radius + midRadius * Math.sin(angleRad) - ringThickness / 2;

    slices.push({
      key: i,
      color: match ? match.color : PALETTE[0],
      x,
      y,
      size: ringThickness + 2.5,
    });
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Radial dots forming solid donut arc */}
      {slices.map((slice) => (
        <View
          key={slice.key}
          style={[
            styles.sliceDot,
            {
              left: slice.x,
              top: slice.y,
              width: slice.size,
              height: slice.size,
              borderRadius: slice.size / 2,
              backgroundColor: slice.color,
            },
          ]}
        />
      ))}

      {/* Central cutout mask (Light: #FFFFFF, Dark: #1E293B) */}
      <View
        style={[
          styles.hole,
          {
            width: size * holeRatio,
            height: size * holeRatio,
            borderRadius: (size * holeRatio) / 2,
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
          },
        ]}
      >
        <Text style={[styles.holeCount, isDark && { color: colors.textPrimary }]}>{data.length}</Text>
        <Text style={[styles.holeLabel, isDark && { color: colors.textSecondary }]}>Cats</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sliceDot: {
    position: 'absolute',
  },
  emptyRing: {
    borderColor: '#E5E7EB',
    position: 'absolute',
  },
  hole: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  holeCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  holeLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
});
