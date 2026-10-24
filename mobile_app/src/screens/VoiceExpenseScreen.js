/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — SMART AI VOICE EXPENSE SCREEN
 * Dual-Mode (Tap to Record & Hold to Speak)
 * Whisper Turbo + Ultra-Fast Hinglish/English Extraction
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, 
  ActivityIndicator, StyleSheet, Dimensions, Platform, Alert, Animated, 
  Easing, Pressable, StatusBar as RNStatusBar 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS, SHADOW } from '../utils/theme';
import { BASE_URL } from '../api/config';
import { getToken } from '../utils/auth';

const { width } = Dimensions.get('window');

const SAMPLE_PROMPTS = [
  { icon: 'gas-station', text: '500 petrol' },
  { icon: 'coffee', text: '200 chai snacks' },
  { icon: 'cart-outline', text: '1200 grocery' },
  { icon: 'silverware-fork-knife', text: '450 swiggy' },
  { icon: 'chart-pie', text: 'aaj ka summary' },
];

export function parseExpenseFromSpeech(text) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();
  
  // Extract number (support formats like 500, 250.50, etc.)
  const numMatch = clean.match(/\b(\d+(?:\.\d+)?)\b/);
  const amount = numMatch ? parseFloat(numMatch[1]) : 0;
  
  // Extract description: remove number and common currency/filler words
  let desc = clean
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '')
    .replace(/\b(rs|inr|rupees|rupaye|rupe|ka|ki|ke|ko|mein|me|for|spent|kharch|kharcha|diya)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  if (!desc || desc.length < 2) desc = 'Expense';

  // Keyword category matching
  const lower = clean.toLowerCase();
  let category = 'other';
  let category_icon = '📦';

  if (/petrol|diesel|fuel|cng|auto|cab|uber|ola|rapido|bike|car|metro|bus|train|ticket|toll|parking|puncture|scooty/i.test(lower)) {
    category = 'transport';
    category_icon = '🚗';
  } else if (/chai|coffee|tea|swiggy|zomato|pizza|burger|snack|snacks|breakfast|lunch|dinner|khana|restaurant|cafe|canteen|food|momo|samosa|biryani|dosa|roti/i.test(lower)) {
    category = 'food';
    category_icon = '🍔';
  } else if (/grocery|groceries|kirana|milk|doodh|sabzi|vegetable|fruit|fruits|ration|bread|egg|eggs|paneer|atta|dal|oil|sugar|rice/i.test(lower)) {
    category = 'groceries';
    category_icon = '🛒';
  } else if (/recharge|bill|wifi|electricity|bijli|water|gas|cylinder|rent|maintenance|broadband|dth/i.test(lower)) {
    category = 'bills';
    category_icon = '💡';
  } else if (/medicine|dawa|dawae|doctor|hospital|clinic|tablet|medical|pharmacy|test|checkup/i.test(lower)) {
    category = 'health';
    category_icon = '🏥';
  } else if (/shopping|clothes|kapde|shoes|amazon|flipkart|myntra|meesho|zara|h&m|shirt|jeans/i.test(lower)) {
    category = 'shopping';
    category_icon = '🛍️';
  } else if (/movie|cinema|netflix|game|party|trip|travel|gym/i.test(lower)) {
    category = 'entertainment';
    category_icon = '🎬';
  }

  return {
    amount,
    description: desc,
    category,
    category_icon,
  };
}

