/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — ADD EXPENSE SCREEN (ENHANCED)
 * Category icons with colors, date picker, premium animations
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView, Platform,
  ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../api/config';
import { sanitizeInput, sanitizeAmount } from '../utils/auth';
import { COLORS, CAT_COLORS, CAT_ICONS, RADIUS, SHADOW } from '../utils/theme';
import { GradientButton } from '../components/SharedComponents';

const CATEGORIES = [
  { key: 'food', label: 'Food', icon: '🍜', color: '#6c5ce7' },
  { key: 'transport', label: 'Transport', icon: '🚗', color: '#00cec9' },
  { key: 'shopping', label: 'Shopping', icon: '🛍️', color: '#fd79a8' },
  { key: 'health', label: 'Health', icon: '💊', color: '#00b894' },
  { key: 'entertainment', label: 'Fun', icon: '🎬', color: '#fdcb6e' },
  { key: 'education', label: 'Education', icon: '📚', color: '#74b9ff' },
  { key: 'utilities', label: 'Utilities', icon: '⚡', color: '#a29bfe' },
  { key: 'other', label: 'Other', icon: '📦', color: '#dfe6e9' },
];

const TODAY = new Date().toISOString().split('T')[0];

export default function AddExpenseScreen({ route, navigation }) {
  const isEdit = route?.params?.expense ? true : false;
  const expense = route?.params?.expense || {};

  const [amount, setAmount] = useState(expense.amount ? expense.amount.toString() : '');
  const [category, setCategory] = useState(expense.category || 'other');
  const [description, setDescription] = useState(expense.description || '');
  const [expDate, setExpDate] = useState(expense.date ? expense.date.split('T')[0] : TODAY);
  const [loading, setLoading] = useState(false);

  const handleAddExpense = async () => {
    const cleanAmount = sanitizeAmount(amount);
    if (!cleanAmount || isNaN(cleanAmount) || parseFloat(cleanAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (isEdit) {
        res = await api.post(`/edit-expense/${expense.id}/`, {
          amount: parseFloat(cleanAmount),
          category: category,
          description: sanitizeInput(description),
          date: expDate || TODAY,
        });
      } else {
        res = await api.post('/quick-add/', {
          amount: parseFloat(cleanAmount),
          category: category,
          description: sanitizeInput(description),
          date: expDate || TODAY,
        });
      }

      Alert.alert(
        isEdit ? '✅ Expense Updated!' : '✅ Expense Saved!',
        res.data?.message || `₹${parseFloat(cleanAmount).toLocaleString('en-IN')} for ${category}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.key === category) || CATEGORIES[7];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Add Expense</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* ── Amount Input ── */}
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>HOW MUCH?</Text>
            <View style={styles.amountRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                value={amount}
                onChangeText={(v) => setAmount(sanitizeAmount(v))}
                keyboardType="numeric"
                autoFocus
              />
            </View>
          </View>

          {/* ── Description ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput
              style={styles.input}
              placeholder="What was this for?"
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              maxLength={255}
            />
          </View>

          {/* ── Date ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>DATE</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={expDate}
              onChangeText={setExpDate}
            />
          </View>

          {/* ── Category ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CATEGORY</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryCard,
                    category === cat.key && {
                      borderColor: cat.color,
                      backgroundColor: cat.color + '18',
                    },
                  ]}
                  onPress={() => setCategory(cat.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.catEmoji}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.catLabel,
                      category === cat.key && { color: cat.color },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Save Button ── */}
          <GradientButton
            title="Save Expense"
            onPress={handleAddExpense}
            loading={loading}
            colors={[selectedCat.color, selectedCat.color + 'CC']}
            icon={selectedCat.icon}
            style={{ marginTop: 24, marginBottom: 40 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary },

  // ── Amount ──
  amountSection: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
  },
  amountLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rupee: {
    color: COLORS.primary,
    fontSize: 36,
    fontWeight: '600',
    marginRight: 4,
  },
  amountInput: {
    color: COLORS.textPrimary,
    fontSize: 48,
    fontWeight: 'bold',
    minWidth: 100,
    textAlign: 'center',
  },

  // ── Fields ──
  fieldGroup: { marginBottom: 18 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: 16,
    color: COLORS.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ── Category Grid ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '23%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  catEmoji: { fontSize: 24, marginBottom: 6 },
  catLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});
