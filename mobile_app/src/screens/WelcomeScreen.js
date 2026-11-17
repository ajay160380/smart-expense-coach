/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — ELEGANT LIGHT THEME ONBOARDING (APP SPECIFIC)
 * Filled with relevant Finance/Chat mockups, no empty spaces,
 * beautifully tying into the app's actual features.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, ActivityIndicator, Image, StyleSheet, Dimensions, Platform, Alert, Animated, FlatList, Modal, Switch, Pressable, Keyboard, SectionList, DeviceEventEmitter, RefreshControl, Linking, LayoutAnimation, UIManager } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import Logo from '../components/Logo';
import { getToken } from '../utils/auth';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// ── Theme Colors ──
const THEME = {
  bg: '#F7F7FB', 
  textMain: '#1F2937', 
  textSub: '#6B7280', 
  primary: '#2563EB', 
  primaryLight: '#EDE9FE',
  accent: '#FF6B35',
  success: '#22C55E',
  warning: '#F59E0B'
};

const SLIDES = [
  {
    id: '1',
    titleMain: 'Track Expenses\n',
    titleNormal: 'With Just Your\n',
    titleBold: 'Voice',
    subtitle: 'Speak naturally. Our AI instantly understands and categorizes your spending. No manual entry needed.',
    layout: 'text-top',
    artType: 'voice',
  },
  {
    id: '2',
    titleHeader: 'Chat on ',
    titleHighlight: 'WhatsApp\n',
    titleBody: 'To Keep Budgets\nUpdated',
    subtitle: 'Send a quick message anytime, anywhere. We will log it directly into your Expense Tracker dashboard.',
    layout: 'art-top',
    artType: 'chat',
  },
  {
    id: '3',
    titleMain: 'Welcome to\n',
    titleBold: 'Expense Tracker',
    titleNormal: '',
    subtitle: 'Start tracking expenses seamlessly with AI and boost your savings today!',
    layout: 'auth-final',
    artType: 'auth',
  }
];

