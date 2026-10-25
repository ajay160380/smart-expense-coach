/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — ADMIN PANEL SCREEN
 * Fully theme-responsive, crisp typography, User & Feedback management
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import api from '../api/config';
import { useTheme } from '../theme/ThemeContext';
import { GlassCard, SectionHeader } from '../components/SharedComponents';

export default function AdminPanelScreen({ navigation }) {
  const { isDark, colors } = useTheme();

  const [users, setUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users/');
      if (res.data.status === 'success') {
        setUsers(res.data.users || []);
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

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const confirmDeleteUser = (user) => {
    if (
      user.is_superuser ||
      user.username === 'ajay' ||
      user.username === 'ajaykumar160380' ||
      (user.phone && user.phone.includes('7905398965'))
    ) {
      Alert.alert('Protected', 'You cannot delete the main admin account.');
      return;
    }
    Alert.alert(
      '⚠️ Delete User',
      `Are you sure you want to permanently delete '${user.username}' and all their data? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteUser(user.id),
        },
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

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            {
              backgroundColor: isDark ? colors.surfaceAlt : '#F1F5F9',
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Admin Panel
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Tabs ── */}
      <View
        style={[
          styles.tabContainer,
          {
            backgroundColor: isDark ? colors.surfaceAlt : '#E2E8F0',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'users' && [
              styles.tabBtnActive,
              { backgroundColor: isDark ? colors.surface : '#FFFFFF' },
            ],
          ]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons
            name="people"
            size={18}
            color={activeTab === 'users' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'users' ? colors.primary : colors.textMuted },
              activeTab === 'users' && styles.tabTextActive,
            ]}
          >
            Users ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'feedback' && [
              styles.tabBtnActive,
              { backgroundColor: isDark ? colors.surface : '#FFFFFF' },
            ],
          ]}
          onPress={() => setActiveTab('feedback')}
        >
          <Ionicons
            name="chatbubbles"
            size={18}
            color={activeTab === 'feedback' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'feedback' ? colors.primary : colors.textMuted },
              activeTab === 'feedback' && styles.tabTextActive,
            ]}
          >
            Feedback ({feedbacks.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'users' ? (
          <>
            {/* ── Search Input ── */}
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search by username or email..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <SectionHeader title="👥 Registered Users" />
            {filteredUsers.length === 0 ? (
              <Text
                style={{
                  color: colors.textMuted,
                  textAlign: 'center',
                  marginTop: 24,
                  fontSize: 14,
                }}
              >
                No users found.
              </Text>
            ) : (
              filteredUsers.map((u) => {
                const initial = (u.username || 'U')[0].toUpperCase();
                return (
                  <GlassCard key={`user-${u.id}`} style={styles.userCard}>
                    {/* User Avatar */}
                    <LinearGradient
                      colors={
                        u.is_superuser
                          ? ['#7C3AED', '#4F46E5']
                          : ['#3B82F6', '#06B6D4']
                      }
                      style={styles.avatarCircle}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.avatarText}>{initial}</Text>
                    </LinearGradient>

                    {/* User Info */}
                    <View style={styles.userInfo}>
                      <View style={styles.userRow}>
                        <Text
                          style={[
                            styles.username,
                            { color: colors.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {u.username}
                        </Text>
                        {u.is_superuser ? (
                          <View style={styles.adminBadge}>
                            <Text style={styles.adminBadgeText}>🛡️ Admin</Text>
                          </View>
                        ) : null}
                      </View>

                      {u.email ? (
                        <View style={styles.metaRow}>
                          <Ionicons
                            name="mail-outline"
                            size={12}
                            color={colors.textMuted}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[styles.userEmail, { color: colors.textSecondary }]}
                            numberOfLines={1}
                          >
                            {u.email}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.metaRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={12}
                          color={colors.textMuted}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[styles.userDate, { color: colors.textMuted }]}
                        >
                          Joined: {u.date_joined}
                        </Text>
                      </View>
                    </View>

                    {/* Delete Action */}
                    {!u.is_superuser && (
                      <TouchableOpacity
                        style={[
                          styles.deleteBtn,
                          {
                            backgroundColor: isDark
                              ? 'rgba(239, 68, 68, 0.15)'
                              : '#FEE2E2',
                            borderColor: isDark
                              ? 'rgba(239, 68, 68, 0.3)'
                              : '#FECACA',
                          },
                        ]}
                        onPress={() => confirmDeleteUser(u)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </GlassCard>
                );
              })
            )}
          </>
        ) : (
          <>
            <SectionHeader title="💬 User Feedback" />
            {feedbacks.length === 0 ? (
              <Text
                style={{
                  color: colors.textMuted,
                  textAlign: 'center',
                  marginTop: 24,
                  fontSize: 14,
                }}
              >
                No feedback received yet.
              </Text>
            ) : (
              feedbacks.map((f) => (
                <GlassCard key={`feedback-${f.id}`} style={styles.feedbackCard}>
                  <View style={styles.feedbackHeader}>
                    <Text
                      style={[
                        styles.feedbackUser,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {f.username}
                    </Text>
                    <Text
                      style={[
                        styles.feedbackSource,
                        {
                          color: colors.primary,
                          backgroundColor: isDark
                            ? 'rgba(124, 58, 237, 0.2)'
                            : 'rgba(124, 58, 237, 0.08)',
                        },
                      ]}
                    >
                      {f.source}
                    </Text>
                  </View>
                  <Text
                    style={[styles.feedbackDate, { color: colors.textMuted }]}
                  >
                    {f.created_at}
                  </Text>
                  <View
                    style={[
                      styles.feedbackDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <Text
                    style={[
                      styles.feedbackText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {f.text}
                  </Text>
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
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '700',
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 2,
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    maxWidth: '70%',
  },
  adminBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  adminBadgeText: {
    color: '#A855F7',
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
  },
  userDate: {
    fontSize: 11,
  },

  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginLeft: 8,
  },

  feedbackCard: {
    padding: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  feedbackUser: {
    fontSize: 15,
    fontWeight: '700',
  },
  feedbackSource: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  feedbackDate: {
    fontSize: 11,
    marginBottom: 8,
  },
  feedbackDivider: {
    height: 1,
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
