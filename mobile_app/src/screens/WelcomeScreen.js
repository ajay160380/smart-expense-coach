/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — REVOLUT / APPLE-STYLE LUXURY FINTECH ONBOARDING
 * Zero ugly white boxes in the middle! Everything breathes freely:
 * Organic 3D glowing Voice Orb, floating translucent WhatsApp bubbles,
 * metallic Titanium Card, and golden-ratio typography.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  FlatList,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Logo from '../components/Logo';
import { getToken } from '../utils/auth';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    badge: '10X FASTER ENTRY',
    badgeIcon: 'flash',
    badgeColor: '#38BDF8',
    badgeBg: 'rgba(56, 189, 248, 0.14)',
    badgeBorder: 'rgba(56, 189, 248, 0.35)',
    titleMain: 'Speak Naturally.\n',
    titleAccent: 'Track Instantly.',
    titleAccentColor: '#38BDF8',
    subtitle: 'Log spends in Hindi, English, or Hinglish in 2 seconds with your voice. Zero manual typing.',
    type: 'voice',
  },
  {
    id: '2',
    badge: 'WHATSAPP SYNC',
    badgeIcon: 'logo-whatsapp',
    badgeColor: '#4ADE80',
    badgeBg: 'rgba(74, 222, 128, 0.14)',
    badgeBorder: 'rgba(74, 222, 128, 0.35)',
    titleMain: 'Your Budget,\n',
    titleAccent: 'On WhatsApp.',
    titleAccentColor: '#4ADE80',
    subtitle: 'Send a quick text or voice note on WhatsApp anytime. Budget updates automatically 24/7 without opening the app.',
    type: 'chat',
  },
  {
    id: '3',
    badge: 'SMART AI COACH',
    badgeIcon: 'sparkles',
    badgeColor: '#FDE047',
    badgeBg: 'rgba(253, 224, 71, 0.14)',
    badgeBorder: 'rgba(253, 224, 71, 0.35)',
    titleMain: 'Take Control of\n',
    titleAccent: 'Your Spending.',
    titleAccentColor: '#67E8F9',
    subtitle: 'Smart daily safe spend pace, automatic categorisation, and boosting your monthly savings effortlessly.',
    type: 'auth',
  },
];

// ── Gentle Continuous Float ──
const Float = ({ children, delay = 0, range = -6, duration = 3000 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true, delay }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, range] });
  return <Animated.View style={{ transform: [{ translateY }] }}>{children}</Animated.View>;
};

