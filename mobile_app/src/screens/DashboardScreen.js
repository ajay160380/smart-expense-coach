/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — DASHBOARD SCREEN (COMPLETE REBUILD)
 * Full feature parity with website dashboard
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, ActivityIndicator, Image, StyleSheet, Dimensions, Platform, Alert, Animated, FlatList, Modal, Switch, Pressable, Keyboard, SectionList, DeviceEventEmitter, RefreshControl, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import Logo from '../components/Logo';
import { GlassCard, AnimatedNumber, EmptyState, StatCard, SectionHeader } from '../components/SharedComponents';




import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/config';
import { getUsername, clearAuthData } from '../utils/auth';
import { COLORS, CAT_COLORS, CAT_ICONS, RADIUS, SHADOW, getFallbackIcon } from '../utils/theme';

const { width } = Dimensions.get('window');

const DEFAULT_QUICK_SHORTCUTS = [
  { id: '1', label: 'Chai / Coffee', amount: '20', category: 'food', icon: '☕', color: '#F59E0B' },
  { id: '2', label: 'Snacks / Food', amount: '100', category: 'food', icon: '🍔', color: '#EC4899' },
  { id: '3', label: 'Petrol / Fuel', amount: '200', category: 'transport', icon: '⛽', color: '#06B6D4' },
  { id: '4', label: 'Auto / Cab', amount: '80', category: 'transport', icon: '🚕', color: '#EAB308' },
  { id: '5', label: 'Groceries', amount: '300', category: 'shopping', icon: '🛒', color: '#10B981' },
  { id: '6', label: 'Fun / Movie', amount: '250', category: 'entertainment', icon: '🍿', color: '#8B5CF6' },
];

const AVAILABLE_SHORTCUT_ICONS = [
  '☕', '🍔', '⛽', '🚕', '🛒', '🍿', '🥛', '🍕', '🏋️', '💊', '🎬', '👕', '💡', '📱', '🚬', '🍜', '🍩', '🍺', '🚗', '📚'
];

const AVAILABLE_SHORTCUT_CATEGORIES = [
  { id: 'food', label: 'Food', color: '#EC4899' },
  { id: 'transport', label: 'Transport', color: '#06B6D4' },
  { id: 'shopping', label: 'Shopping', color: '#10B981' },
  { id: 'entertainment', label: 'Fun', color: '#8B5CF6' },
  { id: 'bills', label: 'Bills', color: '#EAB308' },
  { id: 'health', label: 'Health', color: '#EF4444' },
  { id: 'other', label: 'Other', color: '#64748B' },
];

const DEFAULT_ACTION_DOCK_KEYS = ['add', 'voice', 'split', 'history'];

