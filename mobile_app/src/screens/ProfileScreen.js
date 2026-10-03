/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — PROFILE SCREEN
 * User stats, settings, gamification, logout
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, 
  KeyboardAvoidingView, ActivityIndicator, Image, StyleSheet, Dimensions, 
  Platform, Alert, Animated, FlatList, Modal, Switch, Pressable, Keyboard, 
  SectionList, DeviceEventEmitter, RefreshControl, Linking, StatusBar as RNStatusBar 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import Logo from '../components/Logo';
import { GlassCard, SectionHeader } from '../components/SharedComponents';




import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';
import messaging from '../utils/messaging';

import api from '../api/config';
import { clearAuthData } from '../utils/auth';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';
import { requestPinAppWidget } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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

  useFocusEffect(useCallback(() => {
    fetchProfile();
    AsyncStorage.getItem('shake_sensitivity').then(val => {
      if (val) setShakeLevel(val);
      else setShakeLevel('3.5');
    });
    AsyncStorage.getItem('biometric_enabled').then(val => {
      setBiometricEnabled(val === 'true');
    });
  }, []));
  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setUploadingImage(true);
        const localUri = result.assets[0].uri;
        const filename = localUri.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        const formData = new FormData();
        formData.append('photo', { uri: localUri, name: filename, type });

        const uploadRes = await api.post('/api/profile/upload-photo/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadRes.data.status === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Add timestamp to bust cache so the image refreshes instantly
          const newPicUrl = uploadRes.data.profile_picture + '?t=' + Date.now();
          setProfile({ ...profile, profile_picture: newPicUrl });
          Alert.alert('Success', 'Profile photo updated successfully!');
        }
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Image pick/upload error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await clearAuthData();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return;
    setSubmittingFeedback(true);
    try {
      const res = await api.post('/api/submit-feedback/', { text: feedbackText, source: 'app' });
      if (res.data.status === 'success') {
        Alert.alert('Success', 'Feedback submitted successfully!');
        setFeedbackVisible(false);
        setFeedbackText('');
      } else {
        Alert.alert('Error', res.data.message || 'Failed to submit feedback');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'An error occurred while submitting feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const openEditProfile = () => {
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
        last_name: editLastName
      });
      if (res.data.status === 'success') {
        Alert.alert('Success', 'Profile updated successfully!');
        setEditProfileVisible(false);
        fetchProfile();
      } else {
        Alert.alert('Error', res.data.error || 'Failed to update profile');
      }
    } catch (e) {
      console.error(e);
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
        if (!res.success) {
          return;
        }
      }

      const nextState = !biometricEnabled;
      setBiometricEnabled(nextState);
      await AsyncStorage.setItem('biometric_enabled', nextState ? 'true' : 'false');
      Alert.alert('App Lock', nextState ? 'App Lock enabled successfully! 🔒' : 'App Lock disabled.');
    } catch (e) {
      console.log('Error toggling biometric:', e);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* ── Top Navigation Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBackBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Profile</Text>
        <TouchableOpacity onPress={openEditProfile} style={styles.topEditBtn} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={19} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header ── */}
        <LinearGradient colors={['#2E0854', '#1A0E38', '#0B0E14']} style={styles.profileHeader}>
          {/* Subtle Ambient Glow Orb */}
          <View style={styles.headerGlowCircle} />

          {/* ── Avatar Initial DP (First Letter DP, No Photo Picker) ── */}
          <View style={styles.avatarGlowWrapper}>
            <LinearGradient
              colors={['#A888FF', '#EC4899', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarOuterRing}
            >
              <LinearGradient
                colors={['#1E1B4B', '#0F172A']}
                style={styles.avatarInner}
              >
                <Text style={styles.avatarLetterText}>{initialLetter}</Text>
              </LinearGradient>
            </LinearGradient>
          </View>

          <Text style={styles.profileName}>{fullName}</Text>
          <View style={styles.usernameChip}>
            <Text style={styles.usernameChipText}>@{username}</Text>
          </View>

          <View style={styles.profileMetaRow}>
            <View style={styles.metaBadge}>
              <Ionicons name="calendar-outline" size={13} color="#94A3B8" style={{ marginRight: 5 }} />
              <Text style={styles.metaBadgeText}>Since {joined || '2026'}</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🌟 {memberDays} Days Active</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Lifetime Stats ── */}
        <View style={{ marginTop: -25, paddingHorizontal: 16 }}>
          <GlassCard style={styles.lifetimeCard}>
            <View style={styles.statsHeaderRow}>
              <View style={styles.statsHeaderLeft}>
                <Ionicons name="stats-chart" size={15} color="#06B6D4" style={{ marginRight: 6 }} />
                <Text style={styles.statsCardTitle}>LIFETIME METRICS</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <LinearGradient colors={['rgba(239, 68, 68, 0.18)', 'rgba(239, 68, 68, 0.05)']} style={styles.statIconBox}>
                  <Text style={styles.statEmoji}>💸</Text>
                </LinearGradient>
                <Text style={styles.statValue}>₹{Math.round(lifetimeSpent).toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>TOTAL SPENT</Text>
              </View>

              <View style={styles.statItem}>
                <LinearGradient colors={['rgba(99, 102, 241, 0.18)', 'rgba(99, 102, 241, 0.05)']} style={styles.statIconBox}>
                  <Text style={styles.statEmoji}>📝</Text>
                </LinearGradient>
                <Text style={styles.statValue}>{totalTxns}</Text>
                <Text style={styles.statLabel}>TRANSACTIONS</Text>
              </View>

              <View style={styles.statItem}>
                <LinearGradient colors={['rgba(245, 158, 11, 0.18)', 'rgba(245, 158, 11, 0.05)']} style={styles.statIconBox}>
                  <Text style={styles.statEmoji}>💰</Text>
                </LinearGradient>
                <Text style={styles.statValue}>₹{Math.round(budget).toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>MONTHLY BUDGET</Text>
              </View>

              <View style={styles.statItem}>
                <LinearGradient colors={['rgba(16, 185, 129, 0.18)', 'rgba(16, 185, 129, 0.05)']} style={styles.statIconBox}>
                  <Text style={styles.statEmoji}>📅</Text>
                </LinearGradient>
                <Text style={styles.statValue}>{memberDays}</Text>
                <Text style={styles.statLabel}>DAYS ACTIVE</Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* ── Menu Section ── */}
        <SectionHeader title="⚡ Quick Actions (Auto-Updated!)" />
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <MenuItem
            icon="✏️"
            ionIcon="person-outline"
            label="Edit Profile"
            sub="Change your name and username"
            onPress={openEditProfile}
          />
          <MenuItem
            icon="📱"
            ionIcon="chatbubble-ellipses-outline"
            label="AI Financial Coach"
            sub="Chat with ExpenseTracker AI"
            onPress={() => navigation.navigate('AIChat')}
          />
          <MenuItem
            icon="📝"
            ionIcon="document-text-outline"
            label="Notepad"
            sub="Save lists & notes easily"
            onPress={() => navigation.navigate('Notepad')}
          />
          <MenuItem
            icon="📊"
            ionIcon="analytics-outline"
            label="Analytics"
            sub="Detailed spending analysis"
            onPress={() => navigation.navigate('Analytics')}
          />
          <MenuItem
            icon="🎯"
            ionIcon="flag-outline"
            label="Savings Goals"
            sub="Track your financial goals"
            onPress={() => navigation.navigate('SavingsGoals')}
          />
          <MenuItem
            icon="📱"
            ionIcon="people-outline"
            label="Expense Split"
            sub="Split bills with friends"
            onPress={() => navigation.navigate('ExpenseSplit')}
          />
          <MenuItem
            icon="📅"
            ionIcon="calendar-outline"
            label="Subscriptions"
            sub="Track recurring payments"
            onPress={() => navigation.navigate('Subscriptions')}
          />
          <MenuItem
            icon="🎤"
            ionIcon="mic-outline"
            label="Voice Expense"
            sub="Add expense via text/voice"
            onPress={() => navigation.navigate('VoiceExpense')}
          />
        </GlassCard>

        <SectionHeader title="💬 Support" />
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <MenuItem
            icon="📝"
            ionIcon="chatbox-ellipses-outline"
            label="Submit Feedback"
            sub="Tell us how we can improve"
            onPress={() => setFeedbackVisible(true)}
          />
          <MenuItem
            icon="🔄"
            ionIcon="sync-outline"
            label="Check for Updates"
            sub="Update to the latest version"
            onPress={async () => {
              try {
                const Updates = require('expo-updates');
                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                  Alert.alert("Update Available", "Downloading new features...");
                  await Updates.fetchUpdateAsync();
                  Alert.alert("Success", "Update applied! Restarting...", [
                    { text: "OK", onPress: () => Updates.reloadAsync() }
                  ]);
                } else {
                  Alert.alert("No Update Available", "Your app is up to date.");
                }
              } catch (error) {
                // Fallback for local builds that don't support manual OTA checks
                Alert.alert("No Update Available", "Your app is up to date.");
              }
            }}
          />
          <MenuItem
            icon="🔔"
            ionIcon="notifications-outline"
            label="Enable Notifications"
            sub="Turn on push notifications"
            onPress={async () => {
              try {
                if (Platform.OS === 'android' && Platform.Version >= 33) {
                  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
                }
                const authStatus = await messaging().requestPermission();
                if (authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL) {
                  await messaging().subscribeToTopic('all_users');
                  Alert.alert("Success", "Push notifications enabled!");
                } else {
                  Alert.alert("Notice", "Notification permission was denied.");
                }
              } catch (e) {
                console.error(e);
                Alert.alert("Error", "Could not enable notifications.");
              }
            }}
          />
          {Platform.OS === 'android' && (
            <MenuItem
              icon="📱"
              ionIcon="apps-outline"
              label="Add Home Screen Widget"
              sub="Quickly add expenses from home screen"
              onPress={async () => {
                try {
                  await requestPinAppWidget('AddExpenseWidget');
                } catch (e) {
                  console.log('Error pinning widget:', e);
                  Alert.alert('Notice', 'Your launcher might not support pinning widgets automatically.');
                }
              }}
            />
          )}
          <MenuItem
            icon="📳"
            ionIcon="options-outline"
            label="Shake Sensitivity"
            sub={`Current: ${getShakeText(shakeLevel)}`}
            onPress={toggleShake}
          />
          <MenuItem
            icon="🔒"
            ionIcon={biometricEnabled ? "lock-closed" : "lock-open-outline"}
            label="App Lock (Biometric)"
            sub={biometricEnabled ? "Enabled" : "Disabled"}
            onPress={toggleBiometric}
          />
        </GlassCard>

        {/* ── App Info ── */}
        <SectionHeader title="ℹ️ About" />
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <MenuItem
            ionIcon="globe-outline"
            label="Web Dashboard"
            sub="smart-expense-coach.onrender.com"
            onPress={() => openLink('https://smart-expense-coach.onrender.com')}
            showArrow
          />
          <MenuItem
            ionIcon="logo-github"
            label="GitHub"
            sub="github.com/ajay160380"
            onPress={() => openLink('https://github.com/ajay160380')}
            showArrow
          />
          <MenuItem
            ionIcon="information-circle-outline"
            label="App Version"
            sub={`v1.3.0 • Channel: ${Updates.channel || 'production'} — Built with ❤️ by Ajay`}
          />
        </GlassCard>

        {/* ── Admin Panel ── */}
        {profile?.username === 'ajay' && (
          <>
            <SectionHeader title="👑 Admin" />
            <GlassCard style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
              <MenuItem
                icon="🛡️"
                ionIcon="shield-checkmark-outline"
                label="Admin Panel"
                sub="Manage users natively"
                onPress={() => navigation.navigate('AdminPanel')}
                showArrow
              />
            </GlassCard>
          </>
        )}

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
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
              style={[styles.submitFeedbackBtn, submittingFeedback && {opacity: 0.7}]} 
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
              style={[styles.submitFeedbackBtn, submittingProfile && {opacity: 0.7}]} 
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

