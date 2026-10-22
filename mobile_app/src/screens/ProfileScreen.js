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
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPinWidget } from 'react-native-android-widget';

import api from '../api/config';
import messaging from '../utils/messaging';
import { clearAuthData } from '../utils/auth';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';
import { formatApiError } from '../utils/errors';
import { validateEmail } from '../utils/validation';

export default function ProfileScreen({ navigation }) {
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
  const [shakeLevel, setShakeLevel] = useState('3.5');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

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
      const res = await api.get('/profile/');
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
        else setShakeLevel('3.5');
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
            await api.post('/api/logout/').catch(() => {});
          } catch (e) {}
          await clearAuthData();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert(
      '⚠️ Delete Account Forever?',
      'This will permanently delete your account, expenses, budgets, savings goals, subscriptions, and all personal records. This action is irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              const res = await api.post('/api/auth/delete-account/');
              await clearAuthData();
              Alert.alert('Account Deleted', res.data?.message || 'Your account has been deleted.');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } catch (error) {
              Alert.alert('Deletion Failed', formatApiError(error));
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
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
      await api.post('/feedback/', { feedback: feedbackText });
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
    try {
      const res = await api.post('/profile/', {
        username: editUsername.trim(),
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        email: editEmail.trim(),
      });
      if (res.data.status === 'success') {
        Alert.alert('Success', 'Profile updated successfully! 🎉');
        setEditProfileVisible(false);
        fetchProfile();
      } else {
        Alert.alert('Error', res.data.error || 'Failed to update profile');
      }
    } catch (e) {
      Alert.alert('Error', formatApiError(e, 'An error occurred while updating profile'));
    } finally {
      setSubmittingProfile(false);
    }
  };

  const openLink = (url) => Linking.openURL(url);

  const getShakeText = (level) => {
    if (level === '1.2' || level === '2.0') return 'High (Very Sensitive)';
    if (level === '1.8' || level === '3.5') return 'Medium (Normal)';
    if (level === '2.6' || level === '5.0') return 'Low (Hard Shake)';
    return 'Disabled';
  };

  const toggleShake = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let next = '1.8';
    if (shakeLevel === '1.8' || shakeLevel === '3.5') next = '1.2';
    else if (shakeLevel === '1.2' || shakeLevel === '2.0') next = '2.6';
    else if (shakeLevel === '2.6' || shakeLevel === '5.0') next = 'disabled';
    else next = '1.8';

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
  const totalTxns = profile?.total_txns || 0;
  const memberDays = profile?.member_days || 0;
  const budget = profile?.budget || 20000;
  const email = profile?.email || `${username.toLowerCase()}@user.expensetracker`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topBackBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>User Profile</Text>
        </View>
        <TouchableOpacity onPress={openEditProfile} style={styles.topEditBtn} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={17} color="#FF6B35" style={{ marginRight: 4 }} />
          <Text style={styles.topEditText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header Hero ── */}
        <LinearGradient
          colors={['#F5F3FF', '#EDE9FE', '#F7F7FB']}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.headerGlowCircle} />

          {/* ── Avatar Initial DP with Verified Shield ── */}
          <View style={styles.avatarGlowWrapper}>
            <LinearGradient
              colors={['#7C3AED', '#FF6B35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarOuterRing}
            >
              <View style={[styles.avatarInner, { backgroundColor: '#FFFFFF' }]}>
                <Text style={[styles.avatarLetterText, { color: '#7C3AED' }]}>{initialLetter}</Text>
              </View>
            </LinearGradient>
            <View style={styles.avatarBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#22C55E" />
            </View>
          </View>

          <Text style={styles.profileName}>{fullName}</Text>
          <View style={styles.usernameChip}>
            <Text style={styles.usernameChipText}>@{username}</Text>
          </View>

          <View style={styles.profileMetaRow}>
            <View style={styles.metaBadge}>
              <Ionicons name="calendar-outline" size={12} color="#94A3B8" style={{ marginRight: 5 }} />
              <Text style={styles.metaBadgeText}>Since {joined || '2026'}</Text>
            </View>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.streakBadgeText}>{memberDays} {memberDays === 1 ? 'Day' : 'Days'} Active</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── SECTION 1: PERSONAL DETAILS CARD ── */}
        <View style={{ marginTop: -16, paddingHorizontal: 16 }}>
          <View style={styles.detailsCard}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="person-circle-outline" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                <Text style={styles.cardHeaderTitle}>PERSONAL DETAILS</Text>
              </View>
              <TouchableOpacity onPress={openEditProfile} activeOpacity={0.7}>
                <Text style={styles.cardHeaderAction}>Update →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{fullName}</Text>
            </View>
            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Username</Text>
              <Text style={styles.detailValue}>@{username}</Text>
            </View>
            <View style={styles.detailDivider} />

            {Boolean(profile?.phone_number) && !String(profile.phone_number).startsWith('g_') && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Registered Mobile</Text>
                  <View style={styles.detailValueContainer}>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {profile.phone_number.startsWith('91') && profile.phone_number.length === 12
                        ? `+91 ${profile.phone_number.slice(2)}`
                        : profile.phone_number}
                    </Text>
                    <View
                      style={[
                        styles.emailChip,
                        {
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        },
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={11}
                        color="#10B981"
                        style={{ marginRight: 3 }}
                      />
                      <Text
                        style={[
                          styles.emailChipText,
                          { color: '#10B981' },
                        ]}
                      >
                        Verified
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.detailDivider} />
              </>
            )}

            {/* Email Address Row with status badge & tap to verify */}
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => {
                if (!profile?.email) {
                  openEditProfile();
                } else if (!profile?.email_verified) {
                  handleSendEmailVerification();
                } else {
                  Alert.alert('Email Verified 🛡️', `Your account is safely linked with ${profile.email}`);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.detailLabel}>Email</Text>
              <View style={styles.detailValueContainer}>
                <Text
                  style={[
                    styles.detailValue,
                    !profile?.email && { color: '#94A3B8', fontWeight: '500' }
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {profile?.email || 'Add Email'}
                </Text>
                <View
                  style={[
                    styles.emailChip,
                    {
                      backgroundColor: profile?.email_verified
                        ? 'rgba(16, 185, 129, 0.15)'
                        : (profile?.email ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)'),
                    },
                  ]}
                >
                  <Ionicons
                    name={profile?.email_verified ? 'shield-checkmark' : (profile?.email ? 'alert-circle' : 'add')}
                    size={11}
                    color={profile?.email_verified ? '#10B981' : (profile?.email ? '#F59E0B' : '#06B6D4')}
                    style={{ marginRight: 3 }}
                  />
                  <Text
                    style={[
                      styles.emailChipText,
                      {
                        color: profile?.email_verified ? '#10B981' : (profile?.email ? '#F59E0B' : '#06B6D4'),
                      },
                    ]}
                  >
                    {profile?.email_verified ? 'Verified' : (profile?.email ? 'Verify' : 'Add')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Monthly Budget</Text>
              <Text style={[styles.detailValue, { color: '#10B981', fontWeight: '800' }]}>
                ₹{Math.round(budget).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── SECTION 2: LIFETIME STATS BENTO GRID ── */}
        <View style={styles.sectionHeaderWrap}>
          <Ionicons name="stats-chart-outline" size={13} color="#818CF8" style={{ marginRight: 6 }} />
          <Text style={styles.sectionHeaderTitle}>LIFETIME SNAPSHOT</Text>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <View style={styles.lifetimeCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBox, { backgroundColor: 'rgba(244, 63, 94, 0.12)', borderColor: 'rgba(244, 63, 94, 0.25)' }]}>
                  <Ionicons name="wallet-outline" size={17} color="#F43F5E" />
                </View>
                <Text style={styles.statValue}>₹{Math.round(lifetimeSpent).toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>LIFETIME SPENT</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIconBox, { backgroundColor: 'rgba(129, 140, 248, 0.12)', borderColor: 'rgba(129, 140, 248, 0.25)' }]}>
                  <Ionicons name="receipt-outline" size={17} color="#818CF8" />
                </View>
                <Text style={styles.statValue}>{totalTxns}</Text>
                <Text style={styles.statLabel}>TRANSACTIONS</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.25)' }]}>
                  <Ionicons name="pie-chart-outline" size={17} color="#06B6D4" />
                </View>
                <Text style={styles.statValue}>₹{Math.round(budget).toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>MONTHLY BUDGET</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.25)' }]}>
                  <Ionicons name="flame-outline" size={17} color="#F59E0B" />
                </View>
                <Text style={styles.statValue}>{memberDays}</Text>
                <Text style={styles.statLabel}>DAYS ACTIVE</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── SECTION 3: PREFERENCES & SECURITY ── */}
        <View style={styles.sectionHeaderWrap}>
          <Ionicons name="shield-checkmark-outline" size={13} color="#10B981" style={{ marginRight: 6 }} />
          <Text style={styles.sectionHeaderTitle}>PREFERENCES & SECURITY</Text>
        </View>
        <View style={styles.menuGroupCard}>
          <MenuItem
            ionIcon={profile?.email_verified ? 'shield-checkmark' : 'mail-outline'}
            iconColor={profile?.email_verified ? '#10B981' : (profile?.email ? '#F59E0B' : '#94A3B8')}
            label="Email Verification"
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
            ionIcon={biometricEnabled ? 'shield-checkmark' : 'shield-outline'}
            iconColor="#10B981"
            label="App Lock (Biometric)"
            sub={biometricEnabled ? 'Biometric security is active' : 'Protect app with fingerprint/PIN'}
            badge={biometricEnabled ? 'Enabled' : 'Off'}
            badgeColor={biometricEnabled ? '#10B981' : '#64748B'}
            onPress={toggleBiometric}
          />
          <MenuItem
            ionIcon="phone-portrait-outline"
            iconColor="#F59E0B"
            label="Shake Sensitivity"
            sub={`Magic Shake: ${getShakeText(shakeLevel)}`}
            badge={getShakeText(shakeLevel).split(' ')[0]}
            badgeColor="#F59E0B"
            onPress={toggleShake}
          />
          <MenuItem
            ionIcon="notifications-outline"
            iconColor="#38BDF8"
            label="Push Notifications"
            sub="Instant spending alerts & daily reminders"
            onPress={async () => {
              try {
                if (Platform.OS === 'android' && Platform.Version >= 33) {
                  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
                }
                const authStatus = await messaging().requestPermission();
                if (
                  authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                  authStatus === messaging.AuthorizationStatus.PROVISIONAL
                ) {
                  await messaging().subscribeToTopic('all_users');
                  Alert.alert('Success', 'Push notifications enabled! 🔔');
                } else {
                  Alert.alert('Notice', 'Notification permission was denied.');
                }
              } catch (e) {
                Alert.alert('Error', 'Could not enable notifications.');
              }
            }}
          />
          <MenuItem
            ionIcon="logo-whatsapp"
            iconColor="#25D366"
            label="WhatsApp Expense Bot"
            sub={
              profile?.whatsapp_linked
                ? 'Linked to +91 7379053923 • Active'
                : '1-tap link to log expenses via WhatsApp'
            }
            badge={profile?.whatsapp_linked ? 'Linked' : 'Not Linked'}
            badgeColor={profile?.whatsapp_linked ? '#10B981' : '#F59E0B'}
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
                    {
                      text: '💬 Chat on WhatsApp',
                      onPress: () => Linking.openURL('https://wa.me/917379053923?text=Hi'),
                    },
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
          />
          {Platform.OS === 'android' && (
            <MenuItem
              ionIcon="grid-outline"
              iconColor="#A855F7"
              label="Home Screen Widget"
              sub="Quickly add expenses from home screen"
              onPress={async () => {
                try {
                  const pinned = await requestPinWidget({ widgetName: 'AddExpenseWidget' });
                  if (!pinned) {
                    Alert.alert(
                      'Pin Widget Manually',
                      'Agar automatic pin support nahi hua, toh phone ki Home Screen par 2 second touch & hold karein -> "Widgets" select karein -> "Expense Tracker" widget ko drag karein.',
                      [{ text: 'Theek hai' }]
                    );
                  }
                } catch (e) {
                  Alert.alert(
                    'Pin Widget Manually',
                    'Home Screen par 2 second touch & hold karein -> "Widgets" select karein -> "Expense Tracker" widget ko drag karein.',
                    [{ text: 'Theek hai' }]
                  );
                }
              }}
            />
          )}
          <MenuItem
            ionIcon="cloud-download-outline"
            iconColor="#06B6D4"
            label="Check for Updates"
            sub="Check for latest EAS OTA update"
            badge="v1.3.0"
            badgeColor="#06B6D4"
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
          />
          <MenuItem
            ionIcon="chatbubble-ellipses-outline"
            iconColor="#EC4899"
            label="Submit Feedback"
            sub="Share your ideas & suggestions"
            onPress={() => setFeedbackVisible(true)}
          />
          <MenuItem
            ionIcon="globe-outline"
            iconColor="#3B82F6"
            label="Web Dashboard"
            sub="smart-expense-coach.onrender.com"
            onPress={() => openLink('https://smart-expense-coach.onrender.com')}
            showArrow
            isLast
          />
        </View>

        {/* ── ADMIN PANEL ── */}
        {isAdmin && (
          <>
            <View style={styles.sectionHeaderWrap}>
              <Ionicons name="key-outline" size={13} color="#EAB308" style={{ marginRight: 6 }} />
              <Text style={styles.sectionHeaderTitle}>ADMIN CONSOLE</Text>
            </View>
            <View style={styles.menuGroupCard}>
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
          </>
        )}

        {/* ── SECTION 4: ABOUT DEVELOPER ── */}
        <View style={styles.sectionHeaderWrap}>
          <Ionicons name="code-slash-outline" size={13} color="#818CF8" style={{ marginRight: 6 }} />
          <Text style={styles.sectionHeaderTitle}>ABOUT DEVELOPER</Text>
        </View>
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={styles.devCard}>
            <View style={styles.devTopRow}>
              <LinearGradient
                colors={['#6366F1', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.devAvatarGrad}
              >
                <Text style={styles.devAvatarText}>AV</Text>
              </LinearGradient>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.devName}>Ajay Vishwakarma</Text>
                  <Ionicons name="checkmark-circle" size={15} color="#06B6D4" style={{ marginLeft: 5 }} />
                </View>
                <Text style={styles.devRole}>Creator & Lead Engineer</Text>
              </View>
            </View>

            <View style={styles.devLinksGrid}>
              <TouchableOpacity
                style={styles.devLinkPill}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Linking.openURL('https://github.com/ajay160380');
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-github" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.devLinkText}>GitHub</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.devLinkPill}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Linking.openURL('https://ajay-vishwakarmaa.netlify.app');
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="globe-outline" size={15} color="#38BDF8" style={{ marginRight: 6 }} />
                <Text style={styles.devLinkText}>Portfolio</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.devLinkPill}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Linking.openURL('https://www.linkedin.com/in/ajay-vishwakarma-71649129a/');
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-linkedin" size={15} color="#0A66C2" style={{ marginRight: 6 }} />
                <Text style={styles.devLinkText}>LinkedIn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── SECTION 5: LEGAL & RESOURCES (Items 16, 17, 19) ── */}
        <View style={styles.sectionHeaderWrap}>
          <Ionicons name="document-text-outline" size={13} color="#818CF8" style={{ marginRight: 6 }} />
          <Text style={styles.sectionHeaderTitle}>LEGAL & POLICIES</Text>
        </View>
        <View style={styles.menuGroupCard}>
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
          />
          <MenuItem
            ionIcon="sparkles-outline"
            iconColor="#F59E0B"
            label="App Tour & Onboarding"
            sub="Explore features & interactive onboarding"
            onPress={() => navigation.navigate('Welcome', { fromProfile: true })}
            showArrow
            isLast
          />
        </View>

        {/* ── SECTION 6: DANGER ZONE (Item 18) ── */}
        <View style={styles.sectionHeaderWrap}>
          <Ionicons name="warning-outline" size={13} color="#EF4444" style={{ marginRight: 6 }} />
          <Text style={[styles.sectionHeaderTitle, { color: '#EF4444' }]}>DANGER ZONE</Text>
        </View>
        <View style={[styles.menuGroupCard, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
          <MenuItem
            ionIcon="trash-bin-outline"
            iconColor="#EF4444"
            label={deletingAccount ? "Deleting Account..." : "Delete Account"}
            sub="Permanently delete all expenses, goals & personal data"
            onPress={handleDeleteAccount}
            showArrow
            danger
            isLast
          />
        </View>

        {/* ── Logout Button (Item 1) ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={19} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Feedback Modal ── */}
      <Modal visible={feedbackVisible} transparent animationType="slide" onRequestClose={() => setFeedbackVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Feedback</Text>
              <TouchableOpacity onPress={() => setFeedbackVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Tell us how we can improve..."
              placeholderTextColor={COLORS.textMuted}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: COLORS.textMuted, marginBottom: 5 }}>Username</Text>
              <TextInput
                style={[styles.feedbackInput, { minHeight: 50, padding: 12, marginBottom: 0 }]}
                value={editUsername}
                onChangeText={setEditUsername}
                autoCapitalize="none"
              />
            </View>
            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: COLORS.textMuted, marginBottom: 5 }}>Email Address</Text>
              <TextInput
                style={[styles.feedbackInput, { minHeight: 50, padding: 12, marginBottom: 0 }]}
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@example.com"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={{ marginBottom: 15 }}>
              <Text style={{ color: COLORS.textMuted, marginBottom: 5 }}>First Name</Text>
              <TextInput
                style={[styles.feedbackInput, { minHeight: 50, padding: 12, marginBottom: 0 }]}
                value={editFirstName}
                onChangeText={setEditFirstName}
              />
            </View>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: COLORS.textMuted, marginBottom: 5 }}>Last Name</Text>
              <TextInput
                style={[styles.feedbackInput, { minHeight: 50, padding: 12, marginBottom: 0 }]}
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

      {/* ── Email Verification OTP Modal (Item 3) ── */}
      <Modal visible={verifyModalVisible} transparent animationType="slide" onRequestClose={() => setVerifyModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Email Code</Text>
              <TouchableOpacity onPress={() => setVerifyModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 16 }}>
              We sent a 6-digit confirmation code to {profile?.email}. Enter it below:
            </Text>
            <TextInput
              style={[styles.feedbackInput, { minHeight: 54, fontSize: 22, letterSpacing: 6, textAlign: 'center', fontWeight: '800' }]}
              value={verifyOtp}
              onChangeText={setVerifyOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="••••••"
              placeholderTextColor={COLORS.textMuted}
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
    </SafeAreaView>
  );
}

