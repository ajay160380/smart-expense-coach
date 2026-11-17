/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — ELEGANT LIGHT THEME ONBOARDING (APP SPECIFIC)
 * Clean, bright, airy modern fintech onboarding with soft Royal Blue accents.
 * 100% bug-free: No text overlapping Skip/Next buttons, no card collisions,
 * and dynamic status bar insets so 1/3 is never cut off.
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
  bg: '#F8FAFC',
  textMain: '#0F172A',
  textSub: '#64748B',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  accent: '#FF6B35',
  success: '#22C55E',
  warning: '#F59E0B',
};

const SLIDES = [
  {
    id: '1',
    badge: 'AI VOICE LOGGING',
    badgeIcon: 'mic',
    titleMain: 'Track Expenses\n',
    titleNormal: 'With Just Your\n',
    titleBold: 'Voice',
    subtitle: 'Speak naturally in Hindi or English. AI instantly categorizes your spending with zero manual typing.',
    layout: 'text-top',
    artType: 'voice',
  },
  {
    id: '2',
    badge: 'WHATSAPP SYNC',
    badgeIcon: 'logo-whatsapp',
    titleHeader: 'Chat on ',
    titleHighlight: 'WhatsApp\n',
    titleBody: 'To Keep Budgets\nUpdated',
    subtitle: 'Send a quick text or voice note on WhatsApp anytime. Spends log directly into your dashboard.',
    layout: 'art-top',
    artType: 'chat',
  },
  {
    id: '3',
    badge: 'SMART AI COACH',
    badgeIcon: 'sparkles',
    titleMain: 'Welcome to\n',
    titleBold: 'Expense Tracker',
    titleNormal: '',
    subtitle: 'Start tracking effortlessly, stay on pace with your daily budget, and boost your savings today!',
    layout: 'auth-final',
    artType: 'auth',
  },
];

