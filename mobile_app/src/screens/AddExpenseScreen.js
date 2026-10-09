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

const getLocalDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};
const TODAY = getLocalDate();

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
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── TOP HALF: MASSIVE DYNAMIC GLOWING BACKGROUND & AMOUNT ── */}
      <View style={[styles.topHalf, { backgroundColor: selectedCat.color + '10' }]}>
        <Animated.View style={{
          position: 'absolute',
          top: -100,
          left: -50,
          right: -50,
          height: 350,
          backgroundColor: selectedCat.color,
          opacity: 0.25,
          borderRadius: 300,
          transform: [{ scaleX: 1.5 }],
        }} />

        <SafeAreaView>
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
            <Text style={styles.headerTitle}>New Expense</Text>
            <View style={{ width: 36 }} />
          </View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.amountContainer}>
              <Text style={[styles.rupee, { color: selectedCat.color }]}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={COLORS.textSecondary}
                value={amount}
                onChangeText={(v) => setAmount(sanitizeAmount(v))}
                keyboardType="numeric"
                autoFocus
                selectionColor={selectedCat.color}
              />
            </View>

            <View style={styles.presetRow}>
              {[50, 100, 200, 500, 1000].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.presetChip, { backgroundColor: selectedCat.color + '20' }]}
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
          </Animated.View>
        </SafeAreaView>
      </View>

      {/* ── BOTTOM HALF: OVERLAPPING SHEET ── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View style={[styles.bottomSheet, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
            
            {/* ── Category Horizontal Scroll ── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryCard,
                      category === cat.key && { backgroundColor: cat.color + '20', borderColor: cat.color, borderWidth: 1.5, shadowColor: cat.color, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }
                    ]}
                    onPress={() => setCategory(cat.key)}
                  >
                    <Text style={styles.catEmoji}>{cat.icon}</Text>
                    <Text style={[styles.catLabel, category === cat.key && { color: cat.color, fontWeight: '700' }]} numberOfLines={1} adjustsFontSizeToFit>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Description ── */}
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.label}>DESCRIPTION</Text>
                <TouchableOpacity onPress={handleTagLocation} disabled={locationLoading}>
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 8 }} />
                  ) : (
                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>📍 Tag Location</Text>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { borderColor: selectedCat.color + '40', backgroundColor: selectedCat.color + '05' }]}
                placeholder="What did you buy?"
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
                maxLength={255}
                selectionColor={selectedCat.color}
              />
            </View>

            {/* ── Date ── */}
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.label, { marginBottom: 0 }]}>DATE</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity 
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpDate(TODAY); }}
                    style={[styles.dateChip, expDate === TODAY && { backgroundColor: selectedCat.color + '33', borderColor: selectedCat.color }]}
                  >
                    <Text style={[styles.dateChipText, expDate === TODAY && { color: selectedCat.color, fontWeight: '700' }]}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const y = new Date(); y.setDate(y.getDate() - 1); setExpDate(y.toISOString().split('T')[0]);
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
                selectionColor={selectedCat.color}
              />
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* ── Absolute Save Button ── */}
          <View style={styles.footer}>
            <GradientButton
              title="Save Expense"
              onPress={handleAddExpense}
              loading={loading}
              colors={[selectedCat.color, selectedCat.color + 'CC']}
              icon={selectedCat.icon}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topHalf: {
    paddingTop: Platform.OS === 'android' ? 30 : 0,
    paddingBottom: 60,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  rupee: {
    fontSize: 48,
    fontWeight: '600',
    marginRight: 8,
    marginTop: 8,
  },
  amountInput: {
    color: COLORS.textPrimary,
    fontSize: 72,
    fontWeight: '800',
    minWidth: 150,
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    position: 'relative',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 32,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryCard: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  catEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  catLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    padding: 16,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  dateChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  }
});
