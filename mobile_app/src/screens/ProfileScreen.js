/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — USER PROFILE & SETTINGS SCREEN
 * Personal Details, Lifetime Stats, Preferences & Security
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  Linking,
  StatusBar as RNStatusBar,
  RefreshControl,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENT_APP_VERSION } from '../utils/versionCheck';

import api from '../api/config';
import { clearAuthData } from '../utils/auth';
import { COLORS, SHADOW } from '../utils/theme';
import { useTheme } from '../theme/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { formatApiError } from '../utils/errors';
import { validateEmail } from '../utils/validation';
import WidgetSelectionModal from '../components/WidgetSelectionModal';
import DeleteAccountModal from '../components/DeleteAccountModal';

export default function ProfileScreen({ navigation }) {
  const { isDark, colors, toggleTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [shakeLevel, setShakeLevel] = useState('disabled');
  const [widgetModalVisible, setWidgetModalVisible] = useState(false);
  const [cachedStats, setCachedStats] = useState(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const userPhone = profile?.phone_number || profile?.whatsapp_number || '';
  const cleanPhone = String(userPhone).replace(/\D/g, '');
  const isAdmin = cleanPhone.endsWith('7905398965') || profile?.is_admin === true;

  // Email verification modal states
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyOtp, setVerifyOtp] = useState('');
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const fetchProfile = async () => {
    try {
      const cached = await AsyncStorage.getItem('user_profile');
      if (cached) {
        setProfile(JSON.parse(cached));
        setLoading(false);
      }
      const res = await api.get('/api/profile/');
      if (res.data) {
        setProfile(res.data);
        AsyncStorage.setItem('user_profile', JSON.stringify(res.data));
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      AsyncStorage.getItem('shake_sensitivity').then((val) => {
        if (val) setShakeLevel(val);
        else setShakeLevel('disabled');
      });
      AsyncStorage.getItem('biometric_enabled').then((val) => {
        setBiometricEnabled(val === 'true');
      });
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
          // 1. Instant local auth wipe
          await clearAuthData();
          // 2. Notify root app auth state immediately
          DeviceEventEmitter.emit('AUTH_STATE_CHANGED', false);
          // 3. Reset navigation
          try {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } catch (e) {
            navigation.navigate('Login');
          }
          // 4. Background server logout without blocking
          api.post('/api/logout/').catch(() => {});
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteModalVisible(true);
  };

  const handleSendEmailVerification = async () => {
    const emailToVerify = profile?.email;
    if (!emailToVerify) {
      Alert.alert('Missing Email', 'Please edit your profile and add an email address first.');
      return;
    }
    setSendingEmailOtp(true);
    try {
      const res = await api.post('/api/auth/send-email-verification/', { email: emailToVerify });
      Alert.alert('Code Sent! 📬', res.data?.message || 'A 6-digit verification code was sent to your email. Please enter the OTP.');
      setVerifyOtp('');
      setVerifyModalVisible(true);
    } catch (error) {
      Alert.alert('Error', formatApiError(error));
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleConfirmEmailOtp = async () => {
    if (!verifyOtp || verifyOtp.trim().length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code received in your email.');
      return;
    }
    setVerifyingEmail(true);
    try {
      const res = await api.post('/api/auth/verify-email/', {
        email: profile?.email,
        otp: verifyOtp.trim(),
      });
      Alert.alert('Verified! 🎉', res.data?.message || 'Your email has been verified.');
      setVerifyModalVisible(false);
      setVerifyOtp('');
      fetchProfile();
    } catch (error) {
      Alert.alert('Verification Failed', formatApiError(error));
    } finally {
      setVerifyingEmail(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please enter your feedback before submitting');
      return;
    }
    setSubmittingFeedback(true);
    try {
      await api.post('/api/feedback/', { text: feedbackText.trim(), feedback: feedbackText.trim(), source: 'app' });
      Alert.alert('Thank You! 🎉', 'Your feedback has been received. We appreciate your support!');
      setFeedbackText('');
      setFeedbackVisible(false);
    } catch (e) {
      Alert.alert('Notice', 'Feedback noted! Thank you.');
      setFeedbackText('');
      setFeedbackVisible(false);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const openEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditUsername(profile?.username || '');
    setEditFirstName(profile?.first_name || '');
    setEditLastName(profile?.last_name || '');
    setEditEmail(profile?.email || '');
    setEditProfileVisible(true);
  };

  const submitEditProfile = async () => {
    if (!editUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }
    if (editEmail.trim()) {
      const emailCheck = validateEmail(editEmail.trim());
      if (!emailCheck.isValid) {
        Alert.alert('Invalid Email', emailCheck.error);
        return;
      }
    }

    setSubmittingProfile(true);

    const newUName = editUsername.trim();
    const newFName = editFirstName.trim();
    const newLName = editLastName.trim();
    const newEMail = editEmail.trim();

    try {
      const res = await api.post('/api/profile/', {
        username: newUName,
        first_name: newFName,
        last_name: newLName,
        email: newEMail,
      });

      // Update state and storage on verified server success
      setProfile((prev) => prev ? ({
        ...prev,
        username: newUName,
        first_name: newFName,
        last_name: newLName,
        email: newEMail,
      }) : prev);

      await AsyncStorage.setItem('username', newUName);
      const fullName = `${newFName} ${newLName}`.trim();
      if (fullName) {
        await AsyncStorage.setItem('full_name', fullName);
      }
      
      DeviceEventEmitter.emit('USERNAME_CHANGED', newUName);

      setEditProfileVisible(false);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      Alert.alert('Success 🎉', res.data?.message || 'Profile updated successfully!');
      fetchProfile();
    } catch (e) {
      console.error('Profile update error:', e);
      Alert.alert('Update Failed', formatApiError(e));
    } finally {
      setSubmittingProfile(false);
    }
  };

  const openLink = (url) => Linking.openURL(url);

  const getShakeText = (level) => {
    if (level === '1.2' || level === '2.0') return 'High';
    if (level === '1.8' || level === '3.5') return 'Medium';
    if (level === '2.6' || level === '5.0') return 'Low';
    return 'Off';
  };

  const toggleShake = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let next = '1.8';
    if (shakeLevel === 'disabled' || shakeLevel === 'off') next = '1.8';
    else if (shakeLevel === '1.8' || shakeLevel === '3.5') next = '1.2';
    else if (shakeLevel === '1.2' || shakeLevel === '2.0') next = '2.6';
    else if (shakeLevel === '2.6' || shakeLevel === '5.0') next = 'disabled';
    else next = 'disabled';

    setShakeLevel(next);
    await AsyncStorage.setItem('shake_sensitivity', next);
    DeviceEventEmitter.emit('shake_sensitivity_changed', next);
  };

  const toggleBiometric = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const LocalAuthentication = require('expo-local-authentication');
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!biometricEnabled) {
        if (!hasHardware || !isEnrolled) {
          Alert.alert('Notice', 'Please set up a Fingerprint, Face ID, or Screen Lock in your phone settings first.');
          return;
        }
        const res = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm Identity to Enable App Lock',
          fallbackLabel: 'Use PIN',
        });
        if (!res.success) return;
      }

      const nextState = !biometricEnabled;
      setBiometricEnabled(nextState);
      await AsyncStorage.setItem('biometric_enabled', nextState ? 'true' : 'false');
      Alert.alert('App Lock', nextState ? 'App Lock enabled successfully! 🔒' : 'App Lock disabled.');
    } catch (e) {
      Alert.alert('Error', 'Could not configure biometric lock.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={COLORS.cyan} size="large" /></View>
      </SafeAreaView>
    );
  }

  const username = profile?.username || 'User';
  const fullName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : username;
  const initialLetter = (fullName ? fullName.charAt(0) : (username ? username.charAt(0) : 'U')).toUpperCase();
  const joined = profile?.joined || '';
  const lifetimeSpent = profile?.lifetime_spent || 0;
  const memberDays = profile?.member_days || 0;
  const budget = profile?.budget || 20000;

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, isDark && { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.topBackBtn, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={isDark ? colors.textPrimary : "#1F2937"} />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, isDark && { color: colors.textPrimary }]}>My Profile & Settings</Text>
        </View>
        <TouchableOpacity onPress={openEditProfile} style={styles.topEditBtn} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={16} color="#2563EB" style={{ marginRight: 4 }} />
          <Text style={styles.topEditText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. SIGNATURE ROYAL BLUE MEMBER CARD (MATCHING ICONIC DASHBOARD THEME) ── */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={isDark ? ['#1E3A8A', '#1D4ED8', '#0F172A'] : ['#2563EB', '#1D4ED8', '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.royalMemberCard}
          >
            {/* Top Row: Gold EMV Chip, Pro Tier Badge & Edit */}
            <View style={styles.cardTopRow}>
              <View style={styles.cardChipSection}>
                <LinearGradient
                  colors={['#FDE68A', '#D97706', '#92400E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.goldEmvChip}
                >
                  <View style={styles.goldChipGrid} />
                </LinearGradient>
                <Ionicons name="wifi" size={17} color="rgba(255,255,255,0.75)" style={{ marginLeft: 8, transform: [{ rotate: '90deg' }] }} />
              </View>

              <View style={styles.cardTierBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#34D399" style={{ marginRight: 4 }} />
                <Text style={styles.cardTierText}>PAISAMITRA PRO</Text>
              </View>

              <TouchableOpacity
                onPress={openEditProfile}
                style={styles.cardEditAction}
                activeOpacity={0.75}
              >
                <Ionicons name="pencil" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.cardEditActionText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Middle Row: User Avatar & Details */}
            <View style={styles.cardUserRow}>
              <View style={styles.cardAvatarOuter}>
                <LinearGradient
                  colors={['#60A5FA', '#93C5FD', '#FFFFFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardAvatarGradient}
                >
                  <View style={styles.cardAvatarInner}>
                    <Text style={styles.cardAvatarLetter}>{initialLetter}</Text>
                  </View>
                </LinearGradient>
                <View style={styles.avatarVerifiedBadge}>
                  <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                </View>
              </View>

              <View style={{ flex: 1, marginLeft: 13 }}>
                <Text style={styles.cardUserName} numberOfLines={1}>{fullName}</Text>
                <View style={styles.cardHandleRow}>
                  <View style={styles.usernamePill}>
                    <Text style={styles.cardHandleText}>@{username}</Text>
                  </View>
                  <View style={styles.cardDot} />
                  <Text style={styles.cardJoinYear}>SINCE {joined ? joined.slice(-4) : '2026'}</Text>
                </View>
              </View>
            </View>

            {/* Bottom Row: Frosted Glass Stats Bar */}
            <View style={styles.cardStatsRow}>
              <View style={styles.cardStatColumn}>
                <Text style={styles.cardStatLabel}>LIFETIME SPENT</Text>
                <Text style={styles.cardStatVal}>₹{Math.round(lifetimeSpent).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.cardStatDivider} />
              <View style={styles.cardStatColumn}>
                <Text style={styles.cardStatLabel}>MONTHLY BUDGET</Text>
                <Text style={styles.cardStatVal}>₹{Math.round(budget).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.cardStatDivider} />
              <View style={styles.cardStatColumn}>
                <Text style={styles.cardStatLabel}>ACTIVE STREAK</Text>
                <Text style={styles.cardStatVal}>{memberDays} {memberDays === 1 ? 'Day' : 'Days'} 🔥</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── 2. FEATURED INTEGRATION: WHATSAPP SMART LOGGER ── */}
        <View style={styles.sectionWrap}>
          <TouchableOpacity
            style={[styles.waHeroBento, isDark && { backgroundColor: '#0B132B', borderColor: 'rgba(37, 211, 102, 0.35)' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const rawPhone = profile?.phone_number || profile?.user_phone || '';
              if (!profile?.whatsapp_linked) {
                if (rawPhone) {
                  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                  Linking.openURL(`https://wa.me/917379053923?text=${encodeURIComponent(`Link ${cleanPhone}`)}`);
                } else {
                  Linking.openURL('https://wa.me/917379053923?text=Link%2091');
                }
              } else {
                Alert.alert(
                  'WhatsApp Expense Bot 🟢',
                  `Your WhatsApp is successfully linked!\n\nText "500 petrol" or "today summary" anytime to +91 7379053923.`,
                  [
                    { text: '💬 Open WhatsApp', onPress: () => Linking.openURL('https://wa.me/917379053923?text=Hi') },
                    {
                      text: '🔄 Re-link Number',
                      onPress: () => {
                        const cleanPhone = (rawPhone || '').replace(/[^0-9]/g, '');
                        Linking.openURL(`https://wa.me/917379053923?text=${encodeURIComponent(`Link ${cleanPhone || '91'}`)}`);
                      },
                    },
                    { text: 'Close', style: 'cancel' },
                  ]
                );
              }
            }}
            activeOpacity={0.88}
          >
            <View style={styles.waHeroTopRow}>
              <View style={styles.waHeroIconWrap}>
                <Ionicons name="logo-whatsapp" size={26} color="#25D366" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.waHeroTitle, isDark && { color: '#FFFFFF' }]}>WhatsApp Smart Logger</Text>
                  <View style={styles.waHeroSpeedBadge}>
                    <Ionicons name="flash" size={10} color="#10B981" />
                    <Text style={styles.waHeroSpeedText}>10X FASTER</Text>
                  </View>
                </View>
                <Text style={[styles.waHeroSubtitle, isDark && { color: '#94A3B8' }]}>
                  {profile?.whatsapp_linked
                    ? 'Active • Log spends by texting "₹150 Chai" or voice notes to bot'
                    : '1-tap connect • Log expenses automatically on WhatsApp'}
                </Text>
              </View>
              <View style={[styles.waHeroStatusPill, { backgroundColor: profile?.whatsapp_linked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                <Text style={[styles.waHeroStatusText, { color: profile?.whatsapp_linked ? '#10B981' : '#F59E0B' }]}>
                  {profile?.whatsapp_linked ? 'ACTIVE' : 'SETUP'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 3. SMART CONTROLS BENTO TILES (2-COLUMN GRID) ── */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, isDark && { color: colors.textSecondary }]}>SMART TOOLS & AUTOMATION</Text>
          <View style={styles.bentoGrid}>
            {/* Tile 1: Daily Budget & Smart Notifications */}
            <TouchableOpacity
              style={[styles.bentoTile, isDark && styles.bentoTileDark]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Notifications');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: 'rgba(99, 102, 241, 0.25)' }]}>
                <Ionicons name="notifications" size={20} color="#6366F1" />
              </View>
              <Text style={[styles.bentoTitle, isDark && { color: colors.textPrimary }]}>Smart Alerts</Text>
              <Text style={[styles.bentoSub, isDark && { color: colors.textSecondary }]}>Morning & night nudges</Text>
              <View style={[styles.bentoPill, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                <Text style={[styles.bentoPillText, { color: '#6366F1' }]}>1-2 / DAY</Text>
              </View>
            </TouchableOpacity>

            {/* Tile 2: App Lock & Biometrics */}
            <TouchableOpacity
              style={[styles.bentoTile, isDark && styles.bentoTileDark]}
              onPress={toggleBiometric}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
                <Ionicons name={biometricEnabled ? 'shield-checkmark' : 'finger-print'} size={20} color="#10B981" />
              </View>
              <Text style={[styles.bentoTitle, isDark && { color: colors.textPrimary }]}>App Lock</Text>
              <Text style={[styles.bentoSub, isDark && { color: colors.textSecondary }]}>Biometric & PIN</Text>
              <View style={[styles.bentoPill, { backgroundColor: biometricEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.15)' }]}>
                <Text style={[styles.bentoPillText, { color: biometricEnabled ? '#10B981' : '#64748B' }]}>
                  {biometricEnabled ? 'ENABLED' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Tile 3: Magic Shake to Add */}
            <TouchableOpacity
              style={[styles.bentoTile, isDark && styles.bentoTileDark]}
              onPress={toggleShake}
              activeOpacity={0.8}
            >
              <View style={[styles.bentoIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.25)' }]}>
                <Ionicons name="phone-portrait" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.bentoTitle, isDark && { color: colors.textPrimary }]}>Magic Shake</Text>
              <Text style={[styles.bentoSub, isDark && { color: colors.textSecondary }]}>Shake phone to add</Text>
              <View style={[styles.bentoPill, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Text style={[styles.bentoPillText, { color: '#F59E0B' }]}>
                  {shakeLevel === 'disabled' || shakeLevel === 'off' ? 'OFF' : getShakeText(shakeLevel).toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Tile 4: Home Screen Widget (Android) or Theme Toggle */}
            {Platform.OS === 'android' ? (
              <TouchableOpacity
                style={[styles.bentoTile, isDark && styles.bentoTileDark]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  AsyncStorage.getItem('dashboard_cache').then(c => {
                    if (c) {
                      try { setCachedStats(JSON.parse(c)?.stats || null); } catch (e) {}
                    }
                  });
                  setWidgetModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.bentoIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.12)', borderColor: 'rgba(168, 85, 247, 0.25)' }]}>
                  <Ionicons name="grid" size={20} color="#A855F7" />
                </View>
                <Text style={[styles.bentoTitle, isDark && { color: colors.textPrimary }]}>Home Widget</Text>
                <Text style={[styles.bentoSub, isDark && { color: colors.textSecondary }]}>Live balance glance</Text>
                <View style={[styles.bentoPill, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                  <Text style={[styles.bentoPillText, { color: '#A855F7' }]}>WIDGET</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.bentoTile, isDark && styles.bentoTileDark]}
                onPress={toggleTheme}
                activeOpacity={0.8}
              >
                <View style={[styles.bentoIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.25)' }]}>
                  <Ionicons name={isDark ? "moon" : "sunny"} size={20} color="#38BDF8" />
                </View>
                <Text style={[styles.bentoTitle, isDark && { color: colors.textPrimary }]}>Appearance</Text>
                <Text style={[styles.bentoSub, isDark && { color: colors.textSecondary }]}>{isDark ? 'Dark Theme' : 'Light Theme'}</Text>
                <View style={[styles.bentoPill, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                  <Text style={[styles.bentoPillText, { color: '#38BDF8' }]}>{isDark ? 'DARK' : 'LIGHT'}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── 4. PREFERENCES & ACCOUNT SETTINGS (CLEAN GROUPED CARD) ── */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, isDark && { color: colors.textSecondary }]}>PREFERENCES & ACCOUNT</Text>
          <View style={[styles.glassListCard, isDark && styles.glassListCardDark]}>
            <MenuItem
              ionIcon={isDark ? "moon" : "sunny-outline"}
              iconColor="#38BDF8"
              label="Theme & Appearance"
              sub={isDark ? "Dark theme active • Tap to switch" : "Clean light theme active • Tap to switch"}
              badge={isDark ? "Dark" : "Light"}
              badgeColor={isDark ? "#38BDF8" : "#94A3B8"}
              rightComponent={<ThemeToggle size="small" />}
              onPress={toggleTheme}
            />
            <MenuItem
              ionIcon={profile?.email_verified ? 'shield-checkmark' : 'mail-outline'}
              iconColor={profile?.email_verified ? '#10B981' : (profile?.email ? '#F59E0B' : '#94A3B8')}
              label="Email Recovery & Verification"
              sub={
                profile?.email
                  ? (profile?.email_verified ? `${profile.email} • Verified` : `${profile.email} • Tap to verify`)
                  : 'Add an email to protect your account'
              }
              badge={profile?.email_verified ? 'Verified' : (profile?.email ? 'Verify' : 'Add')}
              badgeColor={profile?.email_verified ? '#10B981' : (profile?.email ? '#F59E0B' : '#64748B')}
              onPress={() => {
                if (!profile?.email) {
                  openEditProfile();
                } else if (!profile?.email_verified) {
                  handleSendEmailVerification();
                } else {
                  Alert.alert('Email Verified 🛡️', `Your account is safely linked with ${profile.email}`);
                }
              }}
            />
            <MenuItem
              ionIcon="alarm-outline"
              iconColor="#6366F1"
              label="Daily Budget & Reminder Times"
              sub="Morning/night pushes, roast tone, rollover"
              onPress={() => navigation.navigate('Notifications')}
              showArrow
            />
            <MenuItem
              ionIcon="sparkles-outline"
              iconColor="#8B5CF6"
              label="Interactive Feature Tour"
              sub="Guided tour of WhatsApp, Widgets, Center '+' & Tools"
              badge="Explore"
              badgeColor="#8B5CF6"
              onPress={() => {
                navigation.navigate('Home');
                setTimeout(() => {
                  DeviceEventEmitter.emit('SHOW_APP_TOUR');
                }, 250);
              }}
            />
            <MenuItem
              ionIcon="chatbubble-ellipses-outline"
              iconColor="#EC4899"
              label="Submit Feedback & Ideas"
              sub="Help us improve PaisaMitra"
              onPress={() => setFeedbackVisible(true)}
            />
            <MenuItem
              ionIcon="globe-outline"
              iconColor="#3B82F6"
              label="Open Web Dashboard"
              sub="expense-coach-prxm.onrender.com"
              onPress={() => openLink('https://expense-coach-prxm.onrender.com')}
              showArrow
            />
            <MenuItem
              ionIcon="cloud-download-outline"
              iconColor="#10B981"
              label="Check for Updates"
              sub="EAS Live OTA sync"
              badge={`v${CURRENT_APP_VERSION}`}
              badgeColor="#10B981"
              onPress={async () => {
                try {
                  const update = await Updates.checkForUpdateAsync();
                  if (update.isAvailable) {
                    Alert.alert('Update Available', 'Downloading new features...');
                    await Updates.fetchUpdateAsync();
                    Alert.alert('Success', 'Update applied! Restarting...', [
                      { text: 'OK', onPress: () => Updates.reloadAsync() },
                    ]);
                  } else {
                    Alert.alert('No Update Available', 'Your app is up to date! 🎉');
                  }
                } catch (error) {
                  Alert.alert('No Update Available', 'Your app is up to date.');
                }
              }}
              isLast
            />
          </View>
        </View>

        {/* ── 5. LEGAL & POLICIES ── */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, isDark && { color: colors.textSecondary }]}>LEGAL & POLICIES</Text>
          <View style={[styles.glassListCard, isDark && styles.glassListCardDark]}>
            <MenuItem
              ionIcon="shield-checkmark-outline"
              iconColor="#10B981"
              label="Privacy Policy"
              sub="Encryption, data protection & GDPR rights"
              onPress={() => navigation.navigate('PrivacyPolicy')}
              showArrow
            />
            <MenuItem
              ionIcon="newspaper-outline"
              iconColor="#38BDF8"
              label="Terms of Service"
              sub="Terms of use & financial disclaimer"
              onPress={() => navigation.navigate('Terms')}
              showArrow
              isLast
            />
          </View>
        </View>

        {/* ── ADMIN PANEL ── */}
        {isAdmin && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: '#EAB308' }]}>ADMIN CONSOLE</Text>
            <View style={[styles.glassListCard, isDark && styles.glassListCardDark]}>
              <MenuItem
                ionIcon="shield-checkmark-outline"
                iconColor="#EAB308"
                label="Admin Panel"
                sub="Manage platform users & database"
                onPress={() => navigation.navigate('AdminPanel')}
                showArrow
                isLast
              />
            </View>
          </View>
        )}

        {/* ── 6. DANGER ZONE ── */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, { color: '#EF4444' }]}>DANGER ZONE</Text>
          <View style={[styles.glassListCard, { borderColor: isDark ? 'rgba(239, 68, 68, 0.28)' : '#FECACA', backgroundColor: isDark ? 'rgba(239, 68, 68, 0.06)' : '#FFFFFF' }]}>
            <MenuItem
              ionIcon="trash-outline"
              iconColor="#EF4444"
              label="Delete Account"
              sub="Permanently delete all expenses, goals & personal data"
              onPress={handleDeleteAccount}
              showArrow
              danger
              isLast
            />
          </View>
        </View>

        {/* ── Logout Button ── */}
        <TouchableOpacity style={[styles.logoutBtn, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)', elevation: 0, shadowOpacity: 0 }]} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={19} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* ── Developer Footer ── */}
        <View style={styles.devFooterWrap}>
          <TouchableOpacity
            style={styles.devFooterRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Linking.openURL('https://github.com/ajay160380');
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="code-slash" size={13} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={[styles.devFooterText, isDark && { color: colors.textSecondary }]}>
              Crafted with ❤️ by <Text style={styles.devFooterLink}>Ajay Vishwakarma</Text>
            </Text>
            <Ionicons name="logo-github" size={13} color={isDark ? "#94A3B8" : "#4B5563"} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <View style={styles.devMiniLinks}>
            <TouchableOpacity
              style={[styles.miniChip, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://ajay-vishwakarmaa.netlify.app');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={12} color="#0284C7" style={{ marginRight: 5 }} />
              <Text style={[styles.miniChipText, isDark && { color: colors.textSecondary }]}>Portfolio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.miniChip, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://www.linkedin.com/in/ajay-vishwakarma-71649129a/');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-linkedin" size={12} color="#0A66C2" style={{ marginRight: 5 }} />
              <Text style={[styles.miniChipText, isDark && { color: colors.textSecondary }]}>LinkedIn</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Feedback Modal ── */}
      <Modal visible={feedbackVisible} transparent animationType="slide" onRequestClose={() => setFeedbackVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && { color: colors.textPrimary }]}>Submit Feedback</Text>
              <TouchableOpacity onPress={() => setFeedbackVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? colors.textPrimary : COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.feedbackInput, isDark && { backgroundColor: colors.elevated, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Tell us how we can improve..."
              placeholderTextColor={isDark ? colors.textMuted : COLORS.textMuted}
              multiline
              numberOfLines={4}
              value={feedbackText}
              onChangeText={setFeedbackText}
            />
            <TouchableOpacity
              style={[styles.submitFeedbackBtn, submittingFeedback && { opacity: 0.7 }]}
              onPress={submitFeedback}
              disabled={submittingFeedback}
            >
              {submittingFeedback ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitFeedbackText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Profile Modal ── */}
      <Modal visible={editProfileVisible} transparent animationType="slide" onRequestClose={() => setEditProfileVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && { color: colors.textPrimary }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? colors.textPrimary : COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: isDark ? colors.textSecondary : COLORS.textMuted, marginBottom: 5 }}>Username</Text>
              <TextInput
                style={[styles.feedbackInput, { minHeight: 50, padding: 12, marginBottom: 0 }, isDark && { backgroundColor: colors.elevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={editUsername}
                onChangeText={setEditUsername}
                autoCapitalize="none"
              />
            </View>
            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: isDark ? colors.textSecondary : COLORS.textMuted, marginBottom: 5 }}>Email Address</Text>
              <TextInput
                style={[styles.feedbackInput, { minHeight: 50, padding: 12, marginBottom: 0 }, isDark && { backgroundColor: colors.elevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@example.com"
                placeholderTextColor={isDark ? colors.textMuted : COLORS.textMuted}
              />
            </View>
            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: isDark ? colors.textSecondary : COLORS.textMuted, marginBottom: 5 }}>First Name</Text>
              <TextInput
                style={[styles.feedbackInput, { minHeight: 50, padding: 12, marginBottom: 0 }, isDark && { backgroundColor: colors.elevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={editFirstName}
                onChangeText={setEditFirstName}
              />
            </View>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: isDark ? colors.textSecondary : COLORS.textMuted, marginBottom: 5 }}>Last Name</Text>
              <TextInput
                style={[styles.feedbackInput, { minHeight: 50, padding: 12, marginBottom: 0 }, isDark && { backgroundColor: colors.elevated, borderColor: colors.border, color: colors.textPrimary }]}
                value={editLastName}
                onChangeText={setEditLastName}
              />
            </View>
            <TouchableOpacity
              style={[styles.submitFeedbackBtn, submittingProfile && { opacity: 0.7 }]}
              onPress={submitEditProfile}
              disabled={submittingProfile}
            >
              {submittingProfile ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitFeedbackText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Email Verification OTP Modal ── */}
      <Modal visible={verifyModalVisible} transparent animationType="slide" onRequestClose={() => setVerifyModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && { color: colors.textPrimary }]}>Verify Email Code</Text>
              <TouchableOpacity onPress={() => setVerifyModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? colors.textPrimary : COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: isDark ? colors.textSecondary : COLORS.textMuted, fontSize: 13, marginBottom: 16 }}>
              We sent a 6-digit confirmation code to {profile?.email}. Enter it below:
            </Text>
            <TextInput
              style={[styles.feedbackInput, { minHeight: 54, fontSize: 22, letterSpacing: 6, textAlign: 'center', fontWeight: '800' }, isDark && { backgroundColor: colors.elevated, borderColor: colors.border, color: colors.textPrimary }]}
              value={verifyOtp}
              onChangeText={setVerifyOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="••••••"
              placeholderTextColor={isDark ? colors.textMuted : COLORS.textMuted}
            />
            <TouchableOpacity
              style={[styles.submitFeedbackBtn, { backgroundColor: '#10B981', marginTop: 16 }, verifyingEmail && { opacity: 0.7 }]}
              onPress={handleConfirmEmailOtp}
              disabled={verifyingEmail}
            >
              {verifyingEmail ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitFeedbackText}>Verify & Confirm Email</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <WidgetSelectionModal
        visible={widgetModalVisible}
        onClose={() => setWidgetModalVisible(false)}
        stats={cachedStats}
        isDark={isDark}
        colors={colors}
      />

      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

function MenuItem({ ionIcon, icon, iconColor = '#2563EB', label, sub, badge, badgeColor = '#94A3B8', onPress, showArrow, isLast, danger = false, rightComponent }) {
  const { isDark, colors } = useTheme();

  const handlePress = () => {
    if (!onPress) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    onPress();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={handlePress}
        activeOpacity={onPress ? 0.72 : 1}
      >
        <View style={[styles.menuIconBox, { backgroundColor: iconColor + '15', borderColor: iconColor + '2E' }]}>
          {ionIcon ? (
            <Ionicons name={ionIcon} size={20} color={iconColor} />
          ) : (
            <Text style={{ fontSize: 18 }}>{icon}</Text>
          )}
        </View>

        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.menuLabel, isDark && { color: colors.textPrimary }, danger && { color: '#EF4444' }]}>{label}</Text>
          {Boolean(sub) && <Text style={[styles.menuSub, isDark && { color: colors.textSecondary }, danger && { color: '#F87171' }]} numberOfLines={1}>{sub}</Text>}
        </View>

        {Boolean(badge) && (
          <View style={[styles.menuBadge, { backgroundColor: badgeColor + '18', borderColor: badgeColor + '38' }]}>
            <Text style={[styles.menuBadgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        )}

        {rightComponent ? (
          rightComponent
        ) : (
          (onPress || showArrow) && (
            <Ionicons name="chevron-forward" size={17} color={danger ? '#EF4444' : (isDark ? '#64748B' : '#94A3B8')} style={{ marginLeft: 6 }} />
          )
        )}
      </TouchableOpacity>
      {!isLast && <View style={[styles.itemDivider, isDark && { backgroundColor: 'rgba(255,255,255,0.06)' }]} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 8 : 42) : 0,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  topEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.22)',
  },
  topEditText: {
    color: '#2563EB',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // ── Royal Member Card ──
  cardContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  royalMemberCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardChipSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goldEmvChip: {
    width: 32,
    height: 24,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  goldChipGrid: {
    width: '100%',
    height: '100%',
    borderWidth: 0.6,
    borderColor: 'rgba(0,0,0,0.25)',
    borderRadius: 2,
  },
  cardTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  cardTierText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  cardEditAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 10,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  cardEditActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardAvatarOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    position: 'relative',
  },
  cardAvatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarLetter: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1D4ED8',
  },
  cardUserName: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardHandleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  usernamePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  cardHandleText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  cardDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 7,
  },
  cardJoinYear: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  cardStatColumn: {
    flex: 1,
    alignItems: 'center',
  },
  cardStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  cardStatLabel: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  cardStatVal: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // ── Hero WhatsApp Bento ──
  waHeroBento: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#D1FAE5',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  waHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  waHeroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waHeroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  waHeroSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2.5,
    lineHeight: 15,
  },
  waHeroSpeedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    gap: 3,
  },
  waHeroSpeedText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#059669',
  },
  waHeroStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 6,
  },
  waHeroStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },

  // ── 2-Column Bento Grid ──
  sectionWrap: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.9,
    marginBottom: 9,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bentoTile: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 13,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  bentoTileDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bentoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 9,
  },
  bentoTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  bentoSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
    lineHeight: 14,
  },
  bentoPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 7,
  },
  bentoPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ── Glass List Card ──
  glassListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  glassListCardDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.2,
    marginRight: 13,
  },
  menuLabel: {
    color: '#0F172A',
    fontSize: 14.2,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  menuSub: {
    color: '#64748B',
    fontSize: 11.5,
    marginTop: 2.5,
    lineHeight: 15,
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 4,
  },
  menuBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 53,
  },

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14.5,
    fontWeight: '800',
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  feedbackInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    color: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submitFeedbackBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitFeedbackText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // ── Developer Footer ──
  devFooterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    marginBottom: 6,
  },
  devFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  devFooterText: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '500',
  },
  devFooterLink: {
    color: '#2563EB',
    fontWeight: '700',
  },
  devMiniLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 10,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  miniChipText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '600',
  },
});
