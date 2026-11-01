/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — EXPENSE SPLIT SCREEN (SPLITWISE-STYLE)
 * Groups, expenses, settlements, WhatsApp share
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, ActivityIndicator, Image, StyleSheet, Dimensions, Platform, Alert, Animated, FlatList, Modal, Switch, Pressable, Keyboard, SectionList, DeviceEventEmitter, RefreshControl, Linking, Share } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { GlassCard, GradientButton, EmptyState, SectionHeader } from '../components/SharedComponents';

import { useFocusEffect } from '@react-navigation/native';
import api, { BASE_URL } from '../api/config';
import { sanitizeInput, sanitizeAmount } from '../utils/auth';
import { COLORS } from '../utils/theme';
import { useTheme } from '../theme/ThemeContext';

export default function ExpenseSplitScreen({ navigation }) {
  const { isDark, colors } = useTheme();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create group
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [aiEstimate, setAiEstimate] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  // Add expense
  const [showExpenseModal, setShowExpenseModal] = useState(null);
  const [expPaidBy, setExpPaidBy] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);

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

  const handleGetEstimate = async () => {
    const name = sanitizeInput(groupName).trim();
    if (!name) {
      Alert.alert('Error', 'Please enter a group name first to get an estimate');
      return;
    }
    setLoadingEstimate(true);
    setAiEstimate(null);
    try {
      const res = await api.post('/splits/estimate/', { name });
      setAiEstimate(res.data.estimate);
    } catch (error) {
      Alert.alert('Error', 'Failed to get AI estimate');
    } finally {
      setLoadingEstimate(false);
    }
  };

  const handleAddExpense = async (groupId) => {
    if (submittingExpense) return; // Prevent double-tap

    const paidBy = sanitizeInput(expPaidBy).trim();
    const desc = sanitizeInput(expDesc).trim();
    const amount = parseFloat(expAmount);

    if (!paidBy || !desc || !amount || amount <= 0) {
      Alert.alert('Error', 'Fill all fields with valid data');
      return;
    }

    setSubmittingExpense(true);
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
    } finally {
      setSubmittingExpense(false);
    }
  };

  const deleteExpense = (groupId, expenseId, desc) => {
    Alert.alert('Delete Expense', `Delete "${desc}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/splits/${groupId}/delete-expense/${expenseId}/`);
            fetchGroups();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete expense');
          }
        },
      },
    ]);
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

  const shareGroupLink = async (group) => {
    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}

      const domain = (BASE_URL || 'https://expense-coach-prxm.onrender.com').replace(/\/api\/?$/, '');
      const liveUrl = `${domain}/split/${group.share_token}/`;
      const membersStr = (group.members || []).join(', ');

      const shareText =
        `🏖️ *${group.name} — Split Hisaab on PaisaMitra*\n\n` +
        `💰 *Total:* ₹${Math.round(group.total).toLocaleString('en-IN')}\n` +
        `👤 *Per Person:* ₹${Math.round(group.per_person).toLocaleString('en-IN')}\n` +
        `👥 *Members:* ${membersStr}\n\n` +
        `🔗 *Live Trip Link (Zero Login):*\n${liveUrl}\n\n` +
        `_Tap the link to view live expenses, who owes whom, and settle payments!_`;

      await Share.share({
        message: shareText,
        url: liveUrl,
        title: `${group.name} Split Hisaab`,
      });
    } catch (error) {
      try {
        const domain = (BASE_URL || 'https://expense-coach-prxm.onrender.com').replace(/\/api\/?$/, '');
        const liveUrl = `${domain}/split/${group.share_token}/`;
        Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`🏖️ *${group.name}* Live Split Link:\n${liveUrl}`)}`);
      } catch (e) {
        Alert.alert('Error', 'Could not open share dialog.');
      }
    }
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
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  const activeGroups = groups.filter((g) => !g.is_settled);
  const settledGroups = groups.filter((g) => g.is_settled);

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, isDark && { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? colors.textPrimary : COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && { color: colors.textPrimary }]}>📱 Expense Split</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? colors.primary : COLORS.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {activeGroups.length > 0 ? (
          activeGroups.map((group) => (
            <GlassCard key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupEmoji}>👥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.groupName, isDark && { color: colors.textPrimary }]}>{group.name}</Text>
                  <Text style={[styles.groupMeta, isDark && { color: colors.textSecondary }]}>{group.member_count} members • {group.expense_count} expenses</Text>
                </View>
                <TouchableOpacity
                  onPress={() => shareGroupLink(group)}
                  style={styles.headerShareBtn}
                  accessibilityLabel="Share Trip Link"
                >
                  <Ionicons name="share-social-outline" size={19} color="#25D366" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteGroup(group.id, group.name)}>
                  <Ionicons name="trash-outline" size={18} color={isDark ? colors.textMuted : COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.splitStats}>
                <View style={[styles.splitStatItem, isDark && { backgroundColor: colors.bgElevated }]}>
                  <Text style={[styles.splitStatLabel, isDark && { color: colors.textMuted }]}>Total</Text>
                  <Text style={[styles.splitStatValue, isDark && { color: colors.textPrimary }]}>₹{Math.round(group.total).toLocaleString('en-IN')}</Text>
                </View>
                <View style={[styles.splitStatItem, isDark && { backgroundColor: colors.bgElevated }]}>
                  <Text style={[styles.splitStatLabel, isDark && { color: colors.textMuted }]}>Per Person</Text>
                  <Text style={[styles.splitStatValue, { color: isDark ? colors.primary : COLORS.cyan }]}>
                    ₹{Math.round(group.per_person).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <View style={styles.memberChips}>
                {group.members.map((m, i) => (
                  <View key={i} style={[styles.memberChip, isDark && { backgroundColor: 'rgba(129, 140, 248, 0.18)' }]}>
                    <Text style={[styles.memberChipText, isDark && { color: colors.primary }]}>{m}</Text>
                  </View>
                ))}
              </View>

              {/* Expense list with delete */}
              {(group.expenses || []).length > 0 && (
                <View style={[styles.expenseList, isDark && { borderTopColor: colors.border }]}>
                  <Text style={[styles.splitStatLabel, isDark && { color: colors.textMuted }, { marginBottom: 6 }]}>EXPENSES</Text>
                  {group.expenses.map((exp) => (
                    <View key={exp.id} style={[styles.expenseRow, isDark && { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.expenseDesc, isDark && { color: colors.textPrimary }]}>{exp.description}</Text>
                        <Text style={[styles.expenseMeta, isDark && { color: colors.textSecondary }]}>{exp.paid_by} paid ₹{Math.round(exp.amount).toLocaleString('en-IN')}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => deleteExpense(group.id, exp.id, exp.description)}
                        style={styles.expDeleteBtn}
                      >
                        <Ionicons name="close-circle" size={20} color={COLORS.red || '#ef4444'} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.groupActions, isDark && { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.groupBtn}
                  onPress={() => {
                    setShowExpenseModal(group.id);
                    setExpPaidBy('');
                    setExpDesc('');
                    setExpAmount('');
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={15} color={isDark ? colors.primary : COLORS.cyan} />
                  <Text style={[styles.groupBtnText, { color: isDark ? colors.primary : COLORS.cyan }]}>+ Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.groupBtn} onPress={() => viewSummary(group.id)} activeOpacity={0.7}>
                  <Ionicons name="receipt-outline" size={15} color={isDark ? '#A78BFA' : COLORS.primary} />
                  <Text style={[styles.groupBtnText, { color: isDark ? '#A78BFA' : COLORS.primary }]}>Summary</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.groupBtn} onPress={() => settleGroup(group.id)} activeOpacity={0.7}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={isDark ? '#34D399' : COLORS.green} />
                  <Text style={[styles.groupBtnText, { color: isDark ? '#34D399' : COLORS.green }]}>Settle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.groupBtn} onPress={() => shareGroupLink(group)} activeOpacity={0.7}>
                  <Ionicons name="share-social-outline" size={15} color="#25D366" />
                  <Text style={[styles.groupBtnText, { color: '#25D366' }]}>Share</Text>
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
                <View style={[styles.groupActions, { borderTopWidth: 0, paddingTop: 0 }]}>
                  <TouchableOpacity style={styles.groupBtn} onPress={() => viewSummary(g.id)}>
                    <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
                    <Text style={[styles.groupBtnText, { color: COLORS.primary }]}>View Summary</Text>
                  </TouchableOpacity>
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
          <View style={[styles.modalContent, isDark && { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && { color: colors.textPrimary }]}>👥 New Split Group</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={isDark ? colors.textMuted : COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, isDark && { color: colors.textSecondary }]}>GROUP NAME</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }, isDark && { backgroundColor: colors.bgInput, color: colors.textPrimary, borderColor: colors.border }]} placeholder="e.g., Goa Trip" placeholderTextColor={isDark ? colors.textMuted : COLORS.textMuted} value={groupName} onChangeText={setGroupName} />
              <TouchableOpacity onPress={handleGetEstimate} style={styles.aiEstimateBtn}>
                {loadingEstimate ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.aiEstimateText}>✨ AI Estimate</Text>}
              </TouchableOpacity>
            </View>

            {aiEstimate && (
              <View style={[styles.aiEstimateBox, isDark && { backgroundColor: 'rgba(129, 140, 248, 0.15)', borderColor: 'rgba(129, 140, 248, 0.3)' }]}>
                <Text style={[styles.aiEstimateBoxText, isDark && { color: colors.textPrimary }]}>{aiEstimate}</Text>
              </View>
            )}

            <Text style={[styles.label, isDark && { color: colors.textSecondary }]}>MEMBERS</Text>
            {members.map((m, idx) => (
              <TextInput
                key={idx}
                style={[styles.input, { marginBottom: 8 }, isDark && { backgroundColor: colors.bgInput, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder={`Member ${idx + 1}`}
                placeholderTextColor={isDark ? colors.textMuted : COLORS.textMuted}
                value={m}
                onChangeText={(v) => updateMember(idx, v)}
              />
            ))}
            <TouchableOpacity onPress={addMemberField} style={styles.addMemberBtn}>
              <Ionicons name="add" size={16} color={isDark ? colors.primary : COLORS.cyan} />
              <Text style={{ color: isDark ? colors.primary : COLORS.cyan, fontSize: 13, marginLeft: 4 }}>Add member</Text>
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
          <View style={[styles.modalContent, isDark && { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && { color: colors.textPrimary }]}>💸 Add Split Expense</Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(null)}>
                <Ionicons name="close" size={24} color={isDark ? colors.textMuted : COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, isDark && { color: colors.textSecondary }]}>PAID BY</Text>
            <View style={styles.paidByChips}>
              {(() => {
                const group = groups.find((g) => g.id === showExpenseModal);
                if (!group) return null;
                return group.members.map((m, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.paidByChip,
                      isDark && { backgroundColor: colors.bgElevated, borderColor: colors.border },
                      expPaidBy === m && (isDark ? { backgroundColor: 'rgba(129, 140, 248, 0.25)', borderColor: colors.primary } : styles.paidByChipActive),
                    ]}
                    onPress={() => setExpPaidBy(m)}
                  >
                    <Text style={[
                      styles.paidByChipText,
                      isDark && { color: colors.textPrimary },
                      expPaidBy === m && (isDark ? { color: colors.primary } : styles.paidByChipTextActive),
                    ]}>{m}</Text>
                  </TouchableOpacity>
                ));
              })()}
            </View>

            <Text style={[styles.label, isDark && { color: colors.textSecondary }]}>DESCRIPTION</Text>
            <TextInput style={[styles.input, isDark && { backgroundColor: colors.bgInput, color: colors.textPrimary, borderColor: colors.border }]} placeholder="e.g., Hotel booking" placeholderTextColor={isDark ? colors.textMuted : COLORS.textMuted} value={expDesc} onChangeText={setExpDesc} />

            <Text style={[styles.label, isDark && { color: colors.textSecondary }]}>AMOUNT (₹)</Text>
            <TextInput style={[styles.input, isDark && { backgroundColor: colors.bgInput, color: colors.textPrimary, borderColor: colors.border }]} placeholder="0.00" placeholderTextColor={isDark ? colors.textMuted : COLORS.textMuted} keyboardType="numeric" value={expAmount} onChangeText={(v) => setExpAmount(sanitizeAmount(v))} />

            <GradientButton title="Add Expense" onPress={() => handleAddExpense(showExpenseModal)} loading={submittingExpense} colors={COLORS.gradOrange} icon="💸" style={{ marginTop: 20 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Summary Modal ── */}
      <Modal visible={showSummary !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }, isDark && { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && { color: colors.textPrimary }]}>📊 Split Summary</Text>
              <TouchableOpacity onPress={() => setShowSummary(null)}>
                <Ionicons name="close" size={24} color={isDark ? colors.textMuted : COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {summaryData && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.summaryTotals}>
                  <View style={[styles.summaryTotalItem, isDark && { backgroundColor: colors.bgElevated }]}>
                    <Text style={[styles.summaryLabel, isDark && { color: colors.textMuted }]}>Total</Text>
                    <Text style={[styles.summaryValue, isDark && { color: colors.textPrimary }]}>₹{Math.round(summaryData.total).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={[styles.summaryTotalItem, isDark && { backgroundColor: colors.bgElevated }]}>
                    <Text style={[styles.summaryLabel, isDark && { color: colors.textMuted }]}>Per Person</Text>
                    <Text style={[styles.summaryValue, { color: isDark ? colors.primary : COLORS.cyan }]}>₹{Math.round(summaryData.per_person).toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                <Text style={[styles.label, isDark && { color: colors.textSecondary }, { marginTop: 16 }]}>MEMBERS</Text>
                {(summaryData.members || []).map((m, idx) => (
                  <View key={idx} style={[styles.memberRow, isDark && { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
                    <Text style={[styles.memberName, isDark && { color: colors.textPrimary }]}>{m.name}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.memberPaid, isDark && { color: colors.textSecondary }]}>Paid: ₹{Math.round(m.paid).toLocaleString('en-IN')}</Text>
                      <Text style={[styles.memberNet, {
                        color: m.status === 'gets_back' ? (isDark ? '#34D399' : COLORS.green) : m.status === 'owes' ? (isDark ? '#F87171' : COLORS.red) : (isDark ? colors.textMuted : COLORS.textMuted),
                      }]}>
                        {m.status === 'gets_back' ? `Gets ₹${Math.round(Math.abs(m.net))}` :
                         m.status === 'owes' ? `Owes ₹${Math.round(Math.abs(m.net))}` : 'Settled ✅'}
                      </Text>
                    </View>
                  </View>
                ))}

                {(summaryData.settlements || []).length > 0 && (
                  <>
                    <Text style={[styles.label, isDark && { color: colors.textSecondary }, { marginTop: 16 }]}>SETTLEMENTS</Text>
                    {summaryData.settlements.map((s, idx) => (
                      <View key={idx} style={[styles.settlementRow, isDark && { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
                        <Text style={[styles.settlementText, isDark && { color: colors.textPrimary }]}>
                          {s.from} ➡️ {s.to}: <Text style={{ color: isDark ? '#34D399' : COLORS.green, fontWeight: 'bold' }}>₹{Math.round(s.amount).toLocaleString('en-IN')}</Text>
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {summaryData && (
                  <View style={styles.summaryShareRow}>
                    <TouchableOpacity
                      style={styles.summaryWaBtn}
                      onPress={() => shareOnWhatsApp(summaryData.whatsapp_message || `${summaryData.group_name} Link: ${summaryData.public_url}`)}
                      activeOpacity={0.8}
                    >
                      <FontAwesome name="whatsapp" size={18} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.summaryShareText}>WhatsApp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.summaryNativeBtn}
                      onPress={() => {
                        Share.share({
                          message: summaryData.whatsapp_message || `Check out ${summaryData.group_name} split on PaisaMitra: ${summaryData.public_url}`,
                          url: summaryData.public_url,
                          title: `${summaryData.group_name} Split`,
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="share-social-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.summaryShareText}>Share Link</Text>
                    </TouchableOpacity>
                  </View>
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
  splitStatItem: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, marginHorizontal: 3 },
  splitStatLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  splitStatValue: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 4 },

  memberChips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  memberChip: { backgroundColor: '#EDE9FE', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  memberChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },

  // ── Expense List ──
  expenseList: { marginBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: 10 },
  expenseRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 10,
    padding: 10, marginBottom: 4,
    borderWidth: 1, borderColor: '#F1F3F9',
  },
  expenseDesc: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  expenseMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  expDeleteBtn: { padding: 6 },

  groupActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderTopWidth: 1, 
    borderTopColor: COLORS.borderLight, 
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  groupBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  groupBtnText: { 
    fontSize: 11.5, 
    fontWeight: '700', 
    marginLeft: 3,
  },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.45)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, color: COLORS.textPrimary, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', padding: 8 },

  // ── Paid By Chips ──
  paidByChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paidByChip: {
    backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  paidByChipActive: {
    backgroundColor: '#EDE9FE',
    borderColor: COLORS.primary,
  },
  paidByChipText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  paidByChipTextActive: { color: COLORS.primary },

  // ── Summary ──
  summaryTotals: { flexDirection: 'row', marginBottom: 8 },
  summaryTotalItem: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 14, padding: 16, marginHorizontal: 4 },
  summaryLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: 'bold' },
  summaryValue: { color: COLORS.textPrimary, fontSize: 22, fontWeight: 'bold', marginTop: 4 },

  memberRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#F1F3F9',
  },
  memberName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  memberPaid: { color: COLORS.textSecondary, fontSize: 12 },
  memberNet: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },

  settlementRow: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: '#F1F3F9' },
  settlementText: { color: COLORS.textPrimary, fontSize: 14 },

  headerShareBtn: {
    padding: 6,
    marginRight: 6,
  },
  summaryShareRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 20,
  },
  summaryWaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 14,
  },
  summaryNativeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary || '#7C3AED',
    borderRadius: 14,
    paddingVertical: 14,
  },
  summaryShareText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  waShareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.whatsapp, borderRadius: 14, padding: 14, marginTop: 16, marginBottom: 20,
  },
  waShareText: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },
  
  aiEstimateBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 14,
    borderRadius: 12, marginLeft: 8, justifyContent: 'center', alignItems: 'center',
  },
  aiEstimateText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  aiEstimateBox: {
    backgroundColor: '#EDE9FE', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#DDD6FE', marginBottom: 16,
  },
  aiEstimateBoxText: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
});
