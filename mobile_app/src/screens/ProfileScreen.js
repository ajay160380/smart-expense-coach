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

      {/* ── Top Navigation Bar (Clean & Seamless) ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.topBackBtn} 
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={19} color="#CBD5E1" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Profile</Text>
        </View>
        <TouchableOpacity onPress={openEditProfile} style={styles.topEditBtn} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={18} color="#06B6D4" />
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
          {/* Subtle Ambient Glow Orb */}
          <View style={styles.headerGlowCircle} />

          {/* ── Avatar Initial DP with Verified Shield ── */}
          <View style={styles.avatarGlowWrapper}>
            <LinearGradient
              colors={['#6366F1', '#EC4899', '#06B6D4']}
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

        {/* ── Lifetime Stats Bento Grid ── */}
        <View style={{ marginTop: -20, paddingHorizontal: 16 }}>
          <View style={styles.lifetimeCard}>
            <View style={styles.statsHeaderRow}>
              <View style={styles.statsHeaderLeft}>
                <Ionicons name="stats-chart" size={14} color="#06B6D4" style={{ marginRight: 6 }} />
                <Text style={styles.statsCardTitle}>LIFETIME METRICS</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="sparkles" size={11} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedText}>Live Sync</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.statIconBox, { backgroundColor: 'rgba(244, 63, 94, 0.12)', borderColor: 'rgba(244, 63, 94, 0.25)' }]}>
                  <Ionicons name="wallet-outline" size={18} color="#F43F5E" />
                </View>
                <Text style={styles.statValue}>₹{Math.round(lifetimeSpent).toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>LIFETIME SPENT</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIconBox, { backgroundColor: 'rgba(129, 140, 248, 0.12)', borderColor: 'rgba(129, 140, 248, 0.25)' }]}>
                  <Ionicons name="receipt-outline" size={18} color="#818CF8" />
                </View>
                <Text style={styles.statValue}>{totalTxns}</Text>
                <Text style={styles.statLabel}>TRANSACTIONS</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.25)' }]}>
                  <Ionicons name="pie-chart-outline" size={18} color="#06B6D4" />
                </View>
                <Text style={styles.statValue}>₹{Math.round(budget).toLocaleString('en-IN')}</Text>
                <Text style={styles.statLabel}>MONTHLY BUDGET</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.25)' }]}>
                  <Ionicons name="flame-outline" size={18} color="#F59E0B" />
                </View>
                <Text style={styles.statValue}>{memberDays}</Text>
                <Text style={styles.statLabel}>DAYS ACTIVE</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── WORKSPACE & TOOLS ── */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionHeaderTitle}>WORKSPACE & TOOLS</Text>
        </View>
        <View style={styles.menuGroupCard}>
          <MenuItem
            ionIcon="person-outline"
            iconColor="#06B6D4"
            label="Edit Profile"
            sub="Update name and username"
            onPress={openEditProfile}
          />
          <MenuItem
            ionIcon="sparkles-outline"
            iconColor="#818CF8"
            label="AI Financial Coach"
            sub="Chat with ExpenseTracker AI"
            onPress={() => navigation.navigate('AIChat')}
          />
          <MenuItem
            ionIcon="document-text-outline"
            iconColor="#F472B6"
            label="Personal Notepad"
            sub="Save lists, memos & thoughts"
            onPress={() => navigation.navigate('Notepad')}
          />
          <MenuItem
            ionIcon="bar-chart-outline"
            iconColor="#10B981"
            label="Analytics & Trends"
            sub="Detailed spending analysis"
            onPress={() => navigation.navigate('Analytics')}
          />
          <MenuItem
            ionIcon="trophy-outline"
            iconColor="#F59E0B"
            label="Savings Goals"
            sub="Track milestone targets & progress"
            onPress={() => navigation.navigate('SavingsGoals')}
          />
          <MenuItem
            ionIcon="people-outline"
            iconColor="#A78BFA"
            label="Expense Split"
            sub="Split bills with friends"
            onPress={() => navigation.navigate('ExpenseSplit')}
          />
          <MenuItem
            ionIcon="repeat-outline"
            iconColor="#38BDF8"
            label="Subscriptions"
            sub="Track recurring payments"
            onPress={() => navigation.navigate('Subscriptions')}
          />
          <MenuItem
            ionIcon="mic-outline"
            iconColor="#FB7185"
            label="Voice Expense"
            sub="Add expense via text/voice"
            onPress={() => navigation.navigate('VoiceExpense')}
            isLast
          />
        </View>

        {/* ── PREFERENCES & SECURITY ── */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionHeaderTitle}>PREFERENCES & SECURITY</Text>
        </View>
        <View style={styles.menuGroupCard}>
          <MenuItem
            ionIcon={biometricEnabled ? "shield-checkmark" : "shield-outline"}
            iconColor="#10B981"
            label="App Lock (Biometric)"
            sub={biometricEnabled ? "Biometric security is active" : "Protect app with fingerprint/PIN"}
            badge={biometricEnabled ? "Enabled" : "Off"}
            badgeColor={biometricEnabled ? "#10B981" : "#64748B"}
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
            label="Enable Notifications"
            sub="Turn on push alerts & reminders"
            onPress={async () => {
              try {
                if (Platform.OS === 'android' && Platform.Version >= 33) {
                  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
                }
                const authStatus = await messaging().requestPermission();
                if (authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL) {
                  await messaging().subscribeToTopic('all_users');
                  Alert.alert("Success", "Push notifications enabled! 🔔");
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
              ionIcon="grid-outline"
              iconColor="#A855F7"
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
            ionIcon="cloud-download-outline"
            iconColor="#06B6D4"
            label="Check for Updates"
            sub="Update to the latest version"
            badge="v1.3.0"
            badgeColor="#06B6D4"
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
                Alert.alert("No Update Available", "Your app is up to date.");
              }
            }}
          />
          <MenuItem
            ionIcon="chatbubble-ellipses-outline"
            iconColor="#EC4899"
            label="Submit Feedback"
            sub="Tell us how we can improve"
            onPress={() => setFeedbackVisible(true)}
            isLast
          />
        </View>

        {/* ── ABOUT & SYSTEM ── */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionHeaderTitle}>ABOUT & SYSTEM</Text>
        </View>
        <View style={styles.menuGroupCard}>
          <MenuItem
            ionIcon="globe-outline"
            iconColor="#3B82F6"
            label="Web Dashboard"
            sub="smart-expense-coach.onrender.com"
            onPress={() => openLink('https://smart-expense-coach.onrender.com')}
            showArrow
          />
          <MenuItem
            ionIcon="logo-github"
            iconColor="#94A3B8"
            label="GitHub"
            sub="github.com/ajay160380"
            onPress={() => openLink('https://github.com/ajay160380')}
            showArrow
          />
          <MenuItem
            ionIcon="information-circle-outline"
            iconColor="#64748B"
            label="App Version"
            sub={`v1.3.0 • Channel: ${Updates.channel || 'production'} — Built with ❤️ by Ajay`}
            isLast
          />
        </View>

        {/* ── ADMIN PANEL ── */}
        {profile?.username === 'ajay' && (
          <>
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionHeaderTitle}>ADMIN CONSOLE</Text>
            </View>
            <View style={styles.menuGroupCard}>
              <MenuItem
                ionIcon="shield-checkmark-outline"
                iconColor="#EAB308"
                label="Admin Panel"
                sub="Manage users natively"
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  topEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  topEditText: {
    color: '#06B6D4',
    fontSize: 12.5,
    fontWeight: '700',
    marginLeft: 5,
  },

  // ── Profile Header ──
  profileHeader: { 
    alignItems: 'center', 
    paddingTop: 16,
    paddingBottom: 44, 
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlowCircle: {
    position: 'absolute',
    top: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  avatarGlowWrapper: {
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarOuterRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 98,
    height: 98,
    borderRadius: 49,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetterText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0B0E14',
    borderWidth: 2,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: { 
    color: '#FFFFFF', 
    fontSize: 22, 
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  usernameChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  usernameChipText: {
    color: '#A5B4FC',
    fontSize: 12.5,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  metaBadgeText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
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
  streakBadgeText: { color: '#FBBF24', fontSize: 11, fontWeight: '700' },

  // ── Lifetime Stats Bento Grid ──
  lifetimeCard: {
    backgroundColor: '#121827',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    ...SHADOW.md,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 2,
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
    justifyContent: 'space-between',
    rowGap: 10,
  },
  statItem: { 
    width: '48.5%', 
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center', 
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  statLabel: { color: '#64748B', fontSize: 9, marginTop: 4, fontWeight: '700', letterSpacing: 0.6 },

  // ── Section Headers ──
  sectionHeaderWrap: {
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // ── Menu Group Card ──
  menuGroupCard: {
    backgroundColor: '#121827',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginHorizontal: 16,
    overflow: 'hidden',
    ...SHADOW.sm,
  },

  // ── Menu Item ──
  menuItem: {
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 13, 
    paddingHorizontal: 16,
  },
  itemDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginLeft: 66,
  },
  menuIconBox: {
    width: 36, 
    height: 36, 
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 14,
  },
  menuLabel: { 
    color: '#F8FAFC', 
    fontSize: 14.5, 
    fontWeight: '600',
  },
  menuSub: { 
    color: '#64748B', 
    fontSize: 11.5, 
    marginTop: 2,
    fontWeight: '500',
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginHorizontal: 16, 
    marginTop: 18, 
    paddingVertical: 14,
    borderRadius: 18, 
    borderWidth: 1, 
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#121827', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, minHeight: 300, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  feedbackInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, color: '#FFFFFF', fontSize: 15, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 20 },
  submitFeedbackBtn: { backgroundColor: '#6366F1', paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  submitFeedbackText: { color: 'white', fontSize: 15, fontWeight: '800' },
});
