/**
 * ═══════════════════════════════════════════════════════════════
 * PAISAMITRA AI — FUTURISTIC CHAT & VOICE COMPANION
 * Fully Matched to Reference UI Design:
 * Screen 1: Welcome Hero & Floating Glassmorphic Prompt Cards
 * Screen 2: Dedicated Holographic Voice Overlay with Real Whisper AI
 * Screen 3: High-Res Modern Chat Stream with Interactive Suggestions
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  Modal,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import api, { BASE_URL } from '../api/config';
import { getToken } from '../utils/auth';
import { useTheme } from '../theme/ThemeContext';

const { width, height } = Dimensions.get('window');

// ── Floating Category Prompt Cards (Screen 1) ──
const PROMPT_CARDS = [
  {
    id: 'budget_opt',
    icon: 'wallet-outline',
    title: 'Budget & Savings',
    subtitle: 'How to optimize my monthly budget?',
    prompt: 'How to optimize my monthly budget and save more this month?',
  },
  {
    id: 'expense_breakdown',
    icon: 'pie-chart-outline',
    title: 'Expense Analysis',
    subtitle: 'Analyze my top spending categories',
    prompt: 'Where did I spend the most money this month? Give me my top spending categories.',
  },
  {
    id: 'impulse_check',
    icon: 'help-circle-outline',
    title: 'Can I Afford This?',
    subtitle: 'Check if an impulse purchase fits my budget',
    prompt: 'What is my remaining daily budget for today? Can I afford to spend ₹1,000 on dining out?',
  },
  {
    id: 'savings_boost',
    icon: 'sparkles-outline',
    title: 'Smart Money Hacks',
    subtitle: 'Actionable tips to cut down expenses',
    prompt: 'Give me 3 realistic tips to cut down unnecessary expenses this week based on my spending.',
  },
];

// ── Suggestion Chips inside AI Bubble (Screen 3) ──
const SUGGESTION_ACTIONS = [
  { icon: 'pie-chart', label: 'Top categories this month', text: 'Where did I spend the most money this month?' },
  { icon: 'calendar', label: 'Remaining daily budget', text: 'What is my remaining daily budget for today?' },
  { icon: 'bulb', label: 'Smart savings tips', text: 'Give me 3 quick tips to save money this month.' },
];

export default function AIChatScreen({ navigation }) {
  const { isDark } = useTheme();

  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('Friend');
  const [suggestionsExpanded, setSuggestionsExpanded] = useState({});

  // Voice Overlay & Audio Recording State
  const [isVoiceOverlayVisible, setIsVoiceOverlayVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState('Listening...');
  const [voiceRecordSeconds, setVoiceRecordSeconds] = useState(0);

  const flatListRef = useRef(null);
  const isRecordingRef = useRef(false);
  const recordingTimerRef = useRef(null);
  const recordingStartTimeRef = useRef(0);

  // Holographic 3D Prism Animations
  const prismPulseAnim = useRef(new Animated.Value(1)).current;
  const prismRotateAnim = useRef(new Animated.Value(0)).current;

  // Initialize Real Audio Recorder
  let recorder = null;
  try {
    recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  } catch (e) {
    console.log('AudioRecorder init notice:', e);
  }

  // Load User Profile
  useEffect(() => {
    (async () => {
      try {
        const cachedUser = await AsyncStorage.getItem('userData');
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser);
          const name = parsed.first_name || parsed.username || 'Friend';
          setUsername(name);
        }
      } catch (e) {}
    })();
  }, []);

  // Holographic Prism Rotation Loop
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(prismPulseAnim, {
          toValue: 1.15,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(prismPulseAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const spinLoop = Animated.loop(
      Animated.timing(prismRotateAnim, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    spinLoop.start();

    return () => {
      pulseLoop.stop();
      spinLoop.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const spin = prismRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ── Send Message to Backend AI ──
  const sendMessage = async (customText = null) => {
    const textToSend = customText || inputText;
    if (!textToSend || !textToSend.trim() || loading) return;

    const cleanText = textToSend.trim();

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: cleanText,
      time: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    Keyboard.dismiss();
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const response = await api.post('/ai_chat/', {
        message: cleanText,
        history,
      });

      const botMsg = {
        id: `bot_${Date.now() + 1}`,
        role: 'bot',
        text: response.data?.reply || 'PaisaMitra is here to help! Please ask any budget question.',
        time: new Date(),
        showSuggestions: true,
      };

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.log('AI Chat Error:', error?.response?.status, error?.message);
      const errMsg = {
        id: `bot_err_${Date.now()}`,
        role: 'bot',
        text:
          error.response?.status === 429
            ? '⏰ Hourly AI rate limit reached. Please wait a bit before asking again!'
            : error.response?.data?.reply || 'Connection interrupted. Please verify your internet and retry.',
        time: new Date(),
        showSuggestions: false,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  // ── Real Audio Voice Recording Functions ──
  const handleOpenVoice = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Microphone Access Needed',
          'Please allow microphone permission to talk directly with PaisaMitra AI.'
        );
        return;
      }

      setIsVoiceOverlayVisible(true);
      setVoiceRecordSeconds(0);
      setVoiceStatusText('Listening... Speak now in Hindi or English');
      setIsTranscribing(false);

      if (recorder) {
        await recorder.prepareToRecordAsync();
        recorder.record();
        isRecordingRef.current = true;
        recordingStartTimeRef.current = Date.now();
        setIsRecording(true);

        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = setInterval(() => {
          setVoiceRecordSeconds((prev) => prev + 1);
        }, 1000);
      }
    } catch (err) {
      console.log('Voice start error:', err);
      Alert.alert('Microphone Notice', 'Could not access microphone: ' + err.message);
      setIsVoiceOverlayVisible(false);
    }
  };

  const handleStopAndTranscribe = async () => {
    if (!isRecordingRef.current) {
      setIsVoiceOverlayVisible(false);
      return;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    isRecordingRef.current = false;
    setIsRecording(false);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    const duration = Date.now() - recordingStartTimeRef.current;
    if (duration < 600) {
      try {
        if (recorder) await recorder.stop();
      } catch (e) {}
      setVoiceStatusText('Too short. Please speak clearly.');
      setTimeout(() => setIsVoiceOverlayVisible(false), 900);
      return;
    }

    setIsTranscribing(true);
    setVoiceStatusText('AI is processing your voice...');

    try {
      if (recorder) {
        await recorder.stop();
        await new Promise((r) => setTimeout(r, 300));
        const uri = recorder.uri;

        if (uri) {
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
                Authorization: `Token ${token}`,
                Accept: 'application/json',
              },
            }
          );

          let data = {};
          try {
            data = JSON.parse(response.body);
          } catch (e) {}

          const spoken = (data.transcription || data.spoken_text || '').trim();

          if (spoken) {
            setVoiceStatusText(`"${spoken}"`);
            setIsVoiceOverlayVisible(false);
            // Send the transcribed speech directly into AI chat
            sendMessage(spoken);
          } else {
            setVoiceStatusText('Could not transcribe audio. Please try again.');
            setTimeout(() => setIsVoiceOverlayVisible(false), 1200);
          }
        }
      }
    } catch (error) {
      console.log('Voice upload error:', error);
      setVoiceStatusText('Speech transcription failed.');
      setTimeout(() => setIsVoiceOverlayVisible(false), 1000);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCancelVoice = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    try {
      if (recorder) await recorder.stop();
    } catch (e) {}
    setIsVoiceOverlayVisible(false);
  };

  const clearChat = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    setMessages([]);
  };

  const initialLetter = (username || 'U').trim().charAt(0).toUpperCase();

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ── Render Message Bubble ──
  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';

    if (isUser) {
      return (
        <View style={styles.userMsgWrapper}>
          <Text style={[styles.senderLabel, { textAlign: 'right' }]}>You</Text>
          <View style={styles.userMsgRow}>
            <View style={styles.userBubbleContainer}>
              <LinearGradient
                colors={isDark ? ['#38BDF8', '#2563EB'] : ['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.userBubbleGrad}
              >
                <Text style={styles.userMsgText}>{item.text}</Text>
              </LinearGradient>
            </View>
            <View style={styles.userAvatarCircle}>
              <Text style={styles.userAvatarLetter}>{initialLetter}</Text>
            </View>
          </View>
        </View>
      );
    }

    // AI Bot Response
    const isExpanded = suggestionsExpanded[item.id] !== false; // default open

    return (
      <View style={styles.botMsgWrapper}>
        <Text style={styles.senderLabel}>PaisaMitra AI</Text>
        <View style={styles.botMsgRow}>
          {/* Glowing AI Orb Avatar */}
          <LinearGradient
            colors={['#38BDF8', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiAvatarOrb}
          >
            <Ionicons name="sparkles" size={14} color="#FFFFFF" />
          </LinearGradient>

          <View style={[styles.botCard, isDark ? styles.botCardDark : styles.botCardLight]}>
            <Text style={[styles.botMsgText, isDark ? { color: '#F1F5F9' } : { color: '#0F172A' }]}>
              {item.text}
            </Text>

            {/* Interactive Suggestions Card (like reference image) */}
            {item.showSuggestions && (
              <View style={[styles.suggestionsBlock, isDark && styles.suggestionsBlockDark]}>
                <TouchableOpacity
                  style={styles.suggestionsHeaderRow}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (e) {}
                    setSuggestionsExpanded((prev) => ({
                      ...prev,
                      [item.id]: !isExpanded,
                    }));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.suggestionsHeaderText, isDark && { color: '#CBD5E1' }]}>
                    Here are ways I can assist :
                  </Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={15}
                    color={isDark ? '#94A3B8' : '#64748B'}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.suggestionsList}>
                    {SUGGESTION_ACTIONS.map((sug, sIdx) => (
                      <TouchableOpacity
                        key={sIdx}
                        style={[styles.suggestionItem, isDark && styles.suggestionItemDark]}
                        onPress={() => sendMessage(sug.text)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={sug.icon}
                          size={14}
                          color="#38BDF8"
                          style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.suggestionItemText, isDark && { color: '#E2E8F0' }]}>
                          {sug.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Ambient Blue Background Glow */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(37, 99, 235, 0.22)', 'rgba(56, 189, 248, 0.08)', 'transparent']
            : ['rgba(219, 234, 254, 0.65)', 'transparent']
        }
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.2, y: 0.55 }}
        style={styles.ambientAura}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Top Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.menuBtn, isDark ? styles.menuBtnDark : styles.menuBtnLight]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? '#F1F5F9' : '#0F172A'} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, isDark && { color: '#F8FAFC' }]}>
            {messages.length === 0 ? 'PAISAMITRA AI' : 'NEW CHAT'}
          </Text>

          {messages.length > 0 ? (
            <TouchableOpacity
              onPress={clearChat}
              style={[styles.menuBtn, isDark ? styles.menuBtnDark : styles.menuBtnLight]}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={17} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* ── Main Chat Area ── */}
        {messages.length === 0 ? (
          /* Screen 1: Welcome & Prompt Selection Cards */
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeHero}>
              <Text style={[styles.heroGreeting, isDark && { color: '#FFFFFF' }]}>
                HI {username.toUpperCase()} !
              </Text>
              <Text style={[styles.heroSubtitle, isDark && { color: '#94A3B8' }]}>
                What Do You Want To Chat About Today?
              </Text>
            </View>

            <View style={styles.cardsGrid}>
              {PROMPT_CARDS.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.promptCard, isDark ? styles.promptCardDark : styles.promptCardLight]}
                  onPress={() => sendMessage(card.prompt)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.promptCardIconBox,
                      isDark ? styles.promptCardIconBoxDark : styles.promptCardIconBoxLight,
                    ]}
                  >
                    <Ionicons name={card.icon} size={18} color="#38BDF8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.promptCardTitle, isDark && { color: '#FFFFFF' }]}>
                      {card.title}
                    </Text>
                    <Text
                      style={[styles.promptCardSub, isDark && { color: '#94A3B8' }]}
                      numberOfLines={1}
                    >
                      {card.subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          /* Screen 3: Chat Message Feed */
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatFeed}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* ── Thinking Indicator ── */}
        {loading && (
          <View style={styles.thinkingContainer}>
            <LinearGradient
              colors={['#38BDF8', '#2563EB']}
              style={styles.thinkingDot}
            >
              <ActivityIndicator size="small" color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.thinkingText, isDark && { color: '#94A3B8' }]}>
              PaisaMitra is analyzing your live budget...
            </Text>
          </View>
        )}

        {/* ── Bottom Floating Input Bar ── */}
        <View style={styles.inputContainer}>
          <View style={[styles.inputPill, isDark ? styles.inputPillDark : styles.inputPillLight]}>
            <TextInput
              style={[styles.textInput, isDark ? { color: '#FFFFFF' } : { color: '#0F172A' }]}
              placeholder="What is on your mind?"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              maxLength={400}
            />

            <TouchableOpacity
              onPress={handleOpenVoice}
              style={styles.micBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={18} color="#38BDF8" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || loading}
              style={[
                styles.sendCircleBtn,
                !inputText.trim() && { opacity: 0.4 },
              ]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#38BDF8', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendCircleGradient}
              >
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Screen 2: Holographic Voice Overlay with Real Audio ── */}
      <Modal
        visible={isVoiceOverlayVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={handleCancelVoice}
      >
        <View style={styles.voiceOverlay}>
          {/* Solid deep space background with neon blue gradient */}
          <LinearGradient
            colors={['#0F172A', '#090D16', '#020617']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Glowing blue aura at top center */}
          <LinearGradient
            colors={['rgba(56, 189, 248, 0.25)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.6 }}
            style={[StyleSheet.absoluteFillObject, { height: height * 0.5 }]}
            pointerEvents="none"
          />

          {/* Top Bar with Dismiss */}
          <View style={styles.voiceTopBar}>
            <TouchableOpacity
              onPress={handleCancelVoice}
              style={styles.voiceTopClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {isRecording && (
              <View style={styles.recordingTimerBadge}>
                <View style={styles.recordingLiveDot} />
                <Text style={styles.recordingTimerText}>{formatTimer(voiceRecordSeconds)}</Text>
              </View>
            )}
          </View>

          {/* Center Holographic Prism / Visualizer */}
          <View style={styles.voiceCenterBox}>
            <Animated.View
              style={[
                styles.prismContainer,
                {
                  transform: [
                    { scale: prismPulseAnim },
                    { rotate: spin },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#38BDF8', '#2563EB', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.prismGradient}
              />
            </Animated.View>

            <Text style={styles.listeningStatusText}>
              {isTranscribing ? 'Processing Voice...' : 'Listening...'}
            </Text>

            <Text style={styles.voiceTranscriptText}>
              {voiceStatusText}
            </Text>
          </View>

          {/* Bottom Floating Controls Bar */}
          <View style={styles.voiceControlsBar}>
            <TouchableOpacity
              onPress={handleCancelVoice}
              style={styles.voiceActionIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleStopAndTranscribe}
              disabled={isTranscribing}
              style={[styles.voiceSendPill, isTranscribing && { opacity: 0.6 }]}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#38BDF8', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.voiceSendPillGrad}
              >
                {isTranscribing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.voiceSendPillText}>Send</Text>
                    <Ionicons name="volume-medium-outline" size={17} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                handleCancelVoice();
              }}
              style={styles.voiceActionIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="keypad-outline" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: '#090D16',
  },
  containerLight: {
    backgroundColor: '#F8FAFC',
  },
  ambientAura: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: height * 0.45,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBtnDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  menuBtnLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ── Welcome Screen ──
  welcomeContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  welcomeHero: {
    marginBottom: 24,
  },
  heroGreeting: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },
  cardsGrid: {
    gap: 12,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  promptCardDark: {
    backgroundColor: 'rgba(19, 27, 46, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  promptCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  promptCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  promptCardIconBoxDark: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  promptCardIconBoxLight: {
    backgroundColor: '#EFF6FF',
  },
  promptCardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  promptCardSub: {
    fontSize: 12,
    color: '#64748B',
  },

  // ── Chat Messages ──
  chatFeed: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  senderLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
    paddingHorizontal: 4,
    fontWeight: '600',
  },

  // User Message
  userMsgWrapper: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  userMsgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    maxWidth: '85%',
    gap: 8,
  },
  userBubbleContainer: {
    flexShrink: 1,
    borderRadius: 22,
    borderTopRightRadius: 4,
    overflow: 'hidden',
  },
  userBubbleGrad: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userMsgText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '600',
  },
  userAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarLetter: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },

  // Bot Message
  botMsgWrapper: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  botMsgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '92%',
    maxWidth: '92%',
    gap: 10,
  },
  aiAvatarOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  botCard: {
    flex: 1,
    borderRadius: 22,
    borderTopLeftRadius: 4,
    padding: 16,
    borderWidth: 1,
  },
  botCardDark: {
    backgroundColor: 'rgba(19, 27, 46, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  botCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  botMsgText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },

  // Suggestions Card inside Bot
  suggestionsBlock: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  suggestionsBlockDark: {
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  suggestionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  suggestionsHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  suggestionsList: {
    marginTop: 8,
    gap: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  suggestionItemDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  suggestionItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  // Thinking State
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  thinkingDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thinkingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  // ── Bottom Floating Input Bar ──
  inputContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
  },
  inputPillDark: {
    backgroundColor: '#0F172A',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  inputPillLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 8,
    paddingRight: 8,
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  sendCircleBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  sendCircleGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Voice Overlay Screen (Screen 2) ──
  voiceOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    backgroundColor: '#090D16',
  },
  voiceTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  voiceTopClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  recordingLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  recordingTimerText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '700',
  },
  voiceCenterBox: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  prismContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 28,
  },
  prismGradient: {
    width: 76,
    height: 76,
    borderRadius: 20,
  },
  listeningStatusText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  voiceTranscriptText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
    maxWidth: '90%',
  },
  voiceControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    width: '100%',
  },
  voiceActionIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceSendPill: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  voiceSendPillGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 14,
  },
  voiceSendPillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
