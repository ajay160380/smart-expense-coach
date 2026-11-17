/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — CINEMATIC LUXURY FINTECH ONBOARDING
 * Completely redesigned: Immersive dark sapphire canvas, 3D glowing
 * interactive showcases (Siri-style Voice Orb, Authentic WhatsApp Phone
 * mockup, Titanium Smart Card), high-contrast bold typography.
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
    badge: 'ZERO-EFFORT AI VOICE',
    badgeIcon: 'mic',
    badgeColor: '#38BDF8',
    badgeBg: 'rgba(56, 189, 248, 0.12)',
    badgeBorder: 'rgba(56, 189, 248, 0.3)',
    titleLine1: 'Just Speak.',
    titleLine2: 'Expense Logged.',
    titleAccent: 'Expense Logged.',
    subtitle: 'Speak in Hindi, English, or Hinglish. Our AI auto-categorizes every rupee in 2 seconds with zero typing.',
    type: 'voice',
  },
  {
    id: '2',
    badge: 'WHATSAPP 24/7 SYNC',
    badgeIcon: 'logo-whatsapp',
    badgeColor: '#4ADE80',
    badgeBg: 'rgba(74, 222, 128, 0.12)',
    badgeBorder: 'rgba(74, 222, 128, 0.3)',
    titleLine1: 'Your Budget,',
    titleLine2: 'On WhatsApp.',
    titleAccent: 'On WhatsApp.',
    subtitle: 'Send a quick text or voice note on WhatsApp anytime. Budget updates instantly without opening the app.',
    type: 'chat',
  },
  {
    id: '3',
    badge: 'SMART AI MONEY COACH',
    badgeIcon: 'sparkles',
    badgeColor: '#FDE047',
    badgeBg: 'rgba(253, 224, 71, 0.12)',
    badgeBorder: 'rgba(253, 224, 71, 0.3)',
    titleLine1: 'Master Your Money,',
    titleLine2: 'Effortlessly.',
    titleAccent: 'Effortlessly.',
    subtitle: 'Track spending automatically, set daily safe spend pace, and grow your monthly savings by 30%.',
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

// ── Immersive Visual Showcases ──
const SlideShowcase = ({ type }) => {
  // Slide 1: Gemini Live / Siri-Style AI Voice Orb & Floating Transcripts
  if (type === 'voice') {
    return (
      <View style={styles.showcaseCanvas}>
        {/* Floating User Voice Bubble */}
        <Float delay={0} duration={3200} range={-5}>
          <View style={styles.voicePromptPill}>
            <View style={styles.voicePromptIcon}>
              <Ionicons name="mic" size={13} color="#38BDF8" />
            </View>
            <Text style={styles.voicePromptText}>"Dinner at Taj - ₹4,500"</Text>
            <View style={styles.voicePromptPulse} />
          </View>
        </Float>

        {/* Central Siri/Gemini Live Glowing Orb */}
        <View style={styles.voiceOrbWrapper}>
          <View style={styles.voiceAuraOuter} />
          <View style={styles.voiceAuraMiddle} />
          <Float delay={200} duration={2600} range={-6}>
            <LinearGradient
              colors={['#38BDF8', '#2563EB', '#1D4ED8', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.voiceOrbCore}
            >
              <Ionicons name="mic-outline" size={38} color="#FFFFFF" />
            </LinearGradient>
          </Float>

          {/* Equalizer Waveform */}
          <View style={styles.eqRow}>
            {[12, 24, 38, 52, 28, 44, 20, 14].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.eqBar,
                  {
                    height: h,
                    backgroundColor: i === 3 || i === 5 ? '#38BDF8' : 'rgba(147, 197, 253, 0.65)',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Floating Auto-Logged Transaction Card */}
        <Float delay={400} duration={3400} range={5}>
          <View style={styles.voiceReceiptCard}>
            <View style={styles.voiceReceiptIcon}>
              <Ionicons name="restaurant" size={18} color="#F97316" />
            </View>
            <View style={{ flex: 1, marginLeft: 11 }}>
              <Text style={styles.voiceReceiptTitle}>Dinner at Taj</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Ionicons name="sparkles" size={11} color="#34D399" />
                <Text style={styles.voiceReceiptSub}>Food & Dining • AI Logged</Text>
              </View>
            </View>
            <Text style={styles.voiceReceiptAmt}>-₹4,500</Text>
          </View>
        </Float>
      </View>
    );
  }

  // Slide 2: Authentic WhatsApp Chat Glass Viewport
  if (type === 'chat') {
    return (
      <View style={styles.showcaseCanvas}>
        <View style={styles.waPhoneFrame}>
          {/* WhatsApp Header */}
          <View style={styles.waHeader}>
            <View style={styles.waAvatarBox}>
              <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.waTitle}>Smart Expense Bot</Text>
                <Ionicons name="checkmark-circle" size={13} color="#25D366" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.waStatusText}>Always Active • Instant AI Sync</Text>
            </View>
          </View>

          {/* User Outgoing WhatsApp Bubble */}
          <Float delay={0} duration={3200} range={-3}>
            <View style={styles.waUserBubble}>
              <Text style={styles.waUserMsg}>Spent ₹250 on coffee with Rohit ☕</Text>
              <View style={styles.waMeta}>
                <Text style={styles.waTime}>11:03 AM</Text>
                <Ionicons name="checkmark-done" size={13} color="#38BDF8" style={{ marginLeft: 3 }} />
              </View>
            </View>
          </Float>

          {/* Bot Incoming Smart Receipt */}
          <Float delay={300} duration={3400} range={3}>
            <View style={styles.waBotBubble}>
              <View style={styles.waBotPill}>
                <Ionicons name="flash" size={10} color="#10B981" />
                <Text style={styles.waBotPillText}>LOGGED IN 1.2s</Text>
              </View>
              <Text style={styles.waBotMain}>Added ₹250 to Food & Cafe</Text>
              
              <View style={styles.waPaceBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.waPaceLabel}>Daily Safe Pace</Text>
                  <Text style={styles.waPaceValue}>₹1,421 left today</Text>
                </View>
                <View style={styles.waPaceTrack}>
                  <View style={styles.waPaceBar} />
                </View>
              </View>
            </View>
          </Float>

          {/* WhatsApp Voice Note Preview */}
          <View style={styles.waVoiceNoteRow}>
            <Ionicons name="mic" size={13} color="#10B981" />
            <Text style={styles.waVoiceNoteText}>Voice notes on WhatsApp also supported</Text>
          </View>
        </View>
      </View>
    );
  }

  // Slide 3: Titanium Metallic Smart Card & Shield
  if (type === 'auth') {
    return (
      <View style={styles.showcaseCanvas}>
        {/* Glowing Aura Rings */}
        <View style={styles.cardAuraOuter} />
        <View style={styles.cardAuraInner} />

        {/* Central 3D Titanium Smart Card */}
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
              <Ionicons name="wifi" size={18} color="rgba(255, 255, 255, 0.4)" style={{ transform: [{ rotate: '90deg' }] }} />
            </View>

            {/* Card Middle Balance */}
            <View style={{ marginVertical: 14 }}>
              <Text style={styles.cardSmallLabel}>ACTIVE RUNWAY</Text>
              <Text style={styles.cardHeroNumber}>₹19,900 <Text style={styles.cardSmallSub}>left</Text></Text>
            </View>

            {/* Card Bottom Row */}
            <View style={styles.cardBottomRow}>
              <View>
                <Text style={styles.cardHolderName}>SMART EXPENSE COACH</Text>
                <Text style={styles.cardPaceTag}>● Safe Daily Spend Pace</Text>
              </View>
              <View style={styles.rupayPill}>
                <Text style={styles.rupayText}>AI</Text>
              </View>
            </View>
          </LinearGradient>
        </Float>

        {/* 3 Floating Feature Badges */}
        <View style={styles.featureChipsRow}>
          <View style={styles.featureChipPill}>
            <Ionicons name="shield-checkmark" size={12} color="#34D399" />
            <Text style={styles.featureChipText}>100% Private</Text>
          </View>
          <View style={styles.featureChipPill}>
            <Ionicons name="logo-whatsapp" size={12} color="#4ADE80" />
            <Text style={styles.featureChipText}>WhatsApp Bot</Text>
          </View>
          <View style={styles.featureChipPill}>
            <Ionicons name="mic" size={12} color="#38BDF8" />
            <Text style={styles.featureChipText}>Voice AI</Text>
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

  // Compute safe top padding that always clears camera punch-hole on Android & iOS
  const safeTopPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 20
  ) + 12;

  // Safe bottom padding above Android gesture bar
  const safeBottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 24);

  // Smooth entrance
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
        {/* Top Text Header */}
        <View style={styles.slideHeader}>
          {/* Sleek Brand Pill */}
          <View
            style={[
              styles.brandPill,
              {
                backgroundColor: item.badgeBg,
                borderColor: item.badgeBorder,
              },
            ]}
          >
            <Ionicons name={item.badgeIcon} size={12} color={item.badgeColor} />
            <Text style={[styles.brandPillText, { color: item.badgeColor }]}>
              {item.badge}
            </Text>
          </View>

          {/* Dramatic Headline */}
          <Text style={styles.slideTitle}>
            {item.titleLine1}{'\n'}
            <Text style={{ color: item.badgeColor, fontWeight: '900' }}>
              {item.titleLine2}
            </Text>
          </Text>

          {/* Subtitle */}
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        </View>

        {/* Center Visual Art Card */}
        <View style={styles.slideVisualArea}>
          <SlideShowcase type={item.type} />
        </View>

        {/* Slide 3 Action Area */}
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

      {/* Glowing Neon Mesh Orbs */}
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

  // Slide Layout
  slide: {
    width,
    height: '100%',
    paddingHorizontal: 24,
  },
  slideHeader: {
    paddingTop: 10,
    paddingBottom: 14,
  },
  brandPill: {
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
  brandPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  slideTitle: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  slideSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#94A3B8',
  },

  slideVisualArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 85,
  },
  showcaseCanvas: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Slide 1: Voice AI Elements ──
  voicePromptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    marginBottom: 20,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  voicePromptIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voicePromptText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#F1F5F9',
    fontStyle: 'italic',
  },
  voicePromptPulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
  },
  voiceOrbWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    position: 'relative',
    marginVertical: 6,
  },
  voiceAuraOuter: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  voiceAuraMiddle: {
    position: 'absolute',
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
  },
  voiceOrbCore: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  eqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 14,
  },
  eqBar: {
    width: 4,
    borderRadius: 2,
  },
  voiceReceiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    width: '94%',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  voiceReceiptIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceReceiptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  voiceReceiptSub: {
    fontSize: 11.5,
    color: '#34D399',
    fontWeight: '600',
    marginLeft: 3,
  },
  voiceReceiptAmt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F87171',
  },

  // ── Slide 2: WhatsApp Elements ──
  waPhoneFrame: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.28)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  waHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  waAvatarBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  waStatusText: {
    fontSize: 11,
    color: '#4ADE80',
    fontWeight: '600',
  },
  waUserBubble: {
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
  },
  waUserMsg: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#ECFDF5',
  },
  waMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  waTime: {
    fontSize: 10,
    color: '#6EE7B7',
  },
  waBotBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    maxWidth: '92%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10,
  },
  waBotPill: {
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
  waBotMain: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  waPaceBox: {
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
  waPaceBar: {
    height: '100%',
    width: '38%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  waVoiceNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 4,
  },
  waVoiceNoteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4ADE80',
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
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
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
  rupayPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  rupayText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#38BDF8',
  },
  featureChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  featureChipPill: {
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
  featureChipText: {
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
