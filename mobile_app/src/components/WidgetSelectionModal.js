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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPinWidget, requestWidgetUpdate } from '../utils/widgetCompat';

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
  const [showHelp, setShowHelp] = useState(false);

  // Live or fallback data (accurate with user's stats)
  const spentVal = stats?.total_spent ?? stats?.spent_this_month ?? 2100;
  const budgetVal = stats?.budget ?? 20000;
  const rawBudgetPct = stats?.budget_percent ?? (budgetVal > 0 ? (spentVal / budgetVal) * 100 : 10.5);
  const budgetPct = Math.round(rawBudgetPct * 10) / 10;
  const spentFormatted = Number(spentVal).toLocaleString('en-IN');
  const budgetFormatted = Number(budgetVal).toLocaleString('en-IN');
  const usedPct = Math.max(1, Math.min(100, Math.round(rawBudgetPct)));

  // Status badge calculation
  let statusBadge = 'SAFE';
  let statusColor = '#10B981';
  let statusBg = '#DCFCE7';
  if (budgetPct > 100) {
    statusBadge = 'ALERT';
    statusColor = '#EF4444';
    statusBg = '#FEE2E2';
  } else if (budgetPct > 80) {
    statusBadge = 'WARN';
    statusColor = '#F59E0B';
    statusBg = '#FEF3C7';
  }

  // Recent items for wide preview
  const recentList = stats?.recent_expenses || stats?.daily_budget?.today_transactions || [];
  let pill1Text = 'Chai ₹20';
  let pill2Text = 'Petrol ₹200';
  if (recentList.length > 0) {
    const item1 = recentList[0];
    pill1Text = `${item1.title || item1.category || 'Expense'} ₹${Number(item1.amount || 0).toLocaleString('en-IN')}`;
  }
  if (recentList.length > 1) {
    const item2 = recentList[1];
    pill2Text = `${item2.title || item2.category || 'Expense'} ₹${Number(item2.amount || 0).toLocaleString('en-IN')}`;
  }

  const handleSelectTab = (widgetName) => {
    try {
      Haptics.selectionAsync();
    } catch (e) {}
    setSelectedWidget(widgetName);
  };

  const handlePin = async (widgetName) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    if (Platform.OS !== 'android') {
      Alert.alert(
        'Android Feature',
        'Home screen widgets are supported on Android devices.'
      );
      return;
    }

    setPinning(true);

    try {
      // 1. Save user selection
      await AsyncStorage.setItem('preferred_widget_layout', widgetName);

      // 2. Trigger updates
      try {
        await requestWidgetUpdate({ widgetName: 'AddExpenseWidget' });
      } catch (e) {}
      try {
        await requestWidgetUpdate({ widgetName: 'WideExpenseWidget' });
      } catch (e) {}

      // 3. Attempt native pin
      let pinned = false;
      try {
        pinned = await requestPinWidget({ widgetName });
      } catch (pinErr) {
        if (widgetName === 'WideExpenseWidget') {
          pinned = false;
        }
      }

      setPinning(false);

      const widgetTitle = widgetName === 'WideExpenseWidget' ? 'Expense Tracker Wide (4x2)' : 'Expense Tracker (2x2)';

      if (pinned) {
        Alert.alert(
          'Widget Pin Request Sent! 🎉',
          `A prompt to add "${widgetTitle}" has been sent to your home screen. Please tap "Add" or "Confirm" on the popup.`,
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert(
          'How to Add Widget',
          `1. Long press (Touch & Hold) on an empty area of your Home Screen.\n2. Tap "Widgets" at the bottom.\n3. Scroll down to "Expense Tracker" and drag "${widgetTitle}" to your screen!\n\n📌 Xiaomi / Redmi / POCO users:\nPlease ensure "Home screen shortcuts" permission is allowed in Settings ➔ Apps ➔ Manage Apps ➔ Expense Tracker ➔ Other Permissions.`,
          [{ text: 'Got it', onPress: onClose }]
        );
      }
    } catch (err) {
      setPinning(false);
      Alert.alert(
        'Add Widget Manually',
        'Touch & hold your Home Screen ➔ tap "Widgets" ➔ drag "Expense Tracker" to your screen.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  };

  const is2x2 = selectedWidget === 'AddExpenseWidget';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.sheetContainer, isDark && styles.sheetContainerDark]}>
          {/* Top Drag Handle */}
          <View style={[styles.handleBar, isDark && { backgroundColor: '#334155' }]} />

          {/* Header Row */}
          <View style={[styles.headerRow, isDark && { borderBottomColor: '#1E293B' }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.sheetTitle, isDark && { color: '#F8FAFC' }]}>
                  Add Widget to Home Screen
                </Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>LIVE</Text>
                </View>
              </View>
              <Text style={[styles.sheetSubtitle, isDark && { color: '#94A3B8' }]}>
                Track spending & 1-tap quick log right from your home screen
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, isDark && { backgroundColor: '#1E293B' }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={isDark ? '#F8FAFC' : '#475569'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* ════════════════════════════════════════════════════
                SEGMENTED SELECTOR (APPLE / MATERIAL YOU STYLE)
            ════════════════════════════════════════════════════ */}
            <View style={[styles.segmentedContainer, isDark && styles.segmentedContainerDark]}>
              {/* Option 1: 2x2 Square */}
              <TouchableOpacity
                style={[
                  styles.segmentTab,
                  is2x2 && styles.segmentTabActive,
                  is2x2 && isDark && styles.segmentTabActiveDark,
                ]}
                activeOpacity={0.85}
                onPress={() => handleSelectTab('AddExpenseWidget')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name="grid"
                    size={15}
                    color={is2x2 ? '#2563EB' : isDark ? '#94A3B8' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.segmentTabText,
                      is2x2 && styles.segmentTabTextActive,
                      isDark && !is2x2 && { color: '#94A3B8' },
                    ]}
                  >
                    2×2 Square
                  </Text>
                </View>
                <View style={[styles.segmentTag, is2x2 && styles.segmentTagActive]}>
                  <Text style={[styles.segmentTagText, is2x2 && styles.segmentTagTextActive]}>
                    BEST FIT
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: 4x2 Wide */}
              <TouchableOpacity
                style={[
                  styles.segmentTab,
                  !is2x2 && styles.segmentTabActive,
                  !is2x2 && isDark && styles.segmentTabActiveDark,
                ]}
                activeOpacity={0.85}
                onPress={() => handleSelectTab('WideExpenseWidget')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name="albums"
                    size={15}
                    color={!is2x2 ? '#2563EB' : isDark ? '#94A3B8' : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.segmentTabText,
                      !is2x2 && styles.segmentTabTextActive,
                      isDark && !is2x2 && { color: '#94A3B8' },
                    ]}
                  >
                    4×2 Wide Banner
                  </Text>
                </View>
                <View style={[styles.segmentTag, !is2x2 && styles.segmentTagActivePurple]}>
                  <Text style={[styles.segmentTagText, !is2x2 && styles.segmentTagTextPurple]}>
                    POPULAR
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ════════════════════════════════════════════════════
                REALISTIC DEVICE SHOWCASE (WALLPAPER FRAME)
            ════════════════════════════════════════════════════ */}
            <View style={[styles.devicePreviewCard, isDark && styles.devicePreviewCardDark]}>
              {/* Phone desktop ambient wallpaper gradient */}
              <LinearGradient
                colors={isDark ? ['#0B1329', '#111827', '#0F172A'] : ['#1E293B', '#0F172A', '#020617']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.wallpaperBackdrop}
              >
                {/* Micro header inside phone mockup */}
                <View style={styles.phoneMockupHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="phone-portrait-outline" size={12} color="rgba(255,255,255,0.6)" style={{ marginRight: 4 }} />
                    <Text style={styles.phoneMockupHeaderText}>HOME SCREEN PREVIEW</Text>
                  </View>
                  <Text style={styles.phoneClockText}>11:39</Text>
                </View>

                {/* ── PREVIEW CONTENT BASED ON SELECTION ── */}
                {is2x2 ? (
                  /* 2x2 Square Widget Mockup */
                  <View style={styles.squareWidgetFrame}>
                    <LinearGradient
                      colors={['#1D4ED8', '#2563EB', '#3B82F6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.squareWidgetGradient}
                    >
                      {/* Top Header */}
                      <View style={styles.widgetHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={styles.widgetAppDot} />
                          <Text style={styles.widgetTitleText}>Expense</Text>
                        </View>
                        <View style={[styles.widgetSafeBadge, { backgroundColor: '#FFFFFF' }]}>
                          <Text style={[styles.widgetSafeText, { color: statusColor }]}>{statusBadge}</Text>
                        </View>
                      </View>

                      {/* Middle Stats */}
                      <View style={{ marginTop: 2 }}>
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
                          <Ionicons name="add" size={14} color="#1D4ED8" style={{ marginRight: 2 }} />
                          <Text style={styles.widgetAddText}>Add</Text>
                        </View>
                        <View style={styles.widgetMicCircle}>
                          <Ionicons name="mic" size={15} color="#FFFFFF" />
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                ) : (
                  /* 4x2 Wide Widget Mockup */
                  <View style={styles.wideWidgetFrame}>
                    <LinearGradient
                      colors={['#1E40AF', '#1D4ED8', '#2563EB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.wideWidgetGradient}
                    >
                      {/* Left Column */}
                      <View style={{ flex: 1, justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.wideTitleText}>Expense Tracker</Text>
                          <View style={[styles.wideSafeBadge, { backgroundColor: '#FFFFFF' }]}>
                            <Text style={[styles.wideSafeText, { color: statusColor }]}>{statusBadge}</Text>
                          </View>
                        </View>

                        <View style={{ marginVertical: 2 }}>
                          <Text style={styles.wideSubtitleLabel}>THIS MONTH · {budgetPct}%</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 1 }}>
                            <Text style={styles.wideBigAmount}>₹{spentFormatted}</Text>
                            <Text style={styles.wideBudgetTotal}> / ₹{budgetFormatted}</Text>
                          </View>
                        </View>

                        {/* Progress Track */}
                        <View style={styles.wideSegmentTrack}>
                          <View style={[styles.wideSegmentFill, { flex: Math.max(1, Math.min(100, usedPct)) }]} />
                          <View style={{ flex: Math.max(0, 100 - Math.min(100, usedPct)) }} />
                        </View>

                        {/* Recent Item Pills */}
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          <View style={styles.categoryPillItem}>
                            <Text style={styles.categoryPillText} numberOfLines={1}>{pill1Text}</Text>
                          </View>
                          <View style={styles.categoryPillItem}>
                            <Text style={styles.categoryPillText} numberOfLines={1}>{pill2Text}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Right Action Icons Column */}
                      <View style={styles.wideRightActionCol}>
                        <View style={styles.widePlusButton}>
                          <Ionicons name="add" size={20} color="#1E40AF" />
                        </View>
                        <View style={styles.wideMicPill}>
                          <Ionicons name="mic" size={15} color="#1E40AF" />
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                )}

                {/* Subtitle description badge inside wallpaper */}
                <View style={styles.previewFooterBar}>
                  <Text style={styles.previewFooterText}>
                    {is2x2
                      ? '⚡ Compact 2x2 grid · Perfect for quick glances & fast logs'
                      : '📊 Wide 4x2 banner · Displays recent items, budget & instant mic'}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* ════════════════════════════════════════════════════
                FEATURE BULLET CHIPS
            ════════════════════════════════════════════════════ */}
            <View style={styles.featureGrid}>
              {is2x2 ? (
                <>
                  <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                    <Ionicons name="flash" size={14} color="#2563EB" style={{ marginRight: 6 }} />
                    <Text style={[styles.featurePillText, isDark && { color: '#E2E8F0' }]}>
                      1-Tap Quick Entry
                    </Text>
                  </View>
                  <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                    <Ionicons name="speedometer" size={14} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={[styles.featurePillText, isDark && { color: '#E2E8F0' }]}>
                      Live Budget Pace
                    </Text>
                  </View>
                  <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                    <Ionicons name="mic" size={14} color="#8B5CF6" style={{ marginRight: 6 }} />
                    <Text style={[styles.featurePillText, isDark && { color: '#E2E8F0' }]}>
                      Voice Logging
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                    <Ionicons name="receipt" size={14} color="#2563EB" style={{ marginRight: 6 }} />
                    <Text style={[styles.featurePillText, isDark && { color: '#E2E8F0' }]}>
                      Recent Expenses
                    </Text>
                  </View>
                  <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                    <Ionicons name="bar-chart" size={14} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={[styles.featurePillText, isDark && { color: '#E2E8F0' }]}>
                      Full Budget Bar
                    </Text>
                  </View>
                  <View style={[styles.featurePill, isDark && styles.featurePillDark]}>
                    <Ionicons name="mic" size={14} color="#8B5CF6" style={{ marginRight: 6 }} />
                    <Text style={[styles.featurePillText, isDark && { color: '#E2E8F0' }]}>
                      Voice & Add
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* ════════════════════════════════════════════════════
                COLLAPSIBLE MANUAL GUIDE / XIAOMI NOTE
            ════════════════════════════════════════════════════ */}
            <TouchableOpacity
              style={[styles.accordionToggle, isDark && { borderColor: '#334155', backgroundColor: '#1E293B' }]}
              onPress={() => setShowHelp(!showHelp)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="help-circle-outline" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
                <Text style={[styles.accordionToggleText, isDark && { color: '#CBD5E1' }]}>
                  Manual setup guide & phone tips
                </Text>
              </View>
              <Ionicons
                name={showHelp ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={isDark ? '#94A3B8' : '#64748B'}
              />
            </TouchableOpacity>

            {showHelp && (
              <View style={[styles.helpContainer, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
                <Text style={[styles.helpStepTitle, isDark && { color: '#93C5FD' }]}>
                  If automatic pinning does not show a popup:
                </Text>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNum}>1.</Text>
                  <Text style={[styles.stepDesc, isDark && { color: '#CBD5E1' }]}>
                    Long press (Touch & Hold) any empty area on your phone's Home Screen.
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNum}>2.</Text>
                  <Text style={[styles.stepDesc, isDark && { color: '#CBD5E1' }]}>
                    Tap <Text style={{ fontWeight: '700' }}>"Widgets"</Text> at the bottom of the screen.
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNum}>3.</Text>
                  <Text style={[styles.stepDesc, isDark && { color: '#CBD5E1' }]}>
                    Scroll to <Text style={{ fontWeight: '700' }}>"Expense Tracker"</Text> and drag {is2x2 ? '"Expense Tracker (2x2)"' : '"Expense Tracker Wide (4x2)"'} to your screen.
                  </Text>
                </View>

                <View style={styles.xiaomiBox}>
                  <Ionicons name="information-circle" size={14} color="#EA580C" style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={styles.xiaomiText}>
                    <Text style={{ fontWeight: '700' }}>Xiaomi / POCO / Redmi / Vivo:</Text> Please ensure "Home screen shortcuts" permission is allowed in phone Settings ➔ Apps ➔ Expense Tracker ➔ Permissions.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* ════════════════════════════════════════════════════
              STICKY BOTTOM ACTION BUTTON (NEVER CUT OFF!)
          ════════════════════════════════════════════════════ */}
          <View style={[styles.footerContainer, isDark && styles.footerContainerDark]}>
            <TouchableOpacity
              style={styles.primaryPinBtn}
              activeOpacity={0.88}
              disabled={pinning}
              onPress={() => handlePin(selectedWidget)}
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryPinGradient}
              >
                {pinning ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryPinText}>Adding to Home Screen...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryPinText}>
                      Add {is2x2 ? '2×2 Square' : '4×2 Wide'} Widget
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetContainerDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
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
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  proBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
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
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
  },

  /* Segmented selector */
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  segmentedContainerDark: {
    backgroundColor: '#1E293B',
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentTabActiveDark: {
    backgroundColor: '#0F172A',
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTabTextActive: {
    fontWeight: '800',
    color: '#2563EB',
  },
  segmentTag: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  segmentTagActive: {
    backgroundColor: '#DBEAFE',
  },
  segmentTagActivePurple: {
    backgroundColor: '#EDE9FE',
  },
  segmentTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  segmentTagTextActive: {
    color: '#1D4ED8',
  },
  segmentTagTextPurple: {
    color: '#7C3AED',
  },

  /* Device Preview Card / Wallpaper Container */
  devicePreviewCard: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    marginBottom: 14,
  },
  devicePreviewCardDark: {
    borderColor: '#334155',
    shadowColor: '#000000',
  },
  wallpaperBackdrop: {
    padding: 16,
    alignItems: 'center',
  },
  phoneMockupHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  phoneMockupHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.8,
  },
  phoneClockText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },

  /* 2x2 Square Widget Preview */
  squareWidgetFrame: {
    width: 170,
    height: 160,
    borderRadius: 26,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  squareWidgetGradient: {
    flex: 1,
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetAppDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#93C5FD',
    marginRight: 6,
  },
  widgetTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  widgetSafeBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  widgetSafeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  widgetBigAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  widgetSpentSubtitle: {
    fontSize: 9.5,
    color: '#DBEAFE',
    marginTop: 1,
    fontWeight: '500',
  },
  sliderTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  sliderFill: {
    height: 6,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sliderThumb: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  widgetBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  widgetAddPill: {
    flex: 1,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  widgetAddText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  widgetMicCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  /* 4x2 Wide Widget Preview */
  wideWidgetFrame: {
    width: '100%',
    height: 130,
    borderRadius: 24,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  wideWidgetGradient: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  wideTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  wideSafeBadge: {
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginLeft: 8,
  },
  wideSafeText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  wideSubtitleLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#BFDBFE',
    letterSpacing: 0.4,
  },
  wideBigAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  wideBudgetTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BFDBFE',
    marginBottom: 2,
  },
  wideSegmentTrack: {
    width: '100%',
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 4,
  },
  wideSegmentFill: {
    height: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 2.5,
  },
  categoryPillItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    maxWidth: 110,
  },
  categoryPillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  wideRightActionCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    marginLeft: 12,
  },
  widePlusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  wideMicPill: {
    width: 36,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  previewFooterBar: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    width: '100%',
  },
  previewFooterText: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },

  /* Feature Grid Chips */
  featureGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 6,
  },
  featurePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featurePillDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  featurePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },

  /* Accordion Manual Guide */
  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  accordionToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  helpContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  helpStepTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  stepNum: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#2563EB',
    width: 16,
    lineHeight: 16,
  },
  stepDesc: {
    flex: 1,
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  xiaomiBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  xiaomiText: {
    flex: 1,
    fontSize: 10.5,
    color: '#EA580C',
    lineHeight: 15,
  },

  /* Sticky Footer Action Button */
  footerContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerContainerDark: {
    backgroundColor: '#0F172A',
    borderTopColor: '#1E293B',
  },
  primaryPinBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryPinGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPinText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
