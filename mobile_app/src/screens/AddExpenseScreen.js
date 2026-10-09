/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — ADD EXPENSE SCREEN (ENHANCED)
 * Category icons with colors, date picker, premium animations
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, ActivityIndicator, Image, StyleSheet, Dimensions, Platform, Alert, Animated, FlatList, Modal, Switch, Pressable, Keyboard, SectionList, DeviceEventEmitter, RefreshControl, Linking, LayoutAnimation, UIManager } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { GradientButton } from '../components/SharedComponents';
import { useFocusEffect } from '@react-navigation/native';













import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import api from '../api/config';
import { sanitizeInput, sanitizeAmount } from '../utils/auth';
import { COLORS, RADIUS } from '../utils/theme';

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

  const [amount, setAmount] = useState(
    expense.amount 
      ? expense.amount.toString() 
      : (route?.params?.prefillAmount ? route.params.prefillAmount.toString() : '')
  );
  const [category, setCategory] = useState(
    expense.category || route?.params?.prefillCategory || 'food'
  );
  const [description, setDescription] = useState(
    expense.description || route?.params?.prefillDescription || ''
  );
  const [expDate, setExpDate] = useState(expense.date ? expense.date.split('T')[0] : TODAY);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true })
      ]).start();
    }, [])
  );
  const [locationLoading, setLocationLoading] = useState(false);

  const handleTagLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const place = geocode[0];
        const locName = place.name || place.street || place.city || place.region;
        if (locName) {
          setDescription((prev) => prev ? `${prev} (at ${locName})` : `Expense at ${locName}`);
        }
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Could not fetch location');
    } finally {
      setLocationLoading(false);
    }
  };

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
        [{ 
          text: 'OK', 
          onPress: () => {
            navigation.navigate('DashboardMain');
          } 
        }]
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

      {/* ── MASSIVE DYNAMIC GLOWING ORB BACKGROUND ── */}
      <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]}>
        <Animated.View style={{
          position: 'absolute',
          top: -150,
          left: -100,
          right: -100,
          height: 400,
          backgroundColor: selectedCat.color,
          opacity: 0.15,
          borderRadius: 400,
          transform: [{ scaleX: 1.5 }],
        }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.replace('DashboardMain');
                }
              }} 
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Add Expense</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* ── Amount Input ── */}
          <LinearGradient 
            colors={[selectedCat.color + '22', selectedCat.color + '05']}
            style={[styles.amountSection, { borderColor: selectedCat.color + '44' }]}
          >
            <Text style={[styles.amountLabel, { color: selectedCat.color }]}>HOW MUCH?</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.rupee, { color: selectedCat.color }]}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                value={amount}
                onChangeText={(v) => setAmount(sanitizeAmount(v))}
                keyboardType="numeric"
                autoFocus
              />
              {amount ? (
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAmount('');
                  }} 
                  style={styles.clearAmountBtn}
                >
                  <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Quick Amount Presets */}
            <View style={styles.presetRow}>
              {[50, 100, 200, 500, 1000].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.presetChip, { borderColor: selectedCat.color + '60', backgroundColor: selectedCat.color + '15' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const current = parseFloat(amount) || 0;
                    setAmount(String(current + val));
                  }}
                >
                  <Text style={[styles.presetText, { color: selectedCat.color }]}>+₹{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>

          {/* ── Description ── */}
          <View style={styles.fieldGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.label}>DESCRIPTION</Text>
              <TouchableOpacity onPress={handleTagLocation} disabled={locationLoading}>
                {locationLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 8 }} />
                ) : (
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>📍 Auto-Tag Location</Text>
                )}
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { borderColor: selectedCat.color + '40', backgroundColor: selectedCat.color + '05' }]}
              placeholder="What was this for?"
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              maxLength={255}
            />
          </View>

          {/* ── Date ── */}
          <View style={styles.fieldGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.label, { marginBottom: 0 }]}>DATE</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setExpDate(TODAY);
                  }}
                  style={[styles.dateChip, expDate === TODAY && { backgroundColor: selectedCat.color + '33', borderColor: selectedCat.color }]}
                >
                  <Text style={[styles.dateChipText, expDate === TODAY && { color: selectedCat.color, fontWeight: '700' }]}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setExpDate(y.toISOString().split('T')[0]);
                  }}
                  style={[styles.dateChip, expDate !== TODAY && { backgroundColor: selectedCat.color + '33', borderColor: selectedCat.color }]}
                >
                  <Text style={[styles.dateChipText, expDate !== TODAY && { color: selectedCat.color, fontWeight: '700' }]}>Yesterday</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={[styles.input, { borderColor: selectedCat.color + '40', backgroundColor: selectedCat.color + '05' }]}
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
                      shadowColor: cat.color,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.5,
                      shadowRadius: 10,
                      elevation: 8,
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
        </Animated.View>
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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: RADIUS.xl,
    padding: 32,
    marginBottom: 32,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
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
    position: 'relative',
    justifyContent: 'center',
    width: '100%',
  },
  rupee: {
    color: COLORS.primary,
    fontSize: 48,
    fontWeight: '600',
    marginRight: 6,
  },
  amountInput: {
    color: COLORS.textPrimary,
    fontSize: 64,
    fontWeight: '800',
    minWidth: 120,
    textAlign: 'center',
  },
  clearAmountBtn: {
    position: 'absolute',
    right: 8,
    padding: 4,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full || 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  presetText: {
    color: COLORS.cyan || '#06B6D4',
    fontSize: 12,
    fontWeight: '600',
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full || 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  dateChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: COLORS.primary,
  },
  dateChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  dateChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
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
