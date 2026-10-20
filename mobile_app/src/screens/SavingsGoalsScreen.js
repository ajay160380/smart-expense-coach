/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — SAVINGS GOALS SCREEN (ULTRA PREMIUM)
 * Circular progress, glowing header, premium goal cards
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, ActivityIndicator, StyleSheet, Platform, Alert, Animated, Modal, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { GradientButton, EmptyState } from '../components/SharedComponents';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import api from '../api/config';
import { sanitizeInput, sanitizeAmount } from '../utils/auth';
import { COLORS, RADIUS } from '../utils/theme';

const GOAL_ICONS = ['🎯', '📱', '🏖️', '🚗', '🏠', '💻', '👗', '✈️', '🎓', '💰', '🎮', '💍'];

// ── Design Direction Theme: Deep Purple / Violet Aesthetics ──
const THEME = {
  bg: '#251D4A',
  topBg: '#4A3E99',
  sheetBg: '#1B1438',
  cardBg: 'rgba(255, 255, 255, 0.08)',
  cardBorder: 'rgba(255, 255, 255, 0.14)',
  primary: '#8B5CF6',
  accentNeon: '#B794F6',
  textPrimary: '#FFFFFF',
  textSecondary: '#E9D5FF',
  textMuted: '#A79BBF',
  green: '#34D399',
  gradPurple: ['#8B5CF6', '#6D28D9', '#4C1D95'],
  gradNeon: ['#C4B5FD', '#8B5CF6', '#6D28D9'],
  gradGreen: ['#34D399', '#059669'],
};

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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true })
      ]).start();
    }, [])
  );

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
          <ActivityIndicator color={THEME.accentNeon} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const activeGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);
  const totalSaved = goals.reduce((sum, g) => sum + (g.saved_amount || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + (g.target_amount || 0), 0);
  const overallPercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── TOP: GLOWING SUMMARY HEADER ── */}
      <View style={styles.topSection}>
        <Animated.View style={{
          position: 'absolute',
          top: -120,
          left: -80,
          right: -80,
          height: 350,
          backgroundColor: THEME.accentNeon,
          opacity: 0.18,
          borderRadius: 300,
          transform: [{ scaleX: 1.6 }],
        }} />

        <SafeAreaView>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Savings Goals</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddModal(true); }}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.summaryRow}>
              {/* Big Amount */}
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryLabel}>TOTAL SAVED</Text>
                <Text style={styles.summaryAmount}>₹{Math.round(totalSaved).toLocaleString('en-IN')}</Text>
                <Text style={styles.summarySubtext}>of ₹{Math.round(totalTarget).toLocaleString('en-IN')} target</Text>
              </View>

              {/* Circular Progress Ring */}
              <View style={styles.ringContainer}>
                <View style={styles.ringOuter}>
                  <LinearGradient
                    colors={THEME.gradNeon}
                    style={[styles.ringFill, { transform: [{ rotate: `${(overallPercent / 100) * 360}deg` }] }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <View style={styles.ringInner}>
                    <Text style={styles.ringPercent}>{overallPercent}%</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Stats pills */}
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statNumber}>{activeGoals.length}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={[styles.statNumber, { color: THEME.green }]}>{completedGoals.length}</Text>
                <Text style={styles.statLabel}>Done</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={[styles.statNumber, { color: THEME.accentNeon }]}>{goals.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>

      {/* ── BOTTOM: OVERLAPPING SHEET WITH GOAL CARDS ── */}
      <Animated.View style={[styles.bottomSheet, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.accentNeon} />}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Active Goals ── */}
          {activeGoals.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>🔥 Active Goals</Text>
              {activeGoals.map((goal) => {
                const pct = Math.min(Math.round(goal.progress_percent || 0), 100);
                const remaining = Math.max(0, Math.round(goal.target_amount - goal.saved_amount));
                return (
                  <View key={goal.id} style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                      <View style={styles.goalIconWrap}>
                        <Text style={styles.goalIconLarge}>{goal.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalName}>{goal.name}</Text>
                        <Text style={styles.goalRemaining}>₹{remaining.toLocaleString('en-IN')} remaining</Text>
                      </View>
                      <View style={styles.goalPercentBadge}>
                        <Text style={styles.goalPercentText}>{pct}%</Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarBg}>
                      <LinearGradient
                        colors={pct >= 100 ? THEME.gradGreen : THEME.gradNeon}
                        style={[styles.progressBarFill, { width: `${pct}%` }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </View>

                    <View style={styles.goalFooter}>
                      <Text style={styles.savedText}>₹{Math.round(goal.saved_amount).toLocaleString('en-IN')}</Text>
                      <Text style={styles.targetText}>₹{Math.round(goal.target_amount).toLocaleString('en-IN')}</Text>
                    </View>

                    {goal.deadline && (
                      <View style={styles.deadlinePill}>
                        <Ionicons name="time-outline" size={12} color={THEME.textMuted} />
                        <Text style={styles.deadlineText}>
                          {new Date(goal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                    )}

                    {goal.months_needed && (
                      <Text style={styles.etaText}>~{goal.months_needed} months to go</Text>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.addMoneyBtn}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddMoney(goal.id); setAddMoneyAmount(''); }}
                      >
                        <LinearGradient colors={THEME.gradPurple} style={styles.addMoneyGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                          <Ionicons name="wallet-outline" size={16} color="#fff" />
                          <Text style={styles.addMoneyText}>Add Money</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteGoal(goal.id, goal.name)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                      </TouchableOpacity>
                    </View>

                    {/* Inline Add Money Input */}
                    {showAddMoney === goal.id && (
                      <View style={styles.addMoneyInput}>
                        <TextInput
                          style={styles.moneyInput}
                          placeholder="₹ Enter amount"
                          placeholderTextColor={THEME.textMuted}
                          keyboardType="numeric"
                          value={addMoneyAmount}
                          onChangeText={(v) => setAddMoneyAmount(sanitizeAmount(v))}
                          autoFocus
                        />
                        <TouchableOpacity style={styles.moneyConfirm} onPress={() => handleAddMoney(goal.id)}>
                          <Ionicons name="checkmark" size={20} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.moneyCancel} onPress={() => setShowAddMoney(null)}>
                          <Ionicons name="close" size={20} color={THEME.textMuted} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
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
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>✅ Completed</Text>
              {completedGoals.map((goal) => (
                <View key={goal.id} style={[styles.goalCard, styles.completedCard]}>
                  <View style={styles.goalHeader}>
                    <View style={[styles.goalIconWrap, { backgroundColor: 'rgba(52, 211, 153, 0.16)', borderColor: 'rgba(52, 211, 153, 0.35)' }]}>
                      <Text style={styles.goalIconLarge}>{goal.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      <Text style={[styles.goalRemaining, { color: THEME.green }]}>🎉 Goal reached!</Text>
                    </View>
                    <Text style={styles.completedAmount}>₹{Math.round(goal.target_amount).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <LinearGradient
                      colors={THEME.gradGreen}
                      style={[styles.progressBarFill, { width: '100%' }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>

      {/* ── Add Goal Modal ── */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            {/* Modal handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Savings Goal</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => { setShowAddModal(false); resetForm(); }}
              >
                <Ionicons name="close" size={20} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>GOAL NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., iPhone 16 Pro"
              placeholderTextColor={THEME.textMuted}
              value={goalName}
              onChangeText={setGoalName}
              maxLength={100}
            />

            <Text style={styles.label}>TARGET AMOUNT (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 50000"
              placeholderTextColor={THEME.textMuted}
              keyboardType="numeric"
              value={goalTarget}
              onChangeText={(v) => setGoalTarget(sanitizeAmount(v))}
            />

            <Text style={styles.label}>ICON</Text>
            <View style={styles.iconGrid}>
              {GOAL_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconOption, goalIcon === icon && styles.iconOptionSelected]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setGoalIcon(icon); }}
                >
                  <Text style={{ fontSize: 24 }}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>DEADLINE (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={THEME.textMuted}
              value={goalDeadline}
              onChangeText={setGoalDeadline}
            />

            <GradientButton
              title="Create Goal"
              onPress={handleAddGoal}
              loading={submitting}
              colors={THEME.gradNeon}
              icon="🎯"
              style={{ marginTop: 24 }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bg,
  },

  // ── Top Section (Deep Purple panel with wave glow) ──
  topSection: {
    backgroundColor: THEME.topBg,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
    paddingBottom: 48,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    color: THEME.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },

  // ── Summary ──
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 20,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: 0.5,
  },
  summarySubtext: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },

  // ── Ring ──
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  ringOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(196, 181, 253, 0.4)',
  },
  ringFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 38,
    opacity: 0.35,
  },
  ringInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.topBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textPrimary,
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: '600',
  },

  // ── Bottom Sheet ──
  bottomSheet: {
    flex: 1,
    backgroundColor: THEME.sheetBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 26,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 16,
    letterSpacing: 0.3,
  },

  // ── Goal Card ──
  goalCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: 'rgba(52, 211, 153, 0.06)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(183, 148, 246, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(183, 148, 246, 0.25)',
  },
  goalIconLarge: { fontSize: 26 },
  goalName: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  goalRemaining: {
    color: THEME.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  goalPercentBadge: {
    backgroundColor: 'rgba(183, 148, 246, 0.18)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(183, 148, 246, 0.35)',
  },
  goalPercentText: {
    color: THEME.accentNeon,
    fontSize: 13,
    fontWeight: '800',
  },

  // ── Progress ──
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  savedText: {
    color: THEME.green,
    fontSize: 13,
    fontWeight: '700',
  },
  targetText: {
    color: THEME.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  deadlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  deadlineText: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  etaText: {
    color: THEME.textMuted,
    fontSize: 11,
    marginBottom: 10,
  },

  // ── Actions ──
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  addMoneyBtn: {
    flex: 1,
  },
  addMoneyGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 18,
    gap: 6,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  addMoneyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
  },
  addMoneyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  moneyInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 13,
    color: THEME.textPrimary,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: THEME.accentNeon + '60',
  },
  moneyConfirm: {
    backgroundColor: THEME.primary,
    width: 42,
    height: 42,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  moneyCancel: {
    width: 42,
    height: 42,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  completedAmount: {
    color: THEME.green,
    fontSize: 16,
    fontWeight: '800',
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 30, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.sheetBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 25,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: THEME.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    padding: 15,
    color: THEME.textPrimary,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: THEME.cardBorder,
    fontWeight: '500',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1.5,
    borderColor: THEME.cardBorder,
  },
  iconOptionSelected: {
    borderColor: THEME.accentNeon,
    backgroundColor: 'rgba(183, 148, 246, 0.22)',
    shadowColor: THEME.primary,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
});
