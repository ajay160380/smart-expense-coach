import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AnimatedBotAvatar({ size = 26, isDark = false }) {
  const eyeScaleY = useRef(new Animated.Value(1)).current;
  const faceLookX = useRef(new Animated.Value(0)).current;
  const faceTilt = useRef(new Animated.Value(0)).current;
  const hoverY = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // 1. Natural Eye Blinking Loop (with occasional double-blinks)
    let blinkTimer = null;
    let isMounted = true;

    const scheduleNextBlink = () => {
      if (!isMounted) return;
      const nextDelay = 2600 + Math.random() * 2200; // 2.6s - 4.8s
      blinkTimer = setTimeout(() => {
        if (!isMounted) return;
        // Blink
        Animated.sequence([
          Animated.timing(eyeScaleY, {
            toValue: 0.1,
            duration: 85,
            useNativeDriver: true,
          }),
          Animated.timing(eyeScaleY, {
            toValue: 1,
            duration: 110,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (!isMounted) return;
          // 30% chance for an adorable quick double-blink
          if (Math.random() < 0.35) {
            setTimeout(() => {
              if (!isMounted) return;
              Animated.sequence([
                Animated.timing(eyeScaleY, {
                  toValue: 0.1,
                  duration: 75,
                  useNativeDriver: true,
                }),
                Animated.timing(eyeScaleY, {
                  toValue: 1,
                  duration: 95,
                  useNativeDriver: true,
                }),
              ]).start(() => scheduleNextBlink());
            }, 100);
          } else {
            scheduleNextBlink();
          }
        });
      }, nextDelay);
    };

    scheduleNextBlink();

    // 2. Curious Head Movement Loop (Idhar-Udhar dekhna / looking left & right)
    const lookAnimation = Animated.loop(
      Animated.sequence([
        // Center idle
        Animated.delay(1200),
        // Glances slightly left
        Animated.parallel([
          Animated.timing(faceLookX, {
            toValue: -2.5,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(faceTilt, {
            toValue: -1,
            duration: 450,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1600),
        // Glances slightly right
        Animated.parallel([
          Animated.timing(faceLookX, {
            toValue: 2.5,
            duration: 550,
            useNativeDriver: true,
          }),
          Animated.timing(faceTilt, {
            toValue: 1,
            duration: 550,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1600),
        // Returns to friendly center
        Animated.parallel([
          Animated.timing(faceLookX, {
            toValue: 0,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(faceTilt, {
            toValue: 0,
            duration: 450,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(2000),
      ])
    );
    lookAnimation.start();

    // 3. Gentle Breathing Hover (Float up & down)
    const hoverAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(hoverY, {
          toValue: -1.5,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(hoverY, {
          toValue: 0.8,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    hoverAnimation.start();

    // 4. Subtle Antenna LED pulse
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.5,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      isMounted = false;
      if (blinkTimer) clearTimeout(blinkTimer);
      lookAnimation.stop();
      hoverAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  const spin = faceTilt.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-5deg', '0deg', '5deg'],
  });

  const headWidth = size;
  const headHeight = Math.round(size * 0.92);
  const visorWidth = Math.round(size * 0.72);
  const visorHeight = Math.round(size * 0.52);
  const eyeWidth = Math.max(3, Math.round(size * 0.15));
  const eyeHeight = Math.max(4, Math.round(size * 0.22));

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: headWidth + 4,
          height: headHeight + 5,
          transform: [
            { translateY: hoverY },
            { translateX: faceLookX },
            { rotate: spin },
          ],
        },
      ]}
    >
      {/* Tiny Antenna / Glowing Signal Dot */}
      <View style={styles.antennaStem} />
      <Animated.View style={[styles.antennaBulb, { opacity: glowPulse }]} />

      {/* Robot Helmet Body */}
      <LinearGradient
        colors={isDark ? ['#6366F1', '#4F46E5'] : ['#7C3AED', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.helmet,
          {
            width: headWidth,
            height: headHeight,
            borderRadius: Math.round(headWidth * 0.32),
          },
        ]}
      >
        {/* Sleek Visor Screen */}
        <View
          style={[
            styles.visor,
            {
              width: visorWidth,
              height: visorHeight,
              borderRadius: Math.round(visorWidth * 0.28),
            },
          ]}
        >
          {/* Eyes Container */}
          <View style={styles.eyesRow}>
            {/* Left Eye */}
            <Animated.View
              style={[
                styles.eye,
                {
                  width: eyeWidth,
                  height: eyeHeight,
                  borderRadius: eyeWidth / 2,
                  transform: [{ scaleY: eyeScaleY }],
                },
              ]}
            >
              <View style={styles.eyePupil} />
            </Animated.View>

            {/* Right Eye */}
            <Animated.View
              style={[
                styles.eye,
                {
                  width: eyeWidth,
                  height: eyeHeight,
                  borderRadius: eyeWidth / 2,
                  transform: [{ scaleY: eyeScaleY }],
                },
              ]}
            >
              <View style={styles.eyePupil} />
            </Animated.View>
          </View>

          {/* Cute Smile / Mouth Line */}
          <View style={styles.mouth} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  antennaStem: {
    width: 1.5,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginBottom: -1,
    zIndex: 1,
  },
  antennaBulb: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 2,
  },
  helmet: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  visor: {
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1,
  },
  eyesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '68%',
    marginBottom: 1,
  },
  eye: {
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  eyePupil: {
    width: 1.5,
    height: 1.5,
    borderRadius: 0.75,
    backgroundColor: '#FFFFFF',
    marginTop: 0.6,
  },
  mouth: {
    width: 6,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.85)',
    marginTop: 1,
  },
});
