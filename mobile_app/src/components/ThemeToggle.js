import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';

export const ThemeToggle = ({ size = 'medium', style }) => {
  const { isDark, toggleTheme } = useTheme();
  const slideAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isDark ? 1 : 0,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isDark]);

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    toggleTheme();
  };

  const isSmall = size === 'small';
  const width = isSmall ? 52 : 62;
  const height = isSmall ? 28 : 34;
  const knobSize = isSmall ? 22 : 26;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, width - knobSize - 3],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={[
        styles.track,
        {
          width,
          height,
          borderRadius: height / 2,
          backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
          borderColor: isDark ? '#334155' : '#CBD5E1',
        },
        style,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel="Toggle Dark Mode"
    >
      {/* Sun Icon (Left) */}
      <View style={styles.iconContainerLeft}>
        <Ionicons
          name="sunny"
          size={isSmall ? 13 : 15}
          color={isDark ? '#64748B' : '#F59E0B'}
        />
      </View>

      {/* Moon Icon (Right) */}
      <View style={styles.iconContainerRight}>
        <Ionicons
          name="moon"
          size={isSmall ? 12 : 14}
          color={isDark ? '#818CF8' : '#94A3B8'}
        />
      </View>

      {/* Animated Sliding Knob */}
      <Animated.View
        style={[
          styles.knob,
          {
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            backgroundColor: isDark ? '#818CF8' : '#FFFFFF',
            transform: [{ translateX }],
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  iconContainerLeft: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  knob: {
    position: 'absolute',
    top: 3,
    left: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default ThemeToggle;
