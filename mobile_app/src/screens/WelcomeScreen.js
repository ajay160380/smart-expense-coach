/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — REALISTIC SMARTPHONE MOCKUP ONBOARDING
 * (Apple Keynote / Linear / Cash App Live Preview Style)
 * Realistic sleek iPhone frame with Dynamic Island, live WhatsApp &
 * Voice interactions, centered pagination, and full-width CTA.
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

// Responsive phone mockup dimensions
const PHONE_WIDTH = Math.min(width * 0.68, 260);
const PHONE_HEIGHT = PHONE_WIDTH * 1.82; // ~370px to 420px

const SLIDES = [
  {
    id: '1',
    badge: 'AI VOICE ENGINE',
    badgeIcon: 'mic',
    badgeColor: '#38BDF8',
    title: 'Track Expenses With Just Your Voice',
    subtitle: 'Speak in Hindi, English, or Hinglish. AI logs and categorizes every rupee in 2 seconds.',
    type: 'voice',
  },
  {
    id: '2',
    badge: 'WHATSAPP SYNC',
    badgeIcon: 'logo-whatsapp',
    badgeColor: '#4ADE80',
    title: 'Log Spends Directly on WhatsApp',
    subtitle: 'Send a quick text or voice note on WhatsApp anytime. Budget syncs automatically 24/7.',
    type: 'chat',
  },
  {
    id: '3',
    badge: 'SMART WEALTH COACH',
    badgeIcon: 'sparkles',
    badgeColor: '#FDE047',
    title: 'Master Your Money Effortlessly',
    subtitle: 'Track daily runway, stay safely within your limit, and boost your monthly savings by 30%.',
    type: 'dashboard',
  },
];

