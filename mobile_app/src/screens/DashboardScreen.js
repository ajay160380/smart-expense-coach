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
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../api/config';
import { getUsername, clearAuthData } from '../utils/auth';
import { COLORS, CAT_COLORS, CAT_ICONS, SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';
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
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);

  const handleSaveBudget = async () => {
    const parsedBudget = parseFloat(newBudget);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      Alert.alert('Error', 'Please enter a valid positive number for the budget.');
      return;
    }

    setBudgetSubmitting(true);
    try {
      const response = await api.post('/profile/', { budget: parsedBudget });
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
    // Show loading on first open, refreshing spinner on subsequent calls
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const name = await getUsername();
      if (name) setUsername(name);

      // Fetch all dashboard data in parallel
      const [statsRes, tipRes, compRes, anomRes] = await Promise.allSettled([
        api.get('/summary-stats/'),
        api.get('/daily-tip/'),
        api.get('/monthly-comparison/'),
        api.get('/anomalies/'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (tipRes.status === 'fulfilled') setDailyTip(tipRes.value.data?.tip);
      if (compRes.status === 'fulfilled') setComparison(compRes.value.data);
      if (anomRes.status === 'fulfilled') setAnomalies(anomRes.value.data?.alerts || []);
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
    Linking.openURL(`https://wa.me/YOUR_WHATSAPP_NUMBER?text=${encodeURIComponent(phoneParam)}`);
  };

  const exportData = async (format) => {
    try {
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
            onPress={() => navigation.navigate('Notifications')}
            style={styles.navIconBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
            {anomalies.length > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.avatar}>
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
          <TouchableOpacity onPress={openWhatsApp} activeOpacity={0.85}>
            <View style={styles.waBanner}>
              <View style={styles.waIconContainer}>
                <FontAwesome name="whatsapp" size={24} color="#fff" />
              </View>
              <View style={styles.waTextContainer}>
                <Text style={styles.waTitle}>Track via WhatsApp</Text>
                <Text style={styles.waSubtitle}>Text "500 petrol" to +91 00000 00000</Text>
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
              setNewBudget(budget.toString());
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
        <TouchableOpacity onPress={() => navigation.navigate('AIChat')} activeOpacity={0.85}>
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
        <TouchableOpacity onPress={() => navigation.navigate('Notepad')} activeOpacity={0.85}>
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
        <SectionHeader
          title="Recent Expenses"
          actionText="Add New +"
          onAction={() => navigation.navigate('AddExpense')}
        />
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
            {recentExpenses.slice(0, 6).map((exp, idx) => (
              <TouchableOpacity 
                key={exp.id || idx} 
                style={[styles.expenseItem, idx < recentExpenses.length - 1 && styles.expenseBorder]}
                onPress={() => navigation.navigate('AddExpense', { expense: exp })}
              >
                <View style={[styles.expIcon, { backgroundColor: (CAT_COLORS[exp.category] || '#888') + '22' }]}>
                  <Text style={{ fontSize: 18 }}>{CAT_ICONS[exp.category] || '📦'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expCategory}>{(exp.category || 'other').charAt(0).toUpperCase() + (exp.category || 'other').slice(1)}</Text>
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
                  onPress={() => handleDeleteExpense(exp.id)}
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

      {/* ── FLOATING ACTION BAR ── */}
      <View style={styles.fabContainer}>
        <View style={styles.fabInner}>
          <TouchableOpacity
            style={styles.voiceFab}
            onPress={() => navigation.navigate('VoiceExpense')}
          >
            <MaterialCommunityIcons name="microphone" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.voiceFabText}>Voice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addFab}
            onPress={() => navigation.navigate('AddExpense')}
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
      icon: CAT_ICONS[name] || '📦',
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

  // ── Navbar ──
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: { fontSize: 20, marginRight: 8 },
  logoText: { color: '#fff', fontSize: 20, fontWeight: 'bold', letterSpacing: -0.5 },
  navRight: { flexDirection: 'row', alignItems: 'center' },
  navIconBtn: { padding: 8, marginRight: 8, position: 'relative' },
  notifDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.red,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: COLORS.cyan,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: COLORS.cyan, fontWeight: 'bold', fontSize: 16 },

  scrollContent: { padding: 16, flexGrow: 1 },

  // ── Greeting ──
  greetingSection: { marginBottom: 16 },
  greetText: { color: COLORS.textPrimary, fontSize: 22, fontWeight: 'bold' },
  greetSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },

  // ── Alert Banner ──
  alertBanner: { marginBottom: 16 },
  alertItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: RADIUS.md, padding: 12,
    marginBottom: 6, borderLeftWidth: 3,
  },
  alertIcon: { fontSize: 18, marginRight: 10 },
  alertText: { color: COLORS.textPrimary, fontSize: 12, flex: 1, lineHeight: 18 },

  // ── WhatsApp ──
  waBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  waIconContainer: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.whatsapp, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  waTextContainer: { flex: 1 },
  waTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  waSubtitle: { color: COLORS.textSecondary, fontSize: 11 },
  waButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  waButtonText: { color: COLORS.whatsapp, fontWeight: '600', fontSize: 12 },

  // ── Main Card ──
  mainCard: { borderRadius: RADIUS.xl, padding: 22, marginBottom: 14, ...SHADOW.lg },
  mainCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  mainCardTitle: {
    color: 'rgba(255,255,255,0.7)', fontSize: 11,
    fontWeight: 'bold', letterSpacing: 1.2,
  },
  overspentBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  overspentText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  balanceContainer: { flexDirection: 'row', alignItems: 'flex-start' },
  currencySymbol: { color: '#a78bfa', fontSize: 28, fontWeight: '600', marginTop: 4, marginRight: 4 },
  balanceAmount: { color: '#fff', fontSize: 42, fontWeight: 'bold' },
  budgetEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetSubtext: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
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
    height: 6, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3, marginBottom: 20, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 3 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10, borderRadius: RADIUS.md, marginHorizontal: 3,
  },
  statBoxLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 9,
    fontWeight: 'bold', marginBottom: 4, letterSpacing: 0.5,
  },
  statBoxValue: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // ── Mini Stats ──
  miniStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },

  // ── Comparison Card ──
  comparisonCard: { marginBottom: 8 },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  compValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  compBars: { alignItems: 'flex-end' },
  compBarItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  compBarLabel: { color: COLORS.textMuted, fontSize: 10, width: 30, marginRight: 6 },
  compBar: { height: 8, borderRadius: 4 },
  compBarAmount: { color: COLORS.textSecondary, fontSize: 10, marginLeft: 6 },
  compVerdict: { color: COLORS.textSecondary, fontSize: 12, marginTop: 10, lineHeight: 18 },

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

  // ── AI Card ──
  aiCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 18, borderRadius: RADIUS.lg, marginBottom: 12,
  },
  aiIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  aiContent: { flex: 1 },
  aiTitle: {
    color: 'rgba(255,255,255,0.7)', fontSize: 10,
    fontWeight: 'bold', letterSpacing: 1, marginBottom: 4,
  },
  aiText: { color: '#fff', fontSize: 12.5, fontWeight: '500', lineHeight: 18 },

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

  // ── FAB ──
  fabContainer: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  fabInner: {
    flexDirection: 'row', backgroundColor: 'rgba(30,41,59,0.95)',
    padding: 6, borderRadius: 30, borderWidth: 1, borderColor: COLORS.glassBorder,
    ...SHADOW.lg,
  },
  voiceFab: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.orange, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, marginRight: 6,
  },
  voiceFabText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  addFab: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.cyan, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24,
  },
  addFabText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
});
