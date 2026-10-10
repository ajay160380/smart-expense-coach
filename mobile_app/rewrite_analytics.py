import json

content = """/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — ANALYTICS SCREEN (PREMIUM)
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, StyleSheet, Platform, Animated, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { GlassCard, EmptyState, SectionHeader } from '../components/SharedComponents';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import api from '../api/config';
import { COLORS, CAT_COLORS, RADIUS, SHADOW, getFallbackIcon } from '../utils/theme';

const PERIODS = ['week', 'month', 'quarter', 'year'];
const PERIOD_LABELS = { week: 'Week', month: 'Month', quarter: 'Quarter', year: 'Year' };

export default function AnalyticsScreen({ navigation }) {
  const [period, setPeriod] = useState('month');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get(`/analytics/?period=${period}`);
      setAnalytics(res.data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
  }, [period]);

  const onRefresh = () => { setRefreshing(true); fetchAnalytics(); };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true })
      ]).start();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={{ color: COLORS.textMuted, marginTop: 16, fontWeight: '600' }}>Crunching numbers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = analytics?.stats || {};
  const categories = analytics?.categories || [];
  const trend = analytics?.monthly_trend || [];
  const anomalies = analytics?.anomalies || [];
  const aiReport = analytics?.ai_report || '';
  const topDay = analytics?.top_day;
  const maxTrend = Math.max(...trend.map((t) => t.total), 1);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* ── PREMIUM HEADER ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── PREMIUM PERIOD TABS ── */}
        <View style={styles.tabsContainer}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.tab, period === p && styles.tabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPeriod(p);
              }}
            >
              <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── MASSIVE OVERVIEW CARD ── */}
        <View style={styles.overviewWrapper}>
           <View style={styles.cardGlowCircle} />
           <LinearGradient colors={['#1e1b4b', '#172554']} style={styles.overviewCard} start={{x:0, y:0}} end={{x:1, y:1}}>
              <Text style={styles.overviewTitle}>TOTAL SPENT</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currency}>₹</Text>
                <Text style={styles.amount}>{Math.round(stats.total_spent || 0).toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.statsStrip}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>AVG/DAY</Text>
                  <Text style={styles.statVal}>₹{Math.round(stats.avg_per_day || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>TXNS</Text>
                  <Text style={styles.statVal}>{stats.transaction_count || 0}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>HIGHEST</Text>
                  <Text style={[styles.statVal, { color: '#fb7185' }]}>₹{Math.round(stats.highest_expense || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>
           </LinearGradient>
        </View>

        {/* ── TREND CHART ── */}
        {trend.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending Trend</Text>
            <View style={styles.chartCard}>
              <View style={styles.chartContainer}>
                {trend.map((month, idx) => (
                  <View key={idx} style={styles.barCol}>
                    <Text style={styles.barValue}>
                      {month.total >= 1000 ? `${Math.round(month.total / 1000)}k` : Math.round(month.total)}
                    </Text>
                    <View style={styles.barTrack}>
                      <LinearGradient
                        colors={idx === trend.length - 1 ? ['#818CF8', '#4F46E5'] : ['#38BDF8', '#0284C7']}
                        style={[styles.barFill, { height: `${Math.max((month.total / maxTrend) * 100, 4)}%` }]}
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                      />
                    </View>
                    <Text style={styles.barLabel}>{month.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── CATEGORY BREAKDOWN ── */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where your money goes</Text>
            <View style={styles.catCard}>
              {categories.map((cat, idx) => (
                <View key={idx} style={[styles.catRow, idx < categories.length - 1 && styles.catBorder]}>
                  <View style={[styles.catIcon, { backgroundColor: (CAT_COLORS[cat.category] || '#64748B') + '20' }]}>
                    <Text style={{ fontSize: 22 }}>{cat.icon || getFallbackIcon(cat.category)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.catNameRow}>
                      <Text style={styles.catName}>{cat.title || cat.name}</Text>
                      <Text style={styles.catAmount}>₹{Math.round(cat.total).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.catProgressRow}>
                      <View style={styles.catBarBg}>
                        <View style={[styles.catBarFill, {
                          width: `${Math.min(cat.percent, 100)}%`,
                          backgroundColor: cat.color || '#64748B',
                        }]} />
                      </View>
                      <Text style={styles.catPercent}>{Math.round(cat.percent)}%</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── ANOMALY ALERTS ── */}
        {anomalies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Smart Alerts</Text>
            {anomalies.map((alert, idx) => (
              <View key={idx} style={[styles.alertCard, {
                borderLeftColor: alert.severity === 'critical' ? '#ef4444' :
                                 alert.severity === 'high' ? '#f97316' : '#eab308',
              }]}>
                <View style={[styles.alertIconWrap, {
                  backgroundColor: alert.severity === 'critical' ? '#ef444420' :
                                   alert.severity === 'high' ? '#f9731620' : '#eab30820'
                }]}>
                  <Text style={styles.alertIcon}>{alert.icon}</Text>
                </View>
                <Text style={styles.alertText}>{alert.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── TOP DAY ── */}
        {topDay && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Spending Day</Text>
            <View style={styles.topDayCard}>
              <View style={styles.topDayIconWrap}>
                <Ionicons name="calendar" size={24} color="#818CF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.topDayDate}>
                  {new Date(topDay.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                </Text>
                <Text style={styles.topDaySubtitle}>Highest single day spend</Text>
              </View>
              <Text style={styles.topDayAmount}>₹{Math.round(topDay.total).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}

        {/* ── AI REPORT ── */}
        {aiReport ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Insights</Text>
            <LinearGradient colors={['#312e81', '#1e1b4b']} style={styles.aiCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="sparkles" size={20} color="#a5b4fc" style={{ marginRight: 8 }} />
                <Text style={styles.aiCardTitle}>Financial Coach</Text>
              </View>
              <Text style={styles.aiReportText}>{aiReport}</Text>
            </LinearGradient>
          </View>
        ) : null}

        {categories.length === 0 && (
          <View style={{ marginTop: 40 }}>
            <EmptyState
              icon="📊"
              title="No data yet"
              message="Start adding expenses to see your analytics"
            />
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingHorizontal: 24, paddingVertical: 20,
    marginBottom: 4,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 30, fontWeight: '800' },
  scrollContent: { paddingHorizontal: 20, flexGrow: 1 },

  // ── Tabs ──
  tabsContainer: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tab: { 
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  tabActive: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  tabText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  tabTextActive: { color: '#fff' },

  // ── Overview ──
  overviewWrapper: { position: 'relative', marginBottom: 32 },
  cardGlowCircle: {
    position: 'absolute', top: -30, right: -20,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
  },
  overviewCard: { 
    borderRadius: 28, padding: 24, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
    overflow: 'hidden'
  },
  overviewTitle: { color: '#a5b4fc', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 24 },
  currency: { color: '#818CF8', fontSize: 32, fontWeight: '700', marginRight: 6 },
  amount: { color: '#fff', fontSize: 52, fontWeight: '900', letterSpacing: -1.5 },
  
  statsStrip: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 16 },
  statCol: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: '80%', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },
  statLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  statVal: { color: '#fff', fontSize: 15, fontWeight: '800' },

  section: { marginBottom: 32 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 16 },

  // ── Chart ──
  chartCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 160 },
  barCol: { alignItems: 'center', flex: 1 },
  barValue: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 6 },
  barTrack: { width: 24, height: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 8 },
  barFill: { width: '100%', borderRadius: 12 },
  barLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },

  // ── Category ──
  catCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  catBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  catIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  catNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  catName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  catAmount: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  catProgressRow: { flexDirection: 'row', alignItems: 'center' },
  catBarBg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginRight: 10 },
  catBarFill: { height: '100%', borderRadius: 3 },
  catPercent: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', width: 30, textAlign: 'right' },

  // ── Alerts ──
  alertCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20,
    padding: 16, marginBottom: 12, borderLeftWidth: 4,
    borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  alertIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  alertIcon: { fontSize: 18 },
  alertText: { color: COLORS.textPrimary, fontSize: 14, flex: 1, lineHeight: 20, fontWeight: '500' },

  // ── Top Day ──
  topDayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  topDayIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(129, 140, 248, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  topDayDate: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  topDaySubtitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  topDayAmount: { color: '#f43f5e', fontSize: 20, fontWeight: '900' },

  // ── AI Report ──
  aiCard: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(165, 180, 252, 0.2)' },
  aiCardTitle: { color: '#a5b4fc', fontSize: 16, fontWeight: '800' },
  aiReportText: { color: '#e2e8f0', fontSize: 15, lineHeight: 24, fontWeight: '500' },
});
"""

with open("src/screens/AnalyticsScreen.js", "w") as f:
    f.write(content)
