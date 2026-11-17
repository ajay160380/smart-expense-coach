/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — PREMIUM FINTECH BLUE-THEME ONBOARDING
 * Modern, cohesive, luxury UI with zero overlaps, safe status bar insets,
 * realistic interactive showcases (Voice AI, WhatsApp, Welcome).
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

// ── Theme Colors ──
const THEME = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  textMain: '#0F172A',
  textSub: '#475569',
  border: '#DBEAFE',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
};

const SLIDES = [
  {
    id: '1',
    badge: 'AI VOICE ASSISTANT',
    badgeIcon: 'mic',
    badgeColor: '#2563EB',
    badgeBg: '#EFF6FF',
    badgeBorder: '#DBEAFE',
    titlePrefix: 'Track Expenses\n',
    titleNormal: 'With Just Your ',
    titleAccent: 'Voice',
    titleAccentColor: '#2563EB',
    subtitle: 'Speak naturally in Hindi, English, or Hinglish. AI understands, categorizes, and logs your spend in 2 seconds.',
    type: 'voice',
  },
  {
    id: '2',
    badge: 'WHATSAPP INTEGRATION',
    badgeIcon: 'logo-whatsapp',
    badgeColor: '#16A34A',
    badgeBg: '#F0FDF4',
    badgeBorder: '#BBF7D0',
    titlePrefix: 'Chat on ',
    titleAccent: 'WhatsApp',
    titleAccentColor: '#16A34A',
    titleNormal: '\nTo Log On The Go',
    subtitle: 'No need to open the app. Send a quick text or voice note on WhatsApp anytime to update your budget.',
    type: 'chat',
  },
  {
    id: '3',
    badge: 'SMART EXPENSE COACH',
    badgeIcon: 'sparkles',
    badgeColor: '#2563EB',
    badgeBg: '#EFF6FF',
    badgeBorder: '#DBEAFE',
    titlePrefix: 'Welcome to\n',
    titleAccent: 'Expense Tracker',
    titleAccentColor: '#2563EB',
    titleNormal: '',
    subtitle: 'Take control of your money. Effortless AI tracking, daily safe spend pace, and smart saving habits.',
    type: 'auth',
  },
];

// ── Gentle Floating Wrapper ──
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