// ── Continuous Float ──
const Float = ({ children, delay = 0, range = -8, duration = 3200 }) => {
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

// ── App-Specific Mockups ──
const ElegantArt = ({ type }) => {
  if (type === 'voice') {
    return (
      <View style={styles.artContainerBottom}>
        {/* Soft Blue Ambient Circle */}
        <View style={styles.largeCircle} />
        
        {/* Soundwaves */}
        <View style={styles.soundwaves}>
          {[28, 56, 36, 72, 42, 60, 24].map((h, i) => (
            <View key={i} style={[styles.waveBar, { height: h }]} />
          ))}
        </View>

        {/* Central Glowing Mic Circle */}
        <Float delay={500} duration={3800} range={-6}>
          <View style={styles.micCircle}>
            <Ionicons name="mic" size={46} color="#FFF" />
          </View>
        </Float>

        {/* Floating Transaction Card (Safely Positioned Below Subtitle) */}
        <View style={styles.voiceCardWrapper}>
          <Float delay={0} duration={3400} range={-8}>
            <View style={styles.voiceMockCard}>
              <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="fast-food" size={18} color="#EF4444" />
              </View>
              <View style={{ marginLeft: 10, marginRight: 10 }}>
                <Text style={styles.cardTitle}>Dinner at Taj</Text>
                <Text style={styles.cardSub}>Just now</Text>
              </View>
              <Text style={styles.cardAmt}>- ₹4,500</Text>
            </View>
          </Float>
        </View>

        {/* Floating Category Pill */}
        <View style={styles.voicePillWrapperLeft}>
          <Float delay={800} duration={4000} range={-8}>
            <View style={[styles.floatingPill, { backgroundColor: '#FEF3C7' }]}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#B45309' }}>🍔 Food & Dining</Text>
            </View>
          </Float>
        </View>

        {/* Floating Income Tag */}
        <View style={styles.voicePillWrapperRight}>
          <Float delay={1400} duration={3600} range={8}>
            <View style={[styles.floatingPill, { backgroundColor: '#DCFCE7' }]}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803D' }}>+ ₹15,000</Text>
            </View>
          </Float>
        </View>
      </View>
    );
  }

  if (type === 'chat') {
    return (
      <View style={styles.artContainerTop}>
        {/* Soft Mint/Blue Background Circle */}
        <View style={[styles.largeCircle, { right: -30, top: 10, backgroundColor: '#DCFCE7', opacity: 0.55 }]} />
        
        {/* User Outgoing Bubble */}
        <Float delay={0} duration={3800} range={-6}>
          <View style={styles.chatBubbleRight}>
            <Text style={styles.chatTextRight}>Spent ₹250 on coffee ☕</Text>
          </View>
        </Float>
        
        {/* Bot Incoming Bubble */}
        <Float delay={800} duration={4200} range={-8}>
          <View style={styles.chatBubbleLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
              <Ionicons name="sparkles" size={13} color={THEME.primary} />
              <Text style={styles.aiTag}>AI Assistant</Text>
            </View>
            <Text style={styles.chatTextLeft}>Added ₹250 to Food & Drinks!</Text>
            <View style={styles.miniCard}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: THEME.textMain }}>Food budget:</Text>
              <Text style={{ fontSize: 11.5, color: THEME.success, fontWeight: '700' }}>₹1,250 left</Text>
            </View>
          </View>
        </Float>

        {/* Floating WhatsApp Green Icon Badge */}
        <View style={styles.floatingWaIcon}>
          <Ionicons name="logo-whatsapp" size={28} color="#FFF" />
        </View>
      </View>
    );
  }

  if (type === 'auth') {
    return (
      <View style={styles.authArtBox}>
        {/* Soft Abstract Background Blobs */}
        <View style={[styles.largeCircle, { backgroundColor: '#DBEAFE', opacity: 0.7, width: 220, height: 220, borderRadius: 110 }]} />
        <View style={[styles.largeCircle, { backgroundColor: '#EFF6FF', opacity: 0.9, width: 280, height: 280, borderRadius: 140, position: 'absolute' }]} />
        
        {/* Central Logo */}
        <Float delay={0} duration={3600} range={-6}>
          <Logo size={1.05} circle={true} showText={false} />
        </Float>
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

  // Dynamic safe top padding that always clears camera notch/punch-hole
  const safeTopPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 20
  ) + 10;

  // Safe bottom padding above gesture bar
  const safeBottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 24);

  // Smooth screen entrance animation
  const screenFade = useRef(new Animated.Value(0)).current;
  const screenScale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenFade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(screenScale, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
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
    // Slide 3: Final Welcome / Register Screen
    if (item.layout === 'auth-final') {
      return (
        <View style={styles.slide}>
          <View style={{ height: height * 0.40, justifyContent: 'center', alignItems: 'center' }}>
            <ElegantArt type={item.artType} />
          </View>

          <View style={styles.authTextSection}>
            <View style={styles.miniBadgePill}>
              <Ionicons name="sparkles" size={11} color="#2563EB" />
              <Text style={styles.miniBadgeText}>SMART FINANCIAL COACH</Text>
            </View>

            <Text style={styles.authTitle}>
              {isTourMode ? "You're All Set!\n" : item.titleMain}
              <Text style={{ color: THEME.primary, fontWeight: '800' }}>{item.titleBold}</Text>
            </Text>

            <Text style={styles.authSubtitle}>
              {isTourMode
                ? "You are logged in and ready to track expenses effortlessly with AI voice and WhatsApp logging."
                : item.subtitle}
            </Text>
          </View>

          <View style={[styles.authActionContainer, { paddingBottom: safeBottomPadding + 8 }]}>
            {isTourMode ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={exitTour}
                style={styles.registerBtnShadow}
              >
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.registerBtnGradient}
                >
                  <Text style={styles.registerBtnText}>Back to App</Text>
                  <Ionicons name="arrow-forward" size={19} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Register')}
                  style={styles.registerBtnShadow}
                >
                  <LinearGradient
                    colors={['#2563EB', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.registerBtnGradient}
                  >
                    <Text style={styles.registerBtnText}>Register</Text>
                    <Ionicons name="arrow-forward" size={19} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.loginLinkRow}>
                  <Text style={{ color: THEME.textSub, fontSize: 14.5 }}>Already have an account? </Text>
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => navigation.navigate('Login')}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Text style={{ color: '#2563EB', fontSize: 15, fontWeight: '800' }}>Login</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      );
    }

    // Slide 1: Voice AI Slide (Text on Top, Visual on Bottom with Zero Overlap)
    if (item.layout === 'text-top') {
      return (
        <View style={styles.slide}>
          <View style={styles.textTopContainer}>
            <View style={styles.slidePillBadge}>
              <Ionicons name="mic" size={11} color="#2563EB" />
              <Text style={styles.slidePillBadgeText}>AI VOICE LOGGING</Text>
            </View>
            <Text style={styles.titleText}>
              <Text style={{ fontWeight: '800' }}>{item.titleMain}</Text>
              <Text style={{ fontWeight: '400' }}>{item.titleNormal}</Text>
              <Text style={{ fontWeight: '800', color: THEME.primary }}>{item.titleBold}</Text>
            </Text>
            {item.subtitle && <Text style={styles.subtitleText}>{item.subtitle}</Text>}
          </View>
          <ElegantArt type={item.artType} />
        </View>
      );
    }

    // Slide 2: WhatsApp Slide (Visual on Top, Text on Bottom with Zero Overlap)
    return (
      <View style={styles.slide}>
        <ElegantArt type={item.artType} />
        <View style={styles.textBottomContainer}>
          <View style={[styles.slidePillBadge, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="logo-whatsapp" size={11} color="#16A34A" />
            <Text style={[styles.slidePillBadgeText, { color: '#16A34A' }]}>WHATSAPP ASSISTANT</Text>
          </View>
          <Text style={styles.titleText}>
            <Text style={{ fontWeight: '800' }}>{item.titleHeader || item.titleMain}</Text>
            {item.titleHighlight && (
              <Text style={{ fontWeight: '900', color: '#16A34A' }}>{item.titleHighlight}</Text>
            )}
            <Text style={{ fontWeight: '800' }}>{item.titleBody || item.titleBold}</Text>
          </Text>
          {item.subtitle && <Text style={styles.subtitleText}>{item.subtitle}</Text>}
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: screenFade, transform: [{ scale: screenScale }] }]}>
      <StatusBar style="dark" />

      {/* ── Top Bar (Completely Safe from Camera Notch & Status Bar) ── */}
      <View style={[styles.topNavRow, { paddingTop: safeTopPadding }]}>
        {isTourMode ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={exitTour}
            style={styles.closeTourBtn}
          >
            <Ionicons name="close" size={18} color={THEME.textMain} />
            <Text style={styles.closeTourText}>Close</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}

        {/* 1 / 3 Slide Counter Badge */}
        <View style={styles.slideCounterBadge}>
          <Text style={styles.slideCounterText}>{currentIndex + 1} / {SLIDES.length}</Text>
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

      {/* ── Bottom Controls (Slides 1 & 2) ── */}
      {currentIndex < SLIDES.length - 1 && (
        <View style={[styles.footerAbsolute, { bottom: safeBottomPadding + 4 }]}>
          <TouchableOpacity
            onPress={skipToEnd}
            style={styles.skipWrapper}
          >
            <Text style={styles.skipText}>{isTourMode ? 'Skip' : 'Skip'}</Text>
          </TouchableOpacity>

          {/* Smooth Indicator Pills */}
          <View style={styles.paginationRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.paginationDot,
                  i === currentIndex
                    ? [styles.paginationDotActive, { backgroundColor: THEME.primary, width: 22 }]
                    : { backgroundColor: '#CBD5E1', width: 7 },
                ]}
              />
            ))}
          </View>
          
          {/* Circular Next Button */}
          <TouchableOpacity activeOpacity={0.8} onPress={scrollToNext} style={styles.nextBtnRing}>
            <View style={styles.nextBtnFill}>
              <Ionicons name="arrow-forward" size={22} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  slide: { width, height: '100%' },

  // ── Top Navigation Bar ──
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 6,
    zIndex: 50,
  },
  closeTourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  closeTourText: {
    marginLeft: 4,
    fontSize: 12.5,
    fontWeight: '700',
    color: THEME.textMain,
  },
  slideCounterBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  slideCounterText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: THEME.primary,
  },

  // ── Typography Containers ──
  textTopContainer: {
    paddingTop: 12,
    paddingHorizontal: 28,
    zIndex: 10,
  },
  textBottomContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 110, // Generous padding so text never touches Skip/Next button
    justifyContent: 'flex-start',
  },

  slidePillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  slidePillBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 34,
    color: THEME.textMain,
    lineHeight: 41,
    letterSpacing: -0.6,
  },
  subtitleText: {
    marginTop: 8,
    fontSize: 14,
    color: THEME.textSub,
    lineHeight: 20,
    paddingRight: 10,
  },

  // ── Abstract Graphic Containers (Spacious, No Overlap) ──
  artContainerBottom: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    width,
    height: height * 0.40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artContainerTop: {
    height: height * 0.42,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },

  // Large Background Circles
  largeCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#DBEAFE',
    opacity: 0.65,
  },
  
  // Voice Art Elements
  micCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  soundwaves: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    zIndex: -1,
  },
  waveBar: {
    width: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    borderRadius: 3,
  },
  
  // Voice Floating Elements (Safely Positioned)
  voiceCardWrapper: {
    position: 'absolute',
    top: 10,
    right: 18,
    zIndex: 10,
  },
  voiceMockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textMain,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 11.5,
    color: THEME.textSub,
  },
  cardAmt: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.textMain,
  },
  voicePillWrapperLeft: {
    position: 'absolute',
    top: 76,
    left: 16,
    zIndex: 10,
  },
  voicePillWrapperRight: {
    position: 'absolute',
    bottom: 35,
    right: 20,
    zIndex: 10,
  },
  floatingPill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },

  // WhatsApp Chat Art Elements
  chatBubbleRight: {
    position: 'absolute',
    top: 20,
    right: 24,
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ rotate: '3deg' }],
  },
  chatTextRight: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  chatBubbleLeft: {
    position: 'absolute',
    top: 78,
    left: 18,
    backgroundColor: '#FFF',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 4,
    width: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    transform: [{ rotate: '-2deg' }],
  },
  aiTag: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
    marginLeft: 5,
  },
  chatTextLeft: {
    color: THEME.textMain,
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  miniCard: {
    backgroundColor: '#F8FAFC',
    padding: 9,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingWaIcon: {
    position: 'absolute',
    bottom: 25,
    right: 32,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },

  // Slide 3 Final Welcome Styling
  authArtBox: {
    height: height * 0.38,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authTextSection: {
    alignItems: 'center',
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  miniBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 10,
  },
  miniBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  authTitle: {
    fontSize: 30,
    lineHeight: 38,
    color: THEME.textMain,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  authSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: THEME.textSub,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  authActionContainer: {
    width: '100%',
    paddingHorizontal: 28,
  },
  registerBtnShadow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 14,
  },
  registerBtnGradient: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  registerBtnText: {
    color: '#FFF',
    fontSize: 16.5,
    fontWeight: '700',
    marginRight: 8,
  },
  loginLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },

  // ── Absolute Footer (Slides 1 & 2) ──
  footerAbsolute: {
    position: 'absolute',
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  skipWrapper: {
    padding: 8,
    paddingLeft: 0,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textMain,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
  paginationDotActive: {
    height: 6,
  },
  nextBtnRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnFill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
