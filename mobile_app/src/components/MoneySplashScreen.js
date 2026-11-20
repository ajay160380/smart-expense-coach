/**
 * ═══════════════════════════════════════════════════════════════
 * LUXURY BUTTERY-SMOOTH WELCOME SPLASH SCREEN
 * Ultra-smooth 60fps native transition into Dashboard.
 * Zero lag, zero heavy token loops, zero screen tearing/flicker.
 * ═══════════════════════════════════════════════════════════════
 */
import React, { useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Image,
  DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW, height: SH } = Dimensions.get('window');

const MoneySplashScreen = memo(({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.6)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    // 1. Entrance animation (Logo Pop + Glow Aura + Text Fade)
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(glowScale, {
        toValue: 1.25,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0.6,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(220),
        Animated.parallel([
          Animated.timing(textFade, {
            toValue: 1,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.spring(textY, {
            toValue: 0,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    // 2. Notify dashboard to start the "deem -> light-up" sequence
    const revealTimer = setTimeout(() => {
      DeviceEventEmitter.emit('splash_reveal');
    }, 200);

    // 3. Ultra-fast snappy display followed by smooth cross-dissolve into Dashboard
    const dissolveTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(exitScale, {
          toValue: 1.04,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        DeviceEventEmitter.emit('splash_reveal');
        if (onFinish) onFinish();
      });
    }, 300);

    const fallback = setTimeout(() => {
      DeviceEventEmitter.emit('splash_reveal');
      if (onFinish) onFinish();
    }, 650);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(dissolveTimer);
      clearTimeout(fallback);
    };
  }, []);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: exitScale }],
        },
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['#070D1E', '#0B1638', '#1E3A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Luminous Center Ambient Glow */}
      <Animated.View
        style={[
          styles.glowAura,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* Center Brand Badge & App Logo */}
      <View style={styles.centerBox}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <LinearGradient
            colors={['#3B82F6', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBorder}
          >
            <View style={styles.logoInner}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Brand Title & Tagline */}
        <Animated.View
          style={[
            styles.brandTextBox,
            {
              opacity: textFade,
              transform: [{ translateY: textY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>EXPENSE TRACKER</Text>
          <View style={styles.taglinePill}>
            <View style={styles.liveDot} />
            <Text style={styles.taglineText}>Smart AI Expense Coach</Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
});

MoneySplashScreen.displayName = 'MoneySplashScreen';
export default MoneySplashScreen;

const styles = StyleSheet.create({
  container: {
    width: SW,
    height: SH,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  glowAura: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(59, 130, 246, 0.28)',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 104,
    height: 104,
    borderRadius: 28,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  logoBorder: {
    width: 104,
    height: 104,
    borderRadius: 28,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 22,
  },
  brandTextBox: {
    alignItems: 'center',
    marginTop: 20,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2.2,
    textAlign: 'center',
  },
  taglinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  taglineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 0.5,
  },
});