export default function VoiceExpenseScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [loggedExpense, setLoggedExpense] = useState(null);
  const [chatReply, setChatReply] = useState('');
  const [manualText, setManualText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  // Animation values for audio waves
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseOpacity1 = useRef(new Animated.Value(0.6)).current;
  const pulseOpacity2 = useRef(new Animated.Value(0.4)).current;

  // Recording timing guards
  const recordingStartTimeRef = useRef(0);
  const isRecordingRef = useRef(false);
  const timerIntervalRef = useRef(null);

  // Initialize Audio Recorder
  let recorder = null;
  try {
    recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  } catch (e) {
    console.log('AudioRecorder init notice:', e);
  }

  // Handle pulse animation loop
  useEffect(() => {
    let animLoop = null;
    if (isRecording) {
      animLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim1, {
              toValue: 1.6,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim1, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity1, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity1, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(400),
            Animated.timing(pulseAnim2, {
              toValue: 1.9,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim2, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(400),
            Animated.timing(pulseOpacity2, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity2, {
              toValue: 0.4,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      animLoop.start();
    } else {
      pulseAnim1.setValue(1);
      pulseAnim2.setValue(1);
      pulseOpacity1.setValue(0.6);
      pulseOpacity2.setValue(0.4);
    }

    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [isRecording]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    if (loading || isRecordingRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Microphone Access Needed', 'Please allow microphone permissions in system settings to record voice expenses.');
        return;
      }

      setLoggedExpense(null);
      setChatReply('');
      setTranscription('');

      if (recorder) {
        await recorder.prepareToRecordAsync();
        recorder.record();
        isRecordingRef.current = true;
        recordingStartTimeRef.current = Date.now();
        setIsRecording(true);
        setRecordSeconds(0);

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
          setRecordSeconds(prev => prev + 1);
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Recording Notice', 'Microphone could not start. Please try again: ' + err.message);
    }
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    isRecordingRef.current = false;
    setIsRecording(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const duration = Date.now() - recordingStartTimeRef.current;
    if (duration < 650) {
      // Audio was too short (<0.65s)
      try {
        if (recorder) await recorder.stop();
      } catch (e) {}
      Alert.alert('Recording Too Short', 'Please speak clearly with your amount (e.g., "500 petrol").');
      return;
    }

    setLoading(true);
    try {
      if (recorder) {
        await recorder.stop();
        await new Promise(r => setTimeout(r, 350));
        const uri = recorder.uri;
        if (uri) {
          await uploadAudio(uri);
        } else {
          throw new Error('No audio recorded');
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Notice', 'Could not process audio. Please try speaking again.');
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const uploadAudio = async (uri) => {
    try {
      let token = await getToken();
      if (!token) {
        token = await AsyncStorage.getItem('userToken');
      }

      const response = await FileSystem.uploadAsync(
        `${BASE_URL}/api/voice-expense/`,
        uri,
        {
          httpMethod: 'POST',
          uploadType: 1, // MULTIPART
          fieldName: 'audio',
          mimeType: 'audio/m4a',
          headers: {
            'Authorization': `Token ${token}`,
            'Accept': 'application/json',
          },
        }
      );

      let data = {};
      try {
        data = JSON.parse(response.body);
      } catch (e) {
        data = {};
      }

      if (response.status === 200 && data.status === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const spoken = (data.transcription || data.spoken_text || '').trim();
        setTranscription(spoken);

        const parsed = parseExpenseFromSpeech(spoken);

        if (data.action === 'log_expenses' || data.expense || data.expense_id || (parsed && parsed.amount > 0)) {
          const srvExp = data.expense || {};
          const finalAmt = (typeof srvExp.amount === 'number' && srvExp.amount > 0)
            ? srvExp.amount
            : (parseFloat(srvExp.amount) || parsed?.amount || 0);

          const finalCat = (srvExp.category && srvExp.category !== 'other')
            ? srvExp.category
            : (parsed?.category || srvExp.category || 'other');

          const finalIcon = srvExp.category_icon || parsed?.category_icon || '🏷️';
          const finalDesc = srvExp.description || parsed?.description || spoken || 'Voice Expense';

          setLoggedExpense({
            id: srvExp.id || data.expense_id,
            amount: finalAmt,
            category: finalCat,
            category_icon: finalIcon,
            description: finalDesc,
            date: srvExp.date || new Date().toISOString().split('T')[0],
            remaining_budget: srvExp.remaining_budget,
            message: data.message,
          });
        } else if (data.is_chat || data.action === 'chat') {
          setChatReply(data.message || 'Understood!');
        } else {
          setChatReply(data.message || 'Processed successfully!');
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Notice', data.message || data.error || 'Please speak clearly with your amount (e.g. 500 petrol).');
      }
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Network Error', 'Failed to connect to the server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const submitTextExpense = async (textToSubmit) => {
    const text = (textToSubmit || manualText).trim();
    if (!text) return;

    setLoading(true);
    setLoggedExpense(null);
    setChatReply('');
    setTranscription(text);

    try {
      let token = await getToken();
      if (!token) token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${BASE_URL}/api/voice-expense/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setManualText('');
        const spoken = (data.transcription || text).trim();
        setTranscription(spoken);

        const parsed = parseExpenseFromSpeech(spoken);

        if (data.action === 'log_expenses' || data.expense || data.expense_id || (parsed && parsed.amount > 0)) {
          const srvExp = data.expense || {};
          const finalAmt = (typeof srvExp.amount === 'number' && srvExp.amount > 0)
            ? srvExp.amount
            : (parseFloat(srvExp.amount) || parsed?.amount || 0);

          const finalCat = (srvExp.category && srvExp.category !== 'other')
            ? srvExp.category
            : (parsed?.category || srvExp.category || 'other');

          const finalIcon = srvExp.category_icon || parsed?.category_icon || '🏷️';
          const finalDesc = srvExp.description || parsed?.description || spoken || 'Expense';

          setLoggedExpense({
            id: srvExp.id || data.expense_id,
            amount: finalAmt,
            category: finalCat,
            category_icon: finalIcon,
            description: finalDesc,
            date: srvExp.date || new Date().toISOString().split('T')[0],
            remaining_budget: srvExp.remaining_budget,
            message: data.message,
          });
        } else {
          setChatReply(data.message || 'Processed!');
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Notice', data.message || 'Could not understand expense. Try: "500 petrol"');
      }
    } catch (e) {
      console.error('Submit text error:', e);
      Alert.alert('Connection Error', 'Could not send expense to server.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI Voice Expense</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setShowTextInput(!showTextInput)} 
          style={styles.keyboardToggle}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={showTextInput ? "mic-outline" : "keypad-outline"} 
            size={22} 
            color={COLORS.primary || '#2563EB'} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status Header ── */}
        <View style={styles.statusSection}>
          <Text style={styles.instructionText}>
            {isRecording 
              ? 'Listening to you...' 
              : loading 
              ? 'AI is parsing expense...' 
              : loggedExpense 
              ? 'Expense Logged! 🎉' 
              : 'Speak Your Expense'}
          </Text>

          <Text style={styles.subInstructionText}>
            {isRecording 
              ? 'Speak naturally: amount + what you bought' 
              : loading 
              ? 'Extracting category & updating budget...' 
              : loggedExpense 
              ? 'Added to your daily expenses successfully' 
              : 'Tap mic to start/stop, or press and hold'}
          </Text>
        </View>

        {/* ── Mic Recording Stage ── */}
        <View style={styles.stageContainer}>
          {/* Animated concentric pulse waves */}
          {isRecording && (
            <>
              <Animated.View 
                style={[
                  styles.pulseWave,
                  {
                    transform: [{ scale: pulseAnim1 }],
                    opacity: pulseOpacity1,
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.pulseWave,
                  {
                    transform: [{ scale: pulseAnim2 }],
                    opacity: pulseOpacity2,
                  }
                ]} 
              />
            </>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <LinearGradient
                colors={['#F0FDF4', '#DCFCE7']}
                style={styles.loadingInner}
              >
                <ActivityIndicator size="large" color="#16A34A" />
                <Text style={styles.loadingText}>Analyzing...</Text>
              </LinearGradient>
            </View>
          ) : (
            <Pressable
              onPress={toggleRecording}
              onLongPress={startRecording}
              onPressOut={() => {
                if (isRecording) stopRecording();
              }}
              delayLongPress={200}
              style={({ pressed }) => [
                styles.micButtonWrapper,
                (pressed || isRecording) && styles.micButtonPressed
              ]}
            >
              <LinearGradient 
                colors={isRecording ? ['#EF4444', '#DC2626'] : ['#2563EB', '#1D4ED8']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.micGradient}
              >
                <MaterialCommunityIcons 
                  name={isRecording ? "microphone" : "microphone-outline"} 
                  size={54} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
            </Pressable>
          )}

          {/* Recording Timer or Action Label */}
          <View style={styles.timerBadgeContainer}>
            {isRecording ? (
              <View style={styles.recordingTimerBadge}>
                <View style={styles.redPulseDot} />
                <Text style={styles.recordingTimerText}>{formatTimer(recordSeconds)}</Text>
              </View>
            ) : (
              <Text style={styles.hintLabel}>
                {loading ? 'Transcribing...' : 'Tap to Record • Hold to Talk'}
              </Text>
            )}
          </View>
        </View>

        {/* ── Recognized Transcript Display (Immediate Real-time verification) ── */}
        {transcription ? (
          <View style={styles.transcriptCard}>
            <View style={styles.transcriptHeader}>
              <Ionicons name="mic" size={16} color="#2563EB" />
              <Text style={styles.transcriptTitle}>Recognized Speech (Aapne Bola):</Text>
            </View>
            <Text style={styles.transcriptText}>"{transcription}"</Text>
          </View>
        ) : null}

        {/* ── Logged Expense Success Card (Instant AI Breakdown) ── */}
        {loggedExpense && (
          <View style={styles.expenseResultCard}>
            <LinearGradient
              colors={['#F0FDF4', '#FFFFFF']}
              style={styles.expenseResultGradient}
            >
              <View style={styles.resultSuccessHeader}>
                <View style={styles.successCheckCircle}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
                <Text style={styles.successTitleText}>Expense Logged Successfully! 🎉</Text>
              </View>

              <View style={styles.resultRow}>
                <View style={styles.resultCategoryPill}>
                  <Text style={styles.categoryIconText}>
                    {loggedExpense.category_icon || '🏷️'}
                  </Text>
                  <Text style={styles.categoryTitleText}>
                    {(loggedExpense.category || 'Expense').toUpperCase()}
                  </Text>
                </View>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountBadgeText}>
                    ₹{typeof loggedExpense.amount === 'number' && loggedExpense.amount > 0 ? Number(loggedExpense.amount).toLocaleString('en-IN') : (loggedExpense.amount || '0')}
                  </Text>
                </View>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Note / Item:</Text>
                <Text style={styles.detailValue}>{loggedExpense.description || transcription || 'Expense'}</Text>
              </View>

              {loggedExpense.remaining_budget !== undefined && (
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Remaining Monthly Budget:</Text>
                  <Text style={styles.budgetValue}>
                    ₹{Math.round(loggedExpense.remaining_budget).toLocaleString('en-IN')}
                  </Text>
                </View>
              )}

              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={styles.actionBtnOutline}
                  onPress={() => {
                    setLoggedExpense(null);
                    setTranscription('');
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={16} color="#2563EB" />
                  <Text style={styles.actionBtnOutlineText}>Record Another</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnSolid}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionBtnSolidText}>Done</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ── Conversational Chat Reply ── */}
        {chatReply ? (
          <View style={styles.chatCard}>
            <Text style={styles.chatReplyText}>{chatReply}</Text>
          </View>
        ) : null}

        {/* ── Text Fallback Input (Optional) ── */}
        {showTextInput && (
          <View style={styles.textInputBox}>
            <TextInput
              style={styles.textInputField}
              placeholder="Or type here (e.g. 500 petrol)..."
              placeholderTextColor="#9CA3AF"
              value={manualText}
              onChangeText={setManualText}
              onSubmitEditing={() => submitTextExpense()}
              returnKeyType="send"
            />
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={() => submitTextExpense()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Sample Prompt Chips ── */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>💡 Quick Examples to Try:</Text>
          <View style={styles.chipsRow}>
            {SAMPLE_PROMPTS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.sampleChip}
                onPress={() => submitTextExpense(item.text)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name={item.icon} size={15} color="#2563EB" />
                <Text style={styles.sampleChipText}>"{item.text}"</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC', 
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 8 : 42) : 0 
  },

  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  headerCenter: { 
    flex: 1, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: { 
    color: '#0F172A', 
    fontSize: 17, 
    fontWeight: '700' 
  },
  aiBadge: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  aiBadgeGradient: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  keyboardToggle: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },

  statusSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  instructionText: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subInstructionText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },

  stageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    width: 200,
    marginVertical: 10,
  },
  pulseWave: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#EF4444',
  },
  micButtonWrapper: {
    width: 124,
    height: 124,
    borderRadius: 62,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  micButtonPressed: {
    transform: [{ scale: 1.06 }],
    shadowColor: '#EF4444',
    shadowOpacity: 0.5,
  },
  micGradient: {
    width: 124,
    height: 124,
    borderRadius: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    width: 124,
    height: 124,
    borderRadius: 62,
    overflow: 'hidden',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  loadingInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#86EFAC',
    borderRadius: 62,
  },
  loadingText: {
    marginTop: 6,
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },

  timerBadgeContainer: {
    position: 'absolute',
    bottom: -15,
  },
  recordingTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  redPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  recordingTimerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hintLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },

  transcriptCard: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  transcriptTitle: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  transcriptText: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '600',
    fontStyle: 'italic',
  },

  expenseResultCard: {
    width: '100%',
    marginTop: 16,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  expenseResultGradient: {
    padding: 18,
  },
  resultSuccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  successCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitleText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '800',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  categoryIconText: {
    fontSize: 14,
  },
  categoryTitleText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  amountBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  amountBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  detailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  resultDescription: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginBottom: 14,
  },
  budgetLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  budgetValue: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: '800',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  actionBtnOutlineText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnSolid: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSolidText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  chatCard: {
    width: '100%',
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatReplyText: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 22,
  },

  textInputBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 18,
  },
  textInputField: {
    flex: 1,
    height: 42,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  suggestionsContainer: {
    width: '100%',
    marginTop: 28,
  },
  suggestionsTitle: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sampleChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
});
