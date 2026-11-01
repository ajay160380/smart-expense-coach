

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, 
  KeyboardAvoidingView, ActivityIndicator, Image, StyleSheet, Dimensions, 
  Platform, Alert, Animated, FlatList, Modal, Switch, Pressable, Keyboard, 
  SectionList, DeviceEventEmitter, RefreshControl, Linking, LayoutAnimation, 
  UIManager, StatusBar as RNStatusBar 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { COLORS, RADIUS } from '../utils/theme';
import { getNotifications, clearNotifications } from '../utils/notifications';
import { useTheme } from '../theme/ThemeContext';

export default function NotificationsScreen({ navigation }) {
  const { isDark, colors } = useTheme();
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    const notifs = await getNotifications();
    setNotifications(notifs);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleClear = async () => {
    await clearNotifications();
    setNotifications([]);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.notificationCard, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconBoxSmall, isDark && { backgroundColor: 'rgba(129, 140, 248, 0.18)' }]}>
        <Ionicons name="notifications" size={24} color={isDark ? colors.primary : COLORS.primary} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notifTitle, isDark && { color: colors.textPrimary }]}>{item.title}</Text>
        <Text style={[styles.notifBody, isDark && { color: colors.textSecondary }]}>{item.body}</Text>
        <Text style={[styles.notifDate, isDark && { color: colors.textMuted }]}>
          {new Date(item.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {/* Header */}
      <View style={[styles.header, isDark && { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, isDark && { backgroundColor: colors.bgElevated, borderColor: colors.border }]} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={isDark ? colors.textPrimary : COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && { color: colors.textPrimary }]}>Notifications</Text>
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
          <Text style={[styles.clearText, isDark && { color: colors.primary }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.iconBox, isDark && { backgroundColor: 'rgba(129, 140, 248, 0.18)' }]}>
            <Ionicons name="notifications-off-outline" size={60} color={isDark ? colors.primary : COLORS.primary} />
          </View>
          <Text style={[styles.emptyTitle, isDark && { color: colors.textPrimary }]}>No new notifications</Text>
          <Text style={[styles.emptyDesc, isDark && { color: colors.textSecondary }]}>
            When your friends split expenses with you, they will appear here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 8 : 42) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.25)',
  },
  clearText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyDesc: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  iconBoxSmall: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  notificationContent: {
    flex: 1,
  },
  notifTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  notifBody: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  notifDate: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
