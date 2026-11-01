import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

import DonutChart from '../components/DonutChart';
import { useTheme } from '../theme/ThemeContext';
import api from '../services/api';

export default function MoneyBreakdownScreen({ navigation }) {
  const { isDark, colors } = useTheme();
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchBreakdown = useCallback(async (selectedPeriod) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/money-breakdown/?period=${selectedPeriod}`);
      if (res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error('Error fetching money breakdown:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBreakdown(period);
  }, [period, fetchBreakdown]);

  const handleAddSubscription = async (suggestion) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const payload = {
        name: suggestion.name,
        amount: suggestion.suggested_amount,
        category: suggestion.category || 'entertainment',
        billing_frequency: 'monthly',
      };
      await api.post('/api/subscriptions/', payload);
      Alert.alert('Subscription Added! 🎉', `${suggestion.name} (₹${suggestion.suggested_amount}) added to recurring subscriptions.`);
      fetchBreakdown(period);
    } catch (e) {
      Alert.alert('Error', 'Could not add subscription automatically.');
    }
  };

  const chartData = (data?.breakdown || [])
    .filter((b) => b.total > 0)
    .map((b) => ({
      name: b.name,
      amount: b.total,
      total: b.total,
      color: b.color,
      percent: b.percent,
    }));

  const dailyBudget = data?.daily_budget;

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, isDark && { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, isDark && { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={isDark ? colors.textPrimary : '#0F172A'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && { color: colors.textPrimary }]}>Mera Paisa Kahan Gaya?</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Period Selector Tabs */}
        <View style={[styles.periodSelector, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {['today', 'week', 'month'].map((p) => {
            const active = period === p;
            const label = p === 'today' ? 'Today' : p === 'week' ? '7 Days' : 'This Cycle';
            return (
              <TouchableOpacity
                key={p}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPeriod(p);
                }}
                style={[
                  styles.periodTab,
                  active && styles.periodTabActive,
                  active && { backgroundColor: isDark ? 'rgba(124, 111, 247, 0.25)' : '#7C6FF7' },
                ]}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    active && styles.periodTabTextActive,
                    !active && isDark && { color: colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#7C6FF7" />
          </View>
        ) : (
          <>
            {/* 1. Daily Budget Card on Top */}
            {dailyBudget && dailyBudget.has_budget_set && (
              <View style={[styles.card, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 20 }}>📅</Text>
                    <View>
                      <Text style={[styles.cardTitle, isDark && { color: colors.textPrimary }]}>Aaj Ka Budget</Text>
                      <Text style={[styles.cardSub, isDark && { color: colors.textSecondary }]}>
                        Day {dailyBudget.day_of_cycle} of {dailyBudget.total_days_in_cycle}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.pill,
                      {
                        backgroundColor:
                          dailyBudget.status === 'ok'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : dailyBudget.status === 'warning'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color:
                            dailyBudget.status === 'ok'
                              ? '#10B981'
                              : dailyBudget.status === 'warning'
                              ? '#F59E0B'
                              : '#EF4444',
                        },
                      ]}
                    >
                      ● {dailyBudget.status_label}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <View>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' }}>
                      Aaj Ka Bacha
                    </Text>
                    <Text
                      style={{
                        fontSize: 26,
                        fontWeight: '900',
                        color: dailyBudget.today_remaining >= 0 ? '#10B981' : '#EF4444',
                      }}
                    >
                      ₹{Math.abs(Math.round(dailyBudget.today_remaining)).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      Daily Limit: ₹{Math.round(dailyBudget.daily_budget).toLocaleString('en-IN')}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      Spent: ₹{Math.round(dailyBudget.spent_today).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 2. Donut Chart & Category Breakdown */}
            <View style={[styles.card, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, isDark && { color: colors.textPrimary }]}>Category Breakdown</Text>
              <Text style={[styles.cardSub, isDark && { color: colors.textSecondary }]}>
                Total Spent: ₹{Math.round(data?.total_spent || 0).toLocaleString('en-IN')}
              </Text>

              {chartData.length > 0 ? (
                <>
                  <View style={{ alignItems: 'center', marginVertical: 18 }}>
                    <DonutChart data={chartData} size={150} holeRatio={0.62} />
                  </View>

                  <View style={{ gap: 10 }}>
                    {data.breakdown
                      .filter((b) => b.total > 0)
                      .map((item) => (
                        <View key={item.key}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? colors.textPrimary : '#0F172A' }}>
                              {item.icon} {item.name}
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? colors.textPrimary : '#0F172A' }}>
                              ₹{Math.round(item.total).toLocaleString('en-IN')}{' '}
                              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>
                                ({item.percent}%)
                              </Text>
                            </Text>
                          </View>
                          <View
                            style={{
                              height: 6,
                              backgroundColor: isDark ? colors.bgElevated : '#E2E8F0',
                              borderRadius: 3,
                              overflow: 'hidden',
                            }}
                          >
                            <View
                              style={{
                                height: '100%',
                                width: `${Math.min(100, item.percent)}%`,
                                backgroundColor: item.color,
                                borderRadius: 3,
                              }}
                            />
                          </View>
                        </View>
                      ))}
                  </View>
                </>
              ) : (
                <Text style={{ textAlign: 'center', marginVertical: 20, color: colors.textSecondary }}>
                  Is period me koi kharcha nahi mila.
                </Text>
              )}
            </View>

            {/* 3. Top 5 Merchants */}
            {data?.top_merchants && data.top_merchants.length > 0 && (
              <View style={[styles.card, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, isDark && { color: colors.textPrimary }]}>Top Merchants</Text>
                <Text style={[styles.cardSub, isDark && { color: colors.textSecondary }]}>
                  Sabse zyada paisa kahan gaya
                </Text>
                <View style={{ marginTop: 12, gap: 8 }}>
                  {data.top_merchants.map((m, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 4,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: isDark ? 'rgba(124, 111, 247, 0.2)' : 'rgba(124, 111, 247, 0.1)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C6FF7' }}>{idx + 1}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? colors.textPrimary : '#0F172A' }}>
                          {m.merchant}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? colors.textPrimary : '#0F172A' }}>
                        ₹{Math.round(m.total).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 4. Suggested Subscriptions (Detected Recurring Payments) */}
            {data?.suggested_subscriptions && data.suggested_subscriptions.length > 0 && (
              <View
                style={[
                  styles.card,
                  isDark
                    ? { backgroundColor: 'rgba(124, 111, 247, 0.1)', borderColor: 'rgba(124, 111, 247, 0.3)' }
                    : { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
                ]}
              >
                <Text style={[styles.cardTitle, { color: '#7C6FF7' }]}>Detected Recurring Payments 💡</Text>
                <Text style={[styles.cardSub, isDark && { color: colors.textSecondary }]}>
                  Ye har mahine regular detect hue hain. 1-tap me Subscription list me jodhein:
                </Text>
                <View style={{ marginTop: 12, gap: 10 }}>
                  {data.suggested_subscriptions.map((sub, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: isDark ? colors.surface : '#FFFFFF',
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isDark ? colors.border : '#E2E8F0',
                      }}
                    >
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? colors.textPrimary : '#0F172A' }}>
                          {sub.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                          ≈ ₹{Math.round(sub.suggested_amount)} / month • {sub.reason}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleAddSubscription(sub)}
                        style={{
                          backgroundColor: '#7C6FF7',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>+ Add</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: '#7C6FF7',
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  periodTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
