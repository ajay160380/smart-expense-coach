/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — BOLD ELECTRIC BLUE ONBOARDING (APPLE / CASH APP STYLE)
 * High-contrast electric blue gradient, floating white glass cards,
 * bold modern typography, zero overlaps, and safe status bar insets.
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
    badge: 'AI VOICE LOGGING',
    badgeIcon: 'mic',
    badgeAccent: '#67E8F9',
    titlePrefix: 'Track Expenses\n',
    titleNormal: 'With Just Your ',
    titleAccent: 'Voice',
    titleAccentColor: '#38BDF8',
    subtitle: 'Speak naturally in Hindi, English, or Hinglish. AI understands, categorizes, and logs your spend in 2 seconds.',
    type: 'voice',
  },
  {
    id: '2',
    badge: 'WHATSAPP SYNC',
    badgeIcon: 'logo-whatsapp',
    badgeAccent: '#4ADE80',
    titlePrefix: 'Chat on ',
    titleAccent: 'WhatsApp',
    titleAccentColor: '#4ADE80',
    titleNormal: '\nTo Log On The Go',
    subtitle: 'No need to open the app. Send a quick text or voice note on WhatsApp anytime to keep your budget updated.',
    type: 'chat',
  },
  {
    id: '3',
    badge: 'SMART EXPENSE COACH',
    badgeIcon: 'sparkles',
    badgeAccent: '#FDE047',
    titlePrefix: 'Welcome to\n',
    titleAccent: 'Expense Tracker',
    titleAccentColor: '#67E8F9',
    titleNormal: '',
    subtitle: 'Take full control of your money. Effortless AI logging, daily safe spend pace, and boost your savings today.',
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

// ── Slide Visual Art Showcases (Floating White Glass Cards) ──
const SlideShowcase = ({ type }) => {
  if (type === 'voice') {
    return (
      <View style={styles.glassCard}>
        {/* Top Header inside Card */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>AI Voice Engine</Text>
          </View>
          <View style={styles.langChip}>
            <Text style={styles.langChipText}>Hinglish / Hindi / English</Text>
          </View>
        </View>

        {/* User Spoken Transcript Bubble */}
        <Float delay={0} duration={3200} range={-4}>
          <View style={styles.transcriptBubble}>
            <Ionicons name="chatbubble-ellipses" size={15} color="#2563EB" />
            <Text style={styles.transcriptText}>
              "Paid ₹4,500 for dinner at Taj"
            </Text>
          </View>
        </Float>

        {/* Pulsing Mic Hub */}
        <View style={styles.micHubBox}>
          <View style={styles.micRingOuter} />
          <View style={styles.micRingInner} />
          <Float delay={200} duration={2600} range={-5}>
            <LinearGradient
              colors={['#38BDF8', '#2563EB', '#1D4ED8']}
              style={styles.micButton}
            >
              <Ionicons name="mic" size={32} color="#FFF" />
            </LinearGradient>
          </Float>
          {/* Animated Waveform */}
          <View style={styles.waveformRow}>
            {[14, 26, 40, 24, 38, 20, 12].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: h,
                    backgroundColor: i === 2 || i === 4 ? '#2563EB' : '#93C5FD',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Generated Receipt Card */}
        <Float delay={400} duration={3400} range={4}>
          <View style={styles.receiptCard}>
            <View style={styles.receiptIconCircle}>
              <Ionicons name="restaurant" size={17} color="#EA580C" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.receiptTitle}>Dinner at Taj</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                <Text style={styles.receiptSub}>Food & Dining • Auto-Logged</Text>
              </View>
            </View>
            <Text style={styles.receiptAmount}>-₹4,500</Text>
          </View>
        </Float>
      </View>
    );
  }

  if (type === 'chat') {
    return (
      <View style={[styles.glassCard, { borderColor: 'rgba(74, 222, 128, 0.4)' }]}>
        {/* WhatsApp Header */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.waAvatar}>
            <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 9 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.waBotName}>Smart Expense Bot</Text>
              <Ionicons name="checkmark-circle" size={13} color="#25D366" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.waSubTitle}>Instant 3-Sec Logging • Always Active</Text>
          </View>
        </View>

        {/* User Outgoing Bubble */}
        <Float delay={0} duration={3200} range={-4}>
          <View style={styles.waBubbleUser}>
            <Text style={styles.waUserText}>Spent ₹250 on coffee ☕</Text>
            <View style={styles.waMetaRow}>
              <Text style={styles.waTimeText}>11:03 AM</Text>
              <Ionicons name="checkmark-done" size={13} color="#38BDF8" style={{ marginLeft: 3 }} />
            </View>
          </View>
        </Float>

        {/* Bot Incoming Confirmation Bubble */}
        <Float delay={300} duration={3500} range={4}>
          <View style={styles.waBubbleBot}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Ionicons name="sparkles" size={13} color="#16A34A" />
              <Text style={styles.waBotTag}>LOGGED SUCCESSFULLY</Text>
            </View>
            <Text style={styles.waBotTitle}>Added ₹250 to Cafe & Drinks</Text>
            
            <View style={styles.waBudgetCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={styles.waBudgetLabel}>Daily Spend Pace</Text>
                <Text style={styles.waBudgetAmount}>₹1,421 safe left today</Text>
              </View>
              <View style={styles.waProgressTrack}>
                <View style={styles.waProgressFill} />
              </View>
            </View>
          </View>
        </Float>

        <View style={styles.waFooterNote}>
          <Ionicons name="flash" size={12} color="#16A34A" />
          <Text style={styles.waFooterNoteText}>Works with quick text or voice notes</Text>
        </View>
      </View>
    );
  }

  if (type === 'auth') {
    return (
      <View style={styles.authHeroBox}>
        {/* Soft Glowing Halos */}
        <View style={styles.authHaloOuter} />
        <View style={styles.authHaloInner} />

        {/* Central Logo */}
        <Float delay={0} duration={3600} range={-6}>
          <View style={styles.authLogoShadow}>
            <Logo size={1.05} circle={true} showText={false} />
          </View>
        </Float>

        {/* 3 Frosted Feature Badges */}
        <View style={styles.authBadgesRow}>
          <View style={styles.authBadgePill}>
            <Ionicons name="shield-checkmark" size={12} color="#34D399" />
            <Text style={styles.authBadgeText}>100% Private</Text>
          </View>
          <View style={styles.authBadgePill}>
            <Ionicons name="logo-whatsapp" size={12} color="#4ADE80" />
            <Text style={styles.authBadgeText}>WhatsApp AI</Text>
          </View>
          <View style={styles.authBadgePill}>
            <Ionicons name="flash" size={12} color="#FBBF24" />
            <Text style={styles.authBadgeText}>Zero Effort</Text>
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
          {/* Badge Pill */}
          <View style={styles.slideBadge}>
            <Ionicons name={item.badgeIcon} size={12} color={item.badgeAccent} />
            <Text style={[styles.slideBadgeText, { color: item.badgeAccent }]}>
              {item.badge}
            </Text>
          </View>

          {/* Title with crisp high contrast */}
          <Text style={styles.slideTitle}>
            {item.titlePrefix}
            <Text style={{ fontWeight: '400', color: '#FFFFFF' }}>
              {item.titleNormal}
            </Text>
            <Text style={{ fontWeight: '900', color: item.titleAccentColor }}>
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

        {/* Slide 3 Action Area (Apple / Cash App Hero Button) */}
        {isAuth && (
          <View style={[styles.authActionArea, { paddingBottom: safeBottomPadding + 10 }]}>
            {isTourMode ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={exitTour}
                style={styles.heroButtonShadow}
              >
                <View style={styles.heroButtonWhite}>
                  <Text style={styles.heroButtonText}>Back to App</Text>
                  <Ionicons name="arrow-forward" size={19} color="#1E40AF" />
                </View>
              </TouchableOpacity>
            ) : (
              <>
                {/* Crisp White High-Contrast Hero Button */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('Register')}
                  style={styles.heroButtonShadow}
                >
                  <View style={styles.heroButtonWhite}>
                    <Text style={styles.heroButtonText}>Get Started Free</Text>
                    <Ionicons name="arrow-forward" size={19} color="#1E40AF" />
                  </View>
                </TouchableOpacity>

                {/* Login Link with High Contrast */}
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
      {/* Light status bar for bold electric blue background */}
      <StatusBar style="light" />

      {/* ── Bold Electric Blue Gradient Canvas ── */}
      <LinearGradient
        colors={['#0F255A', '#1E40AF', '#1D4ED8', '#2563EB']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient Electric Cyan Glows for Visual Depth */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      {/* ── Top Navigation Bar (Always completely below camera punch-hole & status bar) ── */}
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

        {/* High-Contrast Slide Counter Badge (1 / 3) */}
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
          {/* High-Contrast Pagination Dots */}
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

          {/* Crisp White Next Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={scrollToNext}
            style={styles.nextBtnShadow}
          >
            <View style={styles.nextBtnCircle}>
              <Ionicons name="arrow-forward" size={20} color="#1E40AF" />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F255A',
  },

  // Ambient Cyan/Indigo Glows for Electric Depth
  ambientGlowTop: {
    position: 'absolute',
    top: -80,
    right: -50,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(99, 102, 241, 0.24)',
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
    paddingHorizontal: 15,
    paddingVertical: 6.5,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  skipPillText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  counterBadge: {
    paddingHorizontal: 13,
    paddingVertical: 5.5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  counterBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#67E8F9',
    letterSpacing: 0.5,
  },

  // ── Slide Layout ──
  slide: {
    width,
    height: '100%',
    paddingHorizontal: 24,
  },
  slideHeader: {
    paddingTop: 10,
    paddingBottom: 14,
  },
  slideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  slideBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  slideTitle: {
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  slideSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#E0E7FF',
  },

  slideBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 85,
  },

  // ── Floating White Glass Cards ──
  glassCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },

  // Voice Card Elements
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  liveIndicator: {
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
  liveLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  langChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  langChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  transcriptBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  transcriptText: {
    fontSize: 13.5,
    fontStyle: 'italic',
    color: '#0F172A',
    fontWeight: '600',
  },
  micHubBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 108,
    position: 'relative',
    marginVertical: 4,
  },
  micRingOuter: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  micRingInner: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
  },
  micButton: {
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
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
  },
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
  },
  receiptIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  receiptSub: {
    fontSize: 11.5,
    color: '#16A34A',
    fontWeight: '600',
    marginLeft: 3,
  },
  receiptAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },

  // WhatsApp Card Elements
  waAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waBotName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  waSubTitle: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
  waBubbleUser: {
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
  waUserText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#065F46',
  },
  waMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  waTimeText: {
    fontSize: 10,
    color: '#059669',
  },
  waBubbleBot: {
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
  waBotTag: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#16A34A',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  waBotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  waBudgetCard: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  waBudgetLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  waBudgetAmount: {
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
  waFooterNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
  },
  waFooterNoteText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#16A34A',
  },

  // Auth Final Slide Art Elements
  authHeroBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  authHaloOuter: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  authHaloInner: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  authLogoShadow: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  authBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  authBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  authBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Apple / Cash App High-Contrast Hero Action Area
  authActionArea: {
    width: '100%',
    paddingHorizontal: 8,
  },
  heroButtonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 14,
  },
  heroButtonWhite: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  heroButtonText: {
    color: '#1E40AF',
    fontSize: 17,
    fontWeight: '800',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  loginSubText: {
    fontSize: 14.5,
    color: '#E0E7FF',
  },
  loginActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#67E8F9',
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
    width: 26,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  nextBtnShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  nextBtnCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