const ALL_ACTION_SHORTCUTS = [
  { id: 'add', label: 'Add', icon: 'add', colors: ['#6366F1', '#4F46E5'], screen: 'AddExpense', iconSize: 24, desc: 'Quickly log new expense' },
  { id: 'voice', label: 'Voice', icon: 'mic', colors: ['#F43F5E', '#E11D48'], screen: 'VoiceExpense', iconSize: 20, desc: 'Speak to record spend' },
  { id: 'split', label: 'Split', icon: 'people', colors: ['#8B5CF6', '#7C3AED'], screen: 'ExpenseSplit', iconSize: 20, desc: 'Split bills with friends' },
  { id: 'history', label: 'History', icon: 'receipt', colors: ['#06B6D4', '#0891B2'], screen: 'History', iconSize: 19, desc: 'All transactions log' },
  { id: 'ai', label: 'AI Coach', icon: 'sparkles', colors: ['#818CF8', '#6366F1'], screen: 'AIChat', iconSize: 20, desc: 'Financial intelligence AI' },
  { id: 'goals', label: 'Goals', icon: 'flag', colors: ['#F59E0B', '#D97706'], screen: 'SavingsGoals', iconSize: 20, desc: 'Savings & milestone targets' },
  { id: 'subs', label: 'Subs', icon: 'repeat', colors: ['#38BDF8', '#0284C7'], screen: 'Subscriptions', iconSize: 20, desc: 'Monthly subscriptions' },
  { id: 'notes', label: 'Notepad', icon: 'document-text', colors: ['#EC4899', '#DB2777'], screen: 'Notepad', iconSize: 20, desc: 'Personal finance notes' },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart', colors: ['#10B981', '#059669'], screen: 'Analytics', iconSize: 20, desc: 'Spending trend charts' },
  { id: 'scan', label: 'Scan QR', icon: 'qr-code', colors: ['#A855F7', '#9333EA'], screen: 'UPIPayment', iconSize: 20, desc: 'UPI pay & scan QR' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', colors: ['#25D366', '#16A34A'], isWhatsApp: true, iconSize: 20, desc: 'Track via WhatsApp bot' },
  { id: 'budget', label: 'Budget', icon: 'wallet', colors: ['#F97316', '#EA580C'], isBudget: true, iconSize: 20, desc: 'Update monthly limit' },
];

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [dailyTip, setDailyTip] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [dismissedAnomalies, setDismissedAnomalies] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [username, setUsername] = useState('User');
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [newBudgetCycleDay, setNewBudgetCycleDay] = useState('1');
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [shakeBannerVisible, setShakeBannerVisible] = useState(true);

  // ── Quick Action Dock Customizable State (1-8 items) ──
  const [actionDockKeys, setActionDockKeys] = useState(DEFAULT_ACTION_DOCK_KEYS);
  const [actionDockModalVisible, setActionDockModalVisible] = useState(false);
  const [tempActionDockKeys, setTempActionDockKeys] = useState(DEFAULT_ACTION_DOCK_KEYS);

  const loadCustomActionDock = async () => {
    try {
      const stored = await AsyncStorage.getItem('custom_action_dock');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActionDockKeys(parsed);
          setTempActionDockKeys(parsed);
        }
      }
    } catch (e) {}
  };

  const saveActionDock = async (newKeys) => {
    setActionDockKeys(newKeys);
    setTempActionDockKeys(newKeys);
    try {
      await AsyncStorage.setItem('custom_action_dock', JSON.stringify(newKeys));
    } catch (e) {}
  };

  const toggleActionKey = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tempActionDockKeys.includes(id)) {
      if (tempActionDockKeys.length <= 1) {
        Alert.alert('Notice', 'Please keep at least 1 shortcut in the dock.');
        return;
      }
      setTempActionDockKeys(prev => prev.filter(k => k !== id));
    } else {
      if (tempActionDockKeys.length >= 8) {
        Alert.alert('Limit Reached', 'You can select up to 8 shortcuts maximum.');
        return;
      }
      setTempActionDockKeys(prev => [...prev, id]);
    }
  };

  const handleActionPress = (action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (action.isWhatsApp) {
      openWhatsApp();
    } else if (action.isBudget) {
      setNewBudget(budget.toString());
      setNewBudgetCycleDay(budgetCycleDay.toString());
      setBudgetModalVisible(true);
    } else if (action.screen) {
      navigation.navigate(action.screen);
    }
  };

  // ── 1-Tap Log Customizable State ──
  const [quickShortcuts, setQuickShortcuts] = useState(DEFAULT_QUICK_SHORTCUTS);
  const [shortcutsModalVisible, setShortcutsModalVisible] = useState(false);
  const [shortcutFormVisible, setShortcutFormVisible] = useState(false);
  const [editShortcutItem, setEditShortcutItem] = useState(null);
  const [shortcutLabel, setShortcutLabel] = useState('');
  const [shortcutAmount, setShortcutAmount] = useState('');
  const [shortcutCategory, setShortcutCategory] = useState('food');
  const [shortcutIcon, setShortcutIcon] = useState('☕');

  const loadCustomShortcuts = async () => {
    try {
      const stored = await AsyncStorage.getItem('custom_quick_shortcuts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuickShortcuts(parsed);
        }
      }
    } catch (e) {}
  };

  const saveQuickShortcuts = async (newList) => {
    setQuickShortcuts(newList);
    try {
      await AsyncStorage.setItem('custom_quick_shortcuts', JSON.stringify(newList));
    } catch (e) {}
  };

  const handleDeleteShortcut = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = quickShortcuts.filter(s => (s.id || s.label) !== id);
    saveQuickShortcuts(updated);
  };

  const handleOpenAddShortcut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditShortcutItem(null);
    setShortcutLabel('');
    setShortcutAmount('');
    setShortcutCategory('food');
    setShortcutIcon('☕');
    setShortcutFormVisible(true);
  };

  const handleOpenEditShortcut = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditShortcutItem(item);
    setShortcutLabel(item.label || '');
    setShortcutAmount(item.amount ? item.amount.toString() : '');
    setShortcutCategory(item.category || 'food');
    setShortcutIcon(item.icon || '☕');
    setShortcutFormVisible(true);
  };

  const handleSaveShortcut = () => {
    if (!shortcutLabel.trim()) {
      Alert.alert('Notice', 'Please enter a name for this shortcut.');
      return;
    }
    const parsedAmt = parseFloat(shortcutAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      Alert.alert('Notice', 'Please enter a valid amount.');
      return;
    }

    const catObj = AVAILABLE_SHORTCUT_CATEGORIES.find(c => c.id === shortcutCategory);
    const color = catObj ? catObj.color : '#06B6D4';

    let updated;
    if (editShortcutItem) {
      updated = quickShortcuts.map(s => {
        if ((s.id && s.id === editShortcutItem.id) || s.label === editShortcutItem.label) {
          return {
            ...s,
            label: shortcutLabel.trim(),
            amount: Math.round(parsedAmt).toString(),
            category: shortcutCategory,
            icon: shortcutIcon,
            color,
          };
        }
        return s;
      });
    } else {
      const newItem = {
        id: Date.now().toString(),
        label: shortcutLabel.trim(),
        amount: Math.round(parsedAmt).toString(),
        category: shortcutCategory,
        icon: shortcutIcon,
        color,
      };
      updated = [...quickShortcuts, newItem];
    }

    saveQuickShortcuts(updated);
    setShortcutFormVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleResetShortcuts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Reset Shortcuts', 'Restore original default 1-Tap Log shortcuts?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          saveQuickShortcuts(DEFAULT_QUICK_SHORTCUTS);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    ]);
  };
  const handleSaveBudget = async () => {
    const parsedBudget = parseFloat(newBudget);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      Alert.alert('Error', 'Please enter a valid positive number for the budget.');
      return;
    }

    setBudgetSubmitting(true);
    try {
      const parsedCycleDay = parseInt(newBudgetCycleDay, 10);
      const payload = { budget: parsedBudget };
      if (!isNaN(parsedCycleDay) && parsedCycleDay >= 1 && parsedCycleDay <= 28) {
          payload.budget_cycle_start_day = parsedCycleDay;
      }
      
      const response = await api.post('/profile/', payload);
      if (response.data.status === 'success') {
        setBudgetModalVisible(false);
        fetchDashboardData();
        Alert.alert('Success', 'Monthly budget updated successfully! 🎉');
      } else {
        Alert.alert('Error', response.data.error || 'Failed to update budget');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save new budget.');
    } finally {
      setBudgetSubmitting(false);
    }
  };

  const handleDeleteExpense = (expenseId) => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const res = await api.post(`/delete-expense/${expenseId}/`);
              if (res.data.status === 'success') {
                fetchDashboardData();
              } else {
                Alert.alert("Error", res.data.message || "Failed to delete expense");
              }
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Could not delete expense.");
            }
          }
        }
      ]
    );
  };

  const fetchDashboardData = async (isInitial = false) => {
    try {
      const name = await getUsername();
      if (name) setUsername(name);
      
      loadCustomShortcuts();
      loadCustomActionDock();

      const shakeDismissed = await AsyncStorage.getItem('shake_banner_dismissed');
      if (shakeDismissed === 'true') {
        setShakeBannerVisible(false);
      }

      // ── 1. LOAD CACHED DATA IMMEDIATELY (Offline-First) ──
      const cachedDashboard = await AsyncStorage.getItem('dashboard_cache');
      if (cachedDashboard) {
        const parsed = JSON.parse(cachedDashboard);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.tip) setDailyTip(parsed.tip);
        if (parsed.comp) setComparison(parsed.comp);
        if (parsed.anom) setAnomalies(parsed.anom);
        if (isInitial) setLoading(false); // Stop loading spinner instantly!
      } else if (isInitial) {
        setLoading(true); // Only show loader if no cache exists
      } else {
        setRefreshing(true);
      }

      const localHour = new Date().getHours();
      const localType = (localHour >= 18 || localHour < 5) ? 'night' : 'morning';

      // ── 2. FETCH FRESH DATA IN BACKGROUND ──
      const [statsRes, tipRes, compRes, anomRes] = await Promise.allSettled([
        api.get('/summary-stats/'),
        api.get(`/daily-tip/?type=${localType}&hour=${localHour}`),
        api.get('/monthly-comparison/'),
        api.get('/anomalies/'),
      ]);

      let newStats, newTip, newComp, newAnom = [];
      
      if (statsRes.status === 'fulfilled') {
        newStats = statsRes.value.data;
        setStats(newStats);
      }
      if (tipRes.status === 'fulfilled') {
        newTip = tipRes.value.data?.tip;
        setDailyTip(newTip);
      }
      if (compRes.status === 'fulfilled') {
        newComp = compRes.value.data;
        setComparison(newComp);
      }
      if (anomRes.status === 'fulfilled') {
        newAnom = anomRes.value.data?.alerts || [];
        setAnomalies(newAnom);
      }

      // ── 3. SAVE FRESH DATA TO CACHE ──
      await AsyncStorage.setItem('dashboard_cache', JSON.stringify({
        stats: newStats || stats,
        tip: newTip || dailyTip,
        comp: newComp || comparison,
        anom: newAnom || anomalies
      }));

    } catch (error) {
      console.error('Dashboard fetch error:', error);
      if (error.response?.status === 401) {
        navigation.replace('Login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(loading); // pass true only when loading is still true (initial open)
    }, [])
  );

  const onRefresh = () => {
    fetchDashboardData();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearAuthData();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const openWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stats?.whatsapp_linked) {
      Linking.openURL('https://wa.me/917379053923?text=Hi');
    } else {
      const phoneParam = stats?.user_phone ? `Link ${stats.user_phone}` : 'Link 91';
      Linking.openURL(`https://wa.me/917379053923?text=${encodeURIComponent(phoneParam)}`);
    }
  };

  const exportData = async (format) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert('Exporting', `Preparing your ${format.toUpperCase()} export...`);
      // Use standard fetch here to download file
      const url = `${api.defaults.baseURL}/api/export/${format}/`;
      const tokenStr = await AsyncStorage.getItem('userToken');
      const token = tokenStr ? `Token ${tokenStr}` : '';
      
      const fileUri = FileSystem.cacheDirectory + `ExpenseTracker_History.${format}`;
      
      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: token }
      });
      
      if (downloadRes.status === 200) {
        const mimeType = format === 'pdf' ? 'application/pdf' : 'text/csv';
        const uti = format === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text';
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: mimeType,
          dialogTitle: `Download Expense ${format.toUpperCase()}`,
          UTI: uti
        });
      } else {
        Alert.alert('Export Error', 'Failed to export data.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Export Error', 'An error occurred during export.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>✨</Text>
        <Text style={{ color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold' }}>ExpenseTracker</Text>
        <ActivityIndicator color={COLORS.cyan} size="small" style={{ marginTop: 16 }} />
      </View>
    );
  }

  const spent = stats?.total_spent || 0;
  const budget = stats?.budget || 20000;
  const budgetCycleDay = stats?.budget_cycle_start_day || 1;
  const usedPercent = stats?.budget_percent || 0;
  const remaining = stats?.remaining || budget;
  const txCount = stats?.transaction_count || 0;
  const avgDay = stats?.avg_per_day || 0;
  const savingsRate = stats?.savings_rate || 100;
  const daysLeft = stats?.days_left || 0;
  const overspent = stats?.overspent || false;
  const recentExpenses = stats?.recent_expenses || [];

  const activeActions = actionDockKeys
    .map(key => ALL_ACTION_SHORTCUTS.find(a => a.id === key))
    .filter(Boolean);

  const row1 = activeActions.slice(0, 4);
  const row2 = activeActions.length > 4 ? activeActions.slice(4) : [];

  const compDiff = comparison?.diff_percent || 0;
  const compMore = comparison?.is_more || false;

  // ── Calculated Real-Time Smart Metrics ──
  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpenses = recentExpenses.filter(e => e.date && e.date.startsWith(todayStr));
  const spentToday = todayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const safeDailySpend = daysLeft > 0 ? Math.max(0, Math.round(remaining / daysLeft)) : 0;

  let healthScore = 94;
  let healthLabel = 'Saver Pro';
  let healthColor = '#10B981';
  if (overspent || usedPercent > 100) {
    healthScore = 35;
    healthLabel = 'Overspent';
    healthColor = '#EF4444';
  } else if (usedPercent > 85) {
    healthScore = 55;
    healthLabel = 'Caution';
    healthColor = '#F59E0B';
  } else if (usedPercent > 65) {
    healthScore = 75;
    healthLabel = 'Balanced';
    healthColor = '#3B82F6';
  } else {
    healthScore = 94;
    healthLabel = 'Saver Pro';
    healthColor = '#10B981';
  }



  const cleanTipText = (text) => {
    if (!text) return '';
    let cleaned = text.replace(/\*([^*]+)\*/g, '$1').replace(/\*/g, '').trim();

    // Dynamically align greeting with device's current local hour (handles cached tips)
    const hour = new Date().getHours();
    const isNight = hour >= 21 || hour < 5;
    const isEvening = hour >= 17 && hour < 21;
    const isAfternoon = hour >= 12 && hour < 17;
    const isMorning = hour >= 5 && hour < 12;

    const currentGreeting = isMorning ? 'Good Morning' : isAfternoon ? 'Good Afternoon' : isEvening ? 'Good Evening' : 'Good Night';
    const greetingEmoji = isNight ? '🌙' : isEvening ? '🌆' : isAfternoon ? '☀️' : '🌅';

    cleaned = cleaned.replace(
      /Good\s+(Morning|Afternoon|Evening|Night)(?:[,\s]+([^!.]+))?!?(?:\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{FE0F}]+)?/iu,
      (match, p1, p2) => {
        const namePart = p2 ? `, ${p2.trim()}` : '';
        return `${currentGreeting}${namePart}! ${greetingEmoji}`;
      }
    );

    return cleaned.trim();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* ── TOP NAVBAR (Ultra-Premium Fintech Header) ── */}
      <LinearGradient
        colors={['#0D1321', '#0B0E14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.navbar}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoIconWrapper}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoIconImage}
              resizeMode="cover"
            />
          </View>
          <View style={{ marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={styles.logoTextMain}>Expense</Text>
              <Text style={styles.logoTextAccent}>Tracker</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1.5 }}>
              <View style={styles.logoStatusDot} />
              <Text style={styles.logoSubText}>Smart Finance • AI</Text>
            </View>
          </View>
        </View>

        <View style={styles.navRight}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Notifications');
            }}
            style={styles.navIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={18} color="#CBD5E1" />
            {anomalies.length > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Profile');
            }}
            style={styles.avatarBtn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366F1', '#EC4899', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradientRing}
            >
              <View style={styles.avatarInnerCircle}>
                <Text style={styles.avatarText}>
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── GREETING & STATUS PILL (Compact & Clean) ── */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingHeaderRow}>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <Text style={styles.greetText} numberOfLines={1}>
                {getGreeting()}, <Text style={{ color: '#A5B4FC' }}>{username ? (username.charAt(0).toUpperCase() + username.slice(1)) : 'Friend'}</Text>
              </Text>
              <Text style={styles.greetSubtext}>Monthly overview</Text>
            </View>
            <View style={styles.unifiedPill}>
              <Ionicons name="calendar-outline" size={10} color="#94A3B8" style={{ marginRight: 3 }} />
              <Text style={styles.unifiedPillMonth}>{formatShortMonth(stats?.month)}</Text>
              <View style={styles.pillDot} />
              <Ionicons name="hourglass-outline" size={10} color="#06B6D4" style={{ marginRight: 2 }} />
              <Text style={styles.unifiedPillDays}>{daysLeft}d left</Text>
            </View>
          </View>
        </View>

        {/* ── ANOMALY SPENDING INSIGHT (Compact Sleek Strip) ── */}
        {anomalies.filter((_, i) => !dismissedAnomalies[i]).length > 0 && (
          <View style={styles.alertBanner}>
            {anomalies.map((alert, idx) => {
              if (dismissedAnomalies[idx]) return null;
              return (
                <LinearGradient
                  key={idx}
                  colors={['rgba(245, 158, 11, 0.12)', 'rgba(17, 24, 39, 0.7)']}
                  style={styles.alertItem}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.alertIconBadge}>
                    <Ionicons name="bulb" size={13} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1 }}>
                      <Text style={styles.alertCategoryTitle}>SPENDING INSIGHT</Text>
                      <View style={styles.alertBadgeDot} />
                      <Text style={styles.alertBadgeSub}>Smart Advice</Text>
                    </View>
                    <Text style={styles.alertText} numberOfLines={2}>
                      {alert.message}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDismissedAnomalies(prev => ({ ...prev, [idx]: true }));
                    }}
                    style={styles.alertDismissBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={13} color="#94A3B8" />
                  </TouchableOpacity>
                </LinearGradient>
              );
            })}
          </View>
        )}

        {/* ── WHATSAPP BANNER ── */}
        {!stats?.whatsapp_linked && (
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              openWhatsApp();
            }} 
            activeOpacity={0.85}
          >
            <View style={styles.waBanner}>
              <View style={styles.waIconContainer}>
                <FontAwesome name="whatsapp" size={24} color="#fff" />
              </View>
              <View style={styles.waTextContainer}>
                <Text style={styles.waTitle}>Track via WhatsApp</Text>
                <Text style={styles.waSubtitle}>Text "500 petrol" to +91 7379053923</Text>
              </View>
              <View style={styles.waButton}>
                <Text style={styles.waButtonText}>Open →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ── LUXURY MAIN BUDGET CARD ── */}
        <LinearGradient
          colors={overspent ? ['#3D0C14', '#1E1226', '#0B0F19'] : ['#18213D', '#11172A', '#0A0E1A']}
          style={styles.mainCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Ambient decorative glowing orb */}
          <View style={styles.cardGlowCircle} />

          <View style={styles.mainCardHeader}>
            <View style={styles.mainCardTitleRow}>
              <View style={styles.walletIconBox}>
                <Ionicons name="wallet-outline" size={13} color="#818CF8" />
              </View>
              <Text style={styles.mainCardTitle}>TOTAL SPENT</Text>
            </View>

            {overspent ? (
              <View style={[styles.overspentBadge, { backgroundColor: 'rgba(239, 68, 68, 0.16)', borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
                <View style={[styles.liveDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.overspentText, { color: '#F87171' }]}>OVERSPENT</Text>
              </View>
            ) : usedPercent > 85 ? (
              <View style={[styles.overspentBadge, { backgroundColor: 'rgba(245, 158, 11, 0.16)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
                <View style={[styles.liveDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.overspentText, { color: '#FBBF24' }]}>85%+ USED</Text>
              </View>
            ) : (
              <View style={[styles.overspentBadge, { backgroundColor: 'rgba(16, 185, 129, 0.14)', borderColor: 'rgba(16, 185, 129, 0.35)' }]}>
                <View style={styles.liveDot} />
                <Text style={[styles.overspentText, { color: '#34D399' }]}>ON TRACK</Text>
              </View>
            )}
          </View>

          <View style={styles.balanceContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <AnimatedNumber
              value={spent}
              style={styles.balanceAmount}
            />
          </View>

          <TouchableOpacity 
            style={styles.budgetEditRow} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setNewBudget(budget.toString());
              setNewBudgetCycleDay(budgetCycleDay.toString());
              setBudgetModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.budgetSubtext}>of ₹{budget.toLocaleString('en-IN')} budget</Text>
            <Ionicons name="pencil" size={11} color="#06B6D4" style={styles.budgetEditIcon} />
          </TouchableOpacity>

          {/* Budget Progress Bar */}
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={usedPercent > 90 ? ['#EF4444', '#DC2626'] : usedPercent > 70 ? ['#F59E0B', '#D97706'] : ['#10B981', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, {
                width: `${Math.min(usedPercent, 100)}%`,
              }]}
            />
          </View>

          {/* Connected 3-Metric Strip */}
          <View style={styles.metricsStrip}>
            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>USED</Text>
              <Text style={styles.metricVal}>{Math.round(usedPercent)}%</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>REMAINING</Text>
              <Text style={[styles.metricVal, { color: remaining >= 0 ? '#10B981' : '#EF4444' }]}>
                ₹{remaining.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>TXNS</Text>
              <Text style={styles.metricVal}>{txCount}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── QUICK ACTION DOCK (Customizable 1-8 items with auto space fill) ── */}
        <View style={styles.actionDockSection}>
          <View style={styles.actionDockHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="flash-outline" size={12} color="#818CF8" style={{ marginRight: 5 }} />
              <Text style={styles.actionDockHeaderTitle}>QUICK ACTIONS</Text>
              <View style={styles.actionDockCountBadge}>
                <Text style={styles.actionDockCountText}>{activeActions.length}/8</Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTempActionDockKeys([...actionDockKeys]);
                setActionDockModalVisible(true);
              }}
              style={styles.actionDockEditBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={12} color="#06B6D4" style={{ marginRight: 3 }} />
              <Text style={styles.actionDockEditText}>Customize</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionDock}>
            {/* Row 1 (up to 4 items) */}
            <View style={styles.actionDockRow}>
              {row1.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.actionDockBtn}
                  onPress={() => handleActionPress(item)}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTempActionDockKeys([...actionDockKeys]);
                    setActionDockModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={item.colors} style={styles.actionDockIcon}>
                    <Ionicons name={item.icon} size={item.iconSize || 20} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.actionDockLabel} numberOfLines={1}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 2 (if > 4 items) */}
            {row2.length > 0 && (
              <View style={[styles.actionDockRow, { marginTop: 14 }]}>
                {row2.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.actionDockBtn}
                    onPress={() => handleActionPress(item)}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTempActionDockKeys([...actionDockKeys]);
                      setActionDockModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={item.colors} style={styles.actionDockIcon}>
                      <Ionicons name={item.icon} size={item.iconSize || 20} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.actionDockLabel} numberOfLines={1}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── 1-TAP QUICK LOG (Dynamic & Customizable) ── */}
        <View style={styles.quickSection}>
          <View style={styles.quickHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="flash" size={13} color="#F59E0B" style={{ marginRight: 5 }} />
              <Text style={styles.quickSectionTitle}>1-TAP LOG</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShortcutsModalVisible(true);
              }}
              style={styles.quickCustomizeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={12} color="#06B6D4" style={{ marginRight: 4 }} />
              <Text style={styles.quickCustomizeText}>Edit & Add</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8, paddingVertical: 2 }}>
            {quickShortcuts.map((item, i) => (
              <TouchableOpacity
                key={item.id || i}
                style={[styles.quickChip, { borderColor: (item.color || '#06B6D4') + '40' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.navigate('AddExpense', {
                    prefillAmount: item.amount,
                    prefillCategory: item.category,
                    prefillDescription: item.label,
                  });
                }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 16, marginRight: 6 }}>{item.icon}</Text>
                <Text style={styles.quickChipAmount}>₹{item.amount}</Text>
                <Text style={styles.quickChipLabel}>{item.label.split('/')[0].trim()}</Text>
              </TouchableOpacity>
            ))}

            {/* Quick Add Pill */}
            <TouchableOpacity
              style={styles.quickAddChip}
              onPress={handleOpenAddShortcut}
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={15} color="#06B6D4" style={{ marginRight: 4 }} />
              <Text style={styles.quickAddChipText}>New</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── FINANCIAL PULSE (CONSOLIDATED HEALTH & SAFE SPEND CARD) ── */}
        <LinearGradient
          colors={['#131B2E', '#0D1424']}
          style={styles.financialPulseCard}
        >
          {/* Top Half: Safe Limit & Fin-Score */}
          <View style={styles.pulseTopRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <View style={[styles.statusDot, { backgroundColor: safeDailySpend > 0 ? '#10B981' : '#EF4444' }]} />
                <Text style={styles.pulseCardLabel}>TODAY'S SAFE LIMIT</Text>
              </View>
              <Text style={[styles.pulseSafeAmount, { color: safeDailySpend > 0 ? '#10B981' : '#EF4444' }]}>
                ₹{safeDailySpend.toLocaleString('en-IN')}<Text style={styles.pulsePerDay}> / day</Text>
              </Text>
              <Text style={styles.pulseSubtext}>
                {spentToday > 0 ? `Spent today: ₹${spentToday.toLocaleString('en-IN')}` : 'No expenses logged today • Safe!'}
              </Text>
            </View>

            <View style={[styles.pulseHealthBadge, { borderColor: healthColor + '60' }]}>
              <Text style={[styles.pulseHealthScore, { color: healthColor }]}>{healthScore}</Text>
              <Text style={styles.pulseHealthSub}>FIN-SCORE</Text>
              <Text style={[styles.pulseHealthTier, { color: healthColor }]} numberOfLines={1}>{healthLabel}</Text>
            </View>
          </View>

          {/* Bottom Half: 3 Micro-Glance Metrics Strip */}
          <View style={styles.pulseMetricsStrip}>
            <View style={styles.pulseMetricItem}>
              <Text style={styles.pulseMetricLabel}>DAILY AVG</Text>
              <Text style={styles.pulseMetricVal}>₹{Math.round(avgDay).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.pulseMetricDivider} />
            <View style={styles.pulseMetricItem}>
              <Text style={styles.pulseMetricLabel}>SAVINGS RATE</Text>
              <Text style={[styles.pulseMetricVal, { color: savingsRate > 50 ? '#10B981' : '#EF4444' }]}>
                {Math.round(savingsRate)}%
              </Text>
            </View>
            <View style={styles.pulseMetricDivider} />
            <View style={styles.pulseMetricItem}>
              <Text style={styles.pulseMetricLabel}>VS LAST MO</Text>
              <Text style={[styles.pulseMetricVal, { color: compMore ? '#EF4444' : '#10B981' }]}>
                {compMore ? '↑' : '↓'} {Math.abs(Math.round(compDiff))}%
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── MAGIC SHAKE INTERACTIVE CARD (if active) ── */}
        {shakeBannerVisible && (
          <TouchableOpacity
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.navigate('AddExpense');
            }}
            activeOpacity={0.8}
            style={{ marginVertical: 6 }}
          >
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.22)', 'rgba(79, 70, 229, 0.08)']}
              style={styles.shakeBanner}
            >
              <View style={styles.shakeIconBox}>
                <Text style={{ fontSize: 20 }}>📱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Magic Shake</Text>
                  <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text style={{ color: '#10B981', fontSize: 9, fontWeight: '800' }}>ACTIVE</Text>
                  </View>
                </View>
                <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 1 }}>Shake phone to quick-log an expense!</Text>
              </View>
              <TouchableOpacity 
                onPress={async (e) => {
                  e.stopPropagation();
                  setShakeBannerVisible(false);
                  await AsyncStorage.setItem('shake_banner_dismissed', 'true');
                }}
                style={{ padding: 5 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={18} color="#A78BFA" />
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── CATEGORY BREAKDOWN ── */}
        {recentExpenses.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <SectionHeader title="Category Breakdown" actionText="Details →" onAction={() => navigation.navigate('Analytics')} />
            <GlassCard style={{ paddingVertical: 4 }}>
              {getCategoryBreakdown(recentExpenses).slice(0, 4).map((cat, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.catRow}
                  onPress={() => navigation.navigate('Analytics')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
                    <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, { width: `${cat.percent}%`, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                  <Text style={styles.catAmount}>₹{cat.total.toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              ))}
            </GlassCard>
          </View>
        )}

        {/* ── AI FINANCIAL COACH & DAILY MONEY TIP (CONSOLIDATED) ── */}
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('AIChat');
          }} 
          activeOpacity={0.85}
          style={{ marginTop: 12 }}
        >
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.18)', 'rgba(6, 182, 212, 0.08)']}
            style={styles.aiUnifiedCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.aiUnifiedHeader}>
              <View style={styles.aiUnifiedBadge}>
                <Ionicons name="sparkles" size={12} color="#818CF8" style={{ marginRight: 5 }} />
                <Text style={styles.aiUnifiedBadgeText}>AI COACH & DAILY TIP</Text>
              </View>
              <View style={styles.aiUnifiedChatBtn}>
                <Text style={styles.aiUnifiedChatText}>Chat with AI</Text>
                <Ionicons name="arrow-forward" size={11} color={COLORS.cyan} />
              </View>
            </View>
            <Text style={styles.aiUnifiedBody}>
              {cleanTipText(dailyTip) || (overspent
                ? `Budget exceeded! You've spent ₹${spent.toLocaleString('en-IN')}. Tap to get advice.`
                : `Great job! You used ${Math.round(usedPercent)}% of your budget. Tap to chat!`)}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── QUICK TOOLS ROW (2-Column Bento: Notepad & Analytics) ── */}
        <View style={styles.toolsBentoRow}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Notepad');
            }}
            activeOpacity={0.8}
            style={styles.toolBentoCard}
          >
            <LinearGradient
              colors={['rgba(236, 72, 153, 0.12)', 'rgba(236, 72, 153, 0.04)']}
              style={styles.toolBentoInner}
            >
              <View style={styles.toolBentoIconBoxPink}>
                <MaterialCommunityIcons name="notebook-outline" size={20} color="#F472B6" />
              </View>
              <Text style={styles.toolBentoTitle}>Personal Notepad</Text>
              <Text style={styles.toolBentoSub}>Lists, memos & thoughts</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Analytics');
            }}
            activeOpacity={0.8}
            style={styles.toolBentoCard}
          >
            <LinearGradient
              colors={['rgba(6, 182, 212, 0.12)', 'rgba(6, 182, 212, 0.04)']}
              style={styles.toolBentoInner}
            >
              <View style={styles.toolBentoIconBoxCyan}>
                <Ionicons name="pie-chart-outline" size={20} color="#06B6D4" />
              </View>
              <Text style={styles.toolBentoTitle}>Analytics & Trends</Text>
              <Text style={styles.toolBentoSub}>Monthly reports & graphs</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── RECENT EXPENSES ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Recent Expenses {recentExpenses.length > 0 ? `(${recentExpenses.length})` : ''}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('History');
            }} 
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={{ color: COLORS.cyan, fontWeight: 'bold', marginRight: 4 }}>See All</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.cyan} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginBottom: 12, gap: 10 }}>
          <TouchableOpacity onPress={() => exportData('pdf')} style={styles.exportPill}>
            <Text style={styles.exportPillText}>📄 Export PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => exportData('csv')} style={styles.exportPill}>
            <Text style={styles.exportPillText}>📊 Export CSV</Text>
          </TouchableOpacity>
        </View>
        {recentExpenses.length > 0 ? (
          <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
            {recentExpenses.map((exp, idx) => (
              <TouchableOpacity 
                key={exp.id || idx} 
                style={[styles.expenseItem, idx < recentExpenses.length - 1 && styles.expenseBorder]}
                onPress={() => navigation.navigate('AddExpense', { expense: exp })}
              >
                <View style={[styles.expIcon, { backgroundColor: (CAT_COLORS[exp.category] || '#888') + '22' }]}>
                  <Text style={{ fontSize: 18 }}>{CAT_ICONS[exp.category] || getFallbackIcon(exp.category)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expCategory} numberOfLines={1}>
                    {exp.description 
                      ? exp.description.charAt(0).toUpperCase() + exp.description.slice(1) 
                      : (exp.category || 'other').charAt(0).toUpperCase() + (exp.category || 'other').slice(1)}
                  </Text>
                  <Text style={styles.expDate}>{formatDate(exp.date)}</Text>
                </View>
                <Text style={[styles.expAmount, { marginRight: 10 }]}>-₹{Number(exp.amount).toLocaleString('en-IN')}</Text>
                
                <TouchableOpacity 
                  onPress={() => navigation.navigate('AddExpense', { expense: exp })}
                  style={{ padding: 5 }}
                >
                  <Ionicons name="pencil-outline" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleDeleteExpense(exp.id);
                  }}
                  style={{ padding: 5 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </GlassCard>
        ) : (
          <EmptyState
            icon="📝"
            title="No expenses yet"
            message="Start tracking your expenses to see insights"
            actionText="Add First Expense"
            onAction={() => navigation.navigate('AddExpense')}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── DUAL FLOATING ACTIONS (VOICE & ADD EXPENSE) ── */}
      <View
        style={{
          position: 'absolute',
          bottom: 24,
          alignSelf: 'center',
          flexDirection: 'row',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderRadius: 30,
          padding: 8,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 10,
          zIndex: 100,
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: '#F97316',
            borderRadius: 24,
            paddingVertical: 12,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 8,
          }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('VoiceExpense');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="mic" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Voice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: '#06B6D4',
            borderRadius: 24,
            paddingVertical: 12,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('AddExpense');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 6 }} />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Add expense</Text>
        </TouchableOpacity>
      </View>

      {/* Update Budget Modal */}
      <Modal
        visible={budgetModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Monthly Budget</Text>
            <Text style={styles.modalSubtitle}>Define your monthly spending limit to stay on track.</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>₹</Text>
              <TextInput
                style={styles.budgetInput}
                keyboardType="numeric"
                value={newBudget}
                onChangeText={setNewBudget}
                placeholder="Enter budget amount"
                placeholderTextColor="#64748b"
                autoFocus={true}
                maxLength={10}
              />
            </View>
            
            <View style={[styles.inputContainer, { marginTop: 15 }]}>
              <Text style={styles.inputPrefix}>📅</Text>
              <TextInput
                style={styles.budgetInput}
                keyboardType="numeric"
                value={newBudgetCycleDay}
                onChangeText={setNewBudgetCycleDay}
                placeholder="Cycle start day (1-28)"
                placeholderTextColor="#64748b"
                maxLength={2}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setBudgetModalVisible(false)}
                disabled={budgetSubmitting}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSaveBudget}
                disabled={budgetSubmitting}
              >
                {budgetSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Save Budget</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CUSTOMIZE SHORTCUTS MODAL ── */}
      <Modal
        visible={shortcutsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShortcutsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetOverlay}
        >
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="flash" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                  <Text style={styles.sheetTitle}>Customize 1-Tap Log</Text>
                </View>
                <Text style={styles.sheetSubtitle}>
                  Add, edit, or remove your daily fast expense buttons
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShortcutsModalVisible(false)}
                style={styles.sheetCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={{ maxHeight: 380, marginVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {quickShortcuts.map((item, idx) => {
                const catObj = AVAILABLE_SHORTCUT_CATEGORIES.find(c => c.id === item.category);
                const catColor = catObj ? catObj.color : '#06B6D4';
                return (
                  <View key={item.id || idx} style={styles.shortcutRow}>
                    <View style={[styles.shortcutRowIcon, { borderColor: catColor + '50' }]}>
                      <Text style={{ fontSize: 20 }}>{item.icon || '💸'}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.shortcutRowTitle}>{item.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Text style={[styles.shortcutRowCat, { color: catColor }]}>
                          {(item.category || 'other').toUpperCase()}
                        </Text>
                        <Text style={styles.shortcutRowDot}>•</Text>
                        <Text style={styles.shortcutRowAmt}>₹{item.amount}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={() => handleOpenEditShortcut(item)}
                        style={[styles.shortcutActionBtn, { backgroundColor: 'rgba(6, 182, 212, 0.12)' }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="pencil" size={15} color="#06B6D4" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteShortcut(item.id || item.label)}
                        style={[styles.shortcutActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)', marginLeft: 8 }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              {quickShortcuts.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text style={{ color: '#64748B', fontSize: 13 }}>No shortcuts configured yet.</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.sheetBottomBar}>
              <TouchableOpacity
                style={styles.addNewShortcutBtn}
                onPress={handleOpenAddShortcut}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.addNewShortcutGrad}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.addNewShortcutText}>Add New Shortcut</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResetShortcuts}
                style={styles.resetShortcutsBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.resetShortcutsText}>Restore Defaults</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── ADD / EDIT SHORTCUT MODAL ── */}
      <Modal
        visible={shortcutFormVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShortcutFormVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetOverlay}
        >
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {editShortcutItem ? 'Edit 1-Tap Shortcut' : 'Create 1-Tap Shortcut'}
              </Text>
              <TouchableOpacity
                onPress={() => setShortcutFormVisible(false)}
                style={styles.sheetCloseBtn}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Select Icon */}
              <Text style={styles.formInputLabel}>CHOOSE ICON</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4, gap: 8 }}
              >
                {AVAILABLE_SHORTCUT_ICONS.map((ic) => {
                  const isSelected = shortcutIcon === ic;
                  return (
                    <TouchableOpacity
                      key={ic}
                      style={[styles.iconChoice, isSelected && styles.iconChoiceSelected]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShortcutIcon(ic);
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>{ic}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Shortcut Label */}
              <Text style={[styles.formInputLabel, { marginTop: 14 }]}>SHORTCUT NAME</Text>
              <TextInput
                style={styles.shortcutTextInput}
                value={shortcutLabel}
                onChangeText={setShortcutLabel}
                placeholder="e.g. Chai, Auto, Coffee, Cigarette"
                placeholderTextColor="#64748B"
                maxLength={24}
              />

              {/* Amount */}
              <Text style={[styles.formInputLabel, { marginTop: 14 }]}>DEFAULT AMOUNT (₹)</Text>
              <View style={styles.shortcutAmtInputWrap}>
                <Text style={styles.shortcutAmtPrefix}>₹</Text>
                <TextInput
                  style={styles.shortcutAmtTextInput}
                  value={shortcutAmount}
                  onChangeText={setShortcutAmount}
                  placeholder="0"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  maxLength={7}
                />
              </View>

              {/* Category */}
              <Text style={[styles.formInputLabel, { marginTop: 14 }]}>CATEGORY</Text>
              <View style={styles.catChipsRow}>
                {AVAILABLE_SHORTCUT_CATEGORIES.map((cat) => {
                  const isSelected = shortcutCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catChoiceChip,
                        isSelected && { borderColor: cat.color, backgroundColor: cat.color + '22' }
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShortcutCategory(cat.id);
                      }}
                    >
                      <Text style={{ fontSize: 13, marginRight: 4 }}>{cat.icon}</Text>
                      <Text
                        style={[
                          styles.catChoiceChipText,
                          isSelected && { color: cat.color, fontWeight: '700' }
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.saveShortcutActionBtn}
                onPress={handleSaveShortcut}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#06B6D4', '#0891B2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveShortcutActionGrad}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveShortcutActionText}>
                    {editShortcutItem ? 'Update Shortcut' : 'Add to Dashboard'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CUSTOMIZE QUICK ACTIONS MODAL ── */}
      <Modal
        visible={actionDockModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActionDockModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetOverlay}
        >
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="apps" size={18} color="#818CF8" style={{ marginRight: 6 }} />
                  <Text style={styles.sheetTitle}>Customize Quick Actions</Text>
                </View>
                <Text style={styles.sheetSubtitle}>
                  Pick up to 8 shortcuts for your home dock
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActionDockModalVisible(false)}
                style={styles.sheetCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Selection counter badge */}
            <View style={styles.actionModalCountRow}>
              <Text style={styles.actionModalCountLabel}>SELECTED SHORTCUTS</Text>
              <View style={[
                styles.actionModalCountPill,
                tempActionDockKeys.length === 8 && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }
              ]}>
                <Text style={[
                  styles.actionModalCountPillText,
                  tempActionDockKeys.length === 8 && { color: '#EF4444' }
                ]}>
                  {tempActionDockKeys.length} / 8 MAX
                </Text>
              </View>
            </View>

            <ScrollView 
              style={{ maxHeight: 380, marginVertical: 6 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.actionModalGrid}>
                {ALL_ACTION_SHORTCUTS.map((item) => {
                  const isSelected = tempActionDockKeys.includes(item.id);
                  const selectedIndex = tempActionDockKeys.indexOf(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.actionModalItemCard,
                        isSelected && styles.actionModalItemCardSelected
                      ]}
                      onPress={() => toggleActionKey(item.id)}
                      activeOpacity={0.75}
                    >
                      <LinearGradient
                        colors={item.colors}
                        style={styles.actionModalIconGrad}
                      >
                        <Ionicons name={item.icon} size={18} color="#fff" />
                      </LinearGradient>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.actionModalItemTitle}>{item.label}</Text>
                        <Text style={styles.actionModalItemDesc} numberOfLines={1}>{item.desc}</Text>
                      </View>
                      <View style={[
                        styles.actionModalCheckbox,
                        isSelected && styles.actionModalCheckboxActive
                      ]}>
                        {isSelected ? (
                          <Text style={styles.actionModalCheckIndex}>{selectedIndex + 1}</Text>
                        ) : (
                          <Ionicons name="add" size={14} color="#64748B" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.sheetBottomBar}>
              <TouchableOpacity
                style={styles.addNewShortcutBtn}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  saveActionDock(tempActionDockKeys);
                  setActionDockModalVisible(false);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.addNewShortcutGrad}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.addNewShortcutText}>Save Actions ({tempActionDockKeys.length})</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setTempActionDockKeys(DEFAULT_ACTION_DOCK_KEYS);
                }}
                style={styles.resetShortcutsBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.resetShortcutsText}>Restore Default 4 Actions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Helper Functions ──

function getGreeting() {
  const h = new Date().getHours(); // Uses device's local time automatically
  if (h >= 5  && h < 12) return '🌅 Good Morning';
  if (h >= 12 && h < 17) return '☀️ Good Afternoon';
  if (h >= 17 && h < 21) return '🌆 Good Evening';
  return '🌙 Good Night';
}

function formatShortMonth(monthStr) {
  if (!monthStr) return 'This Month';
  const parts = monthStr.trim().split(/\s+/);
  if (parts.length >= 2) {
    const shortMonth = parts[0].slice(0, 3);
    const shortYear = parts[1].slice(-2);
    return `${shortMonth} '${shortYear}`;
  }
  return monthStr.slice(0, 8);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getCategoryBreakdown(expenses) {
  const catMap = {};
  let total = 0;
  expenses.forEach((exp) => {
    const cat = (exp.category || 'other').toLowerCase();
    catMap[cat] = (catMap[cat] || 0) + Number(exp.amount);
    total += Number(exp.amount);
  });

  return Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, catTotal]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      total: Math.round(catTotal),
      percent: total > 0 ? Math.round((catTotal / total) * 100) : 0,
      color: CAT_COLORS[name] || '#888',
      icon: CAT_ICONS[name] || getFallbackIcon(name),
    }));
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Luxury Top Navbar ──
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0B0E14',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  logoIconImage: {
    width: '100%',
    height: '100%',
  },
  logoTextMain: {
    color: '#FFFFFF',
    fontSize: 17.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  logoTextAccent: {
    color: '#06B6D4',
    fontSize: 17.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  logoStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  logoSubText: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#0B0E14',
  },
  avatarBtn: {
    borderRadius: 19,
  },
  avatarGradientRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    padding: 1.8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarInnerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14.5,
    letterSpacing: -0.2,
  },

  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, flexGrow: 1 },

  // ── Greeting & Date Pill (Compact & Elegant) ──
  greetingSection: {
    marginBottom: 8,
  },
  greetingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  greetSubtext: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  unifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  unifiedPillMonth: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '600',
  },
  pillDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#64748B',
    marginHorizontal: 5,
  },
  unifiedPillDays: {
    color: '#06B6D4',
    fontSize: 10.5,
    fontWeight: '700',
  },

  // ── Smart Alert Banner (Compact Sleek Strip) ──
  alertBanner: {
    marginBottom: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  alertIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCategoryTitle: {
    color: '#F59E0B',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alertBadgeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D97706',
    marginHorizontal: 4,
  },
  alertBadgeSub: {
    color: '#D97706',
    fontSize: 9.5,
    fontWeight: '600',
  },
  alertText: {
    color: '#E2E8F0',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  alertDismissBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },

  // ── WhatsApp ──
  waBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  waIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.whatsapp,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  waTextContainer: { flex: 1 },
  waTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  waSubtitle: { color: COLORS.textSecondary, fontSize: 11 },
  waButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  waButtonText: { color: COLORS.whatsapp, fontWeight: '600', fontSize: 12 },

  // ── Luxury Main Budget Card ──
  mainCard: { 
    borderRadius: 26, 
    padding: 20, 
    marginBottom: 12, 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    position: 'relative',
    overflow: 'hidden',
    ...SHADOW.lg,
  },
  cardGlowCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  mainCardHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center', 
    marginBottom: 10,
  },
  mainCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
  },
  mainCardTitle: {
    color: '#94A3B8', 
    fontSize: 10.5,
    fontWeight: '800', 
    letterSpacing: 1,
  },
  overspentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9, 
    paddingVertical: 4, 
    borderRadius: 10,
    borderWidth: 1,
  },
  overspentText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },
  balanceContainer: { 
    flexDirection: 'row', 
    alignItems: 'baseline', 
    marginBottom: 4,
    marginTop: 2,
  },
  currencySymbol: { 
    color: '#818CF8', 
    fontSize: 26, 
    fontWeight: '700', 
    marginRight: 4,
  },
  balanceAmount: { 
    color: '#FFFFFF', 
    fontSize: 40, 
    fontWeight: '900', 
    letterSpacing: -1.2,
  },
  budgetEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  budgetSubtext: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  budgetEditIcon: {
    marginLeft: 6,
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 14, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.xl,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    ...SHADOW.lg,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    width: '100%',
    height: 56,
    marginBottom: 24,
  },
  inputPrefix: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  budgetInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalBtnCancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalBtnSave: {
    backgroundColor: COLORS.primary,
  },
  modalBtnSaveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // ── Progress Bar ──
  progressBarBg: {
    height: 7, 
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4, 
    marginBottom: 16, 
    overflow: 'hidden',
  },
  progressBarFill: { 
    height: '100%', 
    borderRadius: 4,
  },

  // ── Connected 3-Metric Strip ──
  metricsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  metricVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // ── Financial Pulse Card ──
  financialPulseCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginVertical: 10,
    ...SHADOW.md,
  },
  pulseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
  },
  pulseCardLabel: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 0.6,
    marginLeft: 6,
  },
  pulseSafeAmount: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  pulsePerDay: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  pulseSubtext: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  pulseHealthBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  pulseHealthScore: {
    fontSize: 20,
    fontWeight: '900',
  },
  pulseHealthSub: {
    color: '#94A3B8',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  pulseHealthTier: {
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 1,
  },
  pulseMetricsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  pulseMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  pulseMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pulseMetricLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pulseMetricVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Category Breakdown ──
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  catIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  catName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  catBarBg: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2, overflow: 'hidden', width: '100%',
  },
  catBarFill: { height: '100%', borderRadius: 2 },
  catAmount: { color: COLORS.textPrimary, fontSize: 14, fontWeight: 'bold' },

  // ── AI Unified Card ──
  aiUnifiedCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    padding: 16,
    ...SHADOW.md,
  },
  aiUnifiedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiUnifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiUnifiedBadgeText: {
    color: '#A5B4FC',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiUnifiedChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiUnifiedChatText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '700',
    marginRight: 4,
  },
  aiUnifiedBody: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },

  // ── Bento Tools Row ──
  toolsBentoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  toolBentoCard: {
    flex: 1,
    marginHorizontal: 3,
  },
  toolBentoInner: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
  },
  toolBentoIconBoxPink: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(236, 72, 153, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolBentoIconBoxCyan: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolBentoTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  toolBentoSub: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '500',
  },

  // ── Expense Item ──
  expenseItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  expenseBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  expIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  expCategory: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  expDate: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  expAmount: { color: COLORS.red, fontSize: 15, fontWeight: 'bold' },

  // ── Quick Log Shortcuts ──
  quickSection: {
    marginTop: 14,
    marginBottom: 6,
  },
  quickHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  quickSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.8,
  },
  fastPill: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  fastPillText: {
    color: '#06B6D4',
    fontSize: 9,
    fontWeight: '800',
  },
  quickSectionSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131A2A',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
  },
  quickChipAmount: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 5,
  },
  quickChipLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },

  // ── Magic Shake Card ──
  shakeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADIUS.lg,
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  shakeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },

  // ── Action Dock Section & Header ──
  actionDockSection: {
    marginVertical: 10,
  },
  actionDockHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  actionDockHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.8,
  },
  actionDockCountBadge: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
  },
  actionDockCountText: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '800',
  },
  actionDockEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  actionDockEditText: {
    color: '#06B6D4',
    fontSize: 11,
    fontWeight: '700',
  },
  actionDock: {
    backgroundColor: '#121827',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 8,
    ...SHADOW.md,
  },
  actionDockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  actionDockBtn: {
    alignItems: 'center',
    flex: 1,
  },
  actionDockIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionDockLabel: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Action Modal Styles ──
  actionModalCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  actionModalCountLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  actionModalCountPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  actionModalCountPillText: {
    color: '#10B981',
    fontSize: 10.5,
    fontWeight: '800',
  },
  actionModalGrid: {
    gap: 8,
  },
  actionModalItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionModalItemCardSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  actionModalIconGrad: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalItemTitle: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: '700',
  },
  actionModalItemDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  actionModalCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionModalCheckboxActive: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
  },
  actionModalCheckIndex: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  // ── Export Pills ──
  exportPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  exportPillText: {
    color: COLORS.cyan,
    fontSize: 12,
    fontWeight: 'bold',
  },

  // ── Quick Log Customization Styles ──
  quickCustomizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  quickCustomizeText: {
    color: '#06B6D4',
    fontSize: 11,
    fontWeight: '700',
  },
  quickAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    borderStyle: 'dashed',
  },
  quickAddChipText: {
    color: '#06B6D4',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Bottom Sheet Modals ──
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...SHADOW.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Shortcut List Rows ──
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  shortcutRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  shortcutRowTitle: {
    color: '#F1F5F9',
    fontSize: 14.5,
    fontWeight: '700',
  },
  shortcutRowCat: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  shortcutRowDot: {
    color: '#475569',
    marginHorizontal: 5,
    fontSize: 10,
  },
  shortcutRowAmt: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  shortcutActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Sheet Bottom Bar ──
  sheetBottomBar: {
    marginTop: 10,
    gap: 8,
  },
  addNewShortcutBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  addNewShortcutGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  addNewShortcutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  resetShortcutsBtn: {
    alignItems: 'center',
    paddingVertical: 9,
  },
  resetShortcutsText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Form Inputs ──
  formInputLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconChoiceSelected: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  shortcutTextInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '600',
  },
  shortcutAmtInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  shortcutAmtPrefix: {
    color: '#06B6D4',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 6,
  },
  shortcutAmtTextInput: {
    flex: 1,
    paddingVertical: 11,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  catChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 16,
  },
  catChoiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  catChoiceChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  saveShortcutActionBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 10,
  },
  saveShortcutActionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveShortcutActionText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
