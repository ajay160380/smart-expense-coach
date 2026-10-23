/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — ANALYTICS SCREEN (TOTAL EXPENSES)
 * Target Design (Image 2 Screen 3): Clean Light Theme,
 * Dual Side-by-Side Purple & Orange Summary Cards,
 * Donut Chart Expense Breakdown, Pure White Elevated Cards.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { GlassCard, EmptyState, SectionHeader } from '../components/SharedComponents';
import DonutChart from '../components/DonutChart';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/config';
import { COLORS, CAT_COLORS, CAT_ICONS, RADIUS, SHADOW, getFallbackIcon } from '../utils/theme';
import { useTheme } from '../theme/ThemeContext';

const PERIODS = ['week', 'month', 'quarter', 'year'];
const PERIOD_LABELS = { week: 'This Week', month: 'This Month', quarter: 'Quarter', year: 'This Year' };

export default function AnalyticsScreen({ navigation }) {
  const { isDark, colors } = useTheme();
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(60);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
      ]).start();
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontWeight: '600' }}>
            Analyzing spending data...
          </Text>
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
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Top Header with Back Button ── */}
      <View style={[styles.header, isDark && { backgroundColor: colors.bg }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={isDark ? colors.textPrimary : "#1F2937"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && { color: colors.textPrimary }]}>Total Expenses</Text>
        <View style={{ width: 38 }} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ── Period Selector Pill Tabs ── */}
          <View style={styles.tabs}>
            {PERIODS.map((p) => {
              const isActive = period === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.tab, 
                    isDark && { backgroundColor: colors.surface, borderColor: colors.border },
                    isActive && styles.tabActive
                  ]}
                  onPress={() => setPeriod(p)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.tabText, 
                    isDark && { color: colors.textSecondary },
                    isActive && styles.tabTextActive
                  ]}>
                    {PERIOD_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── 2 Side-by-Side Summary Cards (Purple & Orange from Image 2 Screen 3) ── */}
          <View style={styles.sideBySideRow}>
            {/* Card 1: Purple (Total Spent / Limit) */}
            <LinearGradient
              colors={['#7C3AED', '#6D28D9']}
              style={styles.statCardHalf}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.statCardHalfLabel}>Total Spent</Text>
              <Text style={styles.statCardHalfAmount}>
                ₹{Math.round(stats.total_spent || 0).toLocaleString('en-IN')}
              </Text>
              <View style={styles.statCardHalfFooter}>
                <Ionicons name="wallet-outline" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.statCardHalfFooterText}>
                  {stats.transaction_count || 0} Txns
                </Text>
              </View>
            </LinearGradient>

            {/* Card 2: Orange (Daily Average / Pace) */}
            <LinearGradient
              colors={['#FF6B35', '#F97316']}
              style={styles.statCardHalf}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.statCardHalfLabel}>Avg / Day</Text>
              <Text style={styles.statCardHalfAmount}>
                ₹{Math.round(stats.avg_per_day || 0).toLocaleString('en-IN')}
              </Text>
              <View style={styles.statCardHalfFooter}>
                <Ionicons name="trending-up-outline" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.statCardHalfFooterText}>
                  {Math.round(stats.savings_rate || 0)}% Saved
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* ── Expense Breakdown Card with Donut Chart ── */}
          <View style={[styles.breakdownCard, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.breakdownHeaderRow}>
              <Text style={[styles.cardHeading, isDark && { color: colors.textPrimary }]}>Expense Breakdown</Text>
              <Text style={[styles.subtleBadgeText, isDark && { color: colors.textSecondary }]}>{categories.length} Categories</Text>
            </View>

            {categories.length > 0 ? (
              <>
                <View style={styles.donutCenterWrapper}>
                  <DonutChart data={categories} size={140} holeRatio={0.58} />
                </View>

                {/* Categories Grid List */}
                <View style={styles.catGrid}>
                  {categories.map((cat, idx) => (
                    <View key={idx} style={[styles.catGridItem, isDark && { borderBottomColor: colors.border }]}>
                      <View style={[styles.catGridDot, { backgroundColor: cat.color || '#7C3AED' }]} />
                      <Text style={[styles.catGridName, isDark && { color: colors.textPrimary }]} numberOfLines={1}>{cat.title || cat.name}</Text>
                      <Text style={[styles.catGridPercent, isDark && { color: colors.textSecondary }]}>{Math.round(cat.percent || 0)}%</Text>
                      <Text style={[styles.catGridAmount, isDark && { color: colors.textPrimary }]}>₹{Math.round(cat.total).toLocaleString('en-IN')}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <EmptyState
                icon="📊"
                title="No expenses logged"
                message="Start logging expenses to view your breakdown chart"
              />
            )}
          </View>

          {/* ── Monthly Trend Chart ── */}
          {trend.length > 0 && (
            <View style={styles.trendSection}>
              <SectionHeader title="Spending Trend" />
              <View style={[styles.whiteCard, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.chartContainer}>
                  {trend.map((month, idx) => (
                    <View key={idx} style={styles.barCol}>
                      <Text style={[styles.barValue, isDark && { color: colors.textSecondary }]}>
                        {month.total >= 1000 ? `${Math.round(month.total / 1000)}k` : Math.round(month.total)}
                      </Text>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max((month.total / maxTrend) * 100, 6),
                            backgroundColor: idx === trend.length - 1 ? (isDark ? colors.primary : '#7C3AED') : (isDark ? '#334155' : '#93C5FD'),
                          },
                        ]}
                      />
                      <Text style={[styles.barLabel, isDark && { color: colors.textSecondary }]}>{month.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ── Top Spending Day ── */}
          {topDay && (
            <View style={{ marginTop: 12 }}>
              <SectionHeader title="Peak Spending Day" />
              <View style={[styles.whiteCard, isDark && { backgroundColor: colors.surface, borderColor: colors.border }, { flexDirection: 'row', alignItems: 'center' }]}>
                <View style={[styles.topDayIcon, isDark && { backgroundColor: 'rgba(129, 140, 248, 0.15)' }]}>
                  <Ionicons name="calendar" size={22} color={isDark ? colors.primary : "#7C3AED"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topDayDate, isDark && { color: colors.textSecondary }]}>
                    {new Date(topDay.date).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  <Text style={[styles.topDayAmount, isDark && { color: colors.textPrimary }]}>₹{Math.round(topDay.total).toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── AI Spending Report ── */}
          {aiReport ? (
            <View style={{ marginTop: 14 }}>
              <SectionHeader title="AI Coach Financial Report" />
              <View style={[styles.aiReportCard, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="sparkles" size={16} color={isDark ? colors.primary : "#7C3AED"} style={{ marginRight: 6 }} />
                  <Text style={{ color: isDark ? colors.primary : '#7C3AED', fontWeight: '800', fontSize: 13 }}>Smart AI Summary</Text>
                </View>
                <Text style={[styles.aiReportText, isDark && { color: colors.textPrimary }]}>{aiReport}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ height: 60 }} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FB',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F7F7FB',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.sm,
  },
  headerTitle: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },

  // ── Period Tabs ──
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOW.sm,
  },
  tabActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  tabText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 12.5,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // ── Side-by-Side Dual Stat Cards ──
  sideBySideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  statCardHalf: {
    flex: 1,
    borderRadius: 22,
    padding: 16,
    ...SHADOW.md,
  },
  statCardHalfLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  statCardHalfAmount: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  statCardHalfFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCardHalfFooterText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },

  // ── Breakdown Card ──
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    marginBottom: 16,
    ...SHADOW.card,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeading: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '800',
  },
  subtleBadgeText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  donutCenterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  catGrid: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  catGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  catGridDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  catGridName: {
    flex: 1,
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '600',
  },
  catGridPercent: {
    color: '#6B7280',
    fontSize: 12.5,
    fontWeight: '600',
    marginRight: 10,
  },
  catGridAmount: {
    color: '#1F2937',
    fontSize: 13.5,
    fontWeight: '800',
  },

  // ── Trend Section ──
  trendSection: {
    marginBottom: 14,
  },
  whiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F3F9',
    ...SHADOW.card,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 130,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 22,
    borderRadius: 6,
    marginVertical: 4,
    minHeight: 6,
  },
  barValue: {
    color: '#6B7280',
    fontSize: 9.5,
    fontWeight: '700',
  },
  barLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Top Day ──
  topDayIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  topDayDate: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
  },
  topDayAmount: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },

  // ── AI Report Card ──
  aiReportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    ...SHADOW.card,
  },
  aiReportText: {
    color: '#4B5563',
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
  },
});
