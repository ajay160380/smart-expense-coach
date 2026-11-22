/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — USER PROFILE & SETTINGS SCREEN
 * Clean, High-End Minimalist Fintech Design
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
import { COLORS } from '../utils/theme';
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
      if (cached && !profile) {
        setProfile(JSON.parse(cached));
        setLoading(false);
      }
      const res = await api.get('/api/profile/');
      if (res.data) {
        const fullProfile = {
          ...res.data,
          full_name: res.data.full_name || `${res.data.first_name || ''} ${res.data.last_name || ''}`.trim() || res.data.username,
        };
        setProfile(fullProfile);
        AsyncStorage.setItem('user_profile', JSON.stringify(fullProfile));
        if (res.data.username) {
          AsyncStorage.setItem('username', res.data.username);
        }
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
          await clearAuthData();
          DeviceEventEmitter.emit('AUTH_STATE_CHANGED', false);
          try {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } catch (e) {
            navigation.navigate('Login');
          }
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

      const updatedFullName = `${newFName} ${newLName}`.trim() || newUName;
      const updatedProfile = {
        ...(profile || {}),
        username: newUName,
        first_name: newFName,
        last_name: newLName,
        full_name: updatedFullName,
        email: newEMail,
      };

      setProfile(updatedProfile);

      await AsyncStorage.multiSet([
        ['username', newUName],
        ['full_name', updatedFullName],
        ['user_profile', JSON.stringify(updatedProfile)],
      ]);
      
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
      <SafeAreaView style={[styles.container, isDark && { backgroundColor: '#0B0F19' }]}>
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
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
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: '#0B0F19' }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Sleek Minimal Top Bar ── */}
      <View style={[styles.topBar, isDark && styles.topBarDark]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.topBackBtn, isDark && styles.topBackBtnDark]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? '#F1F5F9' : '#0F172A'} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, isDark && { color: '#F8FAFC' }]}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. PREMIUM USER IDENTITY PROFILE CARD ── */}
        <View style={styles.profileCardWrap}>
          <View style={[styles.profileCard, isDark && styles.profileCardDark]}>
            {/* Top Identity Block */}
            <View style={styles.profileMainRow}>
              <View style={styles.avatarWrap}>
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8', '#1E40AF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarLetter}>{initialLetter}</Text>
                </LinearGradient>
                <View style={styles.verifiedDot}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.profileInfoCol}>
                <Text style={[styles.profileFullName, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                  {fullName}
                </Text>
                <View style={styles.usernameMetaRow}>
                  <Text style={[styles.profileHandleText, isDark && { color: '#94A3B8' }]}>
                    @{username}
                  </Text>
                  <View style={styles.metaDividerDot} />
                  <Text style={[styles.profileJoinedText, isDark && { color: '#64748B' }]}>
                    Member since {joined ? joined.slice(-4) : '2026'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={openEditProfile}
                style={[styles.editPillBtn, isDark && styles.editPillBtnDark]}
                activeOpacity={0.75}
              >
                <Ionicons name="pencil" size={13} color={isDark ? '#60A5FA' : '#2563EB'} style={{ marginRight: 4 }} />
                <Text style={[styles.editPillText, isDark && { color: '#60A5FA' }]}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Separator */}
            <View style={[styles.profileCardDivider, isDark && { backgroundColor: 'rgba(255,255,255,0.08)' }]} />

            {/* Financial Highlights Bar */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={[styles.statNum, isDark && { color: '#F8FAFC' }]}>
                  ₹{Math.round(lifetimeSpent).toLocaleString('en-IN')}
                </Text>
                <Text style={[styles.statDesc, isDark && { color: '#64748B' }]}>LIFETIME SPENT</Text>
              </View>

              <View style={[styles.statVerticalDivider, isDark && { backgroundColor: 'rgba(255,255,255,0.08)' }]} />

              <View style={styles.statCol}>
                <Text style={[styles.statNum, { color: '#10B981' }]}>
                  ₹{Math.round(budget).toLocaleString('en-IN')}
                </Text>
                <Text style={[styles.statDesc, isDark && { color: '#64748B' }]}>MONTHLY BUDGET</Text>
              </View>

              <View style={[styles.statVerticalDivider, isDark && { backgroundColor: 'rgba(255,255,255,0.08)' }]} />

              <View style={styles.statCol}>
                <Text style={[styles.statNum, { color: '#F59E0B' }]}>
                  {memberDays} {memberDays === 1 ? 'Day' : 'Days'} 🔥
                </Text>
                <Text style={[styles.statDesc, isDark && { color: '#64748B' }]}>ACTIVE STREAK</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 2. WHATSAPP EXPENSE BOT BANNER ── */}
        <View style={styles.sectionWrap}>
          <TouchableOpacity
            style={[styles.waBanner, isDark && styles.waBannerDark]}
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
                      text: '🔄 Re-link Phone Number',
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
            activeOpacity={0.85}
          >
            <View style={styles.waIconBox}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.waTitle, isDark && { color: '#F8FAFC' }]}>WhatsApp Expense Bot</Text>
              <Text style={[styles.waSubtitle, isDark && { color: '#94A3B8' }]}>
                {profile?.whatsapp_linked ? 'Active • Log spends by texting "₹150 Chai"' : '1-Tap connect to log spends on WhatsApp'}
              </Text>
            </View>
            <View style={[styles.waStatusBadge, { backgroundColor: profile?.whatsapp_linked ? 'rgba(37, 211, 102, 0.15)' : 'rgba(37, 99, 235, 0.15)' }]}>
              <Text style={[styles.waStatusText, { color: profile?.whatsapp_linked ? '#25D366' : '#3B82F6' }]}>
                {profile?.whatsapp_linked ? 'Linked ✓' : 'Connect ›'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 3. SMART AUTOMATION & CONTROLS ── */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, isDark && { color: '#64748B' }]}>SMART AUTOMATION</Text>
          <View style={[styles.groupedCard, isDark && styles.groupedCardDark]}>
            <SettingsRow
              icon="notifications"
              iconColor="#6366F1"
              title="Smart Spending Alerts"
              subtitle="Automated morning & night nudges"
              badge="Active"
              badgeColor="#6366F1"
              onPress={() => navigation.navigate('Notifications')}
            />
            <SettingsRow
              icon={biometricEnabled ? "shield-checkmark" : "finger-print"}
              iconColor="#10B981"
              title="App Lock & Security"
              subtitle="Biometric Face ID / Fingerprint / PIN"
              badge={biometricEnabled ? "Enabled" : "Off"}
              badgeColor={biometricEnabled ? "#10B981" : "#64748B"}
              onPress={toggleBiometric}
            />
            <SettingsRow
              icon="phone-portrait"
              iconColor="#F59E0B"
              title="Magic Shake to Add"
              subtitle="Shake your phone to quickly log expense"
              badge={shakeLevel === 'disabled' || shakeLevel === 'off' ? 'Off' : getShakeText(shakeLevel)}
              badgeColor={shakeLevel === 'disabled' || shakeLevel === 'off' ? '#64748B' : '#F59E0B'}
              onPress={toggleShake}
            />
            {Platform.OS === 'android' && (
              <SettingsRow
                icon="grid"
                iconColor="#A855F7"
                title="Home Screen Widget"
                subtitle="Live expense & balance glance on home screen"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  AsyncStorage.getItem('dashboard_cache').then(c => {
                    if (c) {
                      try { setCachedStats(JSON.parse(c)?.stats || null); } catch (e) {}
                    }
                  });
                  setWidgetModalVisible(true);
                }}
                isLast
              />
            )}
          </View>
        </View>

        {/* ── 4. PREFERENCES & ACCOUNT ── */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, isDark && { color: '#64748B' }]}>PREFERENCES & ACCOUNT</Text>
          <View style={[styles.groupedCard, isDark && styles.groupedCardDark]}>
            <SettingsRow
              icon={isDark ? "moon" : "sunny"}
              iconColor="#38BDF8"
              title="Theme & Appearance"
              subtitle={isDark ? "Dark theme active" : "Light theme active"}
              rightComponent={<ThemeToggle size="small" />}
              onPress={toggleTheme}
            />
            <SettingsRow
              icon={profile?.email_verified ? 'shield-checkmark' : 'mail'}
              iconColor={profile?.email_verified ? '#10B981' : (profile?.email ? '#F59E0B' : '#38BDF8')}
              title="Email Verification"
              subtitle={
                profile?.email
                  ? (profile?.email_verified ? `${profile.email} • Verified` : `${profile.email} • Tap to verify`)
                  : 'Add an email to protect your account'
              }
              badge={profile?.email_verified ? 'Verified' : (profile?.email ? 'Verify' : 'Add')}
              badgeColor={profile?.email_verified ? '#10B981' : (profile?.email ? '#F59E0B' : '#38BDF8')}
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
            <SettingsRow
              icon="sparkles"
              iconColor="#8B5CF6"
              title="Interactive Feature Tour"
              subtitle="Step-by-step walkthrough of features"
              onPress={() => {
                navigation.navigate('Home');
                setTimeout(() => {
                  DeviceEventEmitter.emit('SHOW_APP_TOUR');
                }, 250);
              }}
            />
            <SettingsRow
              icon="chatbubble-ellipses"
              iconColor="#EC4899"
              title="Submit Feedback & Ideas"
              subtitle="Help us improve PaisaMitra"
              onPress={() => setFeedbackVisible(true)}
            />
            <SettingsRow
              icon="globe"
              iconColor="#3B82F6"
              title="Web Dashboard"
              subtitle="expense-coach-prxm.onrender.com"
              onPress={() => openLink('https://expense-coach-prxm.onrender.com')}
            />
            <SettingsRow
              icon="cloud-download"
              iconColor="#10B981"
              title="Check for Updates"
              subtitle="EAS Live OTA sync"
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

        {/* ── 5. LEGAL & SECURITY ── */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, isDark && { color: '#64748B' }]}>LEGAL & POLICIES</Text>
          <View style={[styles.groupedCard, isDark && styles.groupedCardDark]}>
            <SettingsRow
              icon="shield-checkmark"
              iconColor="#10B981"
              title="Privacy Policy"
              subtitle="Encryption, data protection & GDPR rights"
              onPress={() => navigation.navigate('PrivacyPolicy')}
            />
            <SettingsRow
              icon="newspaper"
              iconColor="#38BDF8"
              title="Terms of Service"
              subtitle="Terms of use & financial disclaimer"
              onPress={() => navigation.navigate('Terms')}
              isLast
            />
          </View>
        </View>

        {/* ── ADMIN PANEL (IF ADMIN) ── */}
        {isAdmin && (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: '#EAB308' }]}>ADMIN CONSOLE</Text>
            <View style={[styles.groupedCard, isDark && styles.groupedCardDark]}>
              <SettingsRow
                icon="key"
                iconColor="#EAB308"
                title="Admin Panel"
                subtitle="Manage platform users & database"
                onPress={() => navigation.navigate('AdminPanel')}
                isLast
              />
            </View>
          </View>
        )}

        {/* ── 6. DANGER ZONE ── */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionHeading, { color: '#EF4444' }]}>DANGER ZONE</Text>
          <View style={[styles.groupedCard, isDark ? { backgroundColor: '#131B2E', borderColor: 'rgba(239, 68, 68, 0.25)' } : { borderColor: '#FECACA' }]}>
            <SettingsRow
              icon="trash"
              iconColor="#EF4444"
              title="Delete Account"
              subtitle="Permanently delete all expenses & account data"
              danger
              onPress={handleDeleteAccount}
              isLast
            />
          </View>
        </View>

        {/* ── 7. SIGN OUT BUTTON ── */}
        <View style={styles.logoutWrap}>
          <TouchableOpacity
            style={[styles.logoutBtn, isDark && styles.logoutBtnDark]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={19} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* ── 8. DEVELOPER SIGNATURE FOOTER ── */}
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
            <Text style={[styles.devFooterText, isDark && { color: '#64748B' }]}>
              Crafted with ❤️ by <Text style={styles.devFooterLink}>Ajay Vishwakarma</Text>
            </Text>
            <Ionicons name="logo-github" size={13} color={isDark ? "#94A3B8" : "#4B5563"} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <View style={styles.devMiniLinks}>
            <TouchableOpacity
              style={[styles.miniChip, isDark && styles.miniChipDark]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://ajay-vishwakarmaa.netlify.app');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={12} color="#0284C7" style={{ marginRight: 5 }} />
              <Text style={[styles.miniChipText, isDark && { color: '#94A3B8' }]}>Portfolio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.miniChip, isDark && styles.miniChipDark]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL('https://www.linkedin.com/in/ajay-vishwakarma-71649129a/');
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-linkedin" size={12} color="#0A66C2" style={{ marginRight: 5 }} />
              <Text style={[styles.miniChipText, isDark && { color: '#94A3B8' }]}>LinkedIn</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Feedback Modal ── */}
      <Modal visible={feedbackVisible} transparent animationType="slide" onRequestClose={() => setFeedbackVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && { color: '#F8FAFC' }]}>Submit Feedback</Text>
              <TouchableOpacity onPress={() => setFeedbackVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#F1F5F9' : '#1F2937'} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.feedbackInput, isDark && styles.feedbackInputDark]}
              placeholder="Tell us how we can improve..."
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
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
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && { color: '#F8FAFC' }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#F1F5F9' : '#1F2937'} />
              </TouchableOpacity>
            </View>
            <View style={{ marginBottom: 15 }}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>Username</Text>
              <TextInput
                style={[styles.textInput, isDark && styles.textInputDark]}
                value={editUsername}
                onChangeText={setEditUsername}
                autoCapitalize="none"
              />
            </View>
            <View style={{ marginBottom: 15 }}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>Email Address</Text>
              <TextInput
                style={[styles.textInput, isDark && styles.textInputDark]}
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@example.com"
                placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
              />
            </View>
            <View style={{ marginBottom: 15 }}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>First Name</Text>
              <TextInput
                style={[styles.textInput, isDark && styles.textInputDark]}
                value={editFirstName}
                onChangeText={setEditFirstName}
              />
            </View>
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>Last Name</Text>
              <TextInput
                style={[styles.textInput, isDark && styles.textInputDark]}
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

      {/* ── Email Verification Modal ── */}
      <Modal visible={verifyModalVisible} transparent animationType="slide" onRequestClose={() => setVerifyModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && { color: '#F8FAFC' }]}>Verify Email Code</Text>
              <TouchableOpacity onPress={() => setVerifyModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#F1F5F9' : '#1F2937'} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 13, marginBottom: 16 }}>
              We sent a 6-digit confirmation code to {profile?.email}. Enter it below:
            </Text>
            <TextInput
              style={[styles.textInput, { minHeight: 54, fontSize: 22, letterSpacing: 6, textAlign: 'center', fontWeight: '800' }, isDark && styles.textInputDark]}
              value={verifyOtp}
              onChangeText={setVerifyOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="••••••"
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
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

function SettingsRow({ icon, iconColor = '#2563EB', title, subtitle, badge, badgeColor = '#94A3B8', onPress, isLast, danger = false, rightComponent }) {
  const { isDark } = useTheme();

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
        style={styles.settingsRow}
        onPress={handlePress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={[styles.rowIconBox, { backgroundColor: iconColor + '16' }]}>
          <Ionicons name={icon} size={19} color={iconColor} />
        </View>

        <View style={styles.rowTextCol}>
          <Text style={[styles.rowTitle, isDark && { color: '#F8FAFC' }, danger && { color: '#EF4444' }]}>
            {title}
          </Text>
          {Boolean(subtitle) && (
            <Text style={[styles.rowSubtitle, isDark && { color: '#64748B' }, danger && { color: '#F87171' }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {Boolean(badge) && (
          <View style={[styles.rowBadge, { backgroundColor: badgeColor + '18' }]}>
            <Text style={[styles.rowBadgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        )}

        {rightComponent ? (
          rightComponent
        ) : (
          onPress && (
            <Ionicons name="chevron-forward" size={17} color={danger ? '#EF4444' : (isDark ? '#475569' : '#94A3B8')} style={{ marginLeft: 6 }} />
          )
        )}
      </TouchableOpacity>
      {!isLast && <View style={[styles.rowDivider, isDark && { backgroundColor: 'rgba(255,255,255,0.06)' }]} />}
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
  topBarDark: {
    backgroundColor: '#0B0F19',
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  topBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topBackBtnDark: {
    backgroundColor: '#131B2E',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },

  // ── Profile Identity Card ──
  profileCardWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  profileCardDark: {
    backgroundColor: '#131B2E',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    position: 'relative',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfoCol: {
    flex: 1,
    marginLeft: 14,
  },
  profileFullName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  usernameMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  profileHandleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  metaDividerDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    marginHorizontal: 6,
  },
  profileJoinedText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  editPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  editPillBtnDark: {
    backgroundColor: 'rgba(37, 99, 235, 0.16)',
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  editPillText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  profileCardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 14,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statVerticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  statNum: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  statDesc: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 3,
    letterSpacing: 0.4,
  },

  // ── WhatsApp Banner ──
  waBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1.2,
    borderColor: 'rgba(37, 211, 102, 0.25)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  waBannerDark: {
    backgroundColor: '#131B2E',
    borderColor: 'rgba(37, 211, 102, 0.28)',
  },
  waIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  waSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  waStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 9,
    marginLeft: 6,
  },
  waStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // ── Grouped Sections ──
  sectionWrap: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.9,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  groupedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  groupedCardDark: {
    backgroundColor: '#131B2E',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12.5,
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },
  rowTextCol: {
    flex: 1,
    paddingRight: 6,
  },
  rowTitle: {
    color: '#0F172A',
    fontSize: 14.2,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    color: '#64748B',
    fontSize: 11.5,
    marginTop: 2,
  },
  rowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 4,
  },
  rowBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 49,
  },

  // ── Logout ──
  logoutWrap: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: '#FEE2E2',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  logoutBtnDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14.5,
    fontWeight: '800',
  },

  // ── Developer Signature ──
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
  miniChipDark: {
    backgroundColor: '#131B2E',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  miniChipText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '600',
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalContentDark: {
    backgroundColor: '#131B2E',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 13,
    padding: 12,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 14.5,
  },
  textInputDark: {
    backgroundColor: '#0B0F19',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    color: '#F8FAFC',
  },
  feedbackInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    color: '#0F172A',
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feedbackInputDark: {
    backgroundColor: '#0B0F19',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    color: '#F8FAFC',
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
});