function MenuItem({ ionIcon, icon, iconColor = '#818CF8', label, sub, badge, badgeColor = '#94A3B8', onPress, showArrow, isLast, danger = false }) {
  return (
    <>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={[styles.menuIconBox, { backgroundColor: iconColor + '18', borderColor: iconColor + '30' }]}>
          {ionIcon ? (
            <Ionicons name={ionIcon} size={19} color={iconColor} />
          ) : (
            <Text style={{ fontSize: 18 }}>{icon}</Text>
          )}
        </View>

        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.menuLabel, danger && { color: '#DC2626' }]}>{label}</Text>
          {Boolean(sub) && <Text style={[styles.menuSub, danger && { color: '#EF4444' }]} numberOfLines={1}>{sub}</Text>}
        </View>

        {Boolean(badge) && (
          <View style={[styles.menuBadge, { backgroundColor: badgeColor + '18', borderColor: badgeColor + '35' }]}>
            <Text style={[styles.menuBadgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        )}

        {(onPress || showArrow) && (
          <Ionicons name="chevron-forward" size={16} color={danger ? '#EF4444' : '#475569'} style={{ marginLeft: 6 }} />
        )}
      </TouchableOpacity>
      {!isLast && <View style={styles.itemDivider} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FB',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 8 : 42) : 0,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1 },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F7F7FB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    borderColor: '#E5E7EB',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  topEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.25)',
  },
  topEditText: {
    color: '#FF6B35',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // ── Profile Header Hero ──
  profileHeader: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlowCircle: {
    position: 'absolute',
    top: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    opacity: 0.8,
  },
  avatarGlowWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarOuterRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.md,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetterText: {
    color: '#7C3AED',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  profileName: {
    color: '#1F2937',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  usernameChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  usernameChipText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metaBadgeText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.25)',
  },
  streakBadgeText: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Personal Details Card ──
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.7,
  },
  cardHeaderAction: {
    fontSize: 11.5,
    color: '#FF6B35',
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 0,
    marginRight: 10,
  },
  detailValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  detailValue: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
    flexShrink: 0,
  },
  emailChipText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // ── Lifetime Stats Bento ──
  lifetimeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    padding: 10,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 6,
  },
  statValue: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // ── Menu Section ──
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  menuGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginHorizontal: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  menuLabel: {
    color: '#1F2937',
    fontSize: 13.5,
    fontWeight: '700',
  },
  menuSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  menuBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 4,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 48,
  },

  // ── Developer Card ──
  devCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  devTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  devAvatarGrad: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  devName: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '800',
  },
  devRole: {
    color: '#6B7280',
    fontSize: 11.5,
    marginTop: 2,
  },
  devLinksGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  devLinkPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 9,
    borderRadius: 12,
  },
  devLinkText: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: '#7C3AED',
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
