/**
 * ═══════════════════════════════════════════════════════════════
 * PAISA MITRA — EXPENSE SPLIT SCREEN (SPLITWISE-STYLE)
 * Groups, expenses, settlements, WhatsApp share
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, RefreshControl, TextInput,
  Alert, Modal, ActivityIndicator, Linking, KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../api/config';
import { sanitizeInput, sanitizeAmount } from '../utils/auth';
import { COLORS, RADIUS, FONT } from '../utils/theme';
import { GlassCard, GradientButton, EmptyState, SectionHeader } from '../components/SharedComponents';

export default function ExpenseSplitScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create group
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);

  // Add expense
  const [showExpenseModal, setShowExpenseModal] = useState(null);
  const [expPaidBy, setExpPaidBy] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');

  // Summary
  const [showSummary, setShowSummary] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/splits/');
      setGroups(res.data?.groups || []);
    } catch (error) {
      console.error('Splits fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchGroups(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchGroups(); };

  const handleCreateGroup = async () => {
    const name = sanitizeInput(groupName).trim();
    const memberList = members.filter((m) => m.trim()).map((m) => ({ name: m.trim() }));

    if (!name) { Alert.alert('Error', 'Group name required'); return; }
    if (memberList.length < 2) { Alert.alert('Error', 'At least 2 members needed'); return; }

    setSubmitting(true);
    try {
      await api.post('/splits/create/', { name, members: memberList });
      setShowCreateModal(false);
      setGroupName('');
      setMembers(['', '']);
      fetchGroups();
      Alert.alert('👥 Group Created!', `"${name}" with ${memberList.length} members`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExpense = async (groupId) => {
    const paidBy = sanitizeInput(expPaidBy).trim();
    const desc = sanitizeInput(expDesc).trim();
    const amount = parseFloat(expAmount);

    if (!paidBy || !desc || !amount || amount <= 0) {
      Alert.alert('Error', 'Fill all fields with valid data');
      return;
    }

    try {
      await api.post(`/splits/${groupId}/add-expense/`, {
        paid_by: paidBy,
        description: desc,
        amount,
      });
      setShowExpenseModal(null);
      setExpPaidBy('');
      setExpDesc('');
      setExpAmount('');
      fetchGroups();
      Alert.alert('💸 Expense Added!', `₹${amount} paid by ${paidBy}`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add expense');
    }
  };

  const viewSummary = async (groupId) => {
    try {
      const res = await api.get(`/splits/${groupId}/summary/`);
      setSummaryData(res.data);
      setShowSummary(groupId);
    } catch (error) {
      Alert.alert('Error', 'Failed to load summary');
    }
  };

  const settleGroup = async (groupId) => {
    Alert.alert('Settle Group', 'Mark this group as settled?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Settle',
        onPress: async () => {
          try {
            await api.post(`/splits/${groupId}/settle/`);
            fetchGroups();
            setShowSummary(null);
            Alert.alert('✅ Settled!', 'Group has been settled');
          } catch (error) {
            Alert.alert('Error', 'Failed to settle');
          }
        },
      },
    ]);
  };

  const deleteGroup = (groupId, name) => {
    Alert.alert('Delete Group', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/splits/${groupId}/delete/`);
            fetchGroups();
          } catch (error) { Alert.alert('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  const shareOnWhatsApp = (message) => {
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const addMemberField = () => setMembers([...members, '']);
  const updateMember = (idx, val) => {
    const updated = [...members];
    updated[idx] = val;
    setMembers(updated);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={COLORS.cyan} size="large" /></View>
      </SafeAreaView>
    );
  }

  const activeGroups = groups.filter((g) => !g.is_settled);
  const settledGroups = groups.filter((g) => g.is_settled);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📱 Expense Split</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {activeGroups.length > 0 ? (
          activeGroups.map((group) => (
            <GlassCard key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupEmoji}>👥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>{group.member_count} members • {group.expense_count} expenses</Text>
                </View>
                <TouchableOpacity onPress={() => deleteGroup(group.id, group.name)}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.splitStats}>
                <View style={styles.splitStatItem}>
                  <Text style={styles.splitStatLabel}>Total</Text>
                  <Text style={styles.splitStatValue}>₹{Math.round(group.total).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.splitStatItem}>
                  <Text style={styles.splitStatLabel}>Per Person</Text>
                  <Text style={[styles.splitStatValue, { color: COLORS.cyan }]}>
                    ₹{Math.round(group.per_person).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <View style={styles.memberChips}>
                {group.members.map((m, i) => (
                  <View key={i} style={styles.memberChip}>
                    <Text style={styles.memberChipText}>{m}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.groupActions}>
                <TouchableOpacity
                  style={styles.groupBtn}
                  onPress={() => {
                    setShowExpenseModal(group.id);
                    setExpPaidBy('');
                    setExpDesc('');
                    setExpAmount('');
                  }}
                >
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.cyan} />
                  <Text style={[styles.groupBtnText, { color: COLORS.cyan }]}>Add Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.groupBtn} onPress={() => viewSummary(group.id)}>
                  <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.groupBtnText, { color: COLORS.primary }]}>Summary</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.groupBtn} onPress={() => settleGroup(group.id)}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.green} />
                  <Text style={[styles.groupBtnText, { color: COLORS.green }]}>Settle</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))
        ) : (
          <EmptyState
            icon="📱"
            title="No split groups yet"
            message="Split expenses with friends — Goa trip, office lunch, or roommate bills!"
            actionText="Create Group"
            onAction={() => setShowCreateModal(true)}
          />
        )}

        {settledGroups.length > 0 && (
          <>
            <SectionHeader title="✅ Settled Groups" />
            {settledGroups.map((g) => (
              <GlassCard key={g.id} style={[styles.groupCard, { opacity: 0.6 }]}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupEmoji}>✅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupName}>{g.name}</Text>
                    <Text style={styles.groupMeta}>Settled • ₹{Math.round(g.total).toLocaleString('en-IN')} total</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Create Group Modal ── */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👥 New Split Group</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>GROUP NAME</Text>
            <TextInput style={styles.input} placeholder="e.g., Goa Trip" placeholderTextColor={COLORS.textMuted} value={groupName} onChangeText={setGroupName} />

            <Text style={styles.label}>MEMBERS</Text>
            {members.map((m, idx) => (
              <TextInput
                key={idx}
                style={[styles.input, { marginBottom: 8 }]}
                placeholder={`Member ${idx + 1}`}
                placeholderTextColor={COLORS.textMuted}
                value={m}
                onChangeText={(v) => updateMember(idx, v)}
              />
            ))}
            <TouchableOpacity onPress={addMemberField} style={styles.addMemberBtn}>
              <Ionicons name="add" size={16} color={COLORS.cyan} />
              <Text style={{ color: COLORS.cyan, fontSize: 13, marginLeft: 4 }}>Add member</Text>
            </TouchableOpacity>

            <GradientButton title="Create Group" onPress={handleCreateGroup} loading={submitting} colors={COLORS.gradCyan} icon="👥" style={{ marginTop: 20 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Expense Modal ── */}
      <Modal visible={showExpenseModal !== null} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💸 Add Split Expense</Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>PAID BY</Text>
            <TextInput style={styles.input} placeholder="Who paid?" placeholderTextColor={COLORS.textMuted} value={expPaidBy} onChangeText={setExpPaidBy} />

            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput style={styles.input} placeholder="e.g., Hotel booking" placeholderTextColor={COLORS.textMuted} value={expDesc} onChangeText={setExpDesc} />

            <Text style={styles.label}>AMOUNT (₹)</Text>
            <TextInput style={styles.input} placeholder="0.00" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={expAmount} onChangeText={(v) => setExpAmount(sanitizeAmount(v))} />

            <GradientButton title="Add Expense" onPress={() => handleAddExpense(showExpenseModal)} colors={COLORS.gradOrange} icon="💸" style={{ marginTop: 20 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Summary Modal ── */}
      <Modal visible={showSummary !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 Split Summary</Text>
              <TouchableOpacity onPress={() => setShowSummary(null)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {summaryData && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.summaryTotals}>
                  <View style={styles.summaryTotalItem}>
                    <Text style={styles.summaryLabel}>Total</Text>
                    <Text style={styles.summaryValue}>₹{Math.round(summaryData.total).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.summaryTotalItem}>
                    <Text style={styles.summaryLabel}>Per Person</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.cyan }]}>₹{Math.round(summaryData.per_person).toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                <Text style={[styles.label, { marginTop: 16 }]}>MEMBERS</Text>
                {(summaryData.members || []).map((m, idx) => (
                  <View key={idx} style={styles.memberRow}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.memberPaid}>Paid: ₹{Math.round(m.paid).toLocaleString('en-IN')}</Text>
                      <Text style={[styles.memberNet, {
                        color: m.status === 'gets_back' ? COLORS.green : m.status === 'owes' ? COLORS.red : COLORS.textMuted,
                      }]}>
                        {m.status === 'gets_back' ? `Gets ₹${Math.round(Math.abs(m.net))}` :
                         m.status === 'owes' ? `Owes ₹${Math.round(Math.abs(m.net))}` : 'Settled ✅'}
                      </Text>
                    </View>
                  </View>
                ))}

                {(summaryData.settlements || []).length > 0 && (
                  <>
                    <Text style={[styles.label, { marginTop: 16 }]}>SETTLEMENTS</Text>
                    {summaryData.settlements.map((s, idx) => (
                      <View key={idx} style={styles.settlementRow}>
                        <Text style={styles.settlementText}>
                          {s.from} ➡️ {s.to}: <Text style={{ color: COLORS.green, fontWeight: 'bold' }}>₹{Math.round(s.amount).toLocaleString('en-IN')}</Text>
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {summaryData.whatsapp_message && (
                  <TouchableOpacity
                    style={styles.waShareBtn}
                    onPress={() => shareOnWhatsApp(summaryData.whatsapp_message)}
                  >
                    <FontAwesome name="whatsapp" size={18} color="#fff" />
                    <Text style={styles.waShareText}>Share on WhatsApp</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
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

  // ── Group Card ──
  groupCard: { marginBottom: 14 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  groupEmoji: { fontSize: 28, marginRight: 12 },
  groupName: { color: COLORS.textPrimary, fontSize: 17, fontWeight: 'bold' },
  groupMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  splitStats: { flexDirection: 'row', marginBottom: 12 },
  splitStatItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, marginHorizontal: 3 },
  splitStatLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  splitStatValue: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 4 },

  memberChips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  memberChip: { backgroundColor: 'rgba(168,136,255,0.12)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  memberChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },

  groupActions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: 12 },
  groupBtn: { flexDirection: 'row', alignItems: 'center', padding: 6 },
  groupBtnText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.bgInput, borderRadius: 12, padding: 14, color: COLORS.textPrimary, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', padding: 8 },

  // ── Summary ──
  summaryTotals: { flexDirection: 'row', marginBottom: 8 },
  summaryTotalItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, marginHorizontal: 4 },
  summaryLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: 'bold' },
  summaryValue: { color: COLORS.textPrimary, fontSize: 22, fontWeight: 'bold', marginTop: 4 },

  memberRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, marginBottom: 6,
  },
  memberName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  memberPaid: { color: COLORS.textSecondary, fontSize: 12 },
  memberNet: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },

  settlementRow: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, marginBottom: 6 },
  settlementText: { color: COLORS.textPrimary, fontSize: 14 },

  waShareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.whatsapp, borderRadius: 14, padding: 14, marginTop: 16, marginBottom: 20,
  },
  waShareText: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },
});
