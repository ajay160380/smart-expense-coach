/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — INTERACTIVE FEATURE TOUR & ONBOARDING
 * High-fidelity step-by-step interactive walkthrough:
 * 1. Center "+" FAB Button (Fast 3-Sec Logging)
 * 2. WhatsApp Assistant Bot (1-Tap Linking & No-App Logging)
 * 3. Menu & Features (Notepad, Widgets, Web Portal)
 * 4. Profile & Monthly Budget (Cycle, Limit, Biometric Lock)
 * 5. Smart Dashboard & Safe Daily Allowance
 * 6. AI Voice & Natural Hinglish Logging
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export const TOUR_STORAGE_KEY = '@has_seen_dashboard_tour_v3';

export const getTourKeyForUser = (userId) => {
  return userId ? `@has_seen_tour_user_${userId}` : TOUR_STORAGE_KEY;
};

const TOUR_STEPS = [
  {
    id: 'add_expense',
    stepNumber: 1,
    tag: 'FAST 3-SEC ENTRY',
    title: 'Center "+" Add Expense',
    subtitle: 'Tap the large center "+" button anytime to record expenses in seconds with intelligent auto-categorization and instant split tracking.',
    icon: 'add-circle',
    colors: ['#7C3AED', '#6D28D9'],
    pills: [
      { icon: 'flash-outline', text: '3-Sec Quick Add' },
      { icon: 'pricetag-outline', text: 'Smart Auto-Categories' },
      { icon: 'people-outline', text: 'Split with Friends' },
    ],
    highlightNote: 'Pro Tip: Always accessible from the bottom navigation bar on every screen.',
    type: 'fab',
  },
  {
    id: 'whatsapp_bot',
    stepNumber: 2,
    tag: 'WHATSAPP SYNC',
    title: '1-Tap WhatsApp Assistant 🤖',
    subtitle: 'Track expenses on the go without opening the app! Send a WhatsApp text or voice note ("₹150 coffee", "₹500 fuel") for instant sync.',
    icon: 'logo-whatsapp',
    colors: ['#16A34A', '#15803D'],
    pills: [
      { icon: 'phone-portrait-outline', text: '1-Tap Auto Link' },
      { icon: 'paper-plane-outline', text: 'Text "500 petrol"' },
      { icon: 'mic-outline', text: 'Voice Notes Supported' },
    ],
    highlightNote: 'Pro Tip: Tap "Link WhatsApp" from your Dashboard or Menu to activate in 5 seconds!',
    type: 'whatsapp',
  },
  {
    id: 'daily_allowance',
    stepNumber: 3,
    tag: 'SAFE-TO-SPEND',
    title: 'Live Safe Daily Allowance ⚡',
    subtitle: 'Your dashboard real-time spending dial calculates exactly how much you can safely spend today so you never run short before month-end.',
    icon: 'speedometer',
    colors: ['#8B5CF6', '#7C3AED'],
    pills: [
      { icon: 'shield-checkmark-outline', text: 'Dynamic Daily Target' },
      { icon: 'trending-up-outline', text: 'Pacing Indicator' },
      { icon: 'pie-chart-outline', text: 'Category Insights' },
    ],
    highlightNote: 'Pro Tip: Stay within your daily green zone to automatically hit your savings goals!',
    type: 'budget',
  },
  {
    id: 'voice_ai',
    stepNumber: 4,
    tag: 'AI VOICE MAGIC',
    title: 'Hands-Free Voice Logging 🎙️',
    subtitle: 'Prefer speaking over typing? Simply tap the microphone and say "Paid 50 for auto" or "150 for lunch" — AI automatically logs and tags it!',
    icon: 'mic',
    colors: ['#EC4899', '#BE185D'],
    pills: [
      { icon: 'chatbubbles-outline', text: 'Multi-Language AI' },
      { icon: 'sparkles-outline', text: 'Zero Form Filling' },
      { icon: 'bulb-outline', text: 'Instant Categorization' },
    ],
    highlightNote: 'Pro Tip: Try saying "Paid 300 for groceries at Supermart" for instant logging.',
    type: 'voice',
  },
  {
    id: 'menu_utilities',
    stepNumber: 5,
    tag: 'POWER TOOLS',
    title: 'Menu Tab — Essential Utilities 📱',
    subtitle: 'Explore the "Menu" hub for top productivity: Financial Notepad, Home Screen Widgets, and Web Cloud Portal for PC/laptop access.',
    icon: 'grid',
    colors: ['#2563EB', '#1D4ED8'],
    pills: [
      { icon: 'document-text-outline', text: 'Financial Notepad' },
      { icon: 'apps-outline', text: 'Home Screen Widgets' },
      { icon: 'globe-outline', text: 'PC Web Cloud Portal' },
    ],
    highlightNote: 'Pro Tip: Add home screen widgets to log expenses right from your phone home screen!',
    type: 'menu',
  },
  {
    id: 'profile_settings',
    stepNumber: 6,
    tag: 'BUDGET & SECURITY',
    title: 'Profile & Budget Setup 👤',
    subtitle: 'Tap your profile avatar on the top-left to configure your monthly budget, set your salary cycle date, and enable Biometric app lock.',
    icon: 'person-circle',
    colors: ['#F59E0B', '#D97706'],
    pills: [
      { icon: 'wallet-outline', text: 'Monthly Budget Limit' },
      { icon: 'calendar-outline', text: 'Custom Salary Cycle' },
      { icon: 'finger-print-outline', text: 'Face / Fingerprint Lock' },
    ],
    highlightNote: "You're all set! Experience effortless, smart money management with PaisaMitra! 🚀",
    type: 'profile',
  },
];

