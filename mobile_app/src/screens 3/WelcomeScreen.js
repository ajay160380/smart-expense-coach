/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — ELEGANT LIGHT THEME ONBOARDING (APP SPECIFIC)
 * Filled with relevant Finance/Chat mockups, no empty spaces,
 * beautifully tying into the app's actual features.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Dimensions,
  TouchableOpacity, FlatList, Animated, Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo';

const { width, height } = Dimensions.get('window');

// ── Theme Colors ──
const THEME = {
  bg: '#F8F9FA', 
  textMain: '#111827', 
  textSub: '#6B7280', 
  primary: '#8B5CF6', 
  primaryLight: '#EDE9FE',
  success: '#10B981',
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
    titleMain: 'Chat on ',
    titleBold: 'WhatsApp\n',
    titleNormal: 'To Keep Budgets\n',
    titleLastBold: 'Updated',
    subtitle: 'Send a quick message anytime, anywhere. We will log it directly into your ExpanseTracker dashboard.',
    layout: 'art-top',
    artType: 'chat',
  },
  {
    id: '3',
    titleMain: 'Welcome to\n',
    titleBold: '',
    titleNormal: '',
    subtitle: 'Start tracking your expenses seamlessly with AI and boost your savings today!',
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

        {/* Floating Transaction Card */}
        <Float delay={0} duration={3500} range={-15}>
          <View style={[styles.mockCard, { bottom: 220, left: 10 }]}>
            <View style={[styles.iconBox, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="fast-food" size={20} color="#EC4899" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Dinner at Taj</Text>
              <Text style={styles.cardSub}>Just now</Text>
            </View>
            <Text style={styles.cardAmt}>- ₹4,500</Text>
          </View>
        </Float>

        {/* Floating Category Pill */}
        <Float delay={1000} duration={4500} range={-10}>
          <View style={[styles.floatingPill, { bottom: 120, right: 30, backgroundColor: '#FEF3C7' }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#B45309' }}>🍔 Food & Dining</Text>
          </View>
        </Float>

        {/* Floating Income Tag */}
        <Float delay={1500} duration={3800} range={10}>
          <View style={[styles.floatingPill, { bottom: 70, left: 20, backgroundColor: '#D1FAE5' }]}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#047857' }}>+ ₹15,000</Text>
          </View>
        </Float>
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
          <View style={[styles.chatBubbleRight, { top: -30, right: 30, transform: [{ rotate: '5deg' }] }]}>
            <Text style={styles.chatTextRight}>Spent 250 on coffee ☕️</Text>
          </View>
        </Float>
        
        <Float delay={1000} duration={4500} range={-15}>
          <View style={[styles.chatBubbleLeft, { top: 40, left: 20, transform: [{ rotate: '-3deg' }] }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="sparkles" size={14} color={THEME.primary} />
              <Text style={styles.aiTag}>AI Assistant</Text>
            </View>
            <Text style={styles.chatTextLeft}>Added ₹250 to Food & Drinks!</Text>
            <View style={styles.miniCard}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: THEME.textMain }}>Food budget:</Text>
              <Text style={{ fontSize: 12, color: THEME.success, fontWeight: '600' }}>₹1,250 left</Text>
            </View>
          </View>
        </Float>

        <View style={[styles.floatingIcon, { bottom: 140, right: 50, backgroundColor: '#25D366', elevation: 15 }]}>
          <Ionicons name="logo-whatsapp" size={32} color="#FFF" />
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
      <View style={{ height: height * 0.45, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        {/* Soft abstract background blobs - perfectly centered behind the logo */}
        <View style={[styles.largeCircle, { backgroundColor: THEME.primaryLight, opacity: 0.8, width: 220, height: 220, borderRadius: 110 }]} />
        <View style={[styles.largeCircle, { backgroundColor: '#F3E8FF', opacity: 0.5, width: 300, height: 300, borderRadius: 150, position: 'absolute' }]} />
        
        {/* Central Logo */}
        <Float delay={0} duration={4000}>
          <Logo size={1} circle={true} showText={false} />
        </Float>
      </View>
    );
  }
  
  return null;
};

export default function WelcomeScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef(null);
  
  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const scrollToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const renderSlide = ({ item }) => {
    if (item.layout === 'auth-final') {
      return (
        <View style={[styles.slide, { paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center' }]}>
          <View style={{ marginBottom: 40 }}>
            <ElegantArt type={item.artType} />
          </View>

          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text style={[styles.titleText, { textAlign: 'center', fontSize: 32, lineHeight: 40 }]}>
              {item.titleMain}
            </Text>
            
            <Text style={[styles.subtitleText, { textAlign: 'center', marginTop: 12, paddingHorizontal: 10 }]}>
              {item.subtitle}
            </Text>
          </View>

          <View style={{ width: '100%' }}>
            {/* Massive Wide Gradient Button */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Register')} style={{ shadowColor: '#1A73E8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15, marginBottom: 30 }}>
              <View style={{ backgroundColor: '#1A73E8', height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}>
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700', marginRight: 8 }}>Register</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: THEME.textSub, fontSize: 15, marginBottom: 8 }}>Already have account?</Text>
              <TouchableOpacity activeOpacity={0.6} onPress={() => navigation.navigate('Login')}>
                <Text style={{ color: '#1A73E8', fontSize: 17, fontWeight: '700' }}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    if (item.layout === 'text-top') {
      return (
        <View style={styles.slide}>
          <View style={styles.textTopContainer}>
            <Text style={styles.titleText}>
              <Text style={{ fontWeight: '800' }}>{item.titleMain}</Text>
              <Text style={{ fontWeight: '400' }}>{item.titleNormal}</Text>
              <Text style={{ fontWeight: '800' }}>{item.titleBold}</Text>
            </Text>
            {item.subtitle && <Text style={styles.subtitleText}>{item.subtitle}</Text>}
          </View>
          <ElegantArt type={item.artType} />
        </View>
      );
    }

    return (
      <View style={styles.slide}>
        <ElegantArt type={item.artType} />
        <View style={styles.textBottomContainer}>
          <Text style={[styles.titleText, { fontSize: 36, lineHeight: 44 }]}>
            <Text style={{ fontWeight: '800' }}>{item.titleMain}</Text>
            <Text style={{ fontWeight: '400' }}>{item.titleNormal}</Text>
            <Text style={{ fontWeight: '800' }}>{item.titleBold}</Text>
            {item.titleLastBold && <Text style={{ fontWeight: '800' }}>{item.titleLastBold}</Text>}
          </Text>
          {item.subtitle && <Text style={styles.subtitleText}>{item.subtitle}</Text>}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        
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
            <TouchableOpacity onPress={() => slidesRef.current.scrollToIndex({ index: SLIDES.length - 1 })} style={styles.skipWrapper}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity activeOpacity={0.8} onPress={scrollToNext} style={styles.nextBtnRing}>
              <View style={styles.nextBtnFill}>
                <Ionicons name="arrow-forward" size={22} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  safeArea: { flex: 1 },
  slide: { width, height: '100%' },

  textTopContainer: { paddingTop: height * 0.12, paddingHorizontal: 32, zIndex: 10 },
  textBottomContainer: { flex: 1, paddingHorizontal: 32, paddingTop: 10 },

  titleText: { fontSize: 44, color: THEME.textMain, lineHeight: 50, letterSpacing: -1 },
  subtitleText: { marginTop: 16, fontSize: 16, color: THEME.textSub, lineHeight: 24, paddingRight: 10 },

  // Abstract Containers
  artContainerBottom: { position: 'absolute', bottom: 50, right: 0, width: width, height: height * 0.45, alignItems: 'center', justifyContent: 'center' },
  artContainerTop: { height: height * 0.55, width: '100%', justifyContent: 'center', alignItems: 'center', paddingTop: 20 },

  // Elements
  largeCircle: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: THEME.primaryLight, opacity: 0.6 },
  
  // Voice Art
  micCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: THEME.primary, justifyContent: 'center', alignItems: 'center', shadowColor: THEME.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 15 },
  soundwaves: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: -1 },
  waveBar: { width: 8, backgroundColor: 'rgba(139, 92, 246, 0.2)', borderRadius: 4 },
  
  // Mock Card
  mockCard: { position: 'absolute', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 20, width: width * 0.75, shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.08, shadowRadius: 25, elevation: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: THEME.textMain, marginBottom: 2 },
  cardSub: { fontSize: 13, color: THEME.textSub },
  cardAmt: { fontSize: 17, fontWeight: '800', color: THEME.textMain },
  floatingPill: { position: 'absolute', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 },

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

  // Absolute Footer
  footerAbsolute: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 30, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipWrapper: { padding: 10, paddingLeft: 0 },
  skipText: { fontSize: 16, fontWeight: '700', color: THEME.textMain },
  nextBtnRing: { width: 70, height: 70, borderRadius: 35, borderWidth: 1.5, borderColor: 'rgba(139, 92, 246, 0.4)', justifyContent: 'center', alignItems: 'center' },
  nextBtnFill: { width: 54, height: 54, borderRadius: 27, backgroundColor: THEME.primary, justifyContent: 'center', alignItems: 'center', shadowColor: THEME.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 10 },
});
