/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — ADMIN PANEL SCREEN
 * Manage users natively inside the app
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, RefreshControl, Alert,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../api/config';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';
import { GlassCard, SectionHeader } from '../components/SharedComponents';

export default function AdminPanelScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users/');
      if (res.data.status === 'success') {
        setUsers(res.data.users);
        if (res.data.feedbacks) {
          setFeedbacks(res.data.feedbacks);
        }
      } else {
        Alert.alert('Error', res.data.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Admin fetch error:', error);
      Alert.alert('Error', 'Access Denied or Server Error');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchUsers(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchUsers(); };

  const confirmDeleteUser = (user) => {
    if (user.is_superuser || user.username === 'ajay') {
      Alert.alert('Protected', 'You cannot delete the main admin account.');
      return;
    }
    Alert.alert(
      '⚠️ Delete User',
      `Are you absolutely sure you want to permanently delete '${user.username}' and all their data? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteUser(user.id)
        }
      ]
    );
  };

  const deleteUser = async (userId) => {
    try {
      const res = await api.post(`/api/admin/delete-user/${userId}/`);
      if (res.data.status === 'success') {
        Alert.alert('Success', res.data.message);
        fetchUsers();
      } else {
        Alert.alert('Error', res.data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      Alert.alert('Error', 'An error occurred while deleting the user');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('users')}
        >
          <Ionicons name="people" size={20} color={activeTab === 'users' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Users ({users.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'feedback' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('feedback')}
        >
          <Ionicons name="chatbubbles" size={20} color={activeTab === 'feedback' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, activeTab === 'feedback' && styles.tabTextActive]}>Feedback ({feedbacks.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {activeTab === 'users' ? (
          <>
            <SectionHeader title="👥 Registered Users" />
            {users.length === 0 ? (
              <Text style={{color: COLORS.textMuted, textAlign: 'center', marginTop: 20}}>No users found.</Text>
            ) : (
              users.map((u) => (
                <GlassCard key={`user-${u.id}`} style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <Text style={styles.username}>
                      {u.username} {u.is_superuser && '🛡️'}
                    </Text>
                    <Text style={styles.userDate}>Joined: {u.date_joined}</Text>
                  </View>
                  
                  {!u.is_superuser && (
                    <TouchableOpacity 
                      style={styles.deleteBtn} 
                      onPress={() => confirmDeleteUser(u)}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.red} />
                    </TouchableOpacity>
                  )}
                </GlassCard>
              ))
            )}
          </>
        ) : (
          <>
            <SectionHeader title="💬 User Feedback" />
            {feedbacks.length === 0 ? (
              <Text style={{color: COLORS.textMuted, textAlign: 'center', marginTop: 20}}>No feedback found.</Text>
            ) : (
              feedbacks.map((f) => (
                <GlassCard key={`feedback-${f.id}`} style={styles.feedbackCard}>
                  <View style={styles.feedbackHeader}>
                    <Text style={styles.feedbackUser}>{f.username}</Text>
                    <Text style={styles.feedbackSource}>{f.source}</Text>
                  </View>
                  <Text style={styles.feedbackDate}>{f.created_at}</Text>
                  <View style={styles.feedbackDivider} />
                  <Text style={styles.feedbackText}>{f.text}</Text>
                </GlassCard>
              ))
            )}
          </>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold' },

  userCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, marginBottom: 12,
  },
  userInfo: { flex: 1 },
  username: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  userDate: { color: COLORS.textMuted, fontSize: 12 },
  
  deleteBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
  }
});