// ── Gentle Float ──
const Float = ({ children, delay = 0, range = -5, duration = 3000 }) => {
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

// ── Realistic Smartphone Screen Contents ──
const PhoneScreenContent = ({ type }) => {
  // ── Slide 1 Screen: Live Voice AI Mode ──
  if (type === 'voice') {
    return (
      <LinearGradient
        colors={['#0F1E3D', '#091124', '#050A17']}
        style={styles.phoneInnerScreen}
      >
        {/* Dynamic Island Notch */}
        <View style={styles.dynamicIsland}>
          <View style={styles.dynamicCam} />
          <View style={styles.dynamicMicDot} />
        </View>

        {/* Mini Status Bar */}
        <View style={styles.phoneHeaderRow}>
          <Text style={styles.phoneHeaderTitle}>AI Voice Mode</Text>
          <View style={styles.liveVoiceBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveVoiceText}>Listening</Text>
          </View>
        </View>

        {/* Spoken Voice Bubble */}
        <View style={styles.phoneVoiceBubble}>
          <Ionicons name="mic" size={13} color="#38BDF8" />
          <Text style={styles.phoneVoiceText}>"Paid ₹4,500 dinner at Taj"</Text>
        </View>

        {/* Central Siri/Gemini Live Animated Orb */}
        <View style={styles.phoneOrbBox}>
          <View style={styles.phoneOrbAura} />
          <LinearGradient
            colors={['#38BDF8', '#2563EB', '#1D4ED8']}
            style={styles.phoneOrbCircle}
          >
            <Ionicons name="mic" size={24} color="#FFFFFF" />
          </LinearGradient>
          {/* Animated EQ bars */}
          <View style={styles.phoneEqRow}>
            {[10, 20, 32, 42, 26, 36, 18, 10].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.phoneEqBar,
                  {
                    height: h * 0.7,
                    backgroundColor: i === 3 || i === 5 ? '#38BDF8' : 'rgba(147, 197, 253, 0.7)',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Auto-Logged Receipt Card */}
        <View style={styles.phoneReceiptCard}>
          <View style={styles.phoneReceiptIcon}>
            <Ionicons name="restaurant" size={14} color="#EA580C" />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.phoneReceiptTitle}>Dinner at Taj</Text>
            <Text style={styles.phoneReceiptCategory}>Food & Dining • AI Logged ✓</Text>
          </View>
          <Text style={styles.phoneReceiptAmt}>-₹4,500</Text>
        </View>

        {/* Home Indicator Bar */}
        <View style={styles.phoneHomeBar} />
      </LinearGradient>
    );
  }

  // ── Slide 2 Screen: Real WhatsApp Chat ──
  if (type === 'chat') {
    return (
      <View style={[styles.phoneInnerScreen, { backgroundColor: '#0B141B' }]}>
        {/* Dynamic Island Notch */}
        <View style={styles.dynamicIsland}>
          <View style={styles.dynamicCam} />
        </View>

        {/* WhatsApp Top Green Bar */}
        <View style={styles.phoneWaBar}>
          <View style={styles.phoneWaAvatar}>
            <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.phoneWaName}>Expense Bot</Text>
              <Ionicons name="checkmark-circle" size={11} color="#25D366" style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.phoneWaStatus}>online</Text>
          </View>
        </View>

        {/* Chat Area */}
        <View style={styles.phoneWaChatArea}>
          {/* Outgoing User Message */}
          <View style={styles.phoneWaMsgUser}>
            <Text style={styles.phoneWaTextUser}>Spent ₹250 on coffee ☕</Text>
            <View style={styles.phoneWaMeta}>
              <Text style={styles.phoneWaTime}>11:03 AM</Text>
              <Ionicons name="checkmark-done" size={11} color="#38BDF8" style={{ marginLeft: 2 }} />
            </View>
          </View>

          {/* Incoming Bot Message */}
          <View style={styles.phoneWaMsgBot}>
            <View style={styles.phoneWaBotTagRow}>
              <Ionicons name="sparkles" size={9} color="#10B981" />
              <Text style={styles.phoneWaBotTag}>LOGGED IN 1.2s</Text>
            </View>
            <Text style={styles.phoneWaBotMain}>Added ₹250 to Food & Cafe</Text>
            
            <View style={styles.phoneWaPaceBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={styles.phoneWaPaceLabel}>Daily Safe Left</Text>
                <Text style={styles.phoneWaPaceAmt}>₹1,421</Text>
              </View>
              <View style={styles.phoneWaPaceTrack}>
                <View style={styles.phoneWaPaceFill} />
              </View>
            </View>
          </View>

          {/* Voice note indicator */}
          <View style={styles.phoneWaVoiceHint}>
            <Ionicons name="mic" size={11} color="#25D366" />
            <Text style={styles.phoneWaVoiceHintText}>Supports text & voice notes</Text>
          </View>
        </View>

        {/* Home Indicator Bar */}
        <View style={styles.phoneHomeBar} />
      </View>
    );
  }

  // ── Slide 3 Screen: Live App Dashboard ──
  return (
    <LinearGradient
      colors={['#0F1E3D', '#0B152B', '#070E1F']}
      style={styles.phoneInnerScreen}
    >
      {/* Dynamic Island Notch */}
      <View style={styles.dynamicIsland}>
        <View style={styles.dynamicCam} />
      </View>

      {/* Mini App Header */}
      <View style={styles.phoneDashHeader}>
        <View style={styles.phoneDashUserCircle}>
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>A</Text>
        </View>
        <Text style={styles.phoneDashDate}>November 2026</Text>
        <Ionicons name="notifications-outline" size={15} color="#94A3B8" />
      </View>

      {/* Total Spent Hero Card inside Mockup */}
      <LinearGradient
        colors={['#1E40AF', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.phoneDashHeroCard}
      >
        <Text style={styles.phoneDashHeroSub}>Total Spent</Text>
        <Text style={styles.phoneDashHeroAmt}>₹100<Text style={{ fontSize: 13, opacity: 0.8 }}>.00</Text></Text>
        
        <View style={styles.phoneDashPillRow}>
          <Text style={styles.phoneDashPillText}>Remaining: ₹19,900</Text>
          <View style={styles.phoneDashPillTag}>
            <Text style={styles.phoneDashPillTagText}>Limit: ₹20k</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Runway Widget */}
      <View style={styles.phoneDashRunwayBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.phoneDashSpeedIcon}>
            <Ionicons name="speedometer" size={12} color="#F59E0B" />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.phoneDashRunwayTitle}>Burn Rate & Runway</Text>
            <Text style={styles.phoneDashRunwaySub}>Safe Pace Active 🔥</Text>
          </View>
          <Text style={styles.phoneDashRunwayAmt}>₹1,421/d</Text>
        </View>
      </View>

      {/* Recent Spend */}
      <View style={styles.phoneDashSpendItem}>
        <Text style={{ fontSize: 11, color: '#F1F5F9', fontWeight: '600' }}>🍔 food</Text>
        <Text style={{ fontSize: 11, color: '#F87171', fontWeight: '800' }}>-₹100</Text>
      </View>

      {/* Home Indicator Bar */}
      <View style={styles.phoneHomeBar} />
    </LinearGradient>
  );
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
  ) + 10;

  // Safe bottom padding above gesture bar
  const safeBottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 24);

  // Entrance animation
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

  const handleCta = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollToNext();
    } else {
      if (isTourMode) {
        exitTour();
      } else {
        navigation.navigate('Register');
      }
    }
  };

  const renderSlide = ({ item }) => {
    return (
      <View style={styles.slide}>
        {/* Upper 55%: Realistic Smartphone Mockup Canvas */}
        <View style={styles.phoneWrapper}>
          <Float delay={item.id === '1' ? 0 : 200} duration={3200} range={-6}>
            <View style={styles.phoneOuterBezel}>
              <PhoneScreenContent type={item.type} />
            </View>
          </Float>
        </View>

        {/* Lower 45%: Narrative Headline, Subtitle, and Value Proposition */}
        <View style={styles.bottomNarrative}>
          {/* Badge */}
          <View style={styles.slideBadge}>
            <Ionicons name={item.badgeIcon} size={11} color={item.badgeColor} />
            <Text style={[styles.slideBadgeText, { color: item.badgeColor }]}>
              {item.badge}
            </Text>
          </View>

          {/* Headline */}
          <Text style={styles.slideTitle}>{item.title}</Text>

          {/* Subtitle */}
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        </View>
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

      {/* Subtle Ambient Radial Orbs */}
      <View style={styles.ambientSphereTop} />
      <View style={styles.ambientSphereBottom} />

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
          <View style={{ width: 50 }} />
        )}

        {/* Slide Counter Badge (1 / 3) */}
        <View style={styles.counterBadge}>
          <Text style={styles.counterBadgeText}>
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

      {/* ── Bottom Controls: Centered Dots + Full-Width Modern CTA Button ── */}
      <View style={[styles.footerControls, { paddingBottom: safeBottomPadding + 8 }]}>
        {/* Centered Pagination Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Full-Width High-Impact Modern CTA Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleCta}
          style={styles.ctaButtonShadow}
        >
          <LinearGradient
            colors={['#38BDF8', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaButtonText}>
              {currentIndex < SLIDES.length - 1 ? 'Continue' : 'Get Started Free'}
            </Text>
            <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary Login Link (Slide 3 Only) */}
        {currentIndex === SLIDES.length - 1 && !isTourMode && (
          <View style={styles.loginLinkRow}>
            <Text style={styles.loginLinkSub}>Already have an account? </Text>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => navigation.navigate('Login')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.loginLinkAction}>Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060B18',
  },

  // Ambient Lighting Orbs
  ambientSphereTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  ambientSphereBottom: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 6,
    zIndex: 50,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
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
  counterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  counterBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },

  // Slide Layout (Golden Ratio)
  slide: {
    width,
    height: '100%',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  phoneWrapper: {
    flex: 1.15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },

  // ── Realistic Smartphone Metallic Frame ──
  phoneOuterBezel: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    borderRadius: 34,
    backgroundColor: '#020617',
    borderWidth: 5,
    borderColor: '#1E293B',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 26,
    elevation: 16,
    overflow: 'hidden',
  },
  phoneInnerScreen: {
    flex: 1,
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    justifyContent: 'space-between',
  },

  // Dynamic Island Notch
  dynamicIsland: {
    width: 66,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#000000',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 8,
    marginTop: 2,
    marginBottom: 8,
  },
  dynamicCam: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
  },
  dynamicMicDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22C55E',
    marginLeft: 6,
  },

  // Phone Bottom Home Indicator
  phoneHomeBar: {
    width: 70,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    alignSelf: 'center',
    marginTop: 6,
  },

  // ── Slide 1 Screen Details ──
  phoneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  liveVoiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22C55E',
  },
  liveVoiceText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#22C55E',
  },
  phoneVoiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginVertical: 4,
  },
  phoneVoiceText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#F1F5F9',
    fontStyle: 'italic',
  },
  phoneOrbBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 90,
    position: 'relative',
  },
  phoneOrbAura: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
  },
  phoneOrbCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  phoneEqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 8,
  },
  phoneEqBar: {
    width: 3,
    borderRadius: 1.5,
  },
  phoneReceiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  phoneReceiptIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneReceiptTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  phoneReceiptCategory: {
    fontSize: 9,
    color: '#34D399',
    fontWeight: '600',
    marginTop: 1,
  },
  phoneReceiptAmt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F87171',
  },

  // ── Slide 2 Screen Details (WhatsApp) ──
  phoneWaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  phoneWaAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneWaName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  phoneWaStatus: {
    fontSize: 8.5,
    color: '#25D366',
  },
  phoneWaChatArea: {
    flex: 1,
    justifyContent: 'space-around',
    paddingVertical: 6,
  },
  phoneWaMsgUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#005C4B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderBottomRightRadius: 2,
    maxWidth: '90%',
  },
  phoneWaTextUser: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#E9EDEF',
  },
  phoneWaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  phoneWaTime: {
    fontSize: 8,
    color: '#8696A0',
  },
  phoneWaMsgBot: {
    alignSelf: 'flex-start',
    backgroundColor: '#1F2C34',
    padding: 9,
    borderRadius: 10,
    borderBottomLeftRadius: 2,
    width: '95%',
  },
  phoneWaBotTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 3,
  },
  phoneWaBotTag: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#25D366',
    letterSpacing: 0.4,
  },
  phoneWaBotMain: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  phoneWaPaceBox: {
    backgroundColor: 'rgba(11, 20, 27, 0.7)',
    padding: 6,
    borderRadius: 7,
  },
  phoneWaPaceLabel: {
    fontSize: 8.5,
    color: '#8696A0',
  },
  phoneWaPaceAmt: {
    fontSize: 9,
    color: '#25D366',
    fontWeight: '700',
  },
  phoneWaPaceTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  phoneWaPaceFill: {
    height: '100%',
    width: '42%',
    backgroundColor: '#25D366',
    borderRadius: 1.5,
  },
  phoneWaVoiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  phoneWaVoiceHintText: {
    fontSize: 9,
    color: '#25D366',
    fontWeight: '600',
  },

  // ── Slide 3 Screen Details (Dashboard) ──
  phoneDashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  phoneDashUserCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneDashDate: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  phoneDashHeroCard: {
    borderRadius: 12,
    padding: 10,
    marginVertical: 4,
  },
  phoneDashHeroSub: {
    fontSize: 8.5,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  phoneDashHeroAmt: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  phoneDashPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  phoneDashPillText: {
    fontSize: 8.5,
    color: '#E0E7FF',
    fontWeight: '600',
  },
  phoneDashPillTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  phoneDashPillTagText: {
    fontSize: 7.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  phoneDashRunwayBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  phoneDashSpeedIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneDashRunwayTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  phoneDashRunwaySub: {
    fontSize: 8,
    color: '#F59E0B',
    fontWeight: '600',
  },
  phoneDashRunwayAmt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
  },
  phoneDashSpendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },

  // ── Lower Narrative Typography ──
  bottomNarrative: {
    flex: 0.85,
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingBottom: 110,
  },
  slideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  slideBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  slideTitle: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    marginTop: 7,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#94A3B8',
  },

  // ── Bottom Fixed Footer (Centered Dots + Full-Width CTA) ──
  footerControls: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    zIndex: 40,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#38BDF8',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  ctaButtonShadow: {
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  loginLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  loginLinkSub: {
    fontSize: 13.5,
    color: '#94A3B8',
  },
  loginLinkAction: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38BDF8',
  },
});