function MenuItem({ icon, ionIcon, label, sub, onPress, showArrow }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.menuIconBox}>
        {ionIcon ? (
          <Ionicons name={ionIcon} size={20} color={COLORS.primary} />
        ) : (
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        {sub && <Text style={styles.menuSub}>{sub}</Text>}
      </View>
      {(onPress || showArrow) && (
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg, 
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 8 : 42) : 0 
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1 },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2E0854',
  },
  topBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  topEditBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 136, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 136, 255, 0.25)',
  },

  // ── Profile Header ──
  profileHeader: { 
    alignItems: 'center', 
    paddingTop: 10,
    paddingBottom: 48, 
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlowCircle: {
    position: 'absolute',
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(168, 136, 255, 0.12)',
  },
  avatarGlowWrapper: {
    marginBottom: 14,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarOuterRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetterText: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
  },
  profileName: { 
    color: '#FFFFFF', 
    fontSize: 23, 
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  usernameChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  usernameChipText: {
    color: '#A888FF',
    fontSize: 13,
    fontWeight: '700',
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
  },
  metaBadgeText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  streakBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  streakBadgeText: { color: '#FBBF24', fontSize: 11, fontWeight: '700' },

  // ── Lifetime Stats ──
  lifetimeCard: {
    padding: 16,
    borderRadius: 20,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  statsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsCardTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  statsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  statItem: { 
    width: '48%', 
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center', 
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statEmoji: { fontSize: 20 },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#94A3B8', fontSize: 9.5, marginTop: 4, fontWeight: '700', letterSpacing: 0.6 },

  // ── Menu Item ──
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  menuIconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(168,136,255,0.1)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  menuLabel: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  menuSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 24, paddingVertical: 14,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.red + '33',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  logoutText: { color: COLORS.red, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.bg, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: 24, minHeight: 300 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold' },
  feedbackInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md, padding: 16, color: COLORS.textPrimary, fontSize: 16, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: 20 },
  submitFeedbackBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: RADIUS.md, alignItems: 'center' },
  submitFeedbackText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
