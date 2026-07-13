/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — ANALYTICS SCREEN
 * Charts, category breakdown, AI report, anomaly alerts
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, RefreshControl, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../api/config';
import { COLORS, CAT_COLORS, CAT_ICONS, RADIUS, SPACING, FONT, SHADOW } from '../utils/theme';
import { GlassCard, SectionHeader, EmptyState } from '../components/SharedComponents';

const { width } = Dimensions.get('window');
const PERIODS = ['week', 'month', 'quarter', 'year'];
const PERIOD_LABELS = { week: 'This Week', month: 'This Month', quarter: 'Quarter', year: 'This Year' };

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.cyan} size="large" />
          <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>Analyzing your data...</Text>
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

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Analytics</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Period Tabs ── */}
        <View style={styles.tabs}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.tab, period === p && styles.tabActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Overview Card ── */}
        <LinearGradient colors={COLORS.gradDeepPurp} style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Total Spent</Text>
              <Text style={styles.overviewValue}>₹{Math.round(stats.total_spent || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Transactions</Text>
              <Text style={styles.overviewValue}>{stats.transaction_count || 0}</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Avg/Day</Text>
              <Text style={styles.overviewValue}>₹{Math.round(stats.avg_per_day || 0).toLocaleString('en-IN')}</Text>
            </View>
          </View>
          <View style={styles.overviewRow2}>
            <View style={styles.overviewItem2}>
              <Text style={styles.overviewLabel}>Highest</Text>
              <Text style={[styles.overviewVal2, { color: COLORS.red }]}>₹{Math.round(stats.highest_expense || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.overviewItem2}>
              <Text style={styles.overviewLabel}>Average</Text>
              <Text style={[styles.overviewVal2, { color: COLORS.yellow }]}>₹{Math.round(stats.average_expense || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.overviewItem2}>
              <Text style={styles.overviewLabel}>Savings</Text>
              <Text style={[styles.overviewVal2, { color: COLORS.green }]}>{Math.round(stats.savings_rate || 0)}%</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Monthly Trend Chart ── */}
        {trend.length > 0 && (
          <>
            <SectionHeader title="Monthly Trend" />
            <GlassCard>
              <View style={styles.chartContainer}>
                {trend.map((month, idx) => (
                  <View key={idx} style={styles.barCol}>
                    <Text style={styles.barValue}>
                      {month.total >= 1000 ? `${Math.round(month.total / 1000)}k` : Math.round(month.total)}
                    </Text>
                    <View style={[styles.bar, {
                      height: Math.max((month.total / maxTrend) * 100, 4),
                      backgroundColor: idx === trend.length - 1 ? COLORS.primary : COLORS.cyan,
                    }]} />
                    <Text style={styles.barLabel}>{month.label}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </>
        )}

        {/* ── Category Breakdown ── */}
        {categories.length > 0 && (
          <>
            <SectionHeader title="Category Breakdown" />
            <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
              {categories.map((cat, idx) => (
                <View key={idx} style={[styles.catRow, idx < categories.length - 1 && styles.catBorder]}>
                  <View style={[styles.catIcon, { backgroundColor: (cat.color || '#888') + '22' }]}>
                    <Text style={{ fontSize: 20 }}>{cat.icon || '📦'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.catNameRow}>
                      <Text style={styles.catName}>{cat.title || cat.name}</Text>
                      <Text style={styles.catPercent}>{Math.round(cat.percent)}%</Text>
                    </View>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, {
                        width: `${Math.min(cat.percent, 100)}%`,
                        backgroundColor: cat.color || '#888',
                      }]} />
                    </View>
                  </View>
                  <Text style={styles.catAmount}>₹{Math.round(cat.total).toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </GlassCard>
          </>
        )}

        {/* ── Anomaly Alerts ── */}
        {anomalies.length > 0 && (
          <>
            <SectionHeader title="⚠️ Alerts" />
            {anomalies.map((alert, idx) => (
              <View key={idx} style={[styles.alertCard, {
                borderLeftColor: alert.severity === 'critical' ? COLORS.red :
                                 alert.severity === 'high' ? COLORS.orange : COLORS.yellow,
              }]}>
                <Text style={styles.alertIcon}>{alert.icon}</Text>
                <Text style={styles.alertText}>{alert.message}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Top Spending Day ── */}
        {topDay && (
          <>
            <SectionHeader title="🔥 Top Spending Day" />
            <GlassCard style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.topDayIcon}>
                <Text style={{ fontSize: 24 }}>📅</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.topDayDate}>
                  {new Date(topDay.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                </Text>
                <Text style={styles.topDayAmount}>₹{Math.round(topDay.total).toLocaleString('en-IN')}</Text>
              </View>
            </GlassCard>
          </>
        )}

        {/* ── AI Report ── */}
        {aiReport ? (
          <>
            <SectionHeader title="🤖 AI Spending Report" />
            <LinearGradient colors={COLORS.gradCyan} style={styles.aiReportCard}>
              <Text style={styles.aiReportText}>{aiReport}</Text>
            </LinearGradient>
          </>
        ) : null}

        {categories.length === 0 && (
          <EmptyState
            icon="📊"
            title="No data yet"
            message="Start adding expenses to see your analytics"
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: 'bold' },
  scrollContent: { padding: 16, flexGrow: 1 },

  // ── Period Tabs ──
  tabs: { flexDirection: 'row', marginBottom: 16 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },

  // ── Overview Card ──
  overviewCard: { borderRadius: RADIUS.xl, padding: 20, marginBottom: 16, ...SHADOW.md },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  overviewItem: { alignItems: 'center', flex: 1 },
  overviewLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 4 },
  overviewValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  overviewRow2: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 14 },
  overviewItem2: { alignItems: 'center', flex: 1 },
  overviewVal2: { fontSize: 15, fontWeight: 'bold', marginTop: 4 },

  // ── Chart ──
  chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 140, paddingTop: 10 },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 28, borderRadius: 6, marginVertical: 4, minHeight: 4 },
  barValue: { color: COLORS.textMuted, fontSize: 9, fontWeight: '600' },
  barLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '500' },

  // ── Category ──
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  catBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  catIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  catNameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  catPercent: { color: COLORS.textMuted, fontSize: 12 },
  catBarBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 3 },
  catAmount: { color: COLORS.textPrimary, fontSize: 14, fontWeight: 'bold', marginLeft: 12 },

  // ── Alerts ──
  alertCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: 14, marginBottom: 8, borderLeftWidth: 3,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  alertIcon: { fontSize: 20, marginRight: 12 },
  alertText: { color: COLORS.textPrimary, fontSize: 13, flex: 1, lineHeight: 18 },

  // ── Top Day ──
  topDayIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(168,136,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  topDayDate: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  topDayAmount: { color: COLORS.red, fontSize: 20, fontWeight: 'bold', marginTop: 2 },

  // ── AI Report ──
  aiReportCard: { borderRadius: RADIUS.lg, padding: 20, marginBottom: 16 },
  aiReportText: { color: '#fff', fontSize: 14, lineHeight: 22 },
});
