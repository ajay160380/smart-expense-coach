/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — PREMIUM LIGHT ONBOARDING (PIXEL PERFECT)
 * 100% faithful to the 3 visual mockups:
 * Slide 1: AI Voice Logging with 3D Mic, Category Chips, Glowing Center Button
 * Slide 2: Chat on Smarter Way (Mint Green theme) with 3D Headphone Robot & 3 Feature Cards
 * Slide 3: Welcome to Expense Tracker with 3D Robot holding Shield, Register & Login
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
  Image,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { getToken } from '../utils/auth';

const { width, height } = Dimensions.get('window');

// ── Continuous Float Animation Component ──
const Float = ({ children, delay = 0, range = -6, duration = 3200 }) => {
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

// ── Stylized Curved Underline Graphic ──
const UnderlineCurve = ({ color = '#2563EB', width = 110, height = 7 }) => (
  <View style={{ width, height, marginTop: -2, marginBottom: 6 }}>
    <View
      style={{
        width: '100%',
        height: 3.5,
        backgroundColor: color,
        borderRadius: 2,
        opacity: 0.85,
        transform: [{ scaleY: 0.85 }, { rotate: '-0.5deg' }],
      }}
    />
  </View>
);

export default function WelcomeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef(null);
  const fromProfile = route?.params?.fromProfile;
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(fromProfile));

  // Dynamic safe top padding to never collide with camera notch or status bar
  const safeTopPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 20
  ) + 8;

  // Safe bottom padding above Android gesture bar
  const safeBottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 20);

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
    if (currentIndex < 2) {
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
      slidesRef.current?.scrollToIndex({ index: 2 });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // SLIDE 1: AI VOICE LOGGING (Mockup 1)
  // ═══════════════════════════════════════════════════════════════
  const renderSlide1 = () => (
    <LinearGradient colors={['#F1F6FF', '#FFFFFF']} style={styles.slide}>
      {/* Background Soft Blobs */}
      <View style={[styles.bgBlob, { top: -40, right: -40, width: 220, height: 220, backgroundColor: '#DBEAFE', opacity: 0.45 }]} />
      <View style={[styles.bgBlob, { bottom: 80, left: -60, width: 260, height: 260, backgroundColor: '#EFF6FF', opacity: 0.7 }]} />

      <View style={[styles.slideInner, { paddingTop: safeTopPadding }]}>
        {/* Top Header Row */}
        <View style={styles.topHeaderRow}>
          <View style={styles.voiceBadgePill}>
            <Ionicons name="mic-outline" size={13} color="#2563EB" />
            <Text style={styles.voiceBadgeText}>AI Voice Logging</Text>
          </View>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>1 / 3</Text>
          </View>
        </View>

        {/* Title & 3D Hero Row */}
        <View style={styles.heroRow}>
          <View style={styles.titleColumn}>
            <Text style={styles.heroTitleMain}>Track Expenses</Text>
            <Text style={styles.heroTitleSub}>With Just Your</Text>
            <Text style={styles.heroTitleHighlightBlue}>Voice</Text>
            <UnderlineCurve color="#2563EB" width={92} />
          </View>

          {/* 3D Mic & Receipt Paper Hero Image */}
          <Float delay={200} duration={3400} range={-6}>
            <View style={styles.slide1HeroImgWrapper}>
              <Image
                source={require('../../assets/onboarding/slide1_mic_hero.jpg')}
                style={styles.slide1HeroImg}
                resizeMode="contain"
              />
            </View>
          </Float>
        </View>

        {/* Subtitle */}
        <Text style={styles.slideSubtitle}>
          Speak naturally in Hindi or English. AI instantly categorizes your spending with zero manual typing.
        </Text>

        {/* Category Pills Row */}
        <View style={styles.categoryRow}>
          <View style={styles.catPill}>
            <Text style={styles.catPillText}>🍔 Food & Dining</Text>
          </View>
          <View style={styles.catPill}>
            <Text style={styles.catPillText}>🚙 Travel & Transport</Text>
          </View>
          <View style={styles.catPill}>
            <Text style={styles.catPillText}>🛍️ Shopping & More</Text>
          </View>
        </View>

        {/* Center Glowing 3D Microphone Action */}
        <View style={styles.centerMicSection}>
          <View style={styles.micGlowRingOuter}>
            <View style={styles.micGlowRingInner}>
              <Float delay={400} duration={3000} range={-5}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
                  }}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    style={styles.glowingMicButton}
                  >
                    <Ionicons name="mic" size={42} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </Float>
            </View>
          </View>

          <View style={styles.tapToSpeakRow}>
            <Text style={styles.accentDash}>— \ </Text>
            <Text style={styles.tapToSpeakText}>Tap to Speak</Text>
            <Text style={styles.accentDash}> / —</Text>
          </View>
        </View>

        {/* Floating Transaction Card */}
        <View style={styles.transactionCardWrapper}>
          <Float delay={600} duration={3600} range={-5}>
            <View style={styles.transactionCard}>
              <View style={styles.transIconBoxGreen}>
                <Ionicons name="trending-up" size={20} color="#16A34A" />
              </View>
              <View style={styles.transTextBox}>
                <Text style={styles.transTitle}>Dinner at Taj</Text>
                <Text style={styles.transTime}>Just now</Text>
              </View>
              <Text style={styles.transAmount}>- ₹4,500</Text>
            </View>
          </Float>
        </View>

        {/* Bottom Footer Controls */}
        <View style={[styles.bottomFooterRow, { paddingBottom: safeBottomPadding }]}>
          <TouchableOpacity onPress={skipToEnd} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.footerSkipText}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.dotsRow}>
            <View style={[styles.dotPillActive, { backgroundColor: '#2563EB' }]} />
            <View style={styles.dotCircleInactive} />
            <View style={styles.dotCircleInactive} />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={scrollToNext}
            style={styles.nextPillBtn}
          >
            <Text style={styles.nextPillBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );

  // ═══════════════════════════════════════════════════════════════
  // SLIDE 2: CHAT ON SMARTER WAY (Mockup 2)
  // ═══════════════════════════════════════════════════════════════
  const renderSlide2 = () => (
    <LinearGradient colors={['#F0FDF4', '#FFFFFF']} style={styles.slide}>
      {/* Background Mint Hills */}
      <View style={[styles.bgBlob, { top: -50, right: -50, width: 240, height: 240, backgroundColor: '#DCFCE7', opacity: 0.55 }]} />
      <View style={[styles.bgBlob, { bottom: 120, left: -60, width: 250, height: 250, backgroundColor: '#E8FBF0', opacity: 0.7 }]} />

      <View style={[styles.slideInner, { paddingTop: safeTopPadding }]}>
        {/* Top Header Row with Logo & Rupee Coin */}
        <View style={styles.topHeaderRow}>
          <View style={styles.slide2LogoBox}>
            <Image
              source={require('../../assets/onboarding/slide2_logo_box.jpg')}
              style={styles.slide2LogoImg}
              resizeMode="contain"
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.slide2RupeeBubble}>
              <Image
                source={require('../../assets/onboarding/slide2_rupee_bubble.jpg')}
                style={styles.slide2RupeeImg}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.stepPill, { backgroundColor: '#E6F9F0', borderColor: '#A7F3D0' }]}>
              <Text style={[styles.stepPillText, { color: '#059669' }]}>2 / 3</Text>
            </View>
          </View>
        </View>

        {/* Hero Row: Left Title & Right 3D Headphone Mascot */}
        <View style={styles.heroRow}>
          <View style={styles.titleColumn}>
            <Text style={styles.heroTitleSmall}>Welcome to</Text>
            <Text style={styles.heroTitleMain}>Chat on</Text>
            <Text style={styles.heroTitleHighlightGreen}>Smarter</Text>
            <UnderlineCurve color="#10B981" width={115} />
            <Text style={styles.heroTitleMain}>Way</Text>
          </View>

          {/* 3D Headphone Robot Mascot */}
          <Float delay={150} duration={3200} range={-6}>
            <View style={styles.slide2HeroImgWrapper}>
              <Image
                source={require('../../assets/onboarding/slide2_robot_hero.jpg')}
                style={styles.slide2HeroImg}
                resizeMode="contain"
              />
            </View>
          </Float>
        </View>

        {/* Subtitle */}
        <Text style={styles.slideSubtitleGreen}>
          Send a quick text or voice note and keep your budgets updated.
        </Text>

        {/* 3 Green Feature Cards */}
        <View style={styles.featureCardsRow}>
          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="trending-up" size={24} color="#10B981" />
            </View>
            <Text style={styles.featureCardTitle}>Track Expenses</Text>
            <Text style={styles.featureCardSub}>in Real-time</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="mic" size={24} color="#10B981" />
            </View>
            <Text style={styles.featureCardTitle}>Voice & Text</Text>
            <Text style={styles.featureCardSub}>Both Work</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
            </View>
            <Text style={styles.featureCardTitle}>Smart Insights</Text>
            <Text style={styles.featureCardSub}>for Better Planning</Text>
          </View>
        </View>

        {/* Get Started Button */}
        <View style={styles.slide2ActionSection}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={scrollToNext}
            style={styles.getStartedBtnShadow}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.getStartedBtnGradient}
            >
              <Text style={styles.getStartedBtnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Pagination Dots */}
          <View style={styles.dotsRowCenter}>
            <View style={styles.dotCircleInactive} />
            <View style={[styles.dotPillActive, { backgroundColor: '#10B981' }]} />
            <View style={styles.dotCircleInactive} />
          </View>
        </View>

        {/* Bottom Floating Receipt */}
        <View style={[styles.slide2ReceiptWrapper, { bottom: safeBottomPadding + 4 }]}>
          <Image
            source={require('../../assets/onboarding/slide2_receipt_paper.jpg')}
            style={styles.slide2ReceiptImg}
            resizeMode="contain"
          />
        </View>
      </View>
    </LinearGradient>
  );

  // ═══════════════════════════════════════════════════════════════
  // SLIDE 3: WELCOME TO EXPENSE TRACKER (Mockup 3)
  // ═══════════════════════════════════════════════════════════════
  const renderSlide3 = () => (
    <LinearGradient colors={['#F1F6FF', '#FFFFFF']} style={styles.slide}>
      {/* Background Soft Blobs */}
      <View style={[styles.bgBlob, { top: -40, left: -40, width: 220, height: 220, backgroundColor: '#DBEAFE', opacity: 0.45 }]} />
      <View style={[styles.bgBlob, { bottom: 100, right: -50, width: 240, height: 240, backgroundColor: '#EFF6FF', opacity: 0.6 }]} />

      <View style={[styles.slideInner, { paddingTop: safeTopPadding }]}>
        {/* Top Header: 3 / 3 Pill on Right */}
        <View style={[styles.topHeaderRow, { justifyContent: 'flex-end' }]}>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>3 / 3</Text>
          </View>
        </View>

        {/* Center Mascot: 3D Robot Holding Shield */}
        <View style={styles.slide3MascotSection}>
          <Float delay={0} duration={3500} range={-6}>
            <Image
              source={require('../../assets/onboarding/slide3_robot_hero.jpg')}
              style={styles.slide3MascotImg}
              resizeMode="contain"
            />
          </Float>
        </View>

        {/* Badge: SMART FINANCIAL COACH */}
        <View style={styles.slide3TextSection}>
          <View style={styles.smartCoachBadge}>
            <Ionicons name="sparkles" size={12} color="#2563EB" />
            <Text style={styles.smartCoachBadgeText}>SMART FINANCIAL COACH</Text>
          </View>

          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.expenseTrackerText}>Expense Tracker</Text>
          <UnderlineCurve color="#2563EB" width={180} />

          <Text style={styles.slide3Subtitle}>
            {isTourMode
              ? "You are logged in and ready to track expenses effortlessly with AI voice and WhatsApp logging."
              : "Start tracking effortlessly, stay on pace with your daily budget, and boost your savings today!"}
          </Text>
        </View>

        {/* Action Button: Register or Back to App */}
        <View style={[styles.slide3ActionSection, { paddingBottom: safeBottomPadding + 6 }]}>
          {isTourMode ? (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={exitTour}
              style={styles.primaryBtnShadow}
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGradient}
              >
                <Text style={styles.primaryBtnText}>Back to App</Text>
                <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => navigation.navigate('Register')}
                style={styles.primaryBtnShadow}
              >
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>Register</Text>
                  <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.loginLinkRow}>
                <Text style={styles.loginPromptText}>Already have an account? </Text>
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => navigation.navigate('Login')}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.loginHighlightText}>Login</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <FlatList
        ref={slidesRef}
        data={[{ id: '1' }, { id: '2' }, { id: '3' }]}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => {
          if (item.id === '1') return renderSlide1();
          if (item.id === '2') return renderSlide2();
          return renderSlide3();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    width,
    height,
    position: 'relative',
    overflow: 'hidden',
  },
  slideInner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  // ── Background Ambient Blobs ──
  bgBlob: {
    position: 'absolute',
    borderRadius: 200,
  },

  // ── Top Header Rows ──
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,
    zIndex: 10,
  },
  voiceBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  voiceBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  stepPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },

  // ── Hero Title & Artwork Rows ──
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  titleColumn: {
    flex: 1,
    paddingRight: 8,
  },
  heroTitleSmall: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: -2,
  },
  heroTitleMain: {
    fontSize: 29,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 35,
    letterSpacing: -0.5,
  },
  heroTitleSub: {
    fontSize: 29,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 35,
    letterSpacing: -0.5,
  },
  heroTitleHighlightBlue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#2563EB',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  heroTitleHighlightGreen: {
    fontSize: 34,
    fontWeight: '900',
    color: '#10B981',
    lineHeight: 38,
    letterSpacing: -0.5,
  },

  // ── Slide 1 Artwork & Elements ──
  slide1HeroImgWrapper: {
    width: 145,
    height: 155,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide1HeroImg: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  slideSubtitle: {
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'flex-start',
    marginVertical: 4,
  },
  catPill: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  catPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
  },

  // ── Glowing Center Mic Section ──
  centerMicSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  micGlowRingOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(37, 99, 235, 0.07)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micGlowRingInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(37, 99, 235, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowingMicButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 10,
  },
  tapToSpeakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  accentDash: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '800',
  },
  tapToSpeakText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '800',
    marginHorizontal: 3,
  },

  // ── Floating Transaction Card ──
  transactionCardWrapper: {
    marginVertical: 4,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  transIconBoxGreen: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transTextBox: {
    flex: 1,
  },
  transTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  transTime: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  transAmount: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#1E40AF',
  },

  // ── Slide 2 Artwork & Elements ──
  slide2LogoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  slide2LogoImg: {
    width: 38,
    height: 38,
  },
  slide2RupeeBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  slide2RupeeImg: {
    width: '100%',
    height: '100%',
  },
  slide2HeroImgWrapper: {
    width: 155,
    height: 165,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide2HeroImg: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  slideSubtitleGreen: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 19,
    marginTop: 2,
    marginBottom: 8,
  },
  featureCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 4,
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureCardTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 15,
  },
  featureCardSub: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  slide2ActionSection: {
    alignItems: 'center',
    marginTop: 6,
  },
  getStartedBtnShadow: {
    width: '100%',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 12,
  },
  getStartedBtnGradient: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  getStartedBtnText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  slide2ReceiptWrapper: {
    position: 'absolute',
    left: 20,
    width: 60,
    height: 60,
    opacity: 0.9,
  },
  slide2ReceiptImg: {
    width: '100%',
    height: '100%',
  },

  // ── Slide 3 Artwork & Elements ──
  slide3MascotSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  slide3MascotImg: {
    width: width * 0.78,
    height: height * 0.28,
  },
  slide3TextSection: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginVertical: 4,
  },
  smartCoachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 10,
  },
  smartCoachBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 27,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 33,
    textAlign: 'center',
  },
  expenseTrackerText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2563EB',
    lineHeight: 38,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  slide3Subtitle: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 10,
    marginTop: 4,
  },
  slide3ActionSection: {
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnShadow: {
    width: '100%',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 12,
  },
  primaryBtnGradient: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loginLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  loginPromptText: {
    fontSize: 14,
    color: '#64748B',
  },
  loginHighlightText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#2563EB',
  },

  // ── Bottom Footer Controls (Slide 1) ──
  bottomFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 46,
  },
  footerSkipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotsRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  dotPillActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
  },
  dotCircleInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  nextPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextPillBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