// ── Slide Visual Art (Zero Box-in-a-Box! Everything Floats Organically) ──
const SlideShowcase = ({ type }) => {
  // Slide 1: Siri / Gemini Live Style Radiant Voice Orb & Floating Translucent Pills
  if (type === 'voice') {
    return (
      <View style={styles.artArea}>
        {/* Floating Voice Prompt Pill */}
        <Float delay={0} duration={3200} range={-6}>
          <View style={styles.voicePromptGlass}>
            <View style={styles.promptDotLive} />
            <Text style={styles.promptGlassText}>"Dinner at Taj - ₹4,500"</Text>
            <Ionicons name="mic" size={14} color="#38BDF8" style={{ marginLeft: 6 }} />
          </View>
        </Float>

        {/* Central Radiant Voice Orb with Layered Glowing Halos */}
        <View style={styles.orbCenterBox}>
          <View style={styles.orbHaloOuter} />
          <View style={styles.orbHaloMiddle} />
          <Float delay={200} duration={2600} range={-7}>
            <LinearGradient
              colors={['#38BDF8', '#2563EB', '#1D4ED8', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orbCore}
            >
              <Ionicons name="mic-outline" size={42} color="#FFFFFF" />
            </LinearGradient>
          </Float>

          {/* Glowing Audio Equalizer Waveform */}
          <View style={styles.orbWaveRow}>
            {[14, 26, 42, 56, 32, 46, 22, 14].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.orbWaveBar,
                  {
                    height: h,
                    backgroundColor: i === 3 || i === 5 ? '#38BDF8' : 'rgba(147, 197, 253, 0.7)',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Floating Auto-Logged Transaction Card (Floating Directly on Canvas) */}
        <Float delay={400} duration={3400} range={6}>
          <View style={styles.receiptGlassCard}>
            <View style={styles.receiptIconBox}>
              <Ionicons name="restaurant" size={18} color="#EA580C" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.receiptItemTitle}>Dinner at Taj</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Ionicons name="checkmark-circle" size={12} color="#34D399" />
                <Text style={styles.receiptItemSub}>Food & Dining • AI Logged</Text>
              </View>
            </View>
            <Text style={styles.receiptItemAmt}>-₹4,500</Text>
          </View>
        </Float>
      </View>
    );
  }

  // Slide 2: WhatsApp Chat Experience Floating Directly on Canvas
  if (type === 'chat') {
    return (
      <View style={styles.artArea}>
        {/* Floating WhatsApp 3D Avatar Header */}
        <Float delay={0} duration={3000} range={-4}>
          <View style={styles.waHeaderGlass}>
            <View style={styles.waAvatarCircle}>
              <Ionicons name="logo-whatsapp" size={17} color="#FFFFFF" />
            </View>
            <View style={{ marginLeft: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.waBotName}>Smart Expense Bot</Text>
                <Ionicons name="checkmark-circle" size={13} color="#25D366" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.waBotSub}>Always Active • 10X Faster</Text>
            </View>
          </View>
        </Float>

        {/* User Outgoing Message Bubble */}
        <Float delay={200} duration={3200} range={-5}>
          <View style={styles.waBubbleUser}>
            <Text style={styles.waUserText}>Spent ₹250 on coffee with Rohit ☕</Text>
            <View style={styles.waMetaRow}>
              <Text style={styles.waTimeText}>11:03 AM</Text>
              <Ionicons name="checkmark-done" size={13} color="#38BDF8" style={{ marginLeft: 3 }} />
            </View>
          </View>
        </Float>

        {/* Bot Incoming Smart Confirmation Bubble */}
        <Float delay={400} duration={3500} range={5}>
          <View style={styles.waBubbleBot}>
            <View style={styles.waBotPillRow}>
              <Ionicons name="flash" size={10} color="#10B981" />
              <Text style={styles.waBotPillText}>LOGGED IN 1.2 SECONDS</Text>
            </View>
            <Text style={styles.waBotTitle}>Added ₹250 to Food & Cafe</Text>
            
            <View style={styles.waPaceWidget}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={styles.waPaceLabel}>Daily Safe Pace</Text>
                <Text style={styles.waPaceValue}>₹1,421 left today</Text>
              </View>
              <View style={styles.waPaceTrack}>
                <View style={styles.waPaceFill} />
              </View>
            </View>
          </View>
        </Float>
      </View>
    );
  }

  // Slide 3: Titanium Smart Card with Glowing Halos
  if (type === 'auth') {
    return (
      <View style={styles.artArea}>
        {/* Soft Glowing Ambient Rings */}
        <View style={styles.cardAuraOuter} />
        <View style={styles.cardAuraInner} />

        {/* Metallic Titanium Smart Card */}
        <Float delay={0} duration={3600} range={-6}>
          <LinearGradient
            colors={['#1E293B', '#0F172A', '#020617']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.titaniumCard}
          >
            {/* Card Top Row */}
            <View style={styles.cardTopRow}>
              <View style={styles.chipGold} />
              <Ionicons name="wifi" size={18} color="rgba(255, 255, 255, 0.45)" style={{ transform: [{ rotate: '90deg' }] }} />
            </View>

            {/* Card Middle Balance */}
            <View style={{ marginVertical: 14 }}>
              <Text style={styles.cardSmallLabel}>MONTHLY SAFE RUNWAY</Text>
              <Text style={styles.cardHeroNumber}>₹19,900 <Text style={styles.cardSmallSub}>left</Text></Text>
            </View>

            {/* Card Bottom Row */}
            <View style={styles.cardBottomRow}>
              <View>
                <Text style={styles.cardHolderName}>EXPENSE COACH AI</Text>
                <Text style={styles.cardPaceTag}>● Safe Spend Pace Active</Text>
              </View>
              <View style={styles.cardAiPill}>
                <Text style={styles.cardAiText}>PRO</Text>
              </View>
            </View>
          </LinearGradient>
        </Float>

        {/* 3 Floating Feature Badges */}
        <View style={styles.featurePillsRow}>
          <View style={styles.featurePill}>
            <Ionicons name="shield-checkmark" size={12} color="#34D399" />
            <Text style={styles.featurePillText}>100% Private</Text>
          </View>
          <View style={styles.featurePill}>
            <Ionicons name="logo-whatsapp" size={12} color="#4ADE80" />
            <Text style={styles.featurePillText}>WhatsApp</Text>
          </View>
          <View style={styles.featurePill}>
            <Ionicons name="mic" size={12} color="#38BDF8" />
            <Text style={styles.featurePillText}>Voice AI</Text>
          </View>
        </View>
      </View>
    );
  }

  return null;
};

export default function WelcomeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef(null);
  const fromProfile = route?.params?.fromProfile;
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(fromProfile));

  // Dynamic safe top padding that always clears camera punch-hole on Android & iOS
  const safeTopPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 20
  ) + 12;

  // Safe bottom padding above Android gesture bar
  const safeBottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 24);

  // Smooth screen entrance
  const screenFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(screenFade, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    let isMounted = true;
    getToken().then(token => {
      if (token && isMounted) {
        setIsLoggedIn(true);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const isTourMode = Boolean(fromProfile || isLoggedIn);

  const exitTour = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('MainTabs', { screen: 'Home', params: { screen: 'DashboardMain' } });
    }
  };

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
      try {
        Haptics.selectionAsync();
      } catch (e) {}
    }
  }).current;

  const scrollToNext = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const skipToEnd = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    if (isTourMode) {
      exitTour();
    } else {
      slidesRef.current?.scrollToIndex({ index: SLIDES.length - 1 });
    }
  };

  const renderSlide = ({ item }) => {
    const isAuth = item.type === 'auth';

    return (
      <View style={styles.slide}>
        {/* Upper Half: Visual Artwork (48% of screen) */}
        <View style={styles.visualSection}>
          <SlideShowcase type={item.type} />
        </View>

        {/* Lower Half: Narrative Typography (36% of screen) */}
        <View style={styles.narrativeSection}>
          {/* Badge Pill */}
          <View
            style={[
              styles.narrativeBadge,
              {
                backgroundColor: item.badgeBg,
                borderColor: item.badgeBorder,
              },
            ]}
          >
            <Ionicons name={item.badgeIcon} size={12} color={item.badgeColor} />
            <Text style={[styles.narrativeBadgeText, { color: item.badgeColor }]}>
              {item.badge}
            </Text>
          </View>

          {/* Headline */}
          <Text style={styles.narrativeTitle}>
            {item.titleMain}
            <Text style={{ color: item.titleAccentColor, fontWeight: '900' }}>
              {item.titleAccent}
            </Text>
          </Text>

          {/* Subtitle */}
          <Text style={styles.narrativeSubtitle}>{item.subtitle}</Text>
        </View>

        {/* Slide 3 Action CTA (Full-Width High-Impact Button) */}
        {isAuth && (
          <View style={[styles.authActionArea, { paddingBottom: safeBottomPadding + 8 }]}>
            {isTourMode ? (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={exitTour}
                style={styles.heroBtnShadow}
              >
                <LinearGradient
                  colors={['#38BDF8', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.heroBtn}
                >
                  <Text style={styles.heroBtnText}>Back to App</Text>
                  <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('Register')}
                  style={styles.heroBtnShadow}
                >
                  <LinearGradient
                    colors={['#38BDF8', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.heroBtn}
                  >
                    <Text style={styles.heroBtnText}>Get Started Free</Text>
                    <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.loginRow}>
                  <Text style={styles.loginSubText}>Already have an account? </Text>
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => navigation.navigate('Login')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.loginActionText}>Login</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: screenFade }]}>
      <StatusBar style="light" />

      {/* ── Deep Sapphire & Midnight Royal Blue Backdrop ── */}
      <LinearGradient
        colors={['#060B18', '#0C1635', '#102256', '#080E22']}
        locations={[0, 0.35, 0.75, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Glowing Ambient Mesh Orbs */}
      <View style={styles.meshGlowTop} />
      <View style={styles.meshGlowBottom} />

      {/* ── Top Bar (Completely Safe from Camera Notch & Status Bar) ── */}
      <View style={[styles.topBar, { paddingTop: safeTopPadding }]}>
        {currentIndex < SLIDES.length - 1 ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={skipToEnd}
            style={styles.skipBtn}
          >
            <Text style={styles.skipBtnText}>
              {isTourMode ? 'Close' : 'Skip'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}

        {/* Slide Counter Badge (1 / 3) */}
        <View style={styles.slideCounterBadge}>
          <Text style={styles.slideCounterText}>
            {currentIndex + 1} / {SLIDES.length}
          </Text>
        </View>
      </View>

      {/* ── Slides ── */}
      <FlatList
        data={SLIDES}
        ref={slidesRef}
        renderItem={renderSlide}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      {/* ── Bottom Controls (Slides 1 & 2) ── */}
      {currentIndex < SLIDES.length - 1 && (
        <View style={[styles.bottomControls, { bottom: safeBottomPadding + 8 }]}>
          {/* Smooth Pagination Pills */}
          <View style={styles.pillsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.paginationPill,
                  i === currentIndex
                    ? styles.paginationPillActive
                    : styles.paginationPillInactive,
                ]}
              />
            ))}
          </View>

          {/* Electric Blue Next Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={scrollToNext}
            style={styles.nextBtnGlow}
          >
            <LinearGradient
              colors={['#38BDF8', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextBtnCircle}
            >
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060B18',
  },

  // Glowing Ambient Background Orbs
  meshGlowTop: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
  },
  meshGlowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -70,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(99, 102, 241, 0.24)',
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 8,
    zIndex: 50,
  },
  skipBtn: {
    paddingHorizontal: 15,
    paddingVertical: 6.5,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  slideCounterBadge: {
    paddingHorizontal: 13,
    paddingVertical: 5.5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  slideCounterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },

  // Slide Layout (Golden Ratio Division)
  slide: {
    width,
    height: '100%',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  visualSection: {
    flex: 1.15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  narrativeSection: {
    flex: 0.85,
    justifyContent: 'flex-start',
    paddingTop: 10,
    paddingBottom: 85,
  },

  narrativeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  narrativeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  narrativeTitle: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  narrativeSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#94A3B8',
  },

  artArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Slide 1: Voice AI Floating Elements (No Outer White Box!) ──
  voicePromptGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    marginBottom: 16,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  promptDotLive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
    marginRight: 8,
  },
  promptGlassText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#F1F5F9',
    fontStyle: 'italic',
  },
  orbCenterBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 130,
    position: 'relative',
    marginVertical: 4,
  },
  orbHaloOuter: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
  },
  orbHaloMiddle: {
    position: 'absolute',
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: 'rgba(37, 99, 235, 0.28)',
  },
  orbCore: {
    width: 78,
    height: 78,
    borderRadius: 39,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  orbWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  orbWaveBar: {
    width: 4,
    borderRadius: 2,
  },
  receiptGlassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    width: '95%',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  receiptIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  receiptItemSub: {
    fontSize: 11.5,
    color: '#34D399',
    fontWeight: '600',
    marginLeft: 3,
  },
  receiptItemAmt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F87171',
  },

  // ── Slide 2: WhatsApp Floating Elements (No Outer White Box!) ──
  waHeaderGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    marginBottom: 14,
  },
  waAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waBotName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  waBotSub: {
    fontSize: 10.5,
    color: '#4ADE80',
    fontWeight: '600',
  },
  waBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#064E3B',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    maxWidth: '85%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  waUserText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#ECFDF5',
  },
  waMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  waTimeText: {
    fontSize: 10,
    color: '#6EE7B7',
  },
  waBubbleBot: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    width: '92%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  waBotPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  waBotPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  waBotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  waPaceWidget: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  waPaceLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  waPaceValue: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '700',
  },
  waPaceTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  waPaceFill: {
    height: '100%',
    width: '38%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },

  // ── Slide 3: Titanium Card & Welcome Elements ──
  cardAuraOuter: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
  cardAuraInner: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(37, 99, 235, 0.24)',
  },
  titaniumCard: {
    width: width * 0.84,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipGold: {
    width: 32,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
  },
  cardSmallLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  cardHeroNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardSmallSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34D399',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
  },
  cardHolderName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  cardPaceTag: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '700',
    marginTop: 2,
  },
  cardAiPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  cardAiText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#38BDF8',
  },
  featurePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Slide 3 Action Area
  authActionArea: {
    width: '100%',
    paddingHorizontal: 8,
  },
  heroBtnShadow: {
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
    marginBottom: 14,
  },
  heroBtn: {
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heroBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  loginSubText: {
    fontSize: 14.5,
    color: '#94A3B8',
  },
  loginActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#38BDF8',
  },

  // Bottom Controls (Slides 1 & 2)
  bottomControls: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 40,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paginationPill: {
    height: 6,
    borderRadius: 3,
  },
  paginationPillActive: {
    width: 26,
    backgroundColor: '#38BDF8',
  },
  paginationPillInactive: {
    width: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  nextBtnGlow: {
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextBtnCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
