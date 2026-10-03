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
import { requestPinAppWidget } from 'react-native-android-widget';

import api from '../api/config';
import messaging from '../utils/messaging';
import { clearAuthData } from '../utils/auth';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';

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
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [shakeLevel, setShakeLevel] = useState('3.5');
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile/');
      setProfile(res.data);
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
            await clearAuthData();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } catch (e) {
            console.error('Logout error:', e);
          }
        },
      },
    ]);
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
    setEditProfileVisible(true);
  };

  const submitEditProfile = async () => {
    if (!editUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }
    setSubmittingProfile(true);
    try {
      const res = await api.post('/profile/', {
        username: editUsername,
        first_name: editFirstName,
        last_name: editLastName,
      });
      if (res.data.status === 'success') {
        Alert.alert('Success', 'Profile updated successfully! 🎉');
        setEditProfileVisible(false);
        fetchProfile();
      } else {
        Alert.alert('Error', res.data.error || 'Failed to update profile');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'An error occurred while updating profile');
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
      <StatusBar style="light" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topBackBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#CBD5E1" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>User Profile</Text>
        </View>
        <TouchableOpacity onPress={openEditProfile} style={styles.topEditBtn} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={17} color="#06B6D4" style={{ marginRight: 4 }} />
          <Text style={styles.topEditText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header Hero ── */}
        <LinearGradient
          colors={['#131B2E', '#0D1424', '#0B0E14']}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.headerGlowCircle} />

          {/* ── Avatar Initial DP with Verified Shield ── */}
          <View style={styles.avatarGlowWrapper}>
            <LinearGradient
              colors={['#6366F1', '#EC4899', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarOuterRing}
            >
              <LinearGradient colors={['#1E1B4B', '#0F172A']} style={styles.avatarInner}>
                <Text style={styles.avatarLetterText}>{initialLetter}</Text>
              </LinearGradient>
            </LinearGradient>
            <View style={styles.avatarBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#10B981" />
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
              <Text style={styles.streakBadgeText}>{memberDays} Days Active</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── SECTION 1: PERSONAL DETAILS CARD ── */}
        <View style={{ marginTop: -16, paddingHorizontal: 16 }}>
          <View style={styles.detailsCard}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="person-circle-outline" size={16} color="#06B6D4" style={{ marginRight: 6 }} />
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

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email / Account</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{email}</Text>
            </View>
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
          {Platform.OS === 'android' && (
            <MenuItem
              ionIcon="grid-outline"
              iconColor="#A855F7"
              label="Home Screen Widget"
              sub="Quickly add expenses from home screen"
              onPress={async () => {
                try {
                  await requestPinAppWidget('AddExpenseWidget');
                } catch (e) {
                  Alert.alert('Notice', 'Your launcher might not support pinning widgets automatically.');
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
        {profile?.username === 'ajay' && (
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

        {/* ── Logout Button ── */}
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
    </SafeAreaView>
  );
}

function MenuItem({ ionIcon, icon, iconColor = '#818CF8', label, sub, badge, badgeColor = '#94A3B8', onPress, showArrow, isLast }) {
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
          <Text style={styles.menuLabel}>{label}</Text>
          {Boolean(sub) && <Text style={styles.menuSub} numberOfLines={1}>{sub}</Text>}
        </View>

        {Boolean(badge) && (
          <View style={[styles.menuBadge, { backgroundColor: badgeColor + '18', borderColor: badgeColor + '35' }]}>
            <Text style={[styles.menuBadgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        )}

        {(onPress || showArrow) && (
          <Ionicons name="chevron-forward" size={16} color="#475569" style={{ marginLeft: 6 }} />
        )}
      </TouchableOpacity>
      {!isLast && <View style={styles.itemDivider} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
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
    backgroundColor: '#0B0E14',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  topEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  topEditText: {
    color: '#06B6D4',
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
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
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
    color: '#FFFFFF',
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
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  usernameChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  usernameChipText: {
    color: '#94A3B8',
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metaBadgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  streakBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Personal Details Card ──
  detailsCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...SHADOW.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.7,
  },
  cardHeaderAction: {
    fontSize: 11.5,
    color: '#06B6D4',
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '500',
  },
  detailValue: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },

  // ── Lifetime Stats Bento ──
  lifetimeCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statLabel: {
    color: '#64748B',
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
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  menuGroupCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    marginHorizontal: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
    color: '#F1F5F9',
    fontSize: 13.5,
    fontWeight: '700',
  },
  menuSub: {
    color: '#64748B',
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginLeft: 48,
  },

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14.5,
    fontWeight: '800',
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.lg,
    padding: 20,
    borderWidth: 1,
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
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  feedbackInput: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    padding: 12,
    color: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  submitFeedbackBtn: {
    backgroundColor: COLORS.cyan,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  submitFeedbackText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
