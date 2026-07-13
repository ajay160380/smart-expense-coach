/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — SUBSCRIPTIONS SCREEN
 * List, add, delete subscriptions with due-soon badges
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, RefreshControl, TextInput,
  Alert, Modal, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../api/config';
import { sanitizeInput, sanitizeAmount } from '../utils/auth';
import { COLORS, CAT_ICONS, RADIUS } from '../utils/theme';
import { GlassCard, GradientButton, EmptyState, SectionHeader } from '../components/SharedComponents';

const SUB_CATEGORIES = ['entertainment', 'utilities', 'health', 'education', 'food', 'shopping', 'other'];

export default function SubscriptionsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [subName, setSubName] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subCategory, setSubCategory] = useState('entertainment');
  const [subDate, setSubDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSubs = async () => {
    try {
      const res = await api.get('/subscriptions/');
      setData(res.data);
    } catch (error) {
      console.error('Subscriptions fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchSubs(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchSubs(); };

  const handleAddSub = async () => {
    const name = sanitizeInput(subName).trim();
    const amount = parseFloat(subAmount);

    if (!name) { Alert.alert('Error', 'Subscription name required'); return; }
    if (!amount || amount <= 0) { Alert.alert('Error', 'Valid amount required'); return; }
    if (!subDate) { Alert.alert('Error', 'Next billing date required (YYYY-MM-DD)'); return; }

    setSubmitting(true);
    try {
      // Using form-data POST to add_subscription (Django form view)
      const formData = new FormData();
      formData.append('name', name);
      formData.append('amount', amount.toString());
      formData.append('category', subCategory);
      formData.append('next_billing_date', subDate);

      await api.post('/subscriptions/', {
        name,
        amount,
        category: subCategory,
        next_billing_date: subDate,
      });
      setShowAddModal(false);
      resetForm();
      fetchSubs();
      Alert.alert('📅 Subscription Added!', `${name} - ₹${amount}/month`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add subscription');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubName('');
    setSubAmount('');
    setSubCategory('entertainment');
    setSubDate('');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={COLORS.cyan} size="large" /></View>
      </SafeAreaView>
    );
  }

  const subs = data?.subscriptions || [];
  const totalMonthly = data?.total_monthly || 0;
  const totalYearly = data?.total_yearly || 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📅 Subscriptions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Totals Card ── */}
        {subs.length > 0 && (
          <LinearGradient colors={COLORS.gradDeepPurp} style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>MONTHLY</Text>
                <Text style={styles.totalValue}>₹{Math.round(totalMonthly).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>YEARLY</Text>
                <Text style={[styles.totalValue, { color: COLORS.orange }]}>₹{Math.round(totalYearly).toLocaleString('en-IN')}</Text>
              </View>
            </View>
            <Text style={styles.totalCount}>{subs.length} active subscription{subs.length !== 1 ? 's' : ''}</Text>
          </LinearGradient>
        )}

        {/* ── Subscription List ── */}
        {subs.length > 0 ? (
          <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
            {subs.map((sub, idx) => (
              <View key={sub.id} style={[styles.subRow, idx < subs.length - 1 && styles.subBorder]}>
                <View style={[styles.subIcon, { backgroundColor: (sub.color || '#888') + '22' }]}>
                  <Text style={{ fontSize: 20 }}>{sub.icon || '📦'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.subNameRow}>
                    <Text style={styles.subName}>{sub.category.charAt(0).toUpperCase() + sub.category.slice(1)}</Text>
                    {sub.due_soon && (
                      <View style={styles.dueBadge}>
                        <Text style={styles.dueBadgeText}>Due in {sub.days_until}d</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.subNext}>
                    Next: {new Date(sub.next_billing).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {sub.days_until > 0 ? ` (${sub.days_until} days)` : ' (Today!)'}
                  </Text>
                </View>
                <View style={styles.subAmountCol}>
                  <Text style={styles.subAmount}>₹{Math.round(sub.amount).toLocaleString('en-IN')}</Text>
                  <Text style={styles.subFreq}>/month</Text>
                </View>
              </View>
            ))}
          </GlassCard>
        ) : (
          <EmptyState
            icon="📅"
            title="No subscriptions"
            message="Add your Netflix, Spotify, gym memberships to track recurring costs"
            actionText="Add Subscription"
            onAction={() => setShowAddModal(true)}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Add Modal ── */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 New Subscription</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>NAME</Text>
            <TextInput style={styles.input} placeholder="e.g., Netflix" placeholderTextColor={COLORS.textMuted} value={subName} onChangeText={setSubName} />

            <Text style={styles.label}>AMOUNT (₹/MONTH)</Text>
            <TextInput style={styles.input} placeholder="e.g., 649" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={subAmount} onChangeText={(v) => setSubAmount(sanitizeAmount(v))} />

            <Text style={styles.label}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
              {SUB_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, subCategory === cat && styles.catChipActive]}
                  onPress={() => setSubCategory(cat)}
                >
                  <Text style={{ marginRight: 4 }}>{CAT_ICONS[cat] || '📦'}</Text>
                  <Text style={[styles.catChipText, subCategory === cat && { color: '#fff' }]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>NEXT BILLING DATE</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={subDate} onChangeText={setSubDate} />

            <GradientButton title="Add Subscription" onPress={handleAddSub} loading={submitting} colors={COLORS.gradPurple} icon="📅" style={{ marginTop: 20 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { flex: 1, color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold', marginLeft: 4 },
  addBtn: { backgroundColor: COLORS.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, flexGrow: 1 },

  // ── Totals ──
  totalsCard: { borderRadius: RADIUS.xl, padding: 22, marginBottom: 16 },
  totalsRow: { flexDirection: 'row', alignItems: 'center' },
  totalItem: { flex: 1, alignItems: 'center' },
  totalDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  totalLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  totalValue: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  totalCount: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: 12 },

  // ── Sub Row ──
  subRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  subBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  subIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  subNameRow: { flexDirection: 'row', alignItems: 'center' },
  subName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  dueBadge: { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  dueBadgeText: { color: COLORS.red, fontSize: 10, fontWeight: 'bold' },
  subNext: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  subAmountCol: { alignItems: 'flex-end' },
  subAmount: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
  subFreq: { color: COLORS.textMuted, fontSize: 10 },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: COLORS.bgInput, borderRadius: 12, padding: 14, color: COLORS.textPrimary, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  catChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    marginRight: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
});
