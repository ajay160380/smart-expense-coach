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
import * as ImagePicker from 'expo-image-picker';
import api from '../api/config';
import { sanitizeInput, sanitizeAmount } from '../utils/auth';
import { validateAmount } from '../utils/validation';
import { formatApiError } from '../utils/errors';
import analytics from '../utils/analytics';
import { addExpenseOfflineFirst, deleteExpenseOfflineFirst } from '../utils/offlineSync';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';
import { useTheme } from '../theme/ThemeContext';

const CATEGORIES = [
  { key: 'food', label: 'Food', icon: '🍜', color: '#F97316' },
  { key: 'transport', label: 'Transport', icon: '🚗', color: '#06B6D4' },
  { key: 'shopping', label: 'Shopping', icon: '🛍️', color: '#EC4899' },
  { key: 'health', label: 'Health', icon: '💊', color: '#10B981' },
  { key: 'entertainment', label: 'Fun', icon: '🎬', color: '#8B5CF6' },
  { key: 'education', label: 'Education', icon: '📚', color: '#3B82F6' },
  { key: 'utilities', label: 'Utilities', icon: '⚡', color: '#EAB308' },
  { key: 'other', label: 'Other', icon: '📦', color: '#64748B' },
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
  const { isDark, colors } = useTheme();
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
  const [receiptImage, setReceiptImage] = useState(expense.receipt_image || null);

  const handlePickReceipt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Attach Bill or Receipt',
      'Select image source:',
      [
        {
          text: '📷 Take Photo',
          onPress: async () => {
            try {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) {
                Alert.alert('Permission Needed', 'Camera permission is required to capture your bill or receipt.');
                return;
              }
              const res = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.7,
              });
              if (!res.canceled && res.assets && res.assets.length > 0) {
                setReceiptImage(res.assets[0].uri);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (err) {
              console.log('Camera error:', err);
            }
          },
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: async () => {
            try {
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.7,
              });
              if (!res.canceled && res.assets && res.assets.length > 0) {
                setReceiptImage(res.assets[0].uri);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (err) {
              console.log('Gallery error:', err);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

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
    const amountVal = validateAmount(cleanAmount);
    if (!amountVal.isValid) {
      Alert.alert('Validation Error', amountVal.error);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(cleanAmount),
        category: category,
        description: sanitizeInput(description),
        date: expDate || TODAY,
        receipt_image: receiptImage || null,
      };

      if (receiptImage) {
        try {
          await AsyncStorage.setItem(`@expense_receipt_${isEdit ? expense.id : 'last'}`, receiptImage);
        } catch (e) {}
      }

      if (isEdit) {
        await api.post(`/api/edit-expense/${expense.id}/`, payload);
        DeviceEventEmitter.emit('EXPENSE_UPDATED');
      } else {
        await addExpenseOfflineFirst(payload);
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      try {
        analytics.track(isEdit ? 'expense_updated' : 'expense_created', {
          amount: parseFloat(cleanAmount),
          category,
          has_description: !!description,
        });
      } catch (e) {}

      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home', { screen: 'DashboardMain' });
      }
    } catch (error) {
      console.error('AddExpense Save Error:', error);
      Alert.alert('Save Failed', formatApiError(error, 'Could not save expense. Please check your connection.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = () => {
    if (!expense?.id) return;
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete this expense of ₹${parseFloat(amount || 0).toLocaleString('en-IN')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {}
            await deleteExpenseOfflineFirst(expense.id);
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home', { screen: 'DashboardMain' });
            }
          }
        }
      ]
    );
  };

  const selectedCat = CATEGORIES.find((c) => c.key === category) || CATEGORIES[7];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

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
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Home', { screen: 'DashboardMain' });
                }
              }} 
              style={[styles.backBtn, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="close" size={26} color={isDark ? colors.textPrimary : COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, isDark && { color: colors.textPrimary }]}>
              {isEdit ? 'Edit Expense' : 'New Expense'}
            </Text>
            {isEdit ? (
              <TouchableOpacity
                onPress={handleDeleteExpense}
                disabled={loading}
                style={[styles.deleteHeaderBtn, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.18)' }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handlePickReceipt}
                style={[
                  styles.headerReceiptBtn,
                  isDark && { backgroundColor: colors.surface, borderColor: colors.border },
                  receiptImage && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={receiptImage ? "checkmark-circle" : "camera-outline"}
                  size={16}
                  color={receiptImage ? "#10B981" : (isDark ? colors.textPrimary : COLORS.textPrimary)}
                />
                <Text style={[
                  styles.headerReceiptText,
                  isDark && { color: colors.textPrimary },
                  receiptImage && { color: '#10B981', fontWeight: '700' }
                ]}>
                  {receiptImage ? "Receipt ✓" : "+ Bill"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.amountContainer}>
              <Text style={[styles.rupee, { color: selectedCat.color }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, isDark && { color: colors.textPrimary }]}
                placeholder="0"
                placeholderTextColor={isDark ? colors.textSecondary : COLORS.textSecondary}
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
        <Animated.View style={[styles.bottomSheet, isDark && { backgroundColor: colors.surface }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
            
            {/* ── Category Horizontal Scroll ── */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, isDark && { color: colors.textSecondary }]}>CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryCard,
                      isDark && { backgroundColor: colors.bgElevated, borderColor: colors.border },
                      category === cat.key && { backgroundColor: cat.color + '20', borderColor: cat.color, borderWidth: 1.5, shadowColor: cat.color, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }
                    ]}
                    onPress={() => setCategory(cat.key)}
                  >
                    <Text style={styles.catEmoji}>{cat.icon}</Text>
                    <Text style={[styles.catLabel, isDark && { color: colors.textSecondary }, category === cat.key && { color: cat.color, fontWeight: '700' }]} numberOfLines={1} adjustsFontSizeToFit>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Description ── */}
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.label, isDark && { color: colors.textSecondary }, { marginBottom: 0 }]}>DESCRIPTION</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={handlePickReceipt} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: receiptImage ? '#10B981' : colors.primary, fontSize: 12, fontWeight: '700' }}>
                      {receiptImage ? '🧾 Receipt Added' : '📷 Attach Bill'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleTagLocation} disabled={locationLoading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    {locationLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>📍 Tag Location</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[
                  styles.input, 
                  isDark && { color: colors.textPrimary },
                  { borderColor: selectedCat.color + '40', backgroundColor: isDark ? colors.bgElevated : selectedCat.color + '05' }
                ]}
                placeholder="What did you buy?"
                placeholderTextColor={isDark ? colors.textSecondary : COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
                maxLength={255}
                selectionColor={selectedCat.color}
              />
            </View>

            {/* ── Date ── */}
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.label, isDark && { color: colors.textSecondary }, { marginBottom: 0 }]}>DATE</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity 
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpDate(TODAY); }}
                    style={[styles.dateChip, isDark && { backgroundColor: colors.bgElevated, borderColor: colors.border }, expDate === TODAY && { backgroundColor: selectedCat.color + '33', borderColor: selectedCat.color }]}
                  >
                    <Text style={[styles.dateChipText, isDark && { color: colors.textSecondary }, expDate === TODAY && { color: selectedCat.color, fontWeight: '700' }]}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setExpDate(YESTERDAY);
                    }}
                    style={[styles.dateChip, isDark && { backgroundColor: colors.bgElevated, borderColor: colors.border }, expDate === YESTERDAY && { backgroundColor: selectedCat.color + '33', borderColor: selectedCat.color }]}
                  >
                    <Text style={[styles.dateChipText, isDark && { color: colors.textSecondary }, expDate === YESTERDAY && { color: selectedCat.color, fontWeight: '700' }]}>Yesterday</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={[
                  styles.input, 
                  isDark && { color: colors.textPrimary },
                  { borderColor: selectedCat.color + '40', backgroundColor: isDark ? colors.bgElevated : selectedCat.color + '05' }
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={isDark ? colors.textSecondary : COLORS.textMuted}
                value={expDate}
                onChangeText={setExpDate}
                selectionColor={selectedCat.color}
              />
            </View>

            {/* ── Bill / Receipt Attachment ── */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, isDark && { color: colors.textSecondary }]}>RECEIPT / BILL (OPTIONAL)</Text>
              {receiptImage ? (
                <View style={[styles.receiptPreviewCard, isDark && { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
                  <Image source={{ uri: receiptImage }} style={styles.receiptThumb} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={[styles.receiptSuccessText, isDark && { color: '#34D399' }]}>Receipt Attached</Text>
                    </View>
                    <Text style={[styles.receiptSubText, isDark && { color: colors.textSecondary }]}>Photo saved with this expense</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setReceiptImage(null);
                    }}
                    style={styles.receiptRemoveBtn}
                  >
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handlePickReceipt}
                  style={[styles.attachReceiptBtn, isDark && { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.attachIconWrap, { backgroundColor: selectedCat.color + '20' }]}>
                    <Ionicons name="camera-outline" size={20} color={selectedCat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.attachBtnTitle, isDark && { color: colors.textPrimary }]}>Attach Bill or Receipt</Text>
                    <Text style={[styles.attachBtnSubtitle, isDark && { color: colors.textSecondary }]}>Take photo or choose from gallery</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={isDark ? colors.textSecondary : "#94A3B8"} />
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* ── Absolute Action Buttons ── */}
          <View style={[styles.footer, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {isEdit ? (
              <View style={{ gap: 10 }}>
                <GradientButton
                  title="Update Expense"
                  onPress={handleAddExpense}
                  loading={loading}
                  colors={[selectedCat.color, selectedCat.color + 'CC']}
                  icon={selectedCat.icon}
                />
                <TouchableOpacity
                  style={[styles.deleteFooterBtn, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.14)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                  onPress={handleDeleteExpense}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={17} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.deleteFooterText}>Delete Expense</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <GradientButton
                title="Save Expense"
                onPress={handleAddExpense}
                loading={loading}
                colors={['#2563EB', '#1D4ED8']}
                icon={selectedCat.icon}
              />
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7FB',
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  rupee: {
    fontSize: 44,
    fontWeight: '800',
    color: '#2563EB',
    marginRight: 6,
    marginTop: 8,
  },
  amountInput: {
    color: '#1F2937',
    fontSize: 68,
    fontWeight: '900',
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -40,
    ...SHADOW.card,
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
    color: '#6B7280',
    letterSpacing: 0.8,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F3F9',
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    ...SHADOW.sm,
  },
  catEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.lg,
    padding: 16,
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '600',
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOW.sm,
  },
  dateChipText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#F1F3F9',
  },
  deleteHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteFooterText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  attachReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderStyle: 'dashed',
  },
  attachIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attachBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  attachBtnSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  receiptPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  receiptThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  receiptSuccessText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  receiptSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  receiptRemoveBtn: {
    padding: 6,
  },
  headerReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerReceiptText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
});
