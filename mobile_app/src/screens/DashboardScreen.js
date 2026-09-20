/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — DASHBOARD SCREEN (COMPLETE REBUILD)
 * Full feature parity with website dashboard
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, RefreshControl, ActivityIndicator,
  Dimensions, Linking, Alert, Modal, TextInput, KeyboardAvoidingView, Image
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../api/config';
import { getUsername, clearAuthData } from '../utils/auth';
import { COLORS, CAT_COLORS, CAT_ICONS, SPACING, RADIUS, FONT, SHADOW, getFallbackIcon } from '../utils/theme';
import { GlassCard, AnimatedNumber, StatCard, SectionHeader, EmptyState } from '../components/SharedComponents';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [dailyTip, setDailyTip] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [username, setUsername] = useState('User');
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [newBudgetCycleDay, setNewBudgetCycleDay] = useState('1');
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [shakeBannerVisible, setShakeBannerVisible] = useState(true);
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

      // ── 2. FETCH FRESH DATA IN BACKGROUND ──
      const [statsRes, tipRes, compRes, anomRes] = await Promise.allSettled([
        api.get('/summary-stats/'),
        api.get('/daily-tip/'),
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
    const phoneParam = stats?.user_phone ? `Link ${stats.user_phone}` : 'Link 91';
    Linking.openURL(`https://wa.me/917379053923?text=${encodeURIComponent(phoneParam)}`);
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

  const QUICK_SHORTCUTS = [
    { label: 'Chai / Coffee', amount: '20', category: 'food', icon: '☕', color: '#F59E0B' },
    { label: 'Snacks / Food', amount: '100', category: 'food', icon: '🍔', color: '#EC4899' },
    { label: 'Petrol / Fuel', amount: '200', category: 'transport', icon: '⛽', color: '#06B6D4' },
    { label: 'Auto / Cab', amount: '80', category: 'transport', icon: '🚕', color: '#EAB308' },
    { label: 'Groceries', amount: '300', category: 'shopping', icon: '🛒', color: '#10B981' },
    { label: 'Fun / Movie', amount: '250', category: 'entertainment', icon: '🍿', color: '#8B5CF6' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* ── TOP NAVBAR ── */}
      <View style={styles.navbar}>
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/icon.png')} style={{ width: 44, height: 44, borderRadius: 12, marginRight: 8 }} />
          <Text style={styles.logoText}>ExpenseTracker</Text>
        </View>
        <View style={styles.navRight}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Notifications');
            }}
            style={styles.navIconBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
            {anomalies.length > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Profile');
            }} 
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── GREETING ── */}

        <View style={styles.greetingSection}>
          <Text style={styles.greetText}>
            {getGreeting()}, <Text style={{ color: COLORS.primary }}>{username}</Text> 👋
          </Text>
          <Text style={styles.greetSub}>{stats?.month || 'This Month'} • {daysLeft} days left</Text>
        </View>

        {/* ── ANOMALY ALERTS ── */}
        {anomalies.length > 0 && (
          <View style={styles.alertBanner}>
            {anomalies.map((alert, idx) => (
              <View key={idx} style={[styles.alertItem, {
                borderLeftColor: alert.severity === 'critical' ? COLORS.red : 
                                 alert.severity === 'high' ? COLORS.orange : COLORS.yellow,
              }]}>
                <Text style={styles.alertIcon}>{alert.icon}</Text>
                <Text style={styles.alertText}>{alert.message}</Text>
              </View>
            ))}
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

        {/* ── MAIN BUDGET CARD ── */}
        <LinearGradient
          colors={overspent ? COLORS.gradRed : COLORS.gradDeepPurp}
          style={styles.mainCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.mainCardHeader}>
            <Text style={styles.mainCardTitle}>TOTAL SPENT</Text>
            {overspent && (
              <View style={styles.overspentBadge}>
                <Text style={styles.overspentText}>⚠️ OVERSPENT</Text>
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
            <Ionicons name="pencil" size={12} color="rgba(255,255,255,0.4)" style={styles.budgetEditIcon} />
          </TouchableOpacity>

          {/* Budget Progress Bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, {
                width: `${Math.min(usedPercent, 100)}%`,
                backgroundColor: usedPercent > 90 ? COLORS.red : usedPercent > 70 ? COLORS.orange : COLORS.green,
              }]}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>USED</Text>
              <Text style={styles.statBoxValue}>{Math.round(usedPercent)}%</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>REMAINING</Text>
              <Text style={styles.statBoxValue}>₹{remaining.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>TRANSACTIONS</Text>
              <Text style={styles.statBoxValue}>{txCount}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── QUICK STATS ── */}
        <View style={styles.miniStatsRow}>
          <StatCard label="AVG / DAY" value={`₹${Math.round(avgDay).toLocaleString('en-IN')}`} />
          <StatCard label="SAVINGS RATE" value={`${Math.round(savingsRate)}%`} color={savingsRate > 50 ? COLORS.green : COLORS.red} />
          <StatCard label="DAYS LEFT" value={`${daysLeft}`} color={COLORS.cyan} />
        </View>

        {/* ── 1-TAP QUICK LOG SHORTCUTS ── */}
        <View style={styles.quickSection}>
          <View style={styles.quickHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.quickSectionTitle}>⚡ 1-TAP QUICK LOG</Text>
              <View style={styles.fastPill}>
                <Text style={styles.fastPillText}>INSTANT</Text>
              </View>
            </View>
            <Text style={styles.quickSectionSub}>Frequent Daily Expenses</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8, paddingVertical: 4 }}>
            {QUICK_SHORTCUTS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.quickTile, { borderColor: item.color + '45' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.navigate('AddExpense', {
                    prefillAmount: item.amount,
                    prefillCategory: item.category,
                    prefillDescription: item.label,
                  });
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[item.color + '22', item.color + '0A']}
                  style={styles.quickTileGrad}
                >
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>{item.icon}</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>₹{item.amount}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{item.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── DAILY SAFE SPEND & HEALTH SCORE ── */}
        <LinearGradient
          colors={['#141E33', '#0C1322']}
          style={styles.dailyBudgetCard}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', letterSpacing: 0.6 }}>🎯 TODAY'S SAFE LIMIT</Text>
                <View style={[styles.statusDot, { backgroundColor: safeDailySpend > 0 ? '#10B981' : '#EF4444' }]} />
              </View>
              <Text style={{ fontSize: 24, fontWeight: '900', color: safeDailySpend > 0 ? '#10B981' : '#EF4444', marginTop: 3 }}>
                ₹{safeDailySpend.toLocaleString('en-IN')}<Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '500' }}> / day</Text>
              </Text>
              <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                {spentToday > 0 ? `Spent today: ₹${spentToday.toLocaleString('en-IN')}` : 'No expenses logged today (Safe!)'}
              </Text>
            </View>

            <View style={[styles.healthBadge, { borderColor: healthColor + '70' }]}>
              <Text style={{ color: healthColor, fontSize: 18, fontWeight: '900' }}>{healthScore}</Text>
              <Text style={{ color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>FIN-SCORE</Text>
              <Text style={{ color: healthColor, fontSize: 9.5, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>{healthLabel}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── MAGIC SHAKE INTERACTIVE CARD ── */}
        {shakeBannerVisible && (
          <TouchableOpacity
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.navigate('AddExpense');
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.22)', 'rgba(79, 70, 229, 0.08)']}
              style={styles.shakeBanner}
            >
              <View style={styles.shakeIconBox}>
                <Text style={{ fontSize: 22 }}>📱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Magic Shake Feature</Text>
                  <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text style={{ color: '#10B981', fontSize: 9, fontWeight: '800' }}>ACTIVE</Text>
                  </View>
                </View>
                <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>Shake your phone or tap here to add expense!</Text>
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
                <Ionicons name="close" size={20} color="#A78BFA" />
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── MONTHLY COMPARISON ── */}
        {comparison && comparison.has_prev_data && (
          <GlassCard style={styles.comparisonCard}>
            <View style={styles.compRow}>
              <View>
                <Text style={styles.compLabel}>vs {comparison.prev_month_name}</Text>
                <Text style={[styles.compValue, { color: compMore ? COLORS.red : COLORS.green }]}>
                  {compMore ? '↑' : '↓'} {Math.abs(Math.round(compDiff))}% {compMore ? 'more' : 'less'}
                </Text>
              </View>
              <View style={styles.compBars}>
                <View style={styles.compBarItem}>
                  <Text style={styles.compBarLabel}>Last</Text>
                  <View style={[styles.compBar, { width: 60, backgroundColor: COLORS.textMuted }]} />
                  <Text style={styles.compBarAmount}>₹{Math.round(comparison.prev_total || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.compBarItem}>
                  <Text style={styles.compBarLabel}>This</Text>
                  <View style={[styles.compBar, {
                    width: Math.min(60 * (1 + compDiff / 100), 100),
                    backgroundColor: compMore ? COLORS.red : COLORS.green,
                  }]} />
                  <Text style={styles.compBarAmount}>₹{Math.round(comparison.current_total || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.compVerdict}>{comparison.verdict_msg}</Text>
          </GlassCard>
        )}

        {/* ── CATEGORY BREAKDOWN ── */}
        {recentExpenses.length > 0 && (
          <>
            <SectionHeader title="Category Breakdown" actionText="Details →" onAction={() => navigation.navigate('Analytics')} />
            <GlassCard>
              {getCategoryBreakdown(recentExpenses).map((cat, idx) => (
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
          </>
        )}

        {/* ── AI FINANCIAL COACH ── */}
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('AIChat');
          }} 
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={COLORS.gradCyan}
            style={styles.aiCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.aiIcon}>
              <MaterialCommunityIcons name="robot-outline" size={24} color="#1e293b" />
            </View>
            <View style={styles.aiContent}>
              <Text style={styles.aiTitle}>AI FINANCIAL COACH</Text>
              <Text style={styles.aiText}>
                {overspent
                  ? `Budget exceeded! You've spent ₹${spent.toLocaleString('en-IN')} against ₹${budget.toLocaleString('en-IN')}. Tap to chat with AI for advice. 🚨`
                  : `Great job! You used ${Math.round(usedPercent)}% of your budget — ₹${remaining.toLocaleString('en-IN')} remaining. Tap to chat! 🌟`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" style={{ opacity: 0.7 }} />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── NOTEPAD ── */}
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Notepad');
          }} 
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#FF9A9E', '#FECFEF']}
            style={styles.aiCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.aiIcon}>
              <MaterialCommunityIcons name="note-edit-outline" size={24} color="#1e293b" />
            </View>
            <View style={styles.aiContent}>
              <Text style={[styles.aiTitle, { color: '#333' }]}>NOTEPAD</Text>
              <Text style={[styles.aiText, { color: '#444' }]}>
                Save important text, unformatted lists, or shopping lists here. 📝
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#333" style={{ opacity: 0.7 }} />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── DAILY MONEY TIP ── */}
        {dailyTip && (
          <LinearGradient
            colors={COLORS.gradGreen}
            style={styles.aiCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={[styles.aiIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="bulb-outline" size={24} color="#fff" />
            </View>
            <View style={styles.aiContent}>
              <Text style={styles.aiTitle}>TODAY'S MONEY TIP</Text>
              <Text style={styles.aiText}>{dailyTip}</Text>
            </View>
          </LinearGradient>
        )}

        {/* ── RECENT EXPENSES ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: COLORS.cyan, fontWeight: 'bold', marginRight: 4 }}>See All History</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.cyan} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, marginBottom: 10 }}>
          <TouchableOpacity onPress={() => exportData('pdf')} style={{ marginRight: 15 }}>
            <Text style={{ color: COLORS.cyan, fontWeight: 'bold' }}>📄 Export PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => exportData('csv')}>
            <Text style={{ color: COLORS.cyan, fontWeight: 'bold' }}>📊 Export CSV</Text>
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

      <View style={styles.fabContainer}>
        <View style={styles.fabInner}>
          <TouchableOpacity
            style={styles.voiceFab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('VoiceExpense');
            }}
          >
            <MaterialCommunityIcons name="microphone" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.voiceFabText}>Voice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addFab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('AddExpense');
            }}
          >
            <Ionicons name="add" size={18} color="#0f172a" style={{ marginRight: 4 }} />
            <Text style={styles.addFabText}>Add expense</Text>
          </TouchableOpacity>
        </View>
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
  container: { flex: 1, backgroundColor: '#050B14' },
  center: { justifyContent: 'center', alignItems: 'center' },

  // ── Navbar ──
  navbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  navRight: { flexDirection: 'row', alignItems: 'center' },
  navIconBtn: {
    padding: 10, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F43F5E' },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1.5, borderColor: '#38BDF8', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#38BDF8', fontWeight: '900', fontSize: 18 },

  scrollContent: { padding: 20, paddingBottom: 120 },

  // ── Greeting ──
  greetingSection: { marginTop: 10, marginBottom: 25 },
  greetText: { color: '#F8FAFC', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  greetSub: { color: '#94A3B8', fontSize: 15, fontWeight: '600', marginTop: 6, letterSpacing: 0.5 },

  // ── Alert Banner ──
  alertBanner: { marginBottom: 20 },
  alertItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  alertIcon: { fontSize: 22, marginRight: 12 },
  alertText: { color: '#F8FAFC', fontSize: 13, flex: 1, lineHeight: 20, fontWeight: '500' },

  // ── WhatsApp ──
  waBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: 20, padding: 18, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  waIconContainer: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  waTextContainer: { flex: 1 },
  waTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, marginBottom: 4 },
  waSubtitle: { color: '#A7F3D0', fontSize: 12, fontWeight: '500' },
  waButton: { backgroundColor: '#22C55E', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25 },
  waButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  // ── Main Card (Ultra Premium) ──
  mainCard: {
    borderRadius: 32, padding: 28, marginBottom: 25,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5, shadowRadius: 35, elevation: 15,
  },
  mainCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  mainCardTitle: { color: '#E2E8F0', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  overspentBadge: { backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)' },
  overspentText: { color: '#FECACA', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  balanceContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  currencySymbol: { color: '#A78BFA', fontSize: 32, fontWeight: '700', marginTop: 8, marginRight: 8 },
  balanceAmount: { color: '#FFFFFF', fontSize: 58, fontWeight: '900', letterSpacing: -2 },
  budgetEditRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 30, backgroundColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  budgetSubtext: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' },
  budgetEditIcon: { marginLeft: 10 },

  progressBarBg: { height: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 5, marginBottom: 25, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 16, marginHorizontal: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statBoxLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  statBoxValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  // ── Mini Stats ──
  miniStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },

  // ── Quick Log Shortcuts ──
  quickSection: { marginBottom: 25 },
  quickHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 4 },
  quickSectionTitle: { fontSize: 14, fontWeight: '900', color: '#F8FAFC', letterSpacing: 1 },
  fastPill: { backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 10 },
  fastPillText: { color: '#38BDF8', fontSize: 10, fontWeight: '900' },
  quickSectionSub: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  quickTile: { width: 110, height: 110, borderRadius: 24, borderWidth: 1, marginRight: 15, overflow: 'hidden', backgroundColor: '#0F172A' },
  quickTileGrad: { flex: 1, padding: 12, alignItems: 'center', justifyContent: 'center' },

  // ── Daily Safe Limit Card ──
  dailyBudgetCard: {
    padding: 24, borderRadius: 28, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 10 },
  healthBadge: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', minWidth: 100 },

  // ── Magic Shake Card ──
  shakeBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, marginBottom: 25,
    borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.4)', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  shakeIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(139, 92, 246, 0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginLeft: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },

  // ── Category Breakdown ──
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  catIcon: { width: 46, height: 46, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  catName: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  catBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', width: '100%' },
  catBarFill: { height: '100%', borderRadius: 3 },
  catAmount: { color: '#F8FAFC', fontSize: 16, fontWeight: '900' },

  // ── Expense Item ──
  expenseItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20 },
  expenseBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  expIcon: { width: 46, height: 46, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  expCategory: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
  expDate: { color: '#94A3B8', fontSize: 13, marginTop: 4, fontWeight: '600' },
  expAmount: { color: '#F43F5E', fontSize: 17, fontWeight: '900' },

  // ── FAB ──
  fabContainer: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center' },
  fabInner: { flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 8, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  voiceFab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 32, marginRight: 10 },
  voiceFabText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  addFab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#06B6D4', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 32 },
  addFabText: { color: '#0F172A', fontWeight: '900', fontSize: 15 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalContent: { backgroundColor: '#1E293B', margin: 24, borderRadius: 32, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: '#F8FAFC', fontSize: 24, fontWeight: '900', marginBottom: 12 },
  modalSubtitle: { color: '#94A3B8', fontSize: 14, marginBottom: 24, lineHeight: 22, fontWeight: '500' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16 },
  inputPrefix: { color: '#A78BFA', fontSize: 20, fontWeight: '900', marginRight: 12 },
  budgetInput: { flex: 1, color: '#F8FAFC', fontSize: 18, fontWeight: '800', paddingVertical: 18 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 32 },
  modalBtn: { flex: 1, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginHorizontal: 8 },
  modalBtnCancel: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  modalBtnCancelText: { color: '#F8FAFC', fontSize: 15, fontWeight: '900' },
  modalBtnSave: { backgroundColor: '#38BDF8' },
  modalBtnSaveText: { color: '#0F172A', fontSize: 15, fontWeight: '900' },
  comparisonCard: { marginBottom: 25 },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '800' },
  compValue: { fontSize: 20, fontWeight: '900', marginTop: 6 },
  compBars: { alignItems: 'flex-end' },
  compBarItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  compBarLabel: { color: '#64748B', fontSize: 11, width: 35, marginRight: 8, fontWeight: '700' },
  compBar: { height: 10, borderRadius: 5 },
  compBarAmount: { color: '#CBD5E1', fontSize: 12, marginLeft: 8, fontWeight: '800' },
  compVerdict: { color: '#94A3B8', fontSize: 13, marginTop: 15, lineHeight: 20, fontWeight: '600' },
});

