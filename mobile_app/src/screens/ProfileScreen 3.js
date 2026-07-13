/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — PROFILE SCREEN
 * User stats, settings, gamification, logout
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, RefreshControl, Alert,
  ActivityIndicator, Linking, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/config';
import { clearAuthData, getUsername } from '../utils/auth';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';
import { GlassCard, SectionHeader } from '../components/SharedComponents';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  useFocusEffect(useCallback(() => { fetchProfile(); }, []));
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
          setProfile({ ...profile, profile_picture: uploadRes.data.profile_picture });
          Alert.alert('Success', 'Profile photo updated successfully!');
        }
      }
    } catch (error) {
      console.error('Image pick/upload error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogout = () => {
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

  const openLink = (url) => Linking.openURL(url);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={COLORS.cyan} size="large" /></View>
      </SafeAreaView>
    );
  }

  const username = profile?.username || 'User';
  const joined = profile?.joined || '';
  const lifetimeSpent = profile?.lifetime_spent || 0;
  const totalTxns = profile?.total_txns || 0;
  const memberDays = profile?.member_days || 0;
  const budget = profile?.budget || 20000;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header ── */}
        <LinearGradient colors={COLORS.gradDeepPurp} style={styles.profileHeader}>
          <TouchableOpacity onPress={pickImage} disabled={uploadingImage} style={{position: 'relative'}}>
            {profile?.profile_picture ? (
              <Image source={{ uri: profile.profile_picture }} style={styles.avatarLargeImage} />
            ) : (
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{username.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            {uploadingImage && (
              <View style={[StyleSheet.absoluteFill, styles.avatarOverlay]}>
                <ActivityIndicator color={COLORS.cyan} />
              </View>
            )}
            <View style={styles.editIconBadge}>
              <Ionicons name="camera" size={16} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{username}</Text>
          <Text style={styles.profileSince}>Member since {joined}</Text>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>🌟 {memberDays} days</Text>
          </View>
        </LinearGradient>

        {/* ── Lifetime Stats ── */}
        <SectionHeader title="📊 Lifetime Stats" />
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statItem}>
            <Text style={styles.statEmoji}>💸</Text>
            <Text style={styles.statValue}>₹{Math.round(lifetimeSpent).toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </GlassCard>
          <GlassCard style={styles.statItem}>
            <Text style={styles.statEmoji}>📝</Text>
            <Text style={styles.statValue}>{totalTxns}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </GlassCard>
          <GlassCard style={styles.statItem}>
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={styles.statValue}>₹{Math.round(budget).toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>Monthly Budget</Text>
          </GlassCard>
          <GlassCard style={styles.statItem}>
            <Text style={styles.statEmoji}>📅</Text>
            <Text style={styles.statValue}>{memberDays}</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </GlassCard>
        </View>

        {/* ── Quick Actions ── */}
        <SectionHeader title="⚡ Quick Actions" />
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <MenuItem
            icon="📱"
            ionIcon="chatbubble-ellipses-outline"
            label="AI Financial Coach"
            sub="Chat with ExpenseTracker AI"
            onPress={() => navigation.navigate('AIChat')}
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

        {/* ── App Info ── */}
        <SectionHeader title="ℹ️ About" />
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <MenuItem
            ionIcon="globe-outline"
            label="Web Dashboard"
            sub="ajay160380-paisa-mitra.hf.space"
            onPress={() => openLink('https://ajay160380-paisa-mitra.hf.space')}
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
            sub="v2.0.0 — Built with ❤️ by Ajay Vishwakarma"
          />
        </GlassCard>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1 },

  // ── Profile Header ──
  profileHeader: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, borderColor: COLORS.cyan,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  avatarLargeImage: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: COLORS.cyan,
    marginBottom: 14,
  },
  avatarOverlay: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  editIconBadge: {
    position: 'absolute', bottom: 14, right: 0,
    backgroundColor: COLORS.cyan, width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.bg,
  },
  avatarLargeText: { color: COLORS.cyan, fontSize: 32, fontWeight: 'bold' },
  profileName: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  profileSince: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 },
  profileBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 6, marginTop: 12,
  },
  profileBadgeText: { color: COLORS.yellow, fontSize: 13, fontWeight: '600' },

  // ── Stats Grid ──
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  statItem: { width: '46%', margin: '2%', alignItems: 'center', paddingVertical: 18 },
  statEmoji: { fontSize: 28, marginBottom: 8 },
  statValue: { color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

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
});
