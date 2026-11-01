

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
import api from '../services/api';

export default function NotificationsScreen({ navigation }) {
  const { isDark, colors } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [notifSettings, setNotifSettings] = useState({
    live_budget_alerts: false,
    morning_budget_push: false,
    morning_push_time: '08:00',
    nightly_summary: false,
    nightly_push_time: '22:00',
    notification_tone: 'normal',
    repeat_nudges: false,
    daily_budget_rollover: false,
  });

  const loadNotifications = async () => {
    const notifs = await getNotifications();
    setNotifications(notifs);
  };

  const loadSettings = async () => {
    try {
      const res = await api.get('/api/notification-settings/');
      if (res.data) {
        setNotifSettings(res.data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadNotifications();
    loadSettings();
  }, []);

  const handleUpdateSetting = async (key, val) => {
    const updated = { ...notifSettings, [key]: val };
    setNotifSettings(updated);
    try {
      await api.post('/api/notification-settings/', { [key]: val });
    } catch (e) {
      console.log('Error updating notification setting', e);
    }
  };

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={[styles.clearBtn, { backgroundColor: isDark ? 'rgba(124, 111, 247, 0.2)' : 'rgba(124, 111, 247, 0.12)', borderColor: isDark ? 'rgba(124, 111, 247, 0.4)' : 'rgba(124, 111, 247, 0.3)' }]} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={16} color="#7C6FF7" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
            <Text style={[styles.clearText, isDark && { color: colors.primary }]}>Clear</Text>
          </TouchableOpacity>
        </View>
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
      {/* Notification Preferences Modal */}
      <Modal
        visible={settingsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: isDark ? colors.surface : '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? colors.textPrimary : '#0F172A' }}>
                Budget Alerts & Notifications
              </Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={isDark ? colors.textSecondary : '#94A3B8'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Morning Budget Push */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? colors.border : '#E2E8F0' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? colors.textPrimary : '#0F172A' }}>Morning Budget Greeting (8:00 AM)</Text>
                  <Text style={{ fontSize: 12, color: isDark ? colors.textSecondary : '#64748B', marginTop: 2 }}>Roz subah aapka aaj ka daily budget bataye</Text>
                </View>
                <Switch
                  value={notifSettings.morning_budget_push}
                  onValueChange={(val) => handleUpdateSetting('morning_budget_push', val)}
                  trackColor={{ false: '#CBD5E1', true: '#7C6FF7' }}
                />
              </View>

              {/* Nightly Summary */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? colors.border : '#E2E8F0' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? colors.textPrimary : '#0F172A' }}>Nightly Spend Summary (10:00 PM)</Text>
                  <Text style={{ fontSize: 12, color: isDark ? colors.textSecondary : '#64748B', marginTop: 2 }}>Raat ko aaj kitna bacha ya extra kharch hua bataye</Text>
                </View>
                <Switch
                  value={notifSettings.nightly_summary}
                  onValueChange={(val) => handleUpdateSetting('nightly_summary', val)}
                  trackColor={{ false: '#CBD5E1', true: '#7C6FF7' }}
                />
              </View>

              {/* Notification Tone */}
              <View style={{ paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? colors.border : '#E2E8F0' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? colors.textPrimary : '#0F172A' }}>Notification Tone</Text>
                <Text style={{ fontSize: 12, color: isDark ? colors.textSecondary : '#64748B', marginTop: 2, marginBottom: 8 }}>Alerts kis andaaz me bhejein</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => handleUpdateSetting('notification_tone', 'normal')}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: notifSettings.notification_tone === 'normal' ? '#7C6FF7' : (isDark ? colors.border : '#E2E8F0'), backgroundColor: notifSettings.notification_tone === 'normal' ? 'rgba(124, 111, 247, 0.15)' : 'transparent' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: notifSettings.notification_tone === 'normal' ? '#7C6FF7' : (isDark ? colors.textSecondary : '#64748B') }}>Normal 😊</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleUpdateSetting('notification_tone', 'roast')}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: notifSettings.notification_tone === 'roast' ? '#EF4444' : (isDark ? colors.border : '#E2E8F0'), backgroundColor: notifSettings.notification_tone === 'roast' ? 'rgba(239, 68, 68, 0.15)' : 'transparent' }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: notifSettings.notification_tone === 'roast' ? '#EF4444' : (isDark ? colors.textSecondary : '#64748B') }}>Roast Mode 🔥</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Live Budget Alerts */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? colors.border : '#E2E8F0' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? colors.textPrimary : '#0F172A' }}>Live Spend Alerts</Text>
                  <Text style={{ fontSize: 12, color: isDark ? colors.textSecondary : '#64748B', marginTop: 2 }}>Payment add hote hi aaj ka bacha budget alert kare (Quiet hours: 11 PM to 7 AM)</Text>
                </View>
                <Switch
                  value={notifSettings.live_budget_alerts}
                  onValueChange={(val) => handleUpdateSetting('live_budget_alerts', val)}
                  trackColor={{ false: '#CBD5E1', true: '#7C6FF7' }}
                />
              </View>

              {/* Repeat Spend Nudges */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? colors.border : '#E2E8F0' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? colors.textPrimary : '#0F172A' }}>Repeat Merchant Nudges</Text>
                  <Text style={{ fontSize: 12, color: isDark ? colors.textSecondary : '#64748B', marginTop: 2 }}>Ek din me 2+ baar Blinkit ya Swiggy aane par friendly nudge</Text>
                </View>
                <Switch
                  value={notifSettings.repeat_nudges}
                  onValueChange={(val) => handleUpdateSetting('repeat_nudges', val)}
                  trackColor={{ false: '#CBD5E1', true: '#7C6FF7' }}
                />
              </View>

              {/* Daily Budget Rollover */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? colors.textPrimary : '#0F172A' }}>Daily Budget Rollover</Text>
                  <Text style={{ fontSize: 12, color: isDark ? colors.textSecondary : '#64748B', marginTop: 2 }}>Unspent ya overspent budget agle din carry forward ho</Text>
                </View>
                <Switch
                  value={notifSettings.daily_budget_rollover}
                  onValueChange={(val) => handleUpdateSetting('daily_budget_rollover', val)}
                  trackColor={{ false: '#CBD5E1', true: '#7C6FF7' }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
