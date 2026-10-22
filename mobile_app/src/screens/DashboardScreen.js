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
import DonutChart from '../components/DonutChart';




import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import api, { BASE_URL } from '../api/config';
import { getUsername, clearAuthData, getToken } from '../utils/auth';
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
  const [fullName, setFullName] = useState('');
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [newBudgetCycleDay, setNewBudgetCycleDay] = useState('1');
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [shakeBannerVisible, setShakeBannerVisible] = useState(true);

  // ── LUXURY ULTRA-CLEAN ENTRANCE ANIMATIONS (NO CROOKED ROTATION) ──
  const animGreetingX = useRef(new Animated.Value(-20)).current;
  const animGreetingOpacity = useRef(new Animated.Value(0)).current;

  const animCardScale = useRef(new Animated.Value(0.93)).current;
  const animCardY = useRef(new Animated.Value(20)).current;
  const animCardOpacity = useRef(new Animated.Value(0)).current;

  const animDockX = useRef(new Animated.Value(20)).current;
  const animDockOpacity = useRef(new Animated.Value(0)).current;

  const animListsY = useRef(new Animated.Value(25)).current;
  const animListsOpacity = useRef(new Animated.Value(0)).current;

  const hasRevealedRef = useRef(false);

  const runEntranceAnimation = useCallback(() => {
    // Reset values first
    animGreetingX.setValue(-20);
    animGreetingOpacity.setValue(0);
    animCardScale.setValue(0.93);
    animCardY.setValue(20);
    animCardOpacity.setValue(0);
    animDockX.setValue(20);
    animDockOpacity.setValue(0);
    animListsY.setValue(25);
    animListsOpacity.setValue(0);

    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(animGreetingOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(animGreetingX, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(animCardOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(animCardY, { toValue: 0, friction: 6, tension: 60, useNativeDriver: true }),
        Animated.spring(animCardScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(animDockOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(animDockX, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(animListsOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(animListsY, { toValue: 0, friction: 7, tension: 45, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    // Listen for splash reveal event from MoneySplashScreen
    const sub = DeviceEventEmitter.addListener('splash_reveal', () => {
      hasRevealedRef.current = true;
      runEntranceAnimation();
    });

    // Fallback: if splash didn't run or finished earlier
    const fallbackTimer = setTimeout(() => {
      if (!hasRevealedRef.current) {
        hasRevealedRef.current = true;
        runEntranceAnimation();
      }
    }, 1800);

    return () => {
      sub.remove();
      clearTimeout(fallbackTimer);
    };
  }, [runEntranceAnimation]);

  useFocusEffect(
    useCallback(() => {
      if (hasRevealedRef.current) {
        runEntranceAnimation();
      } else {
        // Keep hidden while splash is running
        animGreetingOpacity.setValue(0);
        animCardOpacity.setValue(0);
        animDockOpacity.setValue(0);
        animListsOpacity.setValue(0);
      }
    }, [runEntranceAnimation])
  );

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

      try {
        const cachedProfile = await AsyncStorage.getItem('user_profile');
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          if (parsed.full_name) setFullName(parsed.full_name);
        }
      } catch (e) {}

      api.get('/profile/').then(res => {
        if (res.data?.full_name) {
          setFullName(res.data.full_name);
          AsyncStorage.setItem('user_profile', JSON.stringify(res.data));
        }
      }).catch(() => {});
      
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

      // ── 2. FETCH FRESH DATA IN BACKGROUND (Instant unblocked UI update) ──
      api.get('/summary-stats/').then(res => {
        if (res.data) {
          setStats(res.data);
          setLoading(false);
        }
      }).catch(err => {
        if (err.response?.status === 401) navigation.replace('Login');
      });

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
      const token = await getToken();
      const authHeader = token ? `Token ${token}` : '';
      const url = `${BASE_URL}/api/export/${format}/`;
      const fileUri = `${FileSystem.cacheDirectory}ExpenseTracker_Report_${Date.now()}.${format}`;
      
      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: authHeader ? { Authorization: authHeader } : {}
      });
      
      if (downloadRes.status === 200) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          const mimeType = format === 'pdf' ? 'application/pdf' : 'text/csv';
          const uti = format === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text';
          await Sharing.shareAsync(downloadRes.uri, {
            mimeType: mimeType,
            dialogTitle: `Download Expense ${format.toUpperCase()}`,
            UTI: uti
          });
        } else {
          Alert.alert('Export Complete', `Saved to ${downloadRes.uri}`);
        }
      } else {
        Alert.alert('Export Error', `Export failed with status ${downloadRes.status}. Please check your connection.`);
      }
    } catch (e) {
      console.error('Export error:', e);
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
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── LILAC PURPLE RADIANT HEADER (Direct Match to User Screenshot) ── */}
        <LinearGradient
          colors={['#8B5CF6', '#9333EA', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroHeaderContainer}
        >
          {/* Subtle Ambient Radial Glows */}
          <View style={styles.heroGlowCircle} />

          {/* Top Bar: Avatar with Thumbs-up | Month Pill | Notification Bell */}
          <Animated.View style={[styles.topHeaderRow, { opacity: animGreetingOpacity }]}>
            {/* Left: Avatar with Badge */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.heroAvatarBtn}
              activeOpacity={0.85}
            >
              <View style={styles.heroAvatarCircle}>
                <Text style={styles.heroAvatarText}>
                  {(fullName || username || 'A').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.heroAvatarThumbBadge}>
                <Text style={{ fontSize: 9 }}>👍</Text>
              </View>
            </TouchableOpacity>

            {/* Center: Month Dropdown Pill (e.g. "November 2026 ⌵") */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNewBudget(budget.toString());
                setNewBudgetCycleDay(budgetCycleDay.toString());
                setBudgetModalVisible(true);
              }}
              style={styles.heroMonthPill}
              activeOpacity={0.8}
            >
              <Text style={styles.heroMonthPillText}>
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {/* Right: Frosted Bell Icon with Red Dot */}
            <TouchableOpacity
              onPress={() => navigation.navigate('History')}
              style={styles.heroNotificationBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications" size={17} color="#FFFFFF" />
              <View style={styles.heroNotificationDot} />
            </TouchableOpacity>
          </Animated.View>

          {/* Centered Balance Block (Direct Match to User Screenshot) */}
          <Animated.View style={[styles.heroBalanceBlock, { opacity: animCardOpacity, transform: [{ translateY: animCardY }, { scale: animCardScale }] }]}>
            <Text style={styles.heroBalanceLabel}>Total Spent</Text>
            <View style={styles.heroBalanceRow}>
              <Text style={styles.heroCurrencySymbol}>₹</Text>
              <AnimatedNumber
                value={spent}
                style={styles.heroBalanceAmount}
              />
              <Text style={styles.heroBalanceCents}>.00</Text>
            </View>

            {/* Remaining Balance & Budget Overview Badge */}
            <View style={styles.heroSpentBadgeRow}>
              <View style={styles.heroSpentBadge}>
                <Ionicons name="wallet-outline" size={13} color="#86EFAC" style={{ marginRight: 5 }} />
                <Text style={styles.heroSpentBadgeText}>
                  Remaining: <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>₹{remaining.toLocaleString('en-IN')}</Text>
                </Text>
                <Text style={styles.heroSpentBudgetDivider}>•</Text>
                <Text style={styles.heroSpentBudgetText}>
                  Limit: ₹{budget.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Sub-Pill below balance (Translucent Frosted Pill) */}
            <TouchableOpacity 
              style={styles.heroSubPill}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNewBudget(budget.toString());
                setNewBudgetCycleDay(budgetCycleDay.toString());
                setBudgetModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.heroSubPillText}>
                {safeDailySpend > 0 
                  ? `+₹${safeDailySpend.toLocaleString('en-IN')} safe per day  •  ${daysLeft}d left` 
                  : `Budget Warning  •  ${daysLeft}d left`}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>

        {/* ── CURVED WHITE SHEET CONTAINER ── */}
        <View style={styles.sheetContainer}>
          {/* ── ANOMALY SPENDING INSIGHT (If Any) ── */}
          {anomalies.filter((_, i) => !dismissedAnomalies[i]).length > 0 && (
            <Animated.View style={[styles.alertBanner, { opacity: animGreetingOpacity }]}>
              {anomalies.map((alert, idx) => {
                if (dismissedAnomalies[idx]) return null;
                return (
                  <View key={idx} style={styles.alertItem}>
                    <View style={styles.alertIconBadge}>
                      <Ionicons name="bulb" size={13} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 8 }}>
                      <Text style={styles.alertCategoryTitle}>SPENDING INSIGHT</Text>
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
                      <Ionicons name="close" size={13} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </Animated.View>
          )}

          {/* ── SECTION 1: YOUR MONEY (Header + Two Bento Cards) ── */}
          <View style={styles.yourMoneyHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.yourMoneyTitle}>Your Money</Text>
              <Ionicons name="information-circle-outline" size={15} color="#94A3B8" style={{ marginLeft: 5 }} />
            </View>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Analytics')}
              style={styles.detailsBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.detailsBtnText}>Details</Text>
              <Ionicons name="chevron-forward" size={13} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* ── TWO-COLUMN BENTO: SAFE LIMIT & EXPENSES ── */}
          <View style={styles.twoBentoRow}>
            {/* Left Bento: Safe Daily / Total Budget */}
            <View style={styles.bentoMiniCard}>
              <View style={[styles.bentoIconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="wallet-outline" size={20} color="#0284C7" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <Text style={styles.bentoCardLabel}>Safe Limit</Text>
                <Ionicons name="information-circle-outline" size={11} color="#94A3B8" style={{ marginLeft: 3 }} />
              </View>
              <Text style={styles.bentoCardAmount}>₹{safeDailySpend.toLocaleString('en-IN')}</Text>
            </View>

            {/* Right Bento: Expenses */}
            <View style={styles.bentoMiniCard}>
              <View style={[styles.bentoIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="receipt-outline" size={20} color="#EF4444" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <Text style={styles.bentoCardLabel}>Expenses</Text>
                <Ionicons name="information-circle-outline" size={11} color="#94A3B8" style={{ marginLeft: 3 }} />
              </View>
              <Text style={styles.bentoCardAmount}>₹{spent.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          {/* ── SECTION 2: DARK INSIGHT PILL ("✨ Your insight is ready   Get Pro >") ── */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('AIChat');
            }}
            activeOpacity={0.88}
            style={styles.darkInsightPill}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <Ionicons name="sparkles" size={15} color="#A78BFA" style={{ marginRight: 8 }} />
              <Text style={styles.darkInsightText} numberOfLines={1}>
                {cleanTipText(dailyTip) || 'Your daily financial insight is ready'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.darkInsightActionText}>Get Pro</Text>
              <Ionicons name="chevron-forward" size={12} color="#94A3B8" style={{ marginLeft: 2 }} />
            </View>
          </TouchableOpacity>

          {/* ── SECTION 3: QUICK ACTION DOCK (Add, Voice, Split, History, More) ── */}
          <Animated.View style={[styles.actionDockSection, { opacity: animDockOpacity, transform: [{ translateX: animDockX }] }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionDockScroll}>
              {activeActions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.actionDockItem}
                  onPress={() => handleActionPress(item)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={item.colors ? item.colors : ['#8B5CF6', '#7C3AED']}
                    style={styles.actionDockIconBox}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name={item.icon} size={22} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.actionDockLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.actionDockItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTempActionDockKeys([...actionDockKeys]);
                  setActionDockModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.actionDockCustomizeBox}>
                  <Ionicons name="options-outline" size={20} color="#7C3AED" />
                </View>
                <Text style={styles.actionDockCustomizeLabel}>More</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>

          {/* ── SECTION 4: 1-TAP QUICK LOG ── */}
          <Animated.View style={[styles.quickSection, { opacity: animListsOpacity, transform: [{ translateY: animListsY }] }]}>
            <View style={styles.quickHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.flashIconBox}>
                  <Ionicons name="flash" size={12} color="#7C3AED" />
                </View>
                <Text style={styles.quickSectionTitle}>1-TAP QUICK LOG</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShortcutsModalVisible(true);
                }}
                style={styles.quickCustomizeBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={12} color="#7C3AED" style={{ marginRight: 4 }} />
                <Text style={styles.quickCustomizeText}>Edit & Add</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickLogScroll}>
              {quickShortcuts.map((item, i) => (
                <TouchableOpacity
                  key={item.id || i}
                  style={styles.quickLogCard}
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
                  <View style={[styles.quickEmojiBubble, { backgroundColor: (item.color || '#7C3AED') + '15' }]}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                  </View>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.quickCardAmount}>₹{item.amount}</Text>
                    <Text style={styles.quickCardLabel} numberOfLines={1}>{item.label.split('/')[0].trim()}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Quick Add Card */}
              <TouchableOpacity
                style={styles.quickAddCard}
                onPress={handleOpenAddShortcut}
                activeOpacity={0.75}
              >
                <Ionicons name="add" size={18} color="#7C3AED" />
                <Text style={styles.quickAddCardText}>Add New</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>

          {/* ── SECTION 5: SPENDING BREAKDOWN ── */}
          {recentExpenses.length > 0 && (
            <View style={{ marginTop: 18 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Spending Breakdown</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Analytics')} activeOpacity={0.7}>
                  <Text style={styles.viewAllLink}>View All &gt;</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.whiteCardBox}>
                <View style={styles.breakdownRow}>
                  {/* Left Legend */}
                  <View style={styles.breakdownLegend}>
                    <View style={styles.legendHeaderRow}>
                      <Text style={styles.legendColTitle}>Label</Text>
                      <Text style={styles.legendColTitle}>Amount</Text>
                    </View>
                    {getCategoryBreakdown(recentExpenses).slice(0, 5).map((cat, idx) => (
                      <View key={idx} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: cat.color || '#7C3AED' }]} />
                        <Text style={styles.legendName} numberOfLines={1}>{cat.name}</Text>
                        <Text style={styles.legendAmount}>₹{cat.total.toLocaleString('en-IN')}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Right Donut Chart */}
                  <View style={styles.donutWrapper}>
                    <DonutChart data={getCategoryBreakdown(recentExpenses)} size={118} />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ── SECTION 6: BENTO QUICK TOOLS ── */}
          <View style={styles.toolsBentoRow}>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Notepad');
              }}
              activeOpacity={0.8}
              style={styles.toolBentoCard}
            >
              <View style={styles.toolBentoInner}>
                <View style={[styles.toolBentoIconBox, { backgroundColor: '#FDF2F8' }]}>
                  <MaterialCommunityIcons name="notebook-outline" size={18} color="#EC4899" />
                </View>
                <Text style={styles.toolBentoTitle}>Notepad</Text>
                <Text style={styles.toolBentoSub}>Memos & lists</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Analytics');
              }}
              activeOpacity={0.8}
              style={styles.toolBentoCard}
            >
              <View style={styles.toolBentoInner}>
                <View style={[styles.toolBentoIconBox, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="pie-chart-outline" size={18} color="#7C3AED" />
                </View>
                <Text style={styles.toolBentoTitle}>Analytics</Text>
                <Text style={styles.toolBentoSub}>Trends & charts</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── SECTION 7: TRANSACTIONS SECTION (At Bottom, with Download PDF / CSV) ── */}
          <Animated.View style={{ opacity: animListsOpacity, transform: [{ translateY: animListsY }], marginTop: 18 }}>
            {/* Header: Transactions | PDF ↓ | CSV ↓ | All > */}
            <View style={styles.txHeaderRow}>
              <Text style={styles.txHeaderTitle}>Transactions</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity 
                  onPress={() => exportData('pdf')} 
                  style={styles.txExportBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={12} color="#7C3AED" style={{ marginRight: 3 }} />
                  <Text style={styles.txExportBtnText}>PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => exportData('csv')} 
                  style={styles.txExportBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="download-outline" size={12} color="#7C3AED" style={{ marginRight: 3 }} />
                  <Text style={styles.txExportBtnText}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('History')}
                  style={styles.forThePeriodPill}
                  activeOpacity={0.75}
                >
                  <Text style={styles.forThePeriodText}>All &gt;</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date line: "Monday, 22 October, 2026" • Total ₹900 */}
            <View style={styles.txDateSubRow}>
              <Text style={styles.txDateText}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Text style={styles.txTotalSpentText}>
                Total <Text style={{ fontWeight: '800', color: '#0F172A' }}>₹{spentToday.toLocaleString('en-IN')}</Text>
              </Text>
            </View>

            {/* Transaction Cards */}
            {recentExpenses.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                {recentExpenses.slice(0, 6).map((exp, idx) => {
                  const catKey = (exp.category || 'other').toLowerCase();
                  const catColor = CAT_COLORS[catKey] || '#7C3AED';
                  const catIcon = CAT_ICONS[catKey] || 'pricetag';

                  return (
                    <TouchableOpacity
                      key={exp.id || idx}
                      style={styles.txCard}
                      onPress={() => navigation.navigate('AddExpense', { expense: exp })}
                      activeOpacity={0.8}
                    >
                      {/* Left: Soft colored rounded-square icon box */}
                      <View style={[styles.txIconBox, { backgroundColor: catColor + '18' }]}>
                        <Ionicons name={catIcon} size={20} color={catColor} />
                      </View>

                      {/* Middle: Title & Tag pill subtext */}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.txTitleText} numberOfLines={1}>
                          {exp.description
                            ? exp.description.charAt(0).toUpperCase() + exp.description.slice(1)
                            : catKey.charAt(0).toUpperCase() + catKey.slice(1)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                          <Ionicons name="pricetag-outline" size={10} color="#94A3B8" style={{ marginRight: 3 }} />
                          <Text style={styles.txSubtagText}>{catKey.charAt(0).toUpperCase() + catKey.slice(1)}</Text>
                          <Text style={styles.txDotSeparator}>•</Text>
                          <Text style={styles.txSubtagText}>{formatDate(exp.date)}</Text>
                        </View>
                      </View>

                      {/* Right: Red Bold Amount & Safe Balance */}
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.txAmountNegative}>-₹{Number(exp.amount).toLocaleString('en-IN')}</Text>
                        <Text style={styles.txSubBalance}>₹{remaining.toLocaleString('en-IN')}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <EmptyState
                icon="📝"
                title="No expenses yet"
                message="Start tracking your expenses to see transactions"
                actionText="Add First Expense"
                onAction={() => navigation.navigate('AddExpense')}
              />
            )}
          </Animated.View>

          <View style={{ height: 110 }} />
        </View>
      </ScrollView>



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
    </View>
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
    backgroundColor: '#8B5CF6',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Lilac Purple Radiant Header (Screenshot Style) ──
  heroHeaderContainer: {
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 36,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlowCircle: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroAvatarBtn: {
    position: 'relative',
  },
  heroAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  heroAvatarText: {
    color: '#7C3AED',
    fontSize: 18,
    fontWeight: '800',
  },
  heroAvatarThumbBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroMonthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  heroMonthPillText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  heroNotificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    position: 'relative',
  },
  heroNotificationDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
  },

  // ── Hero Centered Balance Block ──
  heroBalanceBlock: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  heroBalanceLabel: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  heroBalanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  heroCurrencySymbol: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginRight: 4,
  },
  heroBalanceAmount: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroBalanceCents: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 26,
    fontWeight: '700',
  },
  heroSpentBadgeRow: {
    marginTop: 8,
    marginBottom: 2,
    alignItems: 'center',
  },
  heroSpentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  heroSpentBadgeText: {
    color: '#FEE2E2',
    fontSize: 12,
    fontWeight: '600',
  },
  heroSpentBudgetDivider: {
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 7,
    fontSize: 10,
  },
  heroSpentBudgetText: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 12,
    fontWeight: '600',
  },
  heroSubPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroSubPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Curved White Sheet Container (Screenshot Style) ──
  sheetContainer: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    backgroundColor: '#FFFFFF',
    marginTop: -20,
    paddingTop: 24,
    paddingHorizontal: 18,
    minHeight: 600,
  },

  // ── Your Money Section ──
  yourMoneyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  yourMoneyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 2,
  },

  // ── Two Bento Metric Cards ──
  twoBentoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  bentoMiniCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bentoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  bentoCardAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
    letterSpacing: -0.3,
  },

  // ── Dark Insight Banner ──
  darkInsightPill: {
    backgroundColor: '#0F172A',
    borderRadius: 26,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  darkInsightText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  darkInsightActionText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Transactions Section (Screenshot Style) ──
  txHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  txHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  forThePeriodPill: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  forThePeriodText: {
    color: '#7C3AED',
    fontSize: 11.5,
    fontWeight: '700',
  },
  txExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  txExportBtnText: {
    color: '#7C3AED',
    fontSize: 11,
    fontWeight: '700',
  },
  txDateSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  txDateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  txTotalSpentText: {
    fontSize: 12,
    color: '#64748B',
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txTitleText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  txSubtagText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  txDotSeparator: {
    fontSize: 11,
    color: '#CBD5E1',
    marginHorizontal: 5,
  },
  txAmountNegative: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  txSubBalance: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },

  // ── Quick Action Dock (Vertical Cards with Gradient Icons) ──
  actionDockSection: {
    marginVertical: 10,
  },
  actionDockScroll: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  actionDockItem: {
    alignItems: 'center',
    marginRight: 14,
    width: 64,
  },
  actionDockIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  actionDockLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  actionDockCustomizeBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionDockCustomizeLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },

  // ── Section Header Row ──
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllLink: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── White Card Box (0 8px 24px Shadow) ──
  whiteCardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    ...SHADOW.card,
  },

  // ── Spending Breakdown ──
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLegend: {
    flex: 1,
    marginRight: 12,
  },
  legendHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  legendColTitle: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendName: {
    flex: 1,
    color: '#1F2937',
    fontSize: 12.5,
    fontWeight: '600',
  },
  legendAmount: {
    color: '#1F2937',
    fontSize: 12.5,
    fontWeight: '700',
  },
  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── AI Coach Light Card ──
  aiLightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    ...SHADOW.card,
  },
  aiUnifiedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiUnifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiUnifiedBadgeText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiUnifiedChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  aiUnifiedChatText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 3,
  },
  aiUnifiedBody: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },

  // ── Bento Tools ──
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    ...SHADOW.card,
  },
  toolBentoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolBentoTitle: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '700',
  },
  toolBentoSub: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 1,
  },

  // ── Expense Rows in Recent Expenses ──
  expenseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  expenseItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  catSquareIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expTitle: {
    color: '#1F2937',
    fontSize: 14.5,
    fontWeight: '700',
  },
  expSubTime: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  expAmountBold: {
    color: '#1F2937',
    fontSize: 15.5,
    fontWeight: '800',
  },
  exportPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOW.sm,
  },
  exportPillText: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    alignItems: 'center',
    ...SHADOW.card,
  },
  modalTitle: {
    color: '#1F2937',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalSubtitle: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    width: '100%',
    height: 52,
    marginBottom: 16,
  },
  inputPrefix: {
    color: '#7C3AED',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  budgetInput: {
    flex: 1,
    color: '#1F2937',
    fontSize: 17,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modalBtnCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalBtnCancelText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBtnSave: {
    backgroundColor: '#7C3AED',
  },
  modalBtnSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metricVal: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '800',
  },

  // ── Financial Pulse Card (Clean Light Executive Card) ──
  pulseLightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginVertical: 10,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  pulseLightTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pulseLightHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  pulseLightStatusText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 18,
  },
  pulsePaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 10,
  },
  pulsePaceBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  pulseLightMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  pulseLightMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  pulseLightDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  pulseLightMetricLabel: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  pulseLightMetricVal: {
    color: '#0F172A',
    fontSize: 14,
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
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  flashIconBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  quickSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  quickCustomizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  quickCustomizeText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  quickLogScroll: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  quickLogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  quickEmojiBubble: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCardAmount: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  quickCardLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  quickAddCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    marginRight: 10,
  },
  quickAddCardText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
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
