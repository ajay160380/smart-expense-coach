import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { requestPinWidget } from 'react-native-android-widget';

const { width } = Dimensions.get('window');

export default function WidgetSelectionModal({
  visible,
  onClose,
  stats = null,
  isDark = false,
  colors = {
    surface: '#FFFFFF',
    border: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    bg: '#F8FAFC',
    primary: '#2563EB',
  },
}) {
  const [selectedWidget, setSelectedWidget] = useState('AddExpenseWidget');
  const [pinning, setPinning] = useState(false);

  // Live or fallback data
  const spentVal = stats?.total_spent ?? 1200;
  const budgetVal = stats?.budget ?? 18800;
  const budgetPct = stats?.budget_percent ?? (budgetVal > 0 ? Math.min(100, Math.round((spentVal / budgetVal) * 100)) : 6);
  const spentFormatted = Number(spentVal).toLocaleString('en-IN');
  const budgetFormatted = Number(budgetVal).toLocaleString('en-IN');
  const usedPct = Math.max(1, Math.min(100, Math.round(budgetPct)));

  // Recent items for wide preview
  const recentList = stats?.recent_expenses || [];
  let pill1Text = 'Grocery ₹400';
  let pill2Text = 'Rent ₹800';
  if (recentList.length > 0) {
    const item1 = recentList[0];
    pill1Text = `${item1.title || item1.category || 'Expense'} ₹${Number(item1.amount || 0).toLocaleString('en-IN')}`;
  }
  if (recentList.length > 1) {
    const item2 = recentList[1];
    pill2Text = `${item2.title || item2.category || 'Expense'} ₹${Number(item2.amount || 0).toLocaleString('en-IN')}`;
  }

  const handlePin = async (widgetName) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    if (Platform.OS !== 'android') {
      Alert.alert(
        'Android Feature',
        'Android Home Screen Widgets keval Android devices par support hote hain.'
      );
      return;
    }

    setPinning(true);
    try {
      const pinned = await requestPinWidget({ widgetName });
      setPinning(false);

      const widgetTitle = widgetName === 'WideExpenseWidget' ? 'Expense Tracker Wide' : 'Expense Tracker';

      if (pinned) {
        Alert.alert(
          'Widget Pin Request Sent! 🎉',
          `"${widgetTitle}" widget aapki Home Screen par add karne ka prompt bhej diya gaya hai. Agar launcher popup dikhe toh "Add" ya "Confirm" dabayein.`,
          [{ text: 'Theek hai', onPress: onClose }]
        );
      } else {
        Alert.alert(
          'Manual Pin Required',
          `Aapke phone ke launcher ne automatic pin support nahi kiya.\n\n📱 Kaise lagayein:\n1. Phone Home Screen par khali jagah 2 second touch & hold karein\n2. "Widgets" option chunein\n3. "${widgetTitle}" drag karke screen par rakh dein!`,
          [{ text: 'Samajh gaya', onPress: onClose }]
        );
      }
    } catch (err) {
      setPinning(false);
      const widgetTitle = widgetName === 'WideExpenseWidget' ? 'Expense Tracker Wide' : 'Expense Tracker';
      Alert.alert(
        'Add Widget Manually',
        `Home Screen par 2 second touch & hold karein -> "Widgets" select karein -> "${widgetTitle}" drag karein.`,
        [{ text: 'Theek hai', onPress: onClose }]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.sheetContainer, isDark && { backgroundColor: '#0F172A', borderColor: '#1E293B' }]}>
          {/* Top handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, isDark && { color: '#F8FAFC' }]}>
                Add Widget to Home Screen
              </Text>
              <Text style={[styles.sheetSubtitle, isDark && { color: '#94A3B8' }]}>
                Choose your favorite widget layout to place on your home screen
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, isDark && { backgroundColor: '#1E293B' }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={isDark ? '#F8FAFC' : '#475569'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ════════════════════════════════════════════════════
                OPTION 1: SQUARE 2x2 COMPACT WIDGET
            ════════════════════════════════════════════════════ */}
            <View
              style={[
                styles.optionCard,
                isDark && { backgroundColor: '#1E293B', borderColor: selectedWidget === 'AddExpenseWidget' ? '#3B82F6' : '#334155' },
                selectedWidget === 'AddExpenseWidget' && styles.optionCardSelected,
              ]}
            >
              <View style={styles.optionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.radioOuter, selectedWidget === 'AddExpenseWidget' && styles.radioOuterActive]}>
                    {selectedWidget === 'AddExpenseWidget' && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={[styles.optionTitle, isDark && { color: '#F8FAFC' }]}>
                      Compact Tracker
                    </Text>
                    <Text style={styles.optionSubtitle}>Square 2x2 Layout</Text>
                  </View>
                </View>

                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>RECOMMENDED</Text>
                </View>
              </View>

              {/* Live Preview of Square Widget (Pixel Perfect from Image 1) */}
              <View style={styles.previewContainer}>
                <View style={styles.squareWidgetPreview}>
                  {/* Top Header */}
                  <View style={styles.widgetHeaderRow}>
                    <Text style={styles.widgetTitleText}>Expense Tracker</Text>
                    <View style={styles.widgetSafeBadge}>
                      <Text style={styles.widgetSafeText}>SAFE</Text>
                    </View>
                  </View>

                  {/* Middle Stats */}
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.widgetBigAmount}>₹{spentFormatted}</Text>
                    <Text style={styles.widgetSpentSubtitle}>
                      spent · {budgetPct}% of ₹{budgetFormatted}
                    </Text>

                    {/* Progress Track with Round Thumb */}
                    <View style={styles.sliderTrack}>
                      <View style={[styles.sliderFill, { flex: Math.max(1, Math.min(94, usedPct)) }]}>
                        <View style={styles.sliderThumb} />
                      </View>
                      <View style={{ flex: Math.max(1, 100 - Math.min(94, usedPct)) }} />
                    </View>
                  </View>

                  {/* Bottom Buttons */}
                  <View style={styles.widgetBottomRow}>
                    <View style={styles.widgetAddPill}>
                      <Text style={styles.widgetAddText}>+ Add</Text>
                    </View>
                    <View style={styles.widgetMicCircle}>
                      <Ionicons name="mic" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Button for Option 1 */}
              <TouchableOpacity
                style={styles.pinActionBtn}
                activeOpacity={0.85}
                disabled={pinning}
                onPress={() => {
                  setSelectedWidget('AddExpenseWidget');
                  handlePin('AddExpenseWidget');
                }}
              >
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pinBtnGradient}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.pinBtnText}>Add 2x2 Compact Widget</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ════════════════════════════════════════════════════
                OPTION 2: WIDE 4x2 BANNER WIDGET
            ════════════════════════════════════════════════════ */}
            <View
              style={[
                styles.optionCard,
                isDark && { backgroundColor: '#1E293B', borderColor: selectedWidget === 'WideExpenseWidget' ? '#3B82F6' : '#334155' },
                selectedWidget === 'WideExpenseWidget' && styles.optionCardSelected,
                { marginTop: 16 },
              ]}
            >
              <View style={styles.optionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.radioOuter, selectedWidget === 'WideExpenseWidget' && styles.radioOuterActive]}>
                    {selectedWidget === 'WideExpenseWidget' && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={[styles.optionTitle, isDark && { color: '#F8FAFC' }]}>
                      Wide Horizon Banner
                    </Text>
                    <Text style={styles.optionSubtitle}>Full 4x2 Landscape Layout</Text>
                  </View>
                </View>

                <View style={[styles.badgePill, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={[styles.badgePillText, { color: '#7C3AED' }]}>DETAILED</Text>
                </View>
              </View>

              {/* Live Preview of Wide Widget (Pixel Perfect from Image 2) */}
              <View style={styles.previewContainer}>
                <LinearGradient
                  colors={['#1D4ED8', '#1E40AF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.wideWidgetPreview}
                >
                  {/* Left Column */}
                  <View style={{ flex: 1, justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.wideHeaderTitle}>Expense Tracker</Text>
                      <View style={styles.wideSafeBadge}>
                        <Text style={styles.wideSafeText}>SAFE</Text>
                      </View>
                    </View>

                    <Text style={styles.wideMonthTag}>THIS MONTH · {budgetPct}%</Text>

                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 }}>
                      <Text style={styles.wideAmountText}>₹{spentFormatted}</Text>
                      <Text style={styles.wideBudgetTotal}> / ₹{budgetFormatted}</Text>
                    </View>

                    {/* Segmented Progress Bar */}
                    <View style={styles.segmentedRow}>
                      {Array.from({ length: 18 }).map((_, idx) => {
                        const isLit = idx < Math.max(1, Math.round((budgetPct / 100) * 18));
                        return (
                          <View
                            key={idx}
                            style={[
                              styles.segmentPill,
                              { backgroundColor: isLit ? '#93C5FD' : '#2563EB' },
                            ]}
                          />
                        );
                      })}
                    </View>

                    {/* Category pills */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText} numberOfLines={1}>{pill1Text}</Text>
                      </View>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText} numberOfLines={1}>{pill2Text}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Right Column */}
                  <View style={styles.wideRightCol}>
                    <View style={styles.wideBigPlusCircle}>
                      <Ionicons name="add" size={28} color="#1E40AF" />
                    </View>
                    <View style={styles.wideMicPill}>
                      <Ionicons name="mic" size={18} color="#1E40AF" />
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Action Button for Option 2 */}
              <TouchableOpacity
                style={styles.pinActionBtn}
                activeOpacity={0.85}
                disabled={pinning}
                onPress={() => {
                  setSelectedWidget('WideExpenseWidget');
                  handlePin('WideExpenseWidget');
                }}
              >
                <LinearGradient
                  colors={['#1D4ED8', '#1E40AF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pinBtnGradient}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.pinBtnText}>Add 4x2 Wide Widget</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Manual Instructions Hint Card */}
            <View style={[styles.helpCard, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="information-circle-outline" size={18} color="#3B82F6" style={{ marginRight: 6 }} />
                <Text style={[styles.helpTitle, isDark && { color: '#93C5FD' }]}>
                  Manual Placement Guide
                </Text>
              </View>
              <Text style={[styles.helpText, isDark && { color: '#94A3B8' }]}>
                Agar button dabane par widget automatic add na ho:
              </Text>
              <Text style={[styles.helpBullet, isDark && { color: '#CBD5E1' }]}>
                1. Phone ki Home Screen par kisi khali jagah par 2 second touch & hold karein.
              </Text>
              <Text style={[styles.helpBullet, isDark && { color: '#CBD5E1' }]}>
                2. Niche "Widgets" par tap karein aur "Expense Tracker" search karein.
              </Text>
              <Text style={[styles.helpBullet, isDark && { color: '#CBD5E1' }]}>
                3. Manpasand widget ko hold karke home screen par drag karein!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  optionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  optionCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#2563EB',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  optionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  badgePill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },

  /* Square Widget Preview Styles */
  squareWidgetPreview: {
    width: 210,
    height: 210,
    backgroundColor: '#205FE6',
    borderRadius: 28,
    padding: 14,
    justifyContent: 'space-between',
    shadowColor: '#205FE6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  widgetSafeBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  widgetSafeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#205FE6',
  },
  widgetBigAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  widgetSpentSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 1,
  },
  sliderTrack: {
    width: '100%',
    height: 9,
    borderRadius: 5,
    backgroundColor: '#4379EE',
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  sliderFill: {
    height: 7,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sliderThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  widgetBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  widgetAddPill: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetAddText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#205FE6',
  },
  widgetMicCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4379EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  /* Wide Widget Preview Styles */
  wideWidgetPreview: {
    width: '100%',
    height: 140,
    borderRadius: 24,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  wideHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  wideSafeBadge: {
    backgroundColor: '#93C5FD',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginLeft: 6,
  },
  wideSafeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F172A',
  },
  wideMonthTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#BFDBFE',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  wideAmountText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  wideBudgetTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BFDBFE',
    marginBottom: 2,
  },
  segmentedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  segmentPill: {
    width: 4.5,
    height: 10,
    borderRadius: 2.5,
    marginRight: 2.5,
  },
  categoryPill: {
    backgroundColor: '#2752B3',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  wideRightCol: {
    width: 72,
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 6,
  },
  wideBigPlusCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EBF3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wideMicPill: {
    width: 66,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Pin Button */
  pinActionBtn: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  pinBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pinBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Help Box */
  helpCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  helpText: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
  },
  helpBullet: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 18,
    marginTop: 2,
  },
});
