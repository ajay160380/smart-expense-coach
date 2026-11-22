/**
 * ═══════════════════════════════════════════════════════════════
 * PAISAMITRA — "CAN I AFFORD THIS?" AI IMPULSE BUY SIMULATOR
 * Luxury Fintech modal simulating real-time budget impact,
 * before-and-after daily safe allowances, and AI coach verdict.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import api from '../api/config';
import { useTheme } from '../context/ThemeContext';
import { addExpenseOfflineFirst } from '../utils/offlineSync';

const QUICK_CHIPS = [
  { label: '₹500', value: '500' },
  { label: '₹1,500', value: '1500' },
  { label: '₹3,500', value: '3500' },
  { label: '₹8,000', value: '8000' },
  { label: '₹15,000', value: '15000' },
];

export default function AffordabilitySimulatorModal({
  visible,
  onClose,
  navigation,
  initialAmount = '',
  initialItemName = '',
}) {
  const { isDark, colors } = useTheme();

  const [itemName, setItemName] = useState(initialItemName);
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [addingExpense, setAddingExpense] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialItemName) setItemName(initialItemName);
      if (initialAmount) setAmount(String(initialAmount));
      if (initialAmount && parseFloat(initialAmount) > 0) {
        handleSimulate(String(initialAmount), initialItemName);
      }
    } else {
      setResult(null);
      setLoading(false);
    }
  }, [visible, initialAmount, initialItemName]);

  const handleSimulate = async (customAmt = null, customName = null) => {
    const rawAmt = customAmt !== null ? customAmt : amount;
    const numAmt = parseFloat(String(rawAmt).replace(/[^0-9.]/g, ''));

    if (!numAmt || numAmt <= 0) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (e) {}
      Alert.alert('Invalid Amount', 'Please enter a valid purchase amount greater than ₹0.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    setLoading(true);
    try {
      const payload = {
        amount: numAmt,
        item_name: (customName !== null ? customName : itemName).trim() || 'This purchase',
      };
      const res = await api.post('/api/affordability-simulator/', payload);
      if (res.data?.status === 'success') {
        setResult(res.data);
        try {
          if (res.data.verdict === 'safe') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else if (res.data.verdict === 'danger') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        } catch (e) {}
      } else {
        Alert.alert('Simulation Error', res.data?.error || 'Unable to simulate affordability right now.');
      }
    } catch (err) {
      console.warn('[AffordabilitySimulator] Error:', err);
      // Fast client-side fallback if server is unreachable
      const numBudget = 20000;
      const daysLeft = 15;
      const currentDaily = Math.round(numBudget / 30);
      const afterRemaining = numBudget - numAmt;
      const newDaily = Math.max(0, Math.round(afterRemaining / daysLeft));
      const verdict = afterRemaining < 0 ? 'danger' : newDaily < currentDaily * 0.5 ? 'caution' : 'safe';
      
      setResult({
        status: 'success',
        verdict,
        badge: verdict === 'safe' ? 'Safe to Buy ✅' : verdict === 'caution' ? 'Think Twice ⚠️' : 'Budget Danger 🚨',
        color: verdict === 'safe' ? '#10B981' : verdict === 'caution' ? '#F59E0B' : '#EF4444',
        score: verdict === 'safe' ? 82 : verdict === 'caution' ? 45 : 15,
        amount: numAmt,
        item_name: itemName || 'This item',
        current_daily_allowance: currentDaily,
        new_daily_allowance: newDaily,
        daily_drop: Math.max(0, currentDaily - newDaily),
        remaining_after: afterRemaining,
        days_remaining: daysLeft,
        advice:
          verdict === 'safe'
            ? `Guilt-free purchase! You will still have ₹${newDaily}/day for the remaining ${daysLeft} days.`
            : verdict === 'caution'
            ? `This purchase will cut your daily allowance by ₹${Math.max(0, currentDaily - newDaily)}/day. Sleep on it!`
            : `Exceeds your safe spending range. Postponing this impulse buy is highly recommended!`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogAsExpense = async () => {
    if (!result || addingExpense) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    setAddingExpense(true);
    try {
      await addExpenseOfflineFirst({
        amount: result.amount,
        category: 'shopping',
        description: result.item_name || 'Impulse Buy',
        payment_mode: 'UPI',
      });
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
      Alert.alert(
        'Expense Recorded ⚡',
        `₹${result.amount.toLocaleString('en-IN')} for "${result.item_name}" has been logged in 0ms!`,
        [
          {
            text: 'Awesome',
            onPress: () => {
              onClose();
            },
          },
        ]
      );
    } catch (err) {
      console.warn('[Affordability] Log expense error:', err);
      Alert.alert('Error', 'Failed to record expense. Please try again.');
    } finally {
      setAddingExpense(false);
    }
  };

  const handleResistImpulse = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
    Alert.alert(
      'Impulse Resisted! 🏆',
      `Smart choice! You just saved ₹${(result?.amount || parseFloat(amount) || 0).toLocaleString('en-IN')} towards your future peace of mind.`,
      [{ text: 'High Five! ✋', onPress: onClose }]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.sheetContainer, isDark && styles.sheetContainerDark]}>
          {/* Top Drag Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <LinearGradient
                colors={['#2563EB', '#7C3AED']}
                style={styles.iconCircle}
              >
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={[styles.headerTitle, isDark && { color: '#F8FAFC' }]}>
                  Can I Afford This?
                </Text>
                <Text style={[styles.headerSubtitle, isDark && { color: '#94A3B8' }]}>
                  AI Impulse-Buy & Budget Impact Simulator
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, isDark && styles.closeBtnDark]}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={isDark ? '#CBD5E1' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Input: Item Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>
                WHAT ARE YOU EYEING?
              </Text>
              <TextInput
                style={[styles.textInput, isDark && styles.textInputDark]}
                placeholder="e.g. Sony Headphones, Sneakers, Goa trip"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={itemName}
                onChangeText={setItemName}
                maxLength={60}
              />
            </View>

            {/* Input: Amount */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>
                HOW MUCH DOES IT COST?
              </Text>
              <View style={[styles.amountInputRow, isDark && styles.amountInputRowDark]}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={[styles.amountInput, isDark && { color: '#FFFFFF' }]}
                  placeholder="0"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  value={amount}
                  onChangeText={(val) => {
                    setAmount(val);
                    if (result) setResult(null); // Clear previous result on change
                  }}
                  keyboardType="numeric"
                  maxLength={9}
                />
              </View>
            </View>

            {/* Quick Chips */}
            <View style={styles.chipsRow}>
              {QUICK_CHIPS.map((chip) => {
                const isSelected = amount === chip.value;
                return (
                  <TouchableOpacity
                    key={chip.value}
                    style={[
                      styles.chip,
                      isDark && styles.chipDark,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => {
                      setAmount(chip.value);
                      handleSimulate(chip.value);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isDark && styles.chipTextDark,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Simulate Button */}
            {!result && (
              <TouchableOpacity
                style={[styles.simulateBtn, loading && { opacity: 0.8 }]}
                onPress={() => handleSimulate()}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.simulateGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.simulateBtnText}>Simulate Impact</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Result Breakdown Card */}
            {result && (
              <View style={[styles.resultCard, isDark && styles.resultCardDark]}>
                {/* Traffic Light Verdict Badge */}
                <View style={styles.verdictHeader}>
                  <View
                    style={[
                      styles.verdictBadge,
                      { backgroundColor: `${result.color}20`, borderColor: result.color },
                    ]}
                  >
                    <View style={[styles.verdictDot, { backgroundColor: result.color }]} />
                    <Text style={[styles.verdictBadgeText, { color: result.color }]}>
                      {result.badge}
                    </Text>
                  </View>

                  <View style={styles.scoreContainer}>
                    <Text style={[styles.scoreLabel, isDark && { color: '#94A3B8' }]}>
                      Budget Health
                    </Text>
                    <Text style={[styles.scoreValue, { color: result.color }]}>
                      {result.score}/100
                    </Text>
                  </View>
                </View>

                {/* Score Progress Bar */}
                <View style={[styles.scoreTrack, isDark && styles.scoreTrackDark]}>
                  <View
                    style={[
                      styles.scoreFill,
                      {
                        width: `${Math.max(5, Math.min(100, result.score))}%`,
                        backgroundColor: result.color,
                      },
                    ]}
                  />
                </View>

                {/* Daily Safe Spend Delta */}
                <View style={[styles.deltaCard, isDark && styles.deltaCardDark]}>
                  <Text style={[styles.deltaSectionTitle, isDark && { color: '#64748B' }]}>
                    DAILY SAFE ALLOWANCE IMPACT ({result.days_remaining} DAYS LEFT)
                  </Text>
                  <View style={styles.deltaMetricsRow}>
                    <View style={styles.deltaCol}>
                      <Text style={[styles.deltaSubLabel, isDark && { color: '#94A3B8' }]}>
                        Currently
                      </Text>
                      <Text style={[styles.deltaValNow, isDark && { color: '#F1F5F9' }]}>
                        ₹{Math.round(result.current_daily_allowance).toLocaleString('en-IN')}/day
                      </Text>
                    </View>

                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color={isDark ? '#64748B' : '#94A3B8'}
                      style={{ marginTop: 14 }}
                    />

                    <View style={styles.deltaCol}>
                      <Text style={[styles.deltaSubLabel, isDark && { color: '#94A3B8' }]}>
                        After Purchase
                      </Text>
                      <Text style={[styles.deltaValNew, { color: result.color }]}>
                        ₹{Math.round(result.new_daily_allowance).toLocaleString('en-IN')}/day
                      </Text>
                    </View>
                  </View>

                  {result.daily_drop > 0 && (
                    <View style={styles.dropPill}>
                      <Ionicons name="trending-down" size={13} color="#EF4444" />
                      <Text style={styles.dropPillText}>
                        Drops by ₹{Math.round(result.daily_drop).toLocaleString('en-IN')}/day
                      </Text>
                    </View>
                  )}
                </View>

                {/* AI Financial Coach Advice */}
                <View style={[styles.aiCoachBox, isDark && styles.aiCoachBoxDark]}>
                  <View style={styles.aiCoachHeader}>
                    <Ionicons name="bulb" size={16} color="#F59E0B" />
                    <Text style={[styles.aiCoachTitle, isDark && { color: '#F8FAFC' }]}>
                      PaisaMitra Coach Insight
                    </Text>
                  </View>
                  <Text style={[styles.aiCoachText, isDark && { color: '#CBD5E1' }]}>
                    {result.advice}
                  </Text>
                </View>

                {/* Actions Footer */}
                <View style={styles.actionButtonsCol}>
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, addingExpense && { opacity: 0.7 }]}
                    onPress={handleLogAsExpense}
                    disabled={addingExpense}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={result.verdict === 'danger' ? ['#DC2626', '#B91C1C'] : ['#10B981', '#059669']}
                      style={styles.primaryActionGradient}
                    >
                      {addingExpense ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.primaryActionText}>
                            {result.verdict === 'danger' ? 'Buy Anyway & Log' : 'Buy It & Log in 0ms'}
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryActionBtn, isDark && styles.secondaryActionBtnDark]}
                    onPress={handleResistImpulse}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="shield-checkmark" size={16} color="#2563EB" style={{ marginRight: 6 }} />
                    <Text style={styles.secondaryActionText}>Resist Impulse (Save ₹{result.amount})</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetContainerDark: {
    backgroundColor: '#0F172A',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 1,
  },
  handleBar: {
    width: 44,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnDark: {
    backgroundColor: '#1E293B',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  inputGroup: {
    marginTop: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  textInputDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#F8FAFC',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  amountInputRowDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextDark: {
    color: '#94A3B8',
  },
  chipTextSelected: {
    color: '#2563EB',
  },
  simulateBtn: {
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  simulateGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  simulateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  resultCard: {
    marginTop: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  resultCardDark: {
    backgroundColor: '#161F30',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  verdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  verdictDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  verdictBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  scoreTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  scoreTrackDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 3,
  },
  deltaCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deltaCardDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  deltaSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  deltaMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deltaCol: {
    flex: 1,
  },
  deltaSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  deltaValNow: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  deltaValNew: {
    fontSize: 15,
    fontWeight: '800',
  },
  dropPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 10,
  },
  dropPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  aiCoachBox: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aiCoachBoxDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderLeftColor: '#F59E0B',
  },
  aiCoachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiCoachTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  aiCoachText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
  },
  actionButtonsCol: {
    marginTop: 16,
    gap: 10,
  },
  primaryActionBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryActionGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryActionBtnDark: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
});
