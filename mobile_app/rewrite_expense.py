import json

content = """/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — ADD EXPENSE SCREEN (CALCULATOR UI)
 * Ultra-premium, custom numpad, incredibly handy
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, StyleSheet, Platform, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import api from '../api/config';
import { sanitizeInput } from '../utils/auth';
import { COLORS } from '../utils/theme';

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

const getLocalDate = (daysOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};
const TODAY = getLocalDate(0);
const YESTERDAY = getLocalDate(-1);

export default function AddExpenseScreen({ route, navigation }) {
  const isEdit = route?.params?.expense ? true : false;
  const expense = route?.params?.expense || {};

  const [amount, setAmount] = useState(
    expense.amount 
      ? expense.amount.toString() 
      : (route?.params?.prefillAmount ? route.params.prefillAmount.toString() : '0')
  );
  const [category, setCategory] = useState(
    expense.category || route?.params?.prefillCategory || 'food'
  );
  const [description, setDescription] = useState(
    expense.description || route?.params?.prefillDescription || ''
  );
  const [expDate, setExpDate] = useState(expense.date ? expense.date.split('T')[0] : TODAY);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

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
      Alert.alert('Error', 'Could not fetch location');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Wait!', 'Please enter an amount greater than 0');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (isEdit) {
        res = await api.post(`/edit-expense/${expense.id}/`, {
          amount: parseFloat(amount),
          category: category,
          description: sanitizeInput(description),
          date: expDate || TODAY,
        });
      } else {
        res = await api.post('/quick-add/', {
          amount: parseFloat(amount),
          category: category,
          description: sanitizeInput(description),
          date: expDate || TODAY,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        isEdit ? '✅ Expense Updated!' : '✅ Expense Saved!',
        res.data?.message || `₹${parseFloat(amount).toLocaleString('en-IN')} for ${category}`,
        [{ 
          text: 'Awesome', 
          onPress: () => navigation.navigate('DashboardMain')
        }]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === '⌫') {
      setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (key === '.') {
      if (!amount.includes('.')) setAmount((prev) => prev + '.');
    } else {
      setAmount((prev) => (prev === '0' ? key : prev + key));
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.key === category) || CATEGORIES[7];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.replace('DashboardMain');
            }} 
            style={styles.backBtn}
          >
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Expense' : 'New Expense'}</Text>
          <View style={{ width: 36 }} />
        </View>

        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* ── TOP SECTION: AMOUNT DISPLAY ── */}
          <View style={styles.amountSection}>
            <Text style={[styles.currencyLabel, { color: selectedCat.color }]}>₹</Text>
            <Text style={[styles.amountValue, { color: amount === '0' ? COLORS.textMuted : COLORS.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
              {amount}
            </Text>
          </View>

          {/* ── MIDDLE SECTION: INPUTS ── */}
          <View style={styles.middleSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.catPill,
                    category === cat.key && { backgroundColor: cat.color + '25', borderColor: cat.color }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setCategory(cat.key);
                  }}
                >
                  <Text style={styles.catEmoji}>{cat.icon}</Text>
                  <Text style={[styles.catLabel, category === cat.key && { color: cat.color, fontWeight: '800' }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.detailsRow}>
              <View style={styles.descInputContainer}>
                <Ionicons name="pencil" size={16} color={selectedCat.color} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.descInput}
                  placeholder="What was this for?"
                  placeholderTextColor={COLORS.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={100}
                />
              </View>
              <TouchableOpacity onPress={handleTagLocation} style={styles.locBtn}>
                {locationLoading ? <ActivityIndicator size="small" color={selectedCat.color} /> : <Ionicons name="location-outline" size={20} color={selectedCat.color} />}
              </TouchableOpacity>
            </View>

            <View style={styles.dateRow}>
              <TouchableOpacity 
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpDate(TODAY); }}
                style={[styles.dateChip, expDate === TODAY && { backgroundColor: selectedCat.color + '25', borderColor: selectedCat.color }]}
              >
                <Text style={[styles.dateChipText, expDate === TODAY && { color: selectedCat.color, fontWeight: '700' }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpDate(YESTERDAY); }}
                style={[styles.dateChip, expDate === YESTERDAY && { backgroundColor: selectedCat.color + '25', borderColor: selectedCat.color }]}
              >
                <Text style={[styles.dateChipText, expDate === YESTERDAY && { color: selectedCat.color, fontWeight: '700' }]}>Yesterday</Text>
              </TouchableOpacity>
              <View style={[styles.customDateChip, { borderColor: COLORS.borderLight }]}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                <TextInput
                  style={styles.dateInput}
                  value={expDate}
                  onChangeText={setExpDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>
          </View>

          {/* ── BOTTOM SECTION: CUSTOM NUMPAD ── */}
          <View style={styles.numpadContainer}>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['.', '0', '⌫']].map((row, rowIndex) => (
              <View key={rowIndex} style={styles.numpadRow}>
                {row.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={styles.numpadKey}
                    onPress={() => handleKeyPress(key)}
                  >
                    {key === '⌫' ? (
                      <Ionicons name="backspace-outline" size={28} color={COLORS.textPrimary} />
                    ) : (
                      <Text style={styles.numpadKeyText}>{key}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: selectedCat.color }]}
              onPress={handleAddExpense}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>{isEdit ? 'SAVE CHANGES' : 'ADD EXPENSE'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 10 },
  backBtn: { padding: 4 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  
  amountSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  currencyLabel: {
    fontSize: 40,
    fontWeight: '800',
    marginRight: 8,
    marginTop: -10,
  },
  amountValue: {
    fontSize: 70,
    fontWeight: '900',
    letterSpacing: -2,
  },

  middleSection: {
    paddingVertical: 20,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 20,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  catEmoji: { fontSize: 20, marginRight: 8 },
  catLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },

  detailsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  descInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  descInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  locBtn: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  dateRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  dateChipText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  customDateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  numpadContainer: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  numpadKey: {
    width: '30%',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
  },
  numpadKeyText: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '600',
  },
  submitBtn: {
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
"""

with open("src/screens/AddExpenseScreen.js", "w") as f:
    f.write(content)
