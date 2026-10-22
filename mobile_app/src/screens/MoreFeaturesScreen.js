/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — MORE FEATURES SCREEN (Workspace & Tools Hub)
 * All secondary financial tools, utilities, AI, and shortcuts
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Platform,
  Alert,
  Linking,
  StatusBar as RNStatusBar,
  RefreshControl,
  PermissionsAndroid,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';

import api from '../api/config';
import { clearAuthData } from '../utils/auth';
import { formatApiError } from '../utils/errors';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';
import { requestPinWidget } from 'react-native-android-widget';

export default function MoreFeaturesScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const adminCheckPhone = profile?.phone_number || profile?.whatsapp_number || '';
  const cleanAdminPhone = String(adminCheckPhone).replace(/\D/g, '');
  const isAdmin = cleanAdminPhone.endsWith('7905398965') || profile?.is_admin === true;

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

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile/');
      setProfile(res.data);
    } catch (e) {
      console.log('Error fetching profile in More screen:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true })
      ]).start();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const openLink = (url) => Linking.openURL(url);

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Notice', 'Please write your feedback before submitting.');
      return;
    }
    setSubmittingFeedback(true);
    try {
      await api.post('/feedback/', { feedback: feedbackText });
      Alert.alert('Thank You! 🎉', 'Your feedback has been submitted successfully.');
      setFeedbackText('');
      setFeedbackVisible(false);
    } catch (e) {
      Alert.alert('Notice', 'Thank you! Your feedback has been noted.');
      setFeedbackText('');
      setFeedbackVisible(false);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [inputPhone, setInputPhone] = useState('');

  const isWaLinked = Boolean(profile?.whatsapp_linked);
  const userPhone = profile?.phone_number || profile?.user_phone || '';
  const waBotNumber = '917379053923';

  const handleLinkWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const rawPhone = profile?.phone_number || profile?.user_phone || '';
    if (rawPhone) {
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
      const text = `Link ${cleanPhone}`;
      const url = `https://wa.me/${waBotNumber}?text=${encodeURIComponent(text)}`;
      Linking.openURL(url);
    } else {
      setPhoneModalVisible(true);
    }
  };

  const handleOpenWhatsAppChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`https://wa.me/${waBotNumber}?text=Hi`);
  };

  const username = profile?.username || 'User';
  const fullName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : username;
  const initialLetter = (fullName ? fullName.charAt(0) : 'U').toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>More Features</Text>
          <Text style={styles.topBarSub}>Explore tools, AI & utilities</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Profile');
          }}
          style={styles.topProfileBtn}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7C3AED', '#6D28D9']}
            style={styles.topProfileGrad}
          >
            <Text style={styles.topProfileInitial}>{initialLetter}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Quick Profile Banner (Tap to View Profile) ── */}
        <TouchableOpacity
          style={styles.profileBanner}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('Profile');
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#4F7CFF', '#3B5BDB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileBannerGrad}
          >
            <View style={styles.bannerAvatarBox}>
              <Text style={styles.bannerAvatarLetter}>{initialLetter}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.bannerName}>{fullName}</Text>
              <Text style={styles.bannerHandle}>@{username} • View Profile & Settings</Text>
            </View>
            <View style={styles.bannerArrowBox}>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── SECTION 1: AI & SMART FINANCE ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="sparkles" size={13} color="#818CF8" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>AI & SMART FINANCE</Text>
        </View>

        <View style={styles.gridSection}>
          {/* Row 1: AI Coach & Voice */}
          <View style={styles.gridRow}>
            <FeatureCard
              icon="sparkles"
              iconColor="#818CF8"
              bgGrad={['rgba(99, 102, 241, 0.16)', 'rgba(99, 102, 241, 0.04)']}
              borderColor="rgba(99, 102, 241, 0.28)"
              title="AI Financial Coach"
              desc="Chat with your personal AI advisor"
              badge="AI"
              badgeColor="#818CF8"
              onPress={() => navigation.navigate('AIChat')}
            />
            <View style={{ width: 10 }} />
            <FeatureCard
              icon="mic"
              iconColor="#FB7185"
              bgGrad={['rgba(244, 63, 94, 0.16)', 'rgba(244, 63, 94, 0.04)']}
              borderColor="rgba(244, 63, 94, 0.28)"
              title="Voice Expense"
              desc="Speak naturally to log spends"
              badge="Fast"
              badgeColor="#FB7185"
              onPress={() => navigation.navigate('VoiceExpense')}
            />
          </View>

          {/* Row 2: Split & Subscriptions */}
          <View style={styles.gridRow}>
            <FeatureCard
              icon="people"
              iconColor="#A78BFA"
              bgGrad={['rgba(167, 139, 250, 0.16)', 'rgba(167, 139, 250, 0.04)']}
              borderColor="rgba(167, 139, 250, 0.28)"
              title="Expense Split"
              desc="Split bills with friends & groups"
              badge="Split"
              badgeColor="#A78BFA"
              onPress={() => navigation.navigate('ExpenseSplit')}
            />
            <View style={{ width: 10 }} />
            <FeatureCard
              icon="repeat"
              iconColor="#38BDF8"
              bgGrad={['rgba(56, 189, 248, 0.16)', 'rgba(56, 189, 248, 0.04)']}
              borderColor="rgba(56, 189, 248, 0.28)"
              title="Subscriptions"
              desc="Track Netflix, Spotify, bills"
              badge="Bills"
              badgeColor="#38BDF8"
              onPress={() => navigation.navigate('Subscriptions')}
            />
          </View>

          {/* Row 3: Goals & Analytics */}
          <View style={styles.gridRow}>
            <FeatureCard
              icon="flag"
              iconColor="#F59E0B"
              bgGrad={['rgba(245, 158, 11, 0.16)', 'rgba(245, 158, 11, 0.04)']}
              borderColor="rgba(245, 158, 11, 0.28)"
              title="Savings Goals"
              desc="Milestone targets & piggy bank"
              badge="Goals"
              badgeColor="#F59E0B"
              onPress={() => navigation.navigate('SavingsGoals')}
            />
            <View style={{ width: 10 }} />
            <FeatureCard
              icon="bar-chart"
              iconColor="#10B981"
              bgGrad={['rgba(16, 185, 129, 0.16)', 'rgba(16, 185, 129, 0.04)']}
              borderColor="rgba(16, 185, 129, 0.28)"
              title="Analytics"
              desc="Deep category breakdowns"
              badge="Stats"
              badgeColor="#10B981"
              onPress={() => navigation.navigate('Analytics')}
            />
          </View>
        </View>

        {/* ── SECTION 2: PRODUCTIVITY & SYNC ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="apps" size={13} color="#06B6D4" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>PRODUCTIVITY & SYNC</Text>
        </View>

        {/* ── WhatsApp Smart Card (Clean Fintech Layout) ── */}
        <View style={styles.waCard}>
          <View style={styles.waHeader}>
            <View style={styles.waIconBox}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.waTitleRow}>
                <Text style={styles.waTitle}>WhatsApp Assistant</Text>
                <View
                  style={[
                    styles.waBadge,
                    {
                      backgroundColor: isWaLinked ? 'rgba(16, 185, 129, 0.16)' : 'rgba(245, 158, 11, 0.16)',
                      borderColor: isWaLinked ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.waDot,
                      { backgroundColor: isWaLinked ? '#10B981' : '#F59E0B' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.waBadgeText,
                      { color: isWaLinked ? '#10B981' : '#F59E0B' },
                    ]}
                  >
                    {isWaLinked ? 'Linked' : 'Not Linked'}
                  </Text>
                </View>
              </View>
              <Text style={styles.waSub}>
                {isWaLinked ? 'Sync & record expenses in real-time' : 'Track expenses by sending quick texts'}
              </Text>
            </View>
          </View>

          {/* Quick info chip */}
          <View style={styles.waInfoChip}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name="chatbubbles-outline" size={13} color="#25D366" style={{ marginRight: 5 }} />
              <Text style={styles.waInfoChipTitle}>Bot: +91 7379053923</Text>
            </View>
            <Text style={styles.waInfoChipSub}>
              {isWaLinked
                ? 'Try texting: "500 coffee" or "today summary"'
                : 'Tap below to 1-tap link your registered phone number'}
            </Text>
          </View>

          {/* Clean Action Buttons with Zero Text Overflow */}
          {!isWaLinked ? (
            <TouchableOpacity
              style={styles.waActionBtn}
              onPress={handleLinkWhatsApp}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#25D366', '#128C7E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.waActionGrad}
              >
                <Ionicons name="flash" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.waActionBtnText}>
                  {userPhone ? `1-Tap Link (+${userPhone})` : '1-Tap Link WhatsApp'}
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.waActionRow}>
              <TouchableOpacity
                style={styles.waChatBtn}
                onPress={handleOpenWhatsAppChat}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-ellipses" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.waChatBtnText}>Chat with Bot</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.waRelinkBtn}
                onPress={handleLinkWhatsApp}
                activeOpacity={0.7}
              >
                <Ionicons name="sync-outline" size={14} color="#94A3B8" style={{ marginRight: 4 }} />
                <Text style={styles.waRelinkText}>Re-link</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Secondary Productivity Utilities ── */}
        <View style={styles.listCard}>
          <ListItem
            icon="document-text-outline"
            iconColor="#F472B6"
            title="Personal Financial Notepad"
            desc="Memos, planned purchases & checklists"
            onPress={() => navigation.navigate('Notepad')}
          />
          {Platform.OS === 'android' && (
            <ListItem
              icon="grid-outline"
              iconColor="#A855F7"
              title="Home Screen Widget"
              desc="Pin 1-tap quick add button to home screen"
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
          <ListItem
            icon="globe-outline"
            iconColor="#3B82F6"
            title="Web Cloud Portal"
            desc="smart-expense-coach.onrender.com"
            showArrow
            onPress={() => openLink('https://smart-expense-coach.onrender.com')}
            isLast
          />
        </View>

        {/* ── SECTION 3: SYSTEM & SUPPORT ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="construct-outline" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>SUPPORT & UPDATES</Text>
        </View>

        <View style={styles.listCard}>
          <ListItem
            icon="chatbubble-ellipses-outline"
            iconColor="#EC4899"
            title="Submit Feedback"
            desc="Suggest a feature or report an issue"
            onPress={() => setFeedbackVisible(true)}
          />
          <ListItem
            icon="cloud-download-outline"
            iconColor="#06B6D4"
            title="Check for App Updates"
            desc="OTA updates via EAS Cloud"
            badge="v1.3.0"
            badgeColor="#06B6D4"
            onPress={async () => {
              try {
                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                  Alert.alert('Update Available', 'Downloading latest features...');
                  await Updates.fetchUpdateAsync();
                  Alert.alert('Success', 'Update applied! Restarting app...', [
                    { text: 'OK', onPress: () => Updates.reloadAsync() },
                  ]);
                } else {
                  Alert.alert('App Up to Date', 'You are on the latest version! 🎉');
                }
              } catch (e) {
                Alert.alert('App Up to Date', 'You are running the latest version.');
              }
            }}
            isLast={!isAdmin}
          />
          {isAdmin && (
            <ListItem
              icon="shield-checkmark-outline"
              iconColor="#EAB308"
              title="Admin Console"
              desc="Manage platform users & database"
              showArrow
              onPress={() => navigation.navigate('AdminPanel')}
              isLast
            />
          )}
        </View>

        {/* ── SECTION: ACCOUNT & SECURITY ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="person-circle-outline" size={13} color="#06B6D4" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>ACCOUNT & SECURITY</Text>
        </View>

        <View style={styles.listCard}>
          <ListItem
            icon="mail-outline"
            iconColor={profile?.email_verified ? '#10B981' : (profile?.email ? '#F59E0B' : '#06B6D4')}
            title="Email Address"
            desc={
              profile?.email
                ? (profile?.email_verified ? `${profile.email} • Verified` : `${profile.email} • Tap to verify`)
                : 'Add an email to secure your account'
            }
            badge={profile?.email_verified ? 'Verified' : (profile?.email ? 'Verify' : 'Add')}
            badgeColor={profile?.email_verified ? '#10B981' : (profile?.email ? '#F59E0B' : '#06B6D4')}
            showArrow
            onPress={() => navigation.navigate('Profile')}
          />
          <ListItem
            icon="settings-outline"
            iconColor="#818CF8"
            title="Profile & Preferences"
            desc="Manage name, avatar, lock & notifications"
            showArrow
            onPress={() => navigation.navigate('Profile')}
          />
          <ListItem
            icon="shield-checkmark-outline"
            iconColor="#10B981"
            title="Privacy Policy"
            desc="Encryption, GDPR & data handling"
            showArrow
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <ListItem
            icon="newspaper-outline"
            iconColor="#38BDF8"
            title="Terms of Service"
            desc="Rules of use and legal terms"
            showArrow
            onPress={() => navigation.navigate('Terms')}
            isLast
          />
        </View>

        {/* ── SECTION: DANGER ZONE ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="warning-outline" size={13} color="#EF4444" style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>DANGER ZONE</Text>
        </View>

        <View style={[styles.listCard, { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.04)' }]}>
          <ListItem
            icon="trash-bin-outline"
            iconColor="#EF4444"
            title={deletingAccount ? "Deleting Account..." : "Delete Account"}
            desc="Permanently delete account, expenses & all records"
            badge="Permanent"
            badgeColor="#EF4444"
            showArrow
            onPress={handleDeleteAccount}
            isLast
          />
        </View>

        {/* ── Sign Out Button ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={19} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* ── Developer Footer ── */}
        <TouchableOpacity
          style={styles.devFooter}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Linking.openURL('https://github.com/ajay160380');
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="code-slash" size={13} color="#6366F1" style={{ marginRight: 6 }} />
          <Text style={styles.devFooterText}>
            Crafted with ❤️ by <Text style={styles.devFooterLink}>Ajay Vishwakarma</Text>
          </Text>
          <Ionicons name="logo-github" size={13} color="#94A3B8" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
      </Animated.View>

      {/* ── Feedback Modal ── */}
      <Modal
        visible={feedbackVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Feedback</Text>
              <TouchableOpacity onPress={() => setFeedbackVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Tell us what you'd like to improve..."
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
                <Text style={styles.submitFeedbackText}>Submit Feedback</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── WhatsApp Phone Linking Modal (Fallback) ── */}
      <Modal
        visible={phoneModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPhoneModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Link WhatsApp Bot</Text>
              </View>
              <TouchableOpacity onPress={() => setPhoneModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 14, lineHeight: 18 }}>
              Enter your 10-digit mobile number. Tapping link will open WhatsApp with the verification text ready to send to +91 7379053923.
            </Text>
            <TextInput
              style={[styles.feedbackInput, { minHeight: 48, paddingVertical: 10, fontSize: 16 }]}
              placeholder="e.g. 9876543210"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={inputPhone}
              onChangeText={setInputPhone}
            />
            <TouchableOpacity
              style={[styles.submitFeedbackBtn, { backgroundColor: '#22C55E' }]}
              onPress={() => {
                const clean = inputPhone.replace(/[^0-9]/g, '');
                if (clean.length < 10) {
                  Alert.alert('Notice', 'Please enter a valid 10-digit mobile number.');
                  return;
                }
                const formatted = clean.length === 10 ? `91${clean}` : clean;
                setPhoneModalVisible(false);
                Linking.openURL(`https://wa.me/${waBotNumber}?text=${encodeURIComponent(`Link ${formatted}`)}`);
              }}
            >
              <Text style={styles.submitFeedbackText}>Open WhatsApp & Link</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function FeatureCard({ icon, iconColor, bgGrad, borderColor, title, desc, badge, badgeColor, onPress }) {
  return (
    <TouchableOpacity
      style={styles.gridItemWrapper}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.8}
    >
      <View style={styles.gridItemCard}>
        <View style={styles.gridItemTop}>
          <View style={[styles.gridIconCircle, { backgroundColor: iconColor + '18' }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
          {badge && (
            <View style={[styles.gridBadge, { backgroundColor: badgeColor + '18', borderColor: badgeColor + '35' }]}>
              <Text style={[styles.gridBadgeText, { color: badgeColor }]}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.gridItemTitle}>{title}</Text>
        <Text style={styles.gridItemDesc} numberOfLines={2}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ListItem({ icon, iconColor, title, desc, badge, badgeColor, showArrow, onPress, isLast }) {
  return (
    <>
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.listIconBox, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.listItemTitle}>{title}</Text>
          <Text style={styles.listItemDesc} numberOfLines={1}>{desc}</Text>
        </View>
        {badge && (
          <View style={[styles.listBadge, { backgroundColor: badgeColor + '18', borderColor: badgeColor + '35' }]}>
            <Text style={[styles.listBadgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        )}
        {(showArrow || !badge) && (
          <Ionicons name="chevron-forward" size={15} color="#9CA3AF" style={{ marginLeft: 6 }} />
        )}
      </TouchableOpacity>
      {!isLast && <View style={styles.listDivider} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FB',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 8 : 42) : 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topBarTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  topBarSub: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  topProfileBtn: {
    borderRadius: 20,
    padding: 2,
  },
  topProfileGrad: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topProfileInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // ── Profile Banner ──
  profileBanner: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  profileBannerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bannerAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  bannerAvatarLetter: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  bannerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerHandle: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  bannerArrowBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Section Headers ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1.2,
  },

  // ── Grid Bento ──
  gridSection: {
    marginBottom: 20,
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 10,
    width: '100%',
  },
  gridItemWrapper: {
    flex: 1,
  },
  gridItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    minHeight: 118,
    justifyContent: 'space-between',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  gridItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  gridBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  gridItemTitle: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  gridItemDesc: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },

  // ── WhatsApp Smart Card ──
  waCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  waHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  waIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waTitle: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '800',
  },
  waBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  waDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  waBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  waSub: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  waInfoChip: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  waInfoChipTitle: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '700',
  },
  waInfoChipSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 1,
  },
  waActionBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  waActionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  waActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  waActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waChatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 11,
    borderRadius: 13,
    marginRight: 8,
  },
  waChatBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  waRelinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 13,
  },
  waRelinkText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── List Card ──
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  listIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemTitle: {
    color: '#1F2937',
    fontSize: 13.5,
    fontWeight: '700',
  },
  listItemDesc: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  listBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 4,
  },
  listBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  listDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 50,
  },

  // ── Modal ──
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
    minHeight: 100,
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
  devFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 8,
  },
  devFooterText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  devFooterLink: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