// ── Continuous Float ──
const Float = ({ children, delay = 0, range = -10, duration = 3000 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true, delay }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true })
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
        <View style={styles.largeCircle} />
        
        {/* Soundwaves */}
        <View style={styles.soundwaves}>
          {[40, 70, 40, 90, 50, 80, 30].map((h, i) => (
            <View key={i} style={[styles.waveBar, { height: h }]} />
          ))}
        </View>

        <Float delay={500} duration={4000}>
          <View style={styles.micCircle}>
            <Ionicons name="mic" size={54} color="#FFF" />
          </View>
        </Float>

        {/* Floating Transaction Card - Safely bounded inside screen */}
        <View style={styles.voiceCardWrapper}>
          <Float delay={0} duration={3500} range={-12}>
            <View style={styles.voiceMockCard}>
              <View style={[styles.iconBox, { backgroundColor: '#FCE7F3' }]}>
                <Ionicons name="fast-food" size={20} color="#EC4899" />
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
          <Float delay={1000} duration={4500} range={-10}>
            <View style={[styles.floatingPill, { backgroundColor: '#FEF3C7' }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#B45309' }}>🍔 Food & Dining</Text>
            </View>
          </Float>
        </View>

        {/* Floating Income Tag */}
        <View style={styles.voicePillWrapperRight}>
          <Float delay={1500} duration={3800} range={10}>
            <View style={[styles.floatingPill, { backgroundColor: '#D1FAE5' }]}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#047857' }}>+ ₹15,000</Text>
            </View>
          </Float>
        </View>
      </View>
    );
  }

  if (type === 'chat') {
    return (
      <View style={styles.artContainerTop}>
        {/* Abstract Background elements */}
        <View style={[styles.largeCircle, { right: -50, top: 0, backgroundColor: '#DCFCE7' }]} />
        
        {/* WhatsApp Chat Mockup */}
        <Float delay={0} duration={4000}>
          <View style={[styles.chatBubbleRight, { top: 15, right: 28, transform: [{ rotate: '4deg' }] }]}>
            <Text style={styles.chatTextRight}>Spent ₹250 on coffee ☕️</Text>
          </View>
        </Float>
        
        <Float delay={1000} duration={4500} range={-12}>
          <View style={[styles.chatBubbleLeft, { top: 75, left: 20, transform: [{ rotate: '-2deg' }] }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
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

        <View style={[styles.floatingIcon, { top: 60, right: 26, backgroundColor: '#25D366', elevation: 12 }]}>
          <Ionicons name="logo-whatsapp" size={28} color="#FFF" />
        </View>
      </View>
    );
  }

  if (type === 'analytics') {
    return (
      <View style={styles.artContainerTop}>
        <View style={[styles.largeCircle, { left: -50, top: 40, backgroundColor: '#FEF3C7' }]} />
        
        {/* Mini Dashboard Mockup */}
        <Float delay={500} duration={5000}>
          <View style={[styles.dashboardMock, { transform: [{ rotate: '-5deg' }] }]}>
            
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 12, color: THEME.textSub }}>Total Spend</Text>
                <Text style={{ fontSize: 24, fontWeight: '800', color: THEME.textMain }}>₹12,450</Text>
              </View>
              <View style={[styles.iconBox, { backgroundColor: '#EDE9FE', borderRadius: 20 }]}>
                <Ionicons name="pie-chart" size={20} color={THEME.primary} />
              </View>
            </View>

            {/* Bars */}
            <View style={styles.chartBars}>
              {[0.4, 0.7, 0.5, 1.0, 0.6, 0.3].map((h, i) => (
                <View key={i} style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${h * 100}%`, backgroundColor: i === 3 ? THEME.primary : '#E5E7EB' }]} />
                </View>
              ))}
            </View>

          </View>
        </Float>

        <Float delay={0} duration={4000} range={-12}>
          <View style={[styles.mockCard, { bottom: 40, right: 0, padding: 12, width: 220 }]}>
             <View style={[styles.iconBox, { backgroundColor: '#FEF3C7', width: 32, height: 32 }]}>
              <Ionicons name="warning" size={16} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.textMain }}>Shopping limit hit</Text>
            </View>
          </View>
        </Float>

      </View>
    );
  }
  
  if (type === 'auth') {
    return (
      <View style={styles.authArtBox}>
        {/* Soft glowing ambient rings */}
        <View style={styles.authAuraOuter} />
        <View style={styles.authAuraInner} />
        
        {/* Central Logo */}
        <Float delay={0} duration={3800} range={-6}>
          <Logo size={1.05} circle={true} showText={false} />
        </Float>

        {/* Floating Mini Badges */}
        <Float delay={200} duration={3200} range={-5}>
          <View style={styles.authBadgeTopLeft}>
            <Ionicons name="shield-checkmark" size={13} color="#10B981" />
            <Text style={styles.authMiniBadgeText}>100% Private</Text>
          </View>
        </Float>

        <Float delay={400} duration={3500} range={6}>
          <View style={styles.authBadgeTopRight}>
            <Ionicons name="flash" size={13} color="#F59E0B" />
            <Text style={styles.authMiniBadgeText}>Zero Effort</Text>
          </View>
        </Float>

        <Float delay={600} duration={4000} range={-6}>
          <View style={styles.authBadgeBottomRight}>
            <Ionicons name="logo-whatsapp" size={13} color="#22C55E" />
            <Text style={styles.authMiniBadgeText}>WhatsApp AI</Text>
          </View>
        </Float>
      </View>
    );
  }
  
  return null;
};

export default function WelcomeScreen({ navigation, route }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef(null);
  const fromProfile = route?.params?.fromProfile;
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(fromProfile));

  // Smooth screen entrance animation
  const screenFade = useRef(new Animated.Value(0)).current;
  const screenScale = useRef(new Animated.Value(0.96)).current;

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
    if (viewableItems[0]) {
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

  const renderSlide = ({ item }) => {
    if (item.layout === 'auth-final') {
      return (
        <View style={[styles.slide, styles.authFinalSlide]}>
          <View style={{ marginBottom: 12 }}>
            <ElegantArt type={item.artType} />
          </View>

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={styles.heroPillBadge}>
              <Ionicons name="sparkles" size={12} color="#2563EB" />
              <Text style={styles.heroPillBadgeText}>SMART EXPENSE COACH</Text>
            </View>

            <Text style={styles.authTitleText}>
              {isTourMode ? "You're All Set!\n" : item.titleMain}
              <Text style={{ color: '#2563EB', fontWeight: '800' }}>{item.titleBold}</Text>
            </Text>
            
            <Text style={styles.authSubtitleText}>
              {isTourMode
                ? "You are logged in and ready to track your expenses effortlessly with AI voice and WhatsApp logging."
                : "Track expenses in seconds via Voice & WhatsApp, set smart budgets, and boost your savings effortlessly."}
            </Text>

            {!isTourMode && (
              <View style={styles.featureHighlightsRow}>
                <View style={styles.featureChip}>
                  <Ionicons name="mic" size={11} color="#6366F1" />
                  <Text style={styles.featureChipText}>Voice AI</Text>
                </View>
                <View style={styles.featureChip}>
                  <Ionicons name="logo-whatsapp" size={11} color="#16A34A" />
                  <Text style={styles.featureChipText}>WhatsApp</Text>
                </View>
                <View style={styles.featureChip}>
                  <Ionicons name="shield-checkmark" size={11} color="#10B981" />
                  <Text style={styles.featureChipText}>100% Private</Text>
                </View>
              </View>
            )}
          </View>

          <View style={{ width: '100%', paddingHorizontal: 32 }}>
            {isTourMode ? (
              <>
                {/* Back to App Primary Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={exitTour}
                  style={styles.tourBackBtnShadow}
                >
                  <LinearGradient
                    colors={['#2563EB', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtnGradient}
                  >
                    <Text style={styles.primaryBtnText}>Back to App</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>

                {/* Dashboard Direct Link */}
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (e) {}
                      navigation.replace('MainTabs', { screen: 'Home', params: { screen: 'DashboardMain' } });
                    }}
                  >
                    <Text style={{ color: THEME.primary, fontSize: 16, fontWeight: '700' }}>Go to Dashboard</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Luxury Royal Gradient Register Button */}
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
                    <Text style={styles.registerBtnText}>Get Started Free</Text>
                    <Ionicons name="arrow-forward" size={19} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>

                {/* Login Link with safe spacing above Android gesture pill */}
                <View style={styles.loginLinkRow}>
                  <Text style={{ color: THEME.textSub, fontSize: 14.5 }}>Already have account? </Text>
                  <TouchableOpacity activeOpacity={0.6} onPress={() => navigation.navigate('Login')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Text style={{ color: '#2563EB', fontSize: 15.5, fontWeight: '800' }}>Login</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      );
    }

    if (item.layout === 'text-top') {
      return (
        <View style={styles.slide}>
          <View style={styles.textTopContainer}>
            <View style={styles.slidePillBadge}>
              <Ionicons name="mic" size={11} color="#6366F1" />
              <Text style={styles.slidePillBadgeText}>AI VOICE LOGGING</Text>
            </View>
            <Text style={styles.slideTitleText}>
              <Text style={{ fontWeight: '800' }}>{item.titleMain}</Text>
              <Text style={{ fontWeight: '400' }}>{item.titleNormal}</Text>
              <Text style={{ fontWeight: '800', color: '#4F46E5' }}>{item.titleBold}</Text>
            </Text>
            {item.subtitle && <Text style={styles.slideSubtitleText}>{item.subtitle}</Text>}
          </View>
          <ElegantArt type={item.artType} />
        </View>
      );
    }

    return (
      <View style={styles.slide}>
        <ElegantArt type={item.artType} />
        <View style={styles.textBottomContainer}>
          <View style={[styles.slidePillBadge, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="logo-whatsapp" size={11} color="#16A34A" />
            <Text style={[styles.slidePillBadgeText, { color: '#16A34A' }]}>WHATSAPP ASSISTANT</Text>
          </View>
          <Text style={styles.slideTitleText}>
            <Text style={{ fontWeight: '800' }}>{item.titleHeader || item.titleMain}</Text>
            {item.titleHighlight && (
              <Text style={{ fontWeight: '900', color: '#16A34A' }}>{item.titleHighlight}</Text>
            )}
            <Text style={{ fontWeight: '800' }}>{item.titleBody || item.titleBold}</Text>
          </Text>
          {item.subtitle && <Text style={styles.slideSubtitleText}>{item.subtitle}</Text>}
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: screenFade, transform: [{ scale: screenScale }] }]}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>

        {/* ── Top Bar with Close Tour option ── */}
        <View style={styles.topNavRow}>
          {isTourMode ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={exitTour}
              style={styles.closeTourBtn}
            >
              <Ionicons name="close" size={20} color={THEME.textMain} />
              <Text style={styles.closeTourText}>Close Tour</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}

          <View style={styles.slideCounterBadge}>
            <Text style={styles.slideCounterText}>{currentIndex + 1} / {SLIDES.length}</Text>
          </View>
        </View>
        
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

        {/* ── Absolute Footer ── */}
        {currentIndex < SLIDES.length - 1 && (
          <View style={styles.footerAbsolute}>
            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (e) {}
                if (isTourMode) {
                  exitTour();
                } else {
                  slidesRef.current?.scrollToIndex({ index: SLIDES.length - 1 });
                }
              }}
              style={styles.skipWrapper}
            >
              <Text style={styles.skipText}>{isTourMode ? 'Skip Tour' : 'Skip'}</Text>
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
            
            <TouchableOpacity activeOpacity={0.8} onPress={scrollToNext} style={styles.nextBtnRing}>
              <View style={styles.nextBtnFill}>
                <Ionicons name="arrow-forward" size={22} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  safeArea: { flex: 1 },
  slide: { width, height: '100%' },

  slidePillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  slidePillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  slideTitleText: {
    fontSize: 27,
    color: THEME.textMain,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  slideSubtitleText: {
    marginTop: 8,
    fontSize: 13.5,
    color: THEME.textSub,
    lineHeight: 20,
    paddingRight: 12,
  },

  textTopContainer: {
    paddingTop: Platform.OS === 'android' ? 24 : 32,
    paddingHorizontal: 28,
    zIndex: 10,
  },
  textBottomContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 120 : 105,
    justifyContent: 'flex-start',
  },

  titleText: { fontSize: 32, color: THEME.textMain, lineHeight: 40, letterSpacing: -0.8 },
  subtitleText: { marginTop: 10, fontSize: 14, color: THEME.textSub, lineHeight: 21, paddingRight: 10 },

  // Abstract Containers
  artContainerBottom: {
    position: 'absolute',
    bottom: 95,
    left: 0,
    right: 0,
    width: width,
    height: height * 0.38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artContainerTop: {
    height: height * 0.38,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },

  // Elements
  largeCircle: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: THEME.primaryLight, opacity: 0.6 },
  
  // Voice Art
  micCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: THEME.primary, justifyContent: 'center', alignItems: 'center', shadowColor: THEME.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12 },
  soundwaves: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 7, zIndex: -1 },
  waveBar: { width: 7, backgroundColor: 'rgba(139, 92, 246, 0.2)', borderRadius: 3.5 },
  
  // Voice Mock Card & Floating Pills (Safely Positioned)
  voiceCardWrapper: { position: 'absolute', top: 10, right: 18, zIndex: 10 },
  voiceMockCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 13, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  voicePillWrapperLeft: { position: 'absolute', top: 80, left: 16, zIndex: 10 },
  voicePillWrapperRight: { position: 'absolute', bottom: 40, right: 20, zIndex: 10 },

  mockCard: { position: 'absolute', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 18, width: width * 0.72, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 8 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: THEME.textMain, marginBottom: 2 },
  cardSub: { fontSize: 12, color: THEME.textSub },
  cardAmt: { fontSize: 16, fontWeight: '800', color: THEME.textMain },
  floatingPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 },

  // Chat Art
  chatBubbleRight: { position: 'absolute', backgroundColor: THEME.primary, paddingVertical: 14, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 4, shadowColor: THEME.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
  chatTextRight: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  chatBubbleLeft: { position: 'absolute', backgroundColor: '#FFF', paddingVertical: 16, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomRightRadius: 24, borderBottomLeftRadius: 4, width: 280, shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.08, shadowRadius: 25, elevation: 10 },
  aiTag: { fontSize: 12, fontWeight: '700', color: THEME.primary, marginLeft: 6 },
  chatTextLeft: { color: THEME.textMain, fontSize: 15, fontWeight: '600', marginBottom: 12, lineHeight: 22 },
  miniCard: { backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  floatingIcon: { position: 'absolute', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },

  // Analytics Art
  dashboardMock: { backgroundColor: '#FFF', width: 260, padding: 24, borderRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 15 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100 },
  barTrack: { width: 24, height: '100%', backgroundColor: '#F3F4F6', borderRadius: 12, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 12 },

  // Abstract Cards Art (Slide 3)
  bookCard: { position: 'absolute', width: 180, height: 240, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, justifyContent: 'center', alignItems: 'center', padding: 20 },

  // Slide 3 Final Auth Styling
  authFinalSlide: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'android' ? 44 : 28,
  },
  authArtBox: {
    height: height * 0.36,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  authAuraOuter: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#EEF2FF',
    opacity: 0.85,
  },
  authAuraInner: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#E0E7FF',
    opacity: 0.9,
  },
  authBadgeTopLeft: {
    position: 'absolute',
    top: 28,
    left: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 4,
  },
  authBadgeTopRight: {
    position: 'absolute',
    top: 36,
    right: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 4,
  },
  authBadgeBottomRight: {
    position: 'absolute',
    bottom: 24,
    right: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 4,
  },
  authMiniBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.textMain,
  },
  heroPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  heroPillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  authTitleText: {
    fontSize: 27,
    color: THEME.textMain,
    lineHeight: 34,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  authSubtitleText: {
    marginTop: 8,
    fontSize: 13.5,
    color: THEME.textSub,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  featureHighlightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 12,
  },
  featureChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: THEME.textMain,
  },
  registerBtnShadow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 16,
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

  // Absolute Footer
  footerAbsolute: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  skipWrapper: { padding: 8, paddingLeft: 0 },
  skipText: { fontSize: 15, fontWeight: '700', color: THEME.textMain },
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
    borderColor: 'rgba(99, 102, 241, 0.35)',
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  
  // Tour Mode Additions
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 14 : 6,
    paddingBottom: 6,
    zIndex: 50,
  },
  closeTourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  closeTourText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textMain,
  },
  slideCounterBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  slideCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  tourBackBtnShadow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  primaryBtnGradient: {
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  dashboardLinkBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dashboardLinkText: {
    color: THEME.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});