export default function FeatureTourModal({ visible, onClose, userName = 'Dost' }) {
  const [currentStep, setCurrentStep] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for interactive preview
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  const triggerStepAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(18);
    scaleAnim.setValue(0.95);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      triggerStepAnimation();
    }
  }, [visible]);

  const handleNext = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      triggerStepAnimation();
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      triggerStepAnimation();
    }
  };

  const handleComplete = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        await AsyncStorage.setItem(`@has_seen_tour_user_${userId}`, 'true');
      }
      await AsyncStorage.setItem(TOUR_STORAGE_KEY, 'true');
      await AsyncStorage.removeItem('pending_onboarding_tour');
    } catch (e) {}
    if (onClose) onClose();
  };

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  // Render dedicated interactive spotlight mockups per step
  const renderVisualMockup = () => {
    switch (step.type) {
      case 'fab':
        return (
          <View style={styles.mockupContainer}>
            <Animated.View style={[styles.fabHaloOuter, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.fabHaloInner}>
                <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.fabButtonMock}>
                  <Ionicons name="add" size={32} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </Animated.View>
            <View style={styles.quickTagsRow}>
              <View style={styles.quickTagItem}>
                <Text style={styles.quickTagEmoji}>🍕</Text>
                <Text style={styles.quickTagLabel}>Food</Text>
              </View>
              <View style={styles.quickTagItem}>
                <Text style={styles.quickTagEmoji}>🚕</Text>
                <Text style={styles.quickTagLabel}>Travel</Text>
              </View>
              <View style={styles.quickTagItem}>
                <Text style={styles.quickTagEmoji}>🛍️</Text>
                <Text style={styles.quickTagLabel}>Shopping</Text>
              </View>
              <View style={styles.quickTagItem}>
                <Text style={styles.quickTagEmoji}>💡</Text>
                <Text style={styles.quickTagLabel}>Bills</Text>
              </View>
            </View>
          </View>
        );

      case 'whatsapp':
        return (
          <View style={styles.mockupContainer}>
            <View style={styles.chatBoxMock}>
              <View style={styles.chatBubbleUser}>
                <Text style={styles.chatUserText}>₹150 Chai & Snacks</Text>
                <Ionicons name="checkmark-done" size={13} color="#60A5FA" style={{ marginLeft: 6 }} />
              </View>
              <View style={styles.chatBubbleBot}>
                <Ionicons name="logo-whatsapp" size={14} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={styles.chatBotText}>✅ Logged ₹150 in Food! Daily safe: ₹850</Text>
              </View>
            </View>
            <View style={styles.whatsappActionPill}>
              <Ionicons name="flash" size={12} color="#16A34A" style={{ marginRight: 4 }} />
              <Text style={styles.whatsappActionText}>1-Tap WhatsApp Link Available</Text>
            </View>
          </View>
        );

      case 'menu':
        return (
          <View style={styles.mockupContainer}>
            <View style={styles.menuGridRow}>
              <View style={[styles.menuMiniCard, { borderColor: '#F472B6' + '40' }]}>
                <View style={[styles.menuMiniIcon, { backgroundColor: '#F472B6' + '18' }]}>
                  <Ionicons name="document-text" size={18} color="#F472B6" />
                </View>
                <Text style={styles.menuMiniTitle}>Notepad</Text>
                <Text style={styles.menuMiniSub}>Wishlist & Notes</Text>
              </View>
              <View style={[styles.menuMiniCard, { borderColor: '#A855F7' + '40' }]}>
                <View style={[styles.menuMiniIcon, { backgroundColor: '#A855F7' + '18' }]}>
                  <Ionicons name="apps" size={18} color="#A855F7" />
                </View>
                <Text style={styles.menuMiniTitle}>Widgets</Text>
                <Text style={styles.menuMiniSub}>Home Screen</Text>
              </View>
              <View style={[styles.menuMiniCard, { borderColor: '#3B82F6' + '40' }]}>
                <View style={[styles.menuMiniIcon, { backgroundColor: '#3B82F6' + '18' }]}>
                  <Ionicons name="globe" size={18} color="#3B82F6" />
                </View>
                <Text style={styles.menuMiniTitle}>Web Portal</Text>
                <Text style={styles.menuMiniSub}>PC & Laptop</Text>
              </View>
            </View>
          </View>
        );

      case 'profile':
        return (
          <View style={styles.mockupContainer}>
            <View style={styles.profileMockCard}>
              <View style={styles.profileAvatarBox}>
                <Text style={styles.profileAvatarText}>A</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.profileMockTitle}>Monthly Budget Limit</Text>
                <Text style={styles.profileMockValue}>₹20,000 <Text style={styles.profileMockCycle}>• Cycle: 1st of month</Text></Text>
              </View>
              <View style={styles.profileGearIcon}>
                <Ionicons name="settings" size={18} color="#F59E0B" />
              </View>
            </View>
          </View>
        );

      case 'budget':
        return (
          <View style={styles.mockupContainer}>
            <LinearGradient
              colors={['#7C3AED', '#5B21B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.budgetCardMock}
            >
              <Text style={styles.budgetTotalSpentTitle}>Total Spent</Text>
              <Text style={styles.budgetSpentAmount}>₹0.00</Text>
              <View style={styles.budgetPillRow}>
                <View style={styles.budgetPillBadge}>
                  <Text style={styles.budgetPillText}>Remaining: ₹20,000</Text>
                </View>
              </View>
              <View style={styles.dailyAllowanceBadge}>
                <Ionicons name="flash" size={12} color="#FBBF24" style={{ marginRight: 4 }} />
                <Text style={styles.dailyAllowanceText}>+₹1,111 safe per day • 18 days left</Text>
              </View>
            </LinearGradient>
          </View>
        );

      case 'voice':
        return (
          <View style={styles.mockupContainer}>
            <View style={styles.voiceMockBox}>
              <View style={styles.voiceMicCircle}>
                <Ionicons name="mic" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.waveContainer}>
                <View style={[styles.waveLine, { height: 14 }]} />
                <View style={[styles.waveLine, { height: 26 }]} />
                <View style={[styles.waveLine, { height: 38 }]} />
                <View style={[styles.waveLine, { height: 20 }]} />
                <View style={[styles.waveLine, { height: 32 }]} />
                <View style={[styles.waveLine, { height: 16 }]} />
              </View>
            </View>
            <Text style={styles.voicePromptExample}>"Say: 'Paid ₹40 for cab to station' — AI logs it!"</Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={handleComplete}
    >
      <View style={styles.overlay}>
        {/* Backdrop Touchable */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleComplete}
        />

        {/* Modal Container */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Header Row with Tag & Skip */}
          <View style={styles.headerRow}>
            <View style={styles.badgeWrap}>
              <LinearGradient
                colors={step.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.badgeGradient}
              >
                <Text style={styles.badgeText}>{step.tag}</Text>
              </LinearGradient>
            </View>

            <TouchableOpacity
              activeOpacity={0.6}
              onPress={handleComplete}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.skipBtn}
            >
              <Text style={styles.skipBtnText}>Skip Tour</Text>
              <Ionicons name="close" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Interactive Visual Spotlight Mockup */}
          {renderVisualMockup()}

          {/* Step Counter Pills */}
          <View style={styles.stepProgressRow}>
            {TOUR_STEPS.map((s, idx) => (
              <View
                key={s.id}
                style={[
                  styles.progressDot,
                  idx === currentStep
                    ? [styles.progressDotActive, { backgroundColor: step.colors[0], width: 26 }]
                    : idx < currentStep
                    ? { backgroundColor: step.colors[0] + '80', width: 8 }
                    : { backgroundColor: '#E5E7EB', width: 8 },
                ]}
              />
            ))}
          </View>

          {/* Step Content */}
          <View style={styles.bodyContent}>
            <Text style={styles.stepIndicatorText}>Step {currentStep + 1} of {TOUR_STEPS.length}</Text>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepSubtitle}>{step.subtitle}</Text>

            {/* Feature Pills */}
            <View style={styles.pillsContainer}>
              {step.pills.map((p, i) => (
                <View key={i} style={styles.pillItem}>
                  <Ionicons name={p.icon} size={14} color={step.colors[0]} style={{ marginRight: 6 }} />
                  <Text style={styles.pillText}>{p.text}</Text>
                </View>
              ))}
            </View>

            {/* Highlight Note */}
            <View style={[styles.noteBox, { borderColor: step.colors[0] + '35', backgroundColor: step.colors[0] + '0C' }]}>
              <View style={[styles.noteIconCircle, { backgroundColor: step.colors[0] + '20' }]}>
                <Ionicons name="bulb-outline" size={14} color={step.colors[0]} />
              </View>
              <Text style={[styles.noteText, { color: step.colors[0] }]}>{step.highlightNote}</Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            {currentStep > 0 ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleBack}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={18} color="#4B5563" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 80 }} />
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleNext}
              style={styles.nextBtnShadow}
            >
              <LinearGradient
                colors={step.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextBtnGradient}
              >
                <Text style={styles.nextBtnText}>{isLast ? 'Get Started! 🚀' : 'Next'}</Text>
                <Ionicons
                  name={isLast ? 'checkmark-circle' : 'arrow-forward'}
                  size={18}
                  color="#FFFFFF"
                  style={{ marginLeft: 6 }}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContainer: {
    width: Math.min(width - 28, 410),
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeWrap: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginRight: 4,
  },

  // ── VISUAL SPOTLIGHT MOCKUPS ──
  mockupContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 105,
    marginVertical: 6,
  },

  // FAB Mockup
  fabHaloOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabHaloInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabButtonMock: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  quickTagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickTagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quickTagEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  quickTagLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },

  // WhatsApp Mockup
  chatBoxMock: {
    width: '100%',
    backgroundColor: '#E7F5EC',
    borderRadius: 16,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.2)',
  },
  chatBubbleUser: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
  },
  chatUserText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },
  chatBubbleBot: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chatBotText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
  },
  whatsappActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  whatsappActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },

  // Menu Grid Mockup
  menuGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  menuMiniCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
  },
  menuMiniIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuMiniTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  menuMiniSub: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 1,
  },

  // Profile Mockup
  profileMockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  profileAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  profileMockTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  profileMockValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
  profileMockCycle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78350F',
  },
  profileGearIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Budget Card Mockup
  budgetCardMock: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  budgetTotalSpentTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  budgetSpentAmount: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 2,
  },
  budgetPillRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  budgetPillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  budgetPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  dailyAllowanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 3,
  },
  dailyAllowanceText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // Voice AI Mockup
  voiceMockBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF2F8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.25)',
  },
  voiceMicCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  waveLine: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#EC4899',
  },
  voicePromptExample: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BE185D',
    marginTop: 6,
  },

  // Step Progress
  stepProgressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    marginBottom: 10,
  },
  progressDot: {
    height: 5,
    borderRadius: 3,
  },
  progressDotActive: {
    height: 5,
  },

  // Body content
  bodyContent: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  stepIndicatorText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 12,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  pillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  noteBox: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'left',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginLeft: 4,
  },
  nextBtnShadow: {
    borderRadius: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
