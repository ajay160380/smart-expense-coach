/**
 * ═══════════════════════════════════════════════════════════════
 * PAISA MITRA — SAVINGS GOALS SCREEN
 * CRUD goals with progress bars, add money, celebrate completion
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
import { COLORS, RADIUS, SPACING, FONT, SHADOW } from '../utils/theme';
import { GlassCard, GradientButton, EmptyState, SectionHeader } from '../components/SharedComponents';

const GOAL_ICONS = ['🎯', '📱', '🏖️', '🚗', '🏠', '💻', '👗', '✈️', '🎓', '💰', '🎮', '💍'];

export default function SavingsGoalsScreen({ navigation }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddMoney, setShowAddMoney] = useState(null);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');

  // Add goal form
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalIcon, setGoalIcon] = useState('🎯');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchGoals = async () => {
    try {
      const res = await api.get('/savings-goals/');
      setGoals(res.data?.goals || []);
    } catch (error) {
      console.error('Goals fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchGoals(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchGoals(); };

  const handleAddGoal = async () => {
    const name = sanitizeInput(goalName).trim();
    const target = parseFloat(goalTarget);

    if (!name) { Alert.alert('Error', 'Goal name is required'); return; }
    if (!target || target <= 0) { Alert.alert('Error', 'Enter a valid target amount'); return; }

    setSubmitting(true);
    try {
      await api.post('/savings-goals/add/', {
        name,
        target_amount: target,
        icon: goalIcon,
        deadline: goalDeadline || undefined,
      });
      setShowAddModal(false);
      resetForm();
      fetchGoals();
      Alert.alert('🎯 Goal Created!', `Target: ₹${target.toLocaleString('en-IN')}`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMoney = async (goalId) => {
    const amount = parseFloat(addMoneyAmount);
    if (!amount || amount <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }

    try {
      const res = await api.post(`/savings-goals/${goalId}/update/`, { add_amount: amount });
      setShowAddMoney(null);
      setAddMoneyAmount('');
      fetchGoals();

      if (res.data?.is_completed) {
        Alert.alert('🎉 Congratulations!', `Goal completed! ${res.data.message}`);
      } else {
        Alert.alert('💰 Saved!', res.data?.message || `₹${amount} added!`);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add money');
    }
  };

  const handleDeleteGoal = (goalId, goalName) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goalName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/savings-goals/${goalId}/delete/`);
              fetchGoals();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setGoalName('');
    setGoalTarget('');
    setGoalIcon('🎯');
    setGoalDeadline('');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.cyan} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const activeGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎯 Savings Goals</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>New Goal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Active Goals ── */}
        {activeGoals.length > 0 ? (
          activeGoals.map((goal) => (
            <GlassCard key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalIconLarge}>{goal.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  {goal.months_needed && (
                    <Text style={styles.goalEta}>~{goal.months_needed} months to go</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDeleteGoal(goal.id, goal.name)}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Progress */}
              <View style={styles.progressSection}>
                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={goal.progress_percent >= 100 ? COLORS.gradGreen : COLORS.gradPurple}
                    style={[styles.progressBarFill, { width: `${Math.min(goal.progress_percent, 100)}%` }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
                <View style={styles.progressTextRow}>
                  <Text style={styles.progressSaved}>₹{Math.round(goal.saved_amount).toLocaleString('en-IN')}</Text>
                  <Text style={styles.progressPercent}>{Math.round(goal.progress_percent)}%</Text>
                  <Text style={styles.progressTarget}>₹{Math.round(goal.target_amount).toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* Add Money Button */}
              <TouchableOpacity
                style={styles.addMoneyBtn}
                onPress={() => { setShowAddMoney(goal.id); setAddMoneyAmount(''); }}
              >
                <LinearGradient colors={COLORS.gradGreen} style={styles.addMoneyGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={styles.addMoneyText}>Add Money</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Inline Add Money Input */}
              {showAddMoney === goal.id && (
                <View style={styles.addMoneyInput}>
                  <TextInput
                    style={styles.moneyInput}
                    placeholder="₹ Amount"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={addMoneyAmount}
                    onChangeText={(v) => setAddMoneyAmount(sanitizeAmount(v))}
                  />
                  <TouchableOpacity style={styles.moneyConfirm} onPress={() => handleAddMoney(goal.id)}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.moneyCancel} onPress={() => setShowAddMoney(null)}>
                    <Ionicons name="close" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              )}

              {goal.deadline && (
                <Text style={styles.deadline}>⏰ Deadline: {new Date(goal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              )}
            </GlassCard>
          ))
        ) : (
          <EmptyState
            icon="🎯"
            title="No savings goals yet"
            message="Set a goal for something you want — iPhone, Goa trip, or emergency fund!"
            actionText="Create First Goal"
            onAction={() => setShowAddModal(true)}
          />
        )}

        {/* ── Completed Goals ── */}
        {completedGoals.length > 0 && (
          <>
            <SectionHeader title="✅ Completed" />
            {completedGoals.map((goal) => (
              <GlassCard key={goal.id} style={[styles.goalCard, { opacity: 0.7 }]}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalIconLarge}>{goal.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Text style={[styles.goalEta, { color: COLORS.green }]}>🎉 Completed!</Text>
                  </View>
                  <Text style={styles.completedAmount}>₹{Math.round(goal.target_amount).toLocaleString('en-IN')}</Text>
                </View>
              </GlassCard>
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Add Goal Modal ── */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎯 New Savings Goal</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>GOAL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., iPhone 16 Pro"
              placeholderTextColor={COLORS.textMuted}
              value={goalName}
              onChangeText={setGoalName}
              maxLength={100}
            />

            <Text style={styles.label}>TARGET AMOUNT (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 50000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={goalTarget}
              onChangeText={(v) => setGoalTarget(sanitizeAmount(v))}
            />

            <Text style={styles.label}>ICON</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconPicker}>
              {GOAL_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconOption, goalIcon === icon && styles.iconOptionSelected]}
                  onPress={() => setGoalIcon(icon)}
                >
                  <Text style={{ fontSize: 24 }}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>DEADLINE (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={goalDeadline}
              onChangeText={setGoalDeadline}
            />

            <GradientButton
              title="Create Goal"
              onPress={handleAddGoal}
              loading={submitting}
              colors={COLORS.gradGreen}
              icon="🎯"
              style={{ marginTop: 20 }}
            />
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: 'bold' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginLeft: 4 },
  scrollContent: { padding: 16, flexGrow: 1 },

  // ── Goal Card ──
  goalCard: { marginBottom: 14 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  goalIconLarge: { fontSize: 32, marginRight: 14 },
  goalName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
  goalEta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  // ── Progress ──
  progressSection: { marginBottom: 12 },
  progressBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  progressSaved: { color: COLORS.green, fontSize: 13, fontWeight: 'bold' },
  progressPercent: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  progressTarget: { color: COLORS.textSecondary, fontSize: 13 },

  // ── Add Money ──
  addMoneyBtn: { marginBottom: 4 },
  addMoneyGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12,
  },
  addMoneyText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
  addMoneyInput: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  moneyInput: {
    flex: 1, backgroundColor: COLORS.bgInput, borderRadius: 10,
    padding: 12, color: COLORS.textPrimary, fontSize: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  moneyConfirm: {
    backgroundColor: COLORS.green, width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  moneyCancel: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginLeft: 4,
  },
  deadline: { color: COLORS.textMuted, fontSize: 12, marginTop: 8 },
  completedAmount: { color: COLORS.green, fontSize: 16, fontWeight: 'bold' },

  // ── Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold' },
  label: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14,
  },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: 12, padding: 14,
    color: COLORS.textPrimary, fontSize: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  iconPicker: { flexDirection: 'row', marginTop: 4 },
  iconOption: {
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.bgInput, marginRight: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  iconOptionSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(168,136,255,0.15)' },
});