// ── Slide Visual Art Showcases ──
const SlideShowcase = ({ type }) => {
  if (type === 'voice') {
    return (
      <View style={styles.showcaseCard}>
        {/* Status bar inside card */}
        <View style={styles.voiceHeaderRow}>
          <View style={styles.livePulseRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>AI Voice Mode</Text>
          </View>
          <View style={styles.langPill}>
            <Text style={styles.langPillText}>Hindi / English</Text>
          </View>
        </View>

        {/* User spoken transcript bubble */}
        <Float delay={0} duration={3200} range={-4}>
          <View style={styles.voiceTranscriptBubble}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color="#2563EB" />
            <Text style={styles.voiceTranscriptText}>
              "Paid ₹4,500 for dinner at Taj"
            </Text>
          </View>
        </Float>

        {/* Glowing Mic Hub with Concentric Rings */}
        <View style={styles.micHubWrapper}>
          <View style={styles.micRingOuter} />
          <View style={styles.micRingInner} />
          <Float delay={200} duration={2800} range={-5}>
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              style={styles.micCircle}
            >
              <Ionicons name="mic" size={32} color="#FFF" />
            </LinearGradient>
          </Float>
          {/* Waveform bars */}
          <View style={styles.waveRow}>
            {[14, 28, 42, 26, 38, 20, 12].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: h,
                    backgroundColor: i === 2 || i === 4 ? '#2563EB' : '#93C5FD',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Transaction Result Card */}
        <Float delay={400} duration={3400} range={4}>
          <View style={styles.voiceResultCard}>
            <View style={styles.resultIconBox}>
              <Ionicons name="restaurant" size={17} color="#EA580C" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.resultTitle}>Dinner at Taj</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                <Text style={styles.resultSub}>Food & Dining • Logged</Text>
              </View>
            </View>
            <Text style={styles.resultAmt}>-₹4,500</Text>
          </View>
        </Float>
      </View>
    );
  }

  if (type === 'chat') {
    return (
      <View style={[styles.showcaseCard, { borderColor: '#BBF7D0' }]}>
        {/* WhatsApp Mock Header */}
        <View style={styles.waHeaderRow}>
          <View style={styles.waAvatar}>
            <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 9 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.waName}>Smart Expense Bot</Text>
              <Ionicons name="checkmark-circle" size={13} color="#25D366" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.waStatus}>Always Active • 10X Faster</Text>
          </View>
        </View>

        {/* User Outgoing Message */}
        <Float delay={0} duration={3200} range={-4}>
          <View style={styles.waOutgoingBubble}>
            <Text style={styles.waOutgoingText}>Spent ₹250 on coffee ☕</Text>
            <View style={styles.waOutgoingMeta}>
              <Text style={styles.waTime}>11:03 AM</Text>
              <Ionicons name="checkmark-done" size={13} color="#38BDF8" style={{ marginLeft: 3 }} />
            </View>
          </View>
        </Float>

        {/* Bot Incoming Message Card */}
        <Float delay={300} duration={3500} range={4}>
          <View style={styles.waIncomingBubble}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Ionicons name="sparkles" size={13} color="#16A34A" />
              <Text style={styles.waIncomingTag}>EXPENSE RECORDED</Text>
            </View>
            <Text style={styles.waIncomingTitle}>Added ₹250 to Cafe & Drinks</Text>
            
            <View style={styles.waBudgetBar}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={styles.waBudgetText}>Daily Budget Safe</Text>
                <Text style={styles.waBudgetLeft}>₹1,421 left today</Text>
              </View>
              <View style={styles.waProgressTrack}>
                <View style={styles.waProgressFill} />
              </View>
            </View>
          </View>
        </Float>

        <View style={styles.waFooterHint}>
          <Ionicons name="flash" size={12} color="#16A34A" />
          <Text style={styles.waFooterHintText}>Works with quick text or voice notes</Text>
        </View>
      </View>
    );
  }

  if (type === 'auth') {
    return (
      <View style={styles.authHeroContainer}>
        {/* Soft glowing concentric auras */}
        <View style={styles.authHaloOuter} />
        <View style={styles.authHaloInner} />

        {/* Central Logo */}
        <Float delay={0} duration={3600} range={-6}>
          <View style={styles.authLogoWrapper}>
            <Logo size={1.05} circle={true} showText={false} />
          </View>
        </Float>

        {/* Floating Mini Badges safely outside the text area */}
        <View style={styles.authBadgesRow}>
          <View style={styles.authSideBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#10B981" />
            <Text style={styles.authSideBadgeText}>100% Private</Text>
          </View>
          <View style={[styles.authSideBadge, { borderColor: '#BBF7D0' }]}>
            <Ionicons name="logo-whatsapp" size={12} color="#25D366" />
            <Text style={styles.authSideBadgeText}>WhatsApp AI</Text>
          </View>
          <View style={[styles.authSideBadge, { borderColor: '#FED7AA' }]}>
            <Ionicons name="flash" size={12} color="#F59E0B" />
            <Text style={styles.authSideBadgeText}>Zero Effort</Text>
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

  // Calculate safe top padding that always clears notch / punch-hole camera on Android
  const safeTopPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 20
  ) + 10;

  // Safe bottom padding above gesture bar
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
          {/* Badge Pill */}
          <View
            style={[
              styles.slideBadge,
              {
                backgroundColor: item.badgeBg,
                borderColor: item.badgeBorder,
              },
            ]}
          >
            <Ionicons name={item.badgeIcon} size={12} color={item.badgeColor} />
            <Text style={[styles.slideBadgeText, { color: item.badgeColor }]}>
              {item.badge}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.slideTitle}>
            {item.titlePrefix}
            <Text style={{ fontWeight: '400', color: THEME.textMain }}>
              {item.titleNormal}
            </Text>
            <Text style={{ fontWeight: '800', color: item.titleAccentColor }}>
              {item.titleAccent}
            </Text>
          </Text>

          {/* Subtitle */}
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        </View>

        {/* Center Visual Art Card */}
        <View style={styles.slideBody}>
          <SlideShowcase type={item.type} />
        </View>

        {/* Slide 3 Action Buttons */}
        {isAuth && (
          <View style={[styles.authActionArea, { paddingBottom: safeBottomPadding + 10 }]}>
            {isTourMode ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={exitTour}
                style={styles.ctaButtonShadow}
              >
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>Back to App</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Register')}
                  style={styles.ctaButtonShadow}
                >
                  <LinearGradient
                    colors={['#2563EB', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaGradient}
                  >
                    <Text style={styles.ctaText}>Get Started Free</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.loginRow}>
                  <Text style={styles.loginSubText}>Already have account? </Text>
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
      <StatusBar style="dark" />

      {/* ── Soft Ambient Background Gradients (Fintech Blue Theme) ── */}
      <LinearGradient
        colors={['#EFF6FF', '#F8FAFC', '#E8F1FE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.ambientBlobTop} />
      <View style={styles.ambientBlobBottom} />

      {/* ── Top Navigation Bar (Always completely below status bar & camera) ── */}
      <View style={[styles.topNavRow, { paddingTop: safeTopPadding }]}>
        {currentIndex < SLIDES.length - 1 ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={skipToEnd}
            style={styles.skipPill}
          >
            <Text style={styles.skipPillText}>
              {isTourMode ? 'Close' : 'Skip'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}

        {/* Slide Counter Badge (1 / 3) */}
        <View style={styles.counterBadge}>
          <Text style={styles.counterBadgeText}>
            {currentIndex + 1} / {SLIDES.length}
          </Text>
        </View>
      </View>

      {/* ── Slide Pages ── */}
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

      {/* ── Bottom Navigation Footer (Slides 1 & 2) ── */}
      {currentIndex < SLIDES.length - 1 && (
        <View style={[styles.bottomFooter, { bottom: safeBottomPadding + 8 }]}>
          {/* Pagination Dots */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex
                    ? styles.dotActive
                    : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* Next Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={scrollToNext}
            style={styles.nextBtnShadow}
          >
            <LinearGradient
              colors={['#2563EB', '#1D4ED8']}
              style={styles.nextBtnCircle}
            >
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
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
    backgroundColor: '#EFF6FF',
  },

  // Ambient Blue Blobs for Fintech Depth
  ambientBlobTop: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#DBEAFE',
    opacity: 0.7,
  },
  ambientBlobBottom: {
    position: 'absolute',
    bottom: 60,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#E0E7FF',
    opacity: 0.6,
  },

  // ── Top Navigation Bar ──
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 8,
    zIndex: 50,
  },
  skipPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skipPillText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: THEME.textSub,
  },
  counterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  counterBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },

  // ── Slide Layout ──
  slide: {
    width,
    height: '100%',
    paddingHorizontal: 24,
  },
  slideHeader: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  slideBadge: {
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
  slideBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  slideTitle: {
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '800',
    color: THEME.textMain,
    letterSpacing: -0.6,
  },
  slideSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: THEME.textSub,
  },

  slideBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },

  // ── Showcase Card (Structured, Centered, No Screen Edge Clipping) ──
  showcaseCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },

  // Voice Card Elements
  voiceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  livePulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textSub,
  },
  langPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  voiceTranscriptBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  voiceTranscriptText: {
    fontSize: 13.5,
    fontStyle: 'italic',
    color: THEME.textMain,
    fontWeight: '600',
  },
  micHubWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 110,
    position: 'relative',
    marginVertical: 4,
  },
  micRingOuter: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(219, 234, 254, 0.4)',
  },
  micRingInner: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(191, 219, 254, 0.6)',
  },
  micCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  voiceResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 14,
  },
  resultIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: THEME.textMain,
  },
  resultSub: {
    fontSize: 11.5,
    color: '#16A34A',
    fontWeight: '600',
    marginLeft: 3,
  },
  resultAmt: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },

  // WhatsApp Card Elements
  waHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  waAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: THEME.textMain,
  },
  waStatus: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
  waOutgoingBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    maxWidth: '85%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  waOutgoingText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#065F46',
  },
  waOutgoingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  waTime: {
    fontSize: 10,
    color: '#059669',
  },
  waIncomingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    maxWidth: '92%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  waIncomingTag: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#16A34A',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  waIncomingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textMain,
    marginBottom: 8,
  },
  waBudgetBar: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  waBudgetText: {
    fontSize: 11,
    color: THEME.textSub,
    fontWeight: '600',
  },
  waBudgetLeft: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
  },
  waProgressTrack: {
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  waProgressFill: {
    height: '100%',
    width: '35%',
    backgroundColor: '#22C55E',
    borderRadius: 2.5,
  },
  waFooterHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
  },
  waFooterHintText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#16A34A',
  },

  // Auth Final Slide Art Elements
  authHeroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  authHaloOuter: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#DBEAFE',
    opacity: 0.5,
  },
  authHaloInner: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#BFDBFE',
    opacity: 0.6,
  },
  authLogoWrapper: {
    marginBottom: 20,
  },
  authBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  authSideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  authSideBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMain,
  },

  // Auth Action Area
  authActionArea: {
    width: '100%',
    paddingHorizontal: 8,
  },
  ctaButtonShadow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 14,
  },
  ctaGradient: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 16.5,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  loginSubText: {
    fontSize: 14.5,
    color: THEME.textSub,
  },
  loginActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563EB',
  },

  // ── Bottom Navigation Footer ──
  bottomFooter: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 40,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#2563EB',
  },
  dotInactive: {
    width: 7,
    backgroundColor: '#CBD5E1',
  },
  nextBtnShadow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  nextBtnCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
