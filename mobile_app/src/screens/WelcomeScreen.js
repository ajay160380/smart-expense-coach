/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — REFINED WORLD-CLASS ONBOARDING
 * Clean, modern fintech aesthetic with seamless navigation:
 * - Clean Top Header on all slides (Back on slides 2 & 3, Skip, X / 3)
 * - Slide 1: AI Voice Logging with 3D Mic, Receipt, Glowing Pulsing Mic, Next
 * - Slide 2: Chat on Smarter Way with Interactive WhatsApp AI Coach & 3 Centered Feature Cards
 * - Slide 3: Welcome to Expense Tracker (Compact layout, Register & Login moved UP, Zero dead gap)
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
const UnderlineCurve = ({ color = '#2563EB', width = 110 }) => (
  <View style={{ width, height: 6, marginTop: -2, marginBottom: 6 }}>
    <View
      style={{
        width: '100%',
        height: 3.5,
        backgroundColor: color,
        borderRadius: 2,
        opacity: 0.9,
      }}
    />
  </View>
);

// ═══════════════════════════════════════════════════════════════
// 1. NATIVE VECTOR 3D MIC & RECEIPT (Slide 1 Hero Graphic)
// ═══════════════════════════════════════════════════════════════
const NativeMicReceiptArt = () => {
  return (
    <View style={artStyles.slide1HeroBox}>
      <View style={artStyles.soundArcOuter} />
      <View style={artStyles.soundArcInner} />

      <View style={artStyles.receiptCard}>
        <View style={artStyles.receiptRupeeCircle}>
          <Text style={artStyles.receiptRupeeText}>₹</Text>
        </View>
        <View style={artStyles.receiptLineLong} />
        <View style={artStyles.receiptLineMedium} />
        <View style={artStyles.receiptLineShort} />
        <View style={artStyles.perforatedRow}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={artStyles.perforatedDot} />
          ))}
        </View>
      </View>

      <View style={artStyles.micCapsuleWrapper}>
        <LinearGradient
          colors={['#60A5FA', '#2563EB', '#1D4ED8']}
          style={artStyles.micCapsuleBody}
        >
          <View style={artStyles.micGrilleRing} />
          <Ionicons name="mic" size={28} color="#FFFFFF" />
        </LinearGradient>
        <View style={artStyles.micNeck} />
        <View style={artStyles.micStandBase} />
      </View>

      <View style={[artStyles.soundDash, { top: 12, right: 10, transform: [{ rotate: '45deg' }] }]} />
      <View style={[artStyles.soundDash, { top: 32, right: 2, transform: [{ rotate: '15deg' }] }]} />
      <View style={[artStyles.soundDash, { bottom: 28, left: 2, transform: [{ rotate: '-35deg' }] }]} />
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// 2. NATIVE WHATSAPP AI CHAT & COACH HERO (Slide 2 Hero Graphic)
// ═══════════════════════════════════════════════════════════════
const NativeWhatsAppChatHero = () => {
  return (
    <View style={artStyles.chatHeroContainer}>
      {/* Background Soft Glow */}
      <View style={artStyles.chatAmbientCircle} />

      {/* User Outgoing Speech Bubble */}
      <Float delay={0} duration={3200} range={-5}>
        <View style={artStyles.waUserBubble}>
          <Text style={artStyles.waUserBubbleText}>Spent ₹250 on coffee ☕</Text>
          <View style={artStyles.waUserBubbleTail} />
        </View>
      </Float>

      {/* AI Assistant Incoming Card */}
      <Float delay={500} duration={3600} range={-6}>
        <View style={artStyles.waBotCard}>
          <View style={artStyles.waBotHeader}>
            <View style={artStyles.waBotAvatar}>
              <Ionicons name="sparkles" size={13} color="#10B981" />
            </View>
            <Text style={artStyles.waBotName}>AI Expense Coach</Text>
            <View style={artStyles.waLiveDot} />
          </View>

          <Text style={artStyles.waBotText}>Added ₹250 to Food & Dining!</Text>

          {/* Mini Budget Bar */}
          <View style={artStyles.waBudgetBox}>
            <View style={artStyles.waBudgetLabels}>
              <Text style={artStyles.waBudgetTitle}>Food Budget:</Text>
              <Text style={artStyles.waBudgetAmt}>₹1,250 left</Text>
            </View>
            <View style={artStyles.waProgressBarBg}>
              <View style={artStyles.waProgressBarFill} />
            </View>
          </View>
        </View>
      </Float>

      {/* Floating 3D WhatsApp Badge */}
      <View style={artStyles.waFloatingBadge}>
        <Ionicons name="logo-whatsapp" size={26} color="#FFFFFF" />
      </View>
    </View>
  );
};

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
  ) + 6;

  // Safe bottom padding above Android gesture bar
  const safeBottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 22);

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    if (currentIndex < 2) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const scrollToPrevious = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    if (currentIndex > 0) {
      slidesRef.current?.scrollToIndex({ index: currentIndex - 1 });
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
    <LinearGradient colors={['#F3F7FF', '#FFFFFF']} style={styles.slide}>
      <View style={[styles.bgBlob, { top: -40, right: -40, width: 220, height: 220, backgroundColor: '#DBEAFE', opacity: 0.5 }]} />
      <View style={[styles.bgBlob, { bottom: 60, left: -60, width: 260, height: 260, backgroundColor: '#EFF6FF', opacity: 0.7 }]} />

      <View style={[styles.slideInner, { paddingTop: safeTopPadding, paddingBottom: safeBottomPadding }]}>
        {/* Top Header Row with AI Badge & 1/3 + Skip */}
        <View style={styles.topHeaderRow}>
          <View style={styles.voiceBadgePill}>
            <Ionicons name="pulse" size={14} color="#2563EB" />
            <Text style={styles.voiceBadgeText}>AI Voice Logging</Text>
          </View>
          <View style={styles.topRightControls}>
            <TouchableOpacity onPress={skipToEnd} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.topSkipText}>Skip</Text>
            </TouchableOpacity>
            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>1 / 3</Text>
            </View>
          </View>
        </View>

        {/* Title & Native Vector Hero Row */}
        <View style={styles.heroRow}>
          <View style={styles.titleColumn}>
            <Text style={styles.heroTitleMain}>Track Expenses</Text>
            <Text style={styles.heroTitleSub}>With Just Your</Text>
            <Text style={styles.heroTitleHighlightBlue}>Voice</Text>
            <UnderlineCurve color="#2563EB" width={95} />
          </View>

          <Float delay={200} duration={3400} range={-6}>
            <NativeMicReceiptArt />
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
              <Float delay={300} duration={2800} range={-5}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (e) {}
                  }}
                  style={styles.micButtonContainer}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#1D4ED8', '#1E40AF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.glowingMicButton}
                  >
                    <Ionicons name="mic" size={44} color="#FFFFFF" />
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
          <Float delay={500} duration={3400} range={-4}>
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

        {/* Bottom Footer Controls: Skip, Dots, Next Button */}
        <View style={styles.bottomFooterRow}>
          <TouchableOpacity
            onPress={skipToEnd}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            style={styles.skipBtnWrap}
          >
            <Text style={styles.footerSkipText}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.dotsRow}>
            <View style={[styles.dotPillActive, { backgroundColor: '#2563EB' }]} />
            <View style={styles.dotCircleInactive} />
            <View style={styles.dotCircleInactive} />
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={scrollToNext}
            style={styles.nextBtnShadow}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LinearGradient
              colors={['#2563EB', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextPillBtnGradient}
            >
              <Text style={styles.nextPillBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );

  // ═══════════════════════════════════════════════════════════════
  // SLIDE 2: CHAT ON SMARTER WAY (Clean Top, AI WhatsApp Hero, 3 Balanced Cards)
  // ═══════════════════════════════════════════════════════════════
  const renderSlide2 = () => (
    <LinearGradient colors={['#F0FDF4', '#F8FAFC', '#FFFFFF']} style={styles.slide}>
      <View style={[styles.bgBlob, { top: -50, right: -50, width: 240, height: 240, backgroundColor: '#DCFCE7', opacity: 0.6 }]} />
      <View style={[styles.bgBlob, { bottom: 100, left: -60, width: 250, height: 250, backgroundColor: '#E8FBF0', opacity: 0.8 }]} />

      <View style={[styles.slideInner, { paddingTop: safeTopPadding, paddingBottom: safeBottomPadding }]}>
        {/* Top Header Row with Previous (← Back), Skip, 2/3 */}
        <View style={styles.topHeaderRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={scrollToPrevious}
            style={styles.backCircleBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.topRightControls}>
            <TouchableOpacity onPress={skipToEnd} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.topSkipText, { color: '#059669' }]}>Skip</Text>
            </TouchableOpacity>
            <View style={[styles.stepPill, { backgroundColor: '#E6F9F0', borderColor: '#A7F3D0' }]}>
              <Text style={[styles.stepPillText, { color: '#059669' }]}>2 / 3</Text>
            </View>
          </View>
        </View>

        {/* Hero Row: Left Title & Right WhatsApp AI Coach Showcase */}
        <View style={styles.heroRow}>
          <View style={styles.titleColumn}>
            <Text style={styles.heroTitleSmall}>Welcome to</Text>
            <Text style={styles.heroTitleMain}>Chat on</Text>
            <Text style={styles.heroTitleHighlightGreen}>Smarter</Text>
            <UnderlineCurve color="#10B981" width={115} />
            <Text style={styles.heroTitleMain}>Way</Text>
          </View>

          <NativeWhatsAppChatHero />
        </View>

        {/* Subtitle */}
        <Text style={styles.slideSubtitleGreen}>
          Send a quick text or voice note and keep your budgets updated.
        </Text>

        {/* 3 Perfectly Balanced Feature Cards */}
        <View style={styles.featureCardsRow}>
          {/* Card 1: Real-time Sync */}
          <LinearGradient
            colors={['#FFFFFF', '#F0FDF4']}
            style={styles.featureCardEnhanced}
          >
            <View style={styles.featureIconWrap}>
              <Ionicons name="stats-chart" size={22} color="#059669" />
            </View>
            <Text style={styles.featureCardTitle}>Track Expenses</Text>
            <Text style={styles.featureCardSub}>in Real-time</Text>
            <View style={styles.cardBottomPill}>
              <Text style={styles.cardBottomPillText}>Live Sync</Text>
            </View>
          </LinearGradient>

          {/* Card 2: Voice & Text */}
          <LinearGradient
            colors={['#FFFFFF', '#F0FDF4']}
            style={styles.featureCardEnhanced}
          >
            <View style={styles.featureIconWrap}>
              <Ionicons name="mic" size={22} color="#059669" />
            </View>
            <Text style={styles.featureCardTitle}>Voice & Text</Text>
            <Text style={styles.featureCardSub}>Both Work</Text>
            <View style={[styles.cardBottomPill, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
              <Text style={[styles.cardBottomPillText, { color: '#0284C7' }]}>AI Powered</Text>
            </View>
          </LinearGradient>

          {/* Card 3: Smart Insights */}
          <LinearGradient
            colors={['#FFFFFF', '#F0FDF4']}
            style={styles.featureCardEnhanced}
          >
            <View style={styles.featureIconWrap}>
              <Ionicons name="shield-checkmark" size={22} color="#059669" />
            </View>
            <Text style={styles.featureCardTitle}>Smart Insights</Text>
            <Text style={styles.featureCardSub}>Better Planning</Text>
            <View style={[styles.cardBottomPill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Text style={[styles.cardBottomPillText, { color: '#D97706' }]}>100% Private</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Primary Action Section: Sleek Get Started Pill + Dots */}
        <View style={styles.slide2BottomActionBox}>
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

          {/* Centered Pagination Dots */}
          <View style={styles.dotsRowCenter}>
            <View style={styles.dotCircleInactive} />
            <View style={[styles.dotPillActive, { backgroundColor: '#10B981' }]} />
            <View style={styles.dotCircleInactive} />
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  // ═══════════════════════════════════════════════════════════════
  // SLIDE 3: WELCOME TO EXPENSE TRACKER (Compact, Register/Login UP)
  // ═══════════════════════════════════════════════════════════════
  const renderSlide3 = () => (
    <LinearGradient colors={['#F3F7FF', '#FFFFFF']} style={styles.slide}>
      <View style={[styles.bgBlob, { top: -40, left: -40, width: 220, height: 220, backgroundColor: '#DBEAFE', opacity: 0.5 }]} />
      <View style={[styles.bgBlob, { bottom: 80, right: -50, width: 240, height: 240, backgroundColor: '#EFF6FF', opacity: 0.7 }]} />

      <View style={[styles.slideInner, { paddingTop: safeTopPadding, paddingBottom: safeBottomPadding }]}>
        {/* Top Header Row with Previous (← Back) & 3/3 */}
        <View style={styles.topHeaderRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={scrollToPrevious}
            style={styles.backCircleBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>3 / 3</Text>
          </View>
        </View>

        {/* Centered Cohesive Group (Mascot + Title + Subtitle + Register/Login) */}
        <View style={styles.slide3CenterContainer}>
          {/* High-Res App Shield & Companion Showcase */}
          <Float delay={0} duration={3400} range={-6}>
            <View style={styles.slide3ShieldFrameOuter}>
              <View style={styles.slide3ShieldFrameInner}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.slide3OfficialLogoImg}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.shieldBadgeCompanion}>
                <Ionicons name="thumbs-up" size={17} color="#2563EB" />
              </View>

              <View style={styles.sparkleIconTopLeft}>
                <Ionicons name="sparkles" size={18} color="#60A5FA" />
              </View>
              <View style={styles.sparkleIconBottomRight}>
                <Ionicons name="sparkles" size={14} color="#3B82F6" />
              </View>
            </View>
          </Float>

          {/* Badge: SMART FINANCIAL COACH */}
          <View style={styles.smartCoachBadge}>
            <Ionicons name="sparkles" size={12} color="#2563EB" />
            <Text style={styles.smartCoachBadgeText}>SMART FINANCIAL COACH</Text>
          </View>

          {/* Title */}
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.expenseTrackerText}>Expense Tracker</Text>
          <UnderlineCurve color="#2563EB" width={180} />

          {/* Subtitle */}
          <Text style={styles.slide3Subtitle}>
            {isTourMode
              ? "You are logged in and ready to track expenses effortlessly with AI voice and WhatsApp logging."
              : "Start tracking effortlessly, stay on pace with your daily budget, and boost your savings today!"}
          </Text>

          {/* Action Buttons (Shifted UP, 16px from subtitle) */}
          <View style={styles.slide3CompactActionSection}>
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
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  >
                    <Text style={styles.loginHighlightText}>Login</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Subtle Bottom Indicator on Slide 3 */}
        <View style={styles.dotsRowCenter}>
          <View style={styles.dotCircleInactive} />
          <View style={styles.dotCircleInactive} />
          <View style={[styles.dotPillActive, { backgroundColor: '#2563EB' }]} />
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

// ═══════════════════════════════════════════════════════════════
// NATIVE VECTOR ARTWORK STYLES
// ═══════════════════════════════════════════════════════════════
const artStyles = StyleSheet.create({
  slide1HeroBox: {
    width: 135,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  soundArcOuter: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 2,
    borderColor: 'rgba(96, 165, 250, 0.25)',
    borderStyle: 'dashed',
  },
  soundArcInner: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    borderColor: 'rgba(96, 165, 250, 0.4)',
  },
  receiptCard: {
    position: 'absolute',
    right: 8,
    top: 22,
    width: 64,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 6,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    transform: [{ rotate: '12deg' }],
  },
  receiptRupeeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  receiptRupeeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1E40AF',
  },
  receiptLineLong: {
    width: '85%',
    height: 3,
    backgroundColor: '#CBD5E1',
    borderRadius: 1.5,
    marginBottom: 4,
  },
  receiptLineMedium: {
    width: '65%',
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 1.5,
    marginBottom: 4,
  },
  receiptLineShort: {
    width: '45%',
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 1.5,
  },
  perforatedRow: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  perforatedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  micCapsuleWrapper: {
    position: 'absolute',
    left: 10,
    top: 15,
    alignItems: 'center',
    zIndex: 5,
  },
  micCapsuleBody: {
    width: 48,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  micGrilleRing: {
    position: 'absolute',
    top: 10,
    width: 32,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
  },
  micNeck: {
    width: 6,
    height: 14,
    backgroundColor: '#94A3B8',
    borderRadius: 3,
  },
  micStandBase: {
    width: 32,
    height: 6,
    backgroundColor: '#64748B',
    borderRadius: 3,
  },
  soundDash: {
    position: 'absolute',
    width: 8,
    height: 2.5,
    backgroundColor: '#3B82F6',
    borderRadius: 1,
  },

  // ── Slide 2: Interactive WhatsApp AI Chat Hero ──
  chatHeroContainer: {
    width: 160,
    height: 155,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatAmbientCircle: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  waUserBubble: {
    position: 'absolute',
    top: 6,
    right: 4,
    backgroundColor: '#2563EB',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderBottomRightRadius: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ rotate: '2deg' }],
  },
  waUserBubbleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  waUserBubbleTail: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 8,
    height: 8,
    backgroundColor: '#2563EB',
    borderBottomLeftRadius: 6,
  },
  waBotCard: {
    position: 'absolute',
    bottom: 12,
    left: 4,
    width: 148,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderBottomLeftRadius: 2,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    transform: [{ rotate: '-1.5deg' }],
  },
  waBotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  waBotAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waBotName: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
  },
  waLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginLeft: 'auto',
  },
  waBotText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 5,
  },
  waBudgetBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 5,
  },
  waBudgetLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  waBudgetTitle: {
    fontSize: 8.5,
    color: '#64748B',
  },
  waBudgetAmt: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#10B981',
  },
  waProgressBarBg: {
    width: '100%',
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  waProgressBarFill: {
    width: '75%',
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  waFloatingBadge: {
    position: 'absolute',
    top: 48,
    right: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN STYLES
// ═══════════════════════════════════════════════════════════════
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
    paddingHorizontal: 22,
    justifyContent: 'space-between',
  },

  bgBlob: {
    position: 'absolute',
    borderRadius: 200,
  },

  // ── Top Header Rows & Controls ──
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 38,
    zIndex: 10,
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topSkipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    paddingHorizontal: 4,
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
    paddingHorizontal: 11,
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
    marginTop: 2,
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
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  heroTitleSub: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  heroTitleHighlightBlue: {
    fontSize: 33,
    fontWeight: '900',
    color: '#2563EB',
    lineHeight: 37,
    letterSpacing: -0.5,
  },
  heroTitleHighlightGreen: {
    fontSize: 33,
    fontWeight: '900',
    color: '#10B981',
    lineHeight: 37,
    letterSpacing: -0.5,
  },

  slideSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18.5,
    marginTop: 2,
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
    marginVertical: 2,
  },
  catPill: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
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
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },

  // ── Glowing Center Mic Section ──
  centerMicSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  micGlowRingOuter: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micGlowRingInner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonContainer: {
    borderRadius: 42,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 10,
  },
  glowingMicButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapToSpeakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  accentDash: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '800',
  },
  tapToSpeakText: {
    color: '#2563EB',
    fontSize: 13.5,
    fontWeight: '800',
    marginHorizontal: 3,
  },

  // ── Floating Transaction Card ──
  transactionCardWrapper: {
    marginVertical: 2,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  transIconBoxGreen: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  transTextBox: {
    flex: 1,
  },
  transTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  transTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  transAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E40AF',
  },

  // ── Slide 2 Styling ──
  slideSubtitleGreen: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18.5,
    marginTop: 4,
    marginBottom: 8,
  },

  // ── Slide 2 Enhanced 3 Feature Cards ──
  featureCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 4,
  },
  featureCardEnhanced: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#064E3B',
    lineHeight: 15,
    textAlign: 'center',
    marginBottom: 2,
  },
  featureCardSub: {
    fontSize: 10,
    color: '#059669',
    lineHeight: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardBottomPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  cardBottomPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },

  slide2BottomActionBox: {
    alignItems: 'center',
    marginTop: 6,
  },
  getStartedBtnShadow: {
    width: '100%',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 7,
    marginBottom: 10,
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

  // ── Slide 3 Centered & Compact Layout ──
  slide3CenterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  slide3ShieldFrameOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 6,
    marginBottom: 10,
  },
  slide3ShieldFrameInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  slide3OfficialLogoImg: {
    width: 92,
    height: 92,
    borderRadius: 20,
  },
  shieldBadgeCompanion: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  sparkleIconTopLeft: {
    position: 'absolute',
    top: 4,
    left: 8,
  },
  sparkleIconBottomRight: {
    position: 'absolute',
    bottom: 16,
    left: 4,
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
    marginBottom: 6,
  },
  smartCoachBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 25,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 30,
    textAlign: 'center',
  },
  expenseTrackerText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#2563EB',
    lineHeight: 35,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  slide3Subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18.5,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  slide3CompactActionSection: {
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnShadow: {
    width: '100%',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 10,
  },
  primaryBtnGradient: {
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loginLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
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

  // ── Bottom Footer Controls ──
  bottomFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 46,
  },
  skipBtnWrap: {
    paddingVertical: 8,
    paddingRight: 10,
  },
  footerSkipText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#64748B',
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
    paddingVertical: 4,
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
  nextBtnShadow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  nextPillBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 21,
  },
  nextPillBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
