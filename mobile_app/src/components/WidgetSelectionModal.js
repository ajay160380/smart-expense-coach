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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPinWidget, requestWidgetUpdate } from 'react-native-android-widget';

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
        'Android फ़ीचर',
        'Android Home Screen Widgets केवल Android फ़ोन पर उपलब्ध हैं।'
      );
      return;
    }

    setPinning(true);

    try {
      // 1. Save user preference for widget layout
      await AsyncStorage.setItem('preferred_widget_layout', widgetName);

      // 2. Trigger widget update so active widgets adapt immediately
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
        // If WideExpenseWidget is not found in older APK, fallback to AddExpenseWidget
        if (widgetName === 'WideExpenseWidget') {
          try {
            pinned = await requestPinWidget({ widgetName: 'AddExpenseWidget' });
          } catch (fbErr) {
            pinned = false;
          }
        }
      }

      setPinning(false);

      if (pinned) {
        Alert.alert(
          'विजेट जोड़ने का अनुरोध भेजा गया! 🎉',
          'आपकी होम स्क्रीन पर विजेट जोड़ने का प्रॉम्प्ट आ गया है। कृपया "Add" या "Confirm" पर टैप करें।',
          [{ text: 'ठीक है', onPress: onClose }]
        );
      } else {
        Alert.alert(
          'विजेट कैसे लगाएं',
          'होम स्क्रीन पर 2 सेकंड दबाकर रखें (Touch & Hold) ➔ नीचे "Widgets" चुनें ➔ "Expense Tracker" को होम स्क्रीन पर लाएं।\n\n📌 Xiaomi / POCO / Redmi यूज़र्स:\nफ़ोन Settings ➔ Apps ➔ Manage Apps ➔ Expense Tracker ➔ Other Permissions में जाकर "Home screen shortcuts" को Allow कर दें।',
          [{ text: 'समझ गया', onPress: onClose }]
        );
      }
    } catch (err) {
      setPinning(false);
      Alert.alert(
        'विजेट कैसे लगाएं',
        'होम स्क्रीन पर 2 सेकंड दबाकर रखें ➔ "Widgets" चुनें ➔ "Expense Tracker" को होम स्क्रीन पर ड्रैग करें।',
        [{ text: 'समझ गया', onPress: onClose }]
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

          {/* Header in Pure Hindi */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, isDark && { color: '#F8FAFC' }]}>
                होम स्क्रीन विजेट
              </Text>
              <Text style={[styles.sheetSubtitle, isDark && { color: '#94A3B8' }]}>
                अपनी पसंद का विजेट चुनें और होम स्क्रीन पर लगाएं
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
                      2x2 चौकोर विजेट (Square)
                    </Text>
                    <Text style={styles.optionSubtitle}>कॉम्पैक्ट लेआउट • खर्च राशि, बजट मीटर और +Add</Text>
                  </View>
                </View>

                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>अनुशंसित</Text>
                </View>
              </View>

              {/* Live Preview of Square Widget (Clean & Unclipped) */}
              <View style={styles.previewContainer}>
                <View style={styles.squareWidgetPreview}>
                  {/* Top Header */}
                  <View style={styles.widgetHeaderRow}>
                    <Text style={styles.widgetTitleText}>Expense</Text>
                    <View style={styles.widgetSafeBadge}>
                      <Text style={styles.widgetSafeText}>SAFE</Text>
                    </View>
                  </View>

                  {/* Middle Stats */}
                  <View style={{ marginTop: 4 }}>
                    <Text style={styles.widgetBigAmount}>₹{spentFormatted}</Text>
                    <Text style={styles.widgetSpentSubtitle}>
                      खर्च · {budgetPct}% (बजट ₹{budgetFormatted})
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
                      <Ionicons name="mic" size={16} color="#FFFFFF" />
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
                  <Text style={styles.pinBtnText}>✨ यह 2x2 विजेट स्क्रीन पर लगाएं</Text>
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
                      4x2 वाइड विजेट (Wide Banner)
                    </Text>
                    <Text style={styles.optionSubtitle}>फुल हॉरिजॉन्टल लेआउट • हालिया खर्च और माइक</Text>
                  </View>
                </View>

                <View style={[styles.badgePill, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={[styles.badgePillText, { color: '#7C3AED' }]}>पॉपुलर</Text>
                </View>
              </View>

              {/* Live Preview of Wide Widget */}
              <View style={styles.previewContainer}>
                <LinearGradient
                  colors={['#1D4ED8', '#1E40AF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.wideWidgetPreview}
                >
                  <View style={{ flex: 1, justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.wideTitleText}>Expense</Text>
                      <View style={styles.wideSafeBadge}>
                        <Text style={styles.wideSafeText}>SAFE</Text>
                      </View>
                    </View>

                    <View style={{ marginVertical: 3 }}>
                      <Text style={styles.wideBigAmount}>₹{spentFormatted}</Text>
                      <Text style={styles.wideSubtitleText}>
                        बजट ₹{budgetFormatted} ({budgetPct}%)
                      </Text>
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

                  {/* Right Actions */}
                  <View style={styles.wideRightActionCol}>
                    <View style={styles.widePlusButton}>
                      <Ionicons name="add" size={20} color="#1E40AF" />
                    </View>
                    <View style={styles.wideMicPill}>
                      <Ionicons name="mic" size={14} color="#1E40AF" />
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
                  colors={['#7C3AED', '#6D28D9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.pinBtnGradient}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.pinBtnText}>✨ यह 4x2 वाइड विजेट लगाएं</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ════════════════════════════════════════════════════
                MANUAL GUIDE CARD IN PURE HINDI
            ════════════════════════════════════════════════════ */}
            <View style={[styles.helpCard, isDark && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="information-circle-outline" size={18} color="#3B82F6" style={{ marginRight: 6 }} />
                <Text style={[styles.helpTitle, isDark && { color: '#93C5FD' }]}>
                  विजेट लगाने का आसान तरीका
                </Text>
              </View>

              <Text style={[styles.helpText, isDark && { color: '#94A3B8' }]}>
                अगर बटन दबाने पर विजेट अपने आप न जुड़े:
              </Text>
              <Text style={[styles.helpBullet, isDark && { color: '#CBD5E1' }]}>
                1. फ़ोन की होम स्क्रीन पर किसी भी खाली जगह पर 2 सेकंड तक दबाकर रखें (Touch & Hold)।
              </Text>
              <Text style={[styles.helpBullet, isDark && { color: '#CBD5E1' }]}>
                2. नीचे "Widgets" (विजेट्स) विकल्प पर टैप करें।
              </Text>
              <Text style={[styles.helpBullet, isDark && { color: '#CBD5E1' }]}>
                3. "Expense Tracker" खोजें और विजेट को अपनी होम स्क्रीन पर ड्रैग करके रख दें!
              </Text>

              <View style={styles.xiaomiNoteBox}>
                <Text style={styles.xiaomiNoteText}>
                  📌 Redmi / POCO / Xiaomi यूज़र्स ध्यान दें:{'\n'}
                  अगर विजेट ऑटोमैटिक ऐड न हो, तो फ़ोन Settings ➔ Apps ➔ Manage Apps ➔ Expense Tracker ➔ Other Permissions में जाकर "Home screen shortcuts" को Allow कर दें।
                </Text>
              </View>
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
    fontWeight: '800',
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
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  squareWidgetPreview: {
    width: 150,
    height: 140,
    backgroundColor: '#205FE6',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
    shadowColor: '#205FE6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetTitleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  widgetSafeBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  widgetSafeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#205FE6',
  },
  widgetBigAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  widgetSpentSubtitle: {
    fontSize: 9,
    color: '#DCE7FE',
    marginTop: 1,
  },
  sliderTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4379EE',
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  sliderFill: {
    height: 5,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sliderThumb: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  widgetBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  widgetAddPill: {
    flex: 1,
    height: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetAddText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#205FE6',
  },
  widgetMicCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4379EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  pinActionBtn: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  pinBtnGradient: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Wide Widget Preview */
  wideWidgetPreview: {
    width: width - 64,
    height: 120,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  wideTitleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  wideSafeBadge: {
    backgroundColor: '#93C5FD',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  wideSafeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  wideBigAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  wideSubtitleText: {
    fontSize: 9,
    color: '#DBEAFE',
  },
  wideSegmentTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 4,
  },
  wideSegmentFill: {
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  categoryPillItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: 90,
  },
  categoryPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  wideRightActionCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    marginLeft: 8,
  },
  widePlusButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wideMicPill: {
    width: 32,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Help Card */
  helpCard: {
    marginTop: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  helpText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '500',
  },
  helpBullet: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 4,
  },
  xiaomiNoteBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  xiaomiNoteText: {
    fontSize: 11,
    color: '#EA580C',
    lineHeight: 16,
    fontWeight: '600',
  },
});
