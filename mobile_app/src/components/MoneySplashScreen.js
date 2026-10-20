/**
 * ═══════════════════════════════════════════════════════════════
 * MONEY SPLASH SCREEN — True Display Center Edition
 * Centered with Flexbox (width: SW, height: SH, justifyContent: center, alignItems: center)
 * Zero negative margins, zero layout offsets — 100% pure display center.
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

// ── 12 PERFECTLY SYMMETRICAL RADIAL CURRENCY TOKENS ─────────────
// Clockwork 360° circle (30° apart):
// Alternating: Gold Coin (🪙) ↔ Emerald Cash Note (💵)
const TOKENS = [];

for (let i = 0; i < 12; i++) {
  // Start from 12 o'clock (-90deg) and move clockwise
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const isCoin = i % 2 === 1;

  // Inward start distance
  const startRadius = 220 + Math.abs(Math.sin(angle)) * 50;
  const sx = Math.cos(angle) * startRadius;
  const sy = Math.sin(angle) * startRadius;

  // Radial burst outward distance
  const burstRadius = 280 + Math.abs(Math.sin(angle)) * 40;
  const bx = Math.cos(angle) * burstRadius;
  const by = Math.sin(angle) * burstRadius;

  TOKENS.push({
    id: i,
    type: isCoin ? 'coin' : 'note',
    angle,
    sx,
    sy,
    bx,
    by,
  });
}

// 4 Golden Sparkle Stars
const SPARKLES = [
  { id: 's1', sx: -140, sy: -140, bx: -240, by: -240 },
  { id: 's2', sx: 140, sy: -140, bx: 240, by: -240 },
  { id: 's3', sx: -140, sy: 140, bx: -240, by: 240 },
  { id: 's4', sx: 140, sy: 140, bx: 240, by: 240 },
];

const MoneySplashScreen = memo(({ onFinish }) => {
  const anim = useRef(new Animated.Value(0)).current;          // 0→1 (converge) → 2 (burst)
  const logoAnim = useRef(new Animated.Value(0)).current;      // Center logo pop
  const glowAnim = useRef(new Animated.Value(0)).current;      // Center aura
  const burstRingAnim = useRef(new Animated.Value(0)).current;  // Shockwave expanding ring
  const fadeAnim = useRef(new Animated.Value(1)).current;      // Screen dissolve

  useEffect(() => {
    // Reveal dashboard right as starburst expansion begins
    const revealTimer = setTimeout(() => {
      DeviceEventEmitter.emit('splash_reveal');
    }, 900);

    Animated.parallel([
      // ── Main Timeline: Radial convergence (0→1) then Radiant burst (1→2) ──
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 2,
          duration: 550,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),

      // ── Center Logo Pop ──
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(logoAnim, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),

      // ── Luminous Center Aura Pulse ──
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),

      // ── Shockwave Expanding Ring (on Burst) ──
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(burstRingAnim, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // ── Smooth Screen Dissolve ──
      Animated.sequence([
        Animated.delay(1050),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      DeviceEventEmitter.emit('splash_reveal');
      onFinish && onFinish();
    });

    const fallback = setTimeout(() => {
      DeviceEventEmitter.emit('splash_reveal');
      onFinish && onFinish();
    }, 1500);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(fallback);
    };
  }, []);

  // Logo interpolations
  const logoScale = logoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  const logoOpacity = logoAnim.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 1, 1],
  });

  // Center aura glow
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1.6],
  });
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.65, 0],
  });

  // Shockwave burst ring
  const burstRingScale = burstRingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 2.8],
  });
  const burstRingOpacity = burstRingAnim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.85, 0.3, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim },
      ]}
      pointerEvents="auto"
    >
      {/* ── CENTER EMERALD AURA ── */}
      <Animated.View
        style={[
          styles.glowWrap,
          { transform: [{ scale: glowScale }], opacity: glowOpacity },
        ]}
      >
        <View style={styles.centerGlow} />
      </Animated.View>

      {/* ── SHOCKWAVE EXPANDING RING ── */}
      <Animated.View
        style={[
          styles.ringWrap,
          { transform: [{ scale: burstRingScale }], opacity: burstRingOpacity },
        ]}
      >
        <View style={styles.burstRing} />
      </Animated.View>

      {/* ── 12 SYMMETRICAL CURRENCY TOKENS ── */}
      {TOKENS.map((t) => {
        const tx = anim.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [t.sx, 0, t.bx],
        });
        const ty = anim.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [t.sy, 0, t.by],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.15, 0.9, 1.8, 2],
          outputRange: [0, 1, 1, 0.75, 0],
        });
        const scale = anim.interpolate({
          inputRange: [0, 0.5, 1, 1.2, 2],
          outputRange: [0.5, 1, 1.2, 1.05, 0.4],
        });

        if (t.type === 'coin') {
          return (
            <Animated.View
              key={t.id}
              style={[
                styles.tokenWrap,
                {
                  transform: [{ translateX: tx }, { translateY: ty }, { scale }],
                  opacity,
                },
              ]}
            >
              <View style={styles.coinOuter}>
                <LinearGradient
                  colors={['#FDE68A', '#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.coinGradient}
                >
                  <View style={styles.coinInnerRing}>
                    <Text style={styles.coinSymbol}>₹</Text>
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>
          );
        }

        // Emerald Cash Note
        return (
          <Animated.View
            key={t.id}
            style={[
              styles.tokenWrap,
              {
                transform: [{ translateX: tx }, { translateY: ty }, { scale }],
                opacity,
              },
            ]}
          >
            <View style={styles.noteOuter}>
              <LinearGradient
                colors={['#34D399', '#10B981', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.noteGradient}
              >
                <View style={styles.noteInnerBorder}>
                  <View style={styles.noteCircle}>
                    <Text style={styles.noteSymbol}>₹</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>
        );
      })}

      {/* ── 4 GOLDEN SPARKLE STARS ── */}
      {SPARKLES.map((s) => {
        const tx = anim.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [s.sx, 0, s.bx],
        });
        const ty = anim.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [s.sy, 0, s.by],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.2, 0.85, 1.8, 2],
          outputRange: [0, 0.9, 1, 0.7, 0],
        });
        const scale = anim.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [0.3, 1.3, 0.4],
        });

        return (
          <Animated.View
            key={s.id}
            style={[
              styles.tokenWrap,
              {
                transform: [{ translateX: tx }, { translateY: ty }, { scale }],
                opacity,
              },
            ]}
          >
            <View style={styles.sparkleDiamond} />
          </Animated.View>
        );
      })}

      {/* ── CENTER BRAND BADGE (True Center Alignment) ── */}
      <Animated.View
        style={[
          styles.centerBadge,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          },
        ]}
      >
        <LinearGradient
          colors={['#8B5CF6', '#10B981']}
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

        <Text style={styles.brandTitle}>EXPENSE TRACKER</Text>
        <View style={styles.tagRow}>
          <View style={styles.dot} />
          <Text style={styles.tagline}>SMART EXPENSE COACH</Text>
          <View style={styles.dot} />
        </View>
      </Animated.View>
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
    backgroundColor: '#0B0E14',
  },
  glowWrap: {
    position: 'absolute',
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerGlow: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    shadowColor: '#10B981',
    shadowOpacity: 0.9,
    shadowRadius: 50,
  },
  ringWrap: {
    position: 'absolute',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  burstRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#34D399',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  tokenWrap: {
    position: 'absolute',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── LUXURY MINTED GOLD COIN ──
  coinOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  coinGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FEF08A',
  },
  coinInnerRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(254, 240, 138, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.25)',
  },
  coinSymbol: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ── CRISP EMERALD CASH NOTE ──
  noteOuter: {
    width: 44,
    height: 24,
    borderRadius: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  noteGradient: {
    width: 44,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6EE7B7',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteInnerBorder: {
    flex: 1,
    width: '100%',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteCircle: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteSymbol: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  // ── SPARKLE DIAMOND STAR ──
  sparkleDiamond: {
    width: 10,
    height: 10,
    backgroundColor: '#FDE047',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#FDE047',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },

  // ── CENTER BRAND BADGE ──
  centerBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBorder: {
    width: 88,
    height: 88,
    borderRadius: 24,
    padding: 3,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 14,
  },
  logoInner: {
    flex: 1,
    backgroundColor: '#0F1424',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 58,
    height: 58,
    borderRadius: 14,
  },
  brandTitle: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3.5,
    textAlign: 'center',
    textShadowColor: 'rgba(139, 92, 246, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#10B981',
    marginHorizontal: 6,
  },
  tagline: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 2,
    textAlign: 'center',
  },
});
