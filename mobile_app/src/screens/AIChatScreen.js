/**
 * ═══════════════════════════════════════════════════════════════
 * FINBOT AI — FUTURISTIC CHAT & VOICE WEALTH COACH
 * Fully Matched to Reference UI Design:
 * Screen 1: Welcome Hero & Interactive Glassmorphic Prompt Cards
 * Screen 2: Holographic 3D Prism Voice Mode with Real Whisper AI
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
  Image,
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
import { getToken, getUsername } from '../utils/auth';
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
    subtitle: 'Where did I spend the most money this month?',
    prompt: 'Where did I spend the most money this month? Give me my top spending categories.',
  },
  {
    id: 'impulse_check',
    icon: 'help-circle-outline',
    title: 'Can I Afford This?',
    subtitle: 'What is my remaining daily budget for today?',
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

// ── Suggestion Chips inside FinBot Bubble (Screen 3) ──
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
  const [username, setUsername] = useState('Ajay');
  const [userAvatar, setUserAvatar] = useState(null);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState({});

  // Voice Overlay & Audio Recording State
  const [isVoiceOverlayVisible, setIsVoiceOverlayVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState('Listening... Speak in Hindi or English');
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

  // Load User Profile Name & Avatar
  useEffect(() => {
    (async () => {
      try {
        let name = '';

        // 1. Check full_name from AsyncStorage
        const storedFullName = await AsyncStorage.getItem('full_name');
        if (storedFullName && storedFullName.trim() && storedFullName.toLowerCase() !== 'friend' && storedFullName.toLowerCase() !== 'user') {
          name = storedFullName.trim();
        }

        // 2. Check cached 'user_profile'
        const cachedProfile = await AsyncStorage.getItem('user_profile');
        if (cachedProfile) {
          try {
            const parsed = JSON.parse(cachedProfile);
            const profName = parsed.full_name || parsed.first_name || parsed.name || parsed.username;
            if (!name && profName && profName.toLowerCase() !== 'friend' && profName.toLowerCase() !== 'user') {
              name = profName;
            }
            if (parsed.avatar || parsed.profile_picture) {
              setUserAvatar(parsed.avatar || parsed.profile_picture);
            }
          } catch (e) {}
        }

        // 3. Check username
        if (!name || name.toLowerCase() === 'user' || name.toLowerCase() === 'friend') {
          const storedUsername = (await AsyncStorage.getItem('username')) || (await getUsername());
          if (storedUsername && storedUsername.toLowerCase() !== 'user' && storedUsername.toLowerCase() !== 'friend') {
            name = storedUsername;
          }
        }

        // 4. Fallback to /api/profile/
        if (!name || name.toLowerCase() === 'user' || name.toLowerCase() === 'friend') {
          try {
            const res = await api.get('/api/profile/');
            if (res.data) {
              const apiName = res.data.full_name || res.data.first_name || res.data.username;
              if (apiName && apiName.toLowerCase() !== 'friend' && apiName.toLowerCase() !== 'user') {
                name = apiName;
              }
              if (res.data.avatar || res.data.profile_picture) {
                setUserAvatar(res.data.avatar || res.data.profile_picture);
              }
            }
          } catch (e) {}
        }

        if (name && name.trim()) {
          setUsername(name.trim());
        }
      } catch (e) {}
    })();
  }, []);

  // Holographic Prism Rotation Loop
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(prismPulseAnim, {
          toValue: 1.18,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(prismPulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const spinLoop = Animated.loop(
      Animated.timing(prismRotateAnim, {
        toValue: 1,
        duration: 8000,
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
        text: response.data?.reply || 'FinBot is here to guide your money decisions! Ask any question.',
        time: new Date(),
        showSuggestions: true,
      };

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.log('FinBot AI Chat Error:', error?.response?.status, error?.message);
      const serverMsg = error.response?.data?.reply || error.response?.data?.error || error.response?.data?.message;
      const errMsg = {
        id: `bot_err_${Date.now()}`,
        role: 'bot',
        text:
          error.response?.status === 429
            ? '⏰ Hourly AI rate limit reached. Please wait a bit before asking again!'
            : serverMsg || 'FinBot is syncing with your live finances. Please tap send again!',
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
          'Please allow microphone permission to speak with FinBot AI.'
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
      setVoiceStatusText('Voice too short. Please speak clearly.');
      setTimeout(() => setIsVoiceOverlayVisible(false), 800);
      return;
    }

    setIsTranscribing(true);
    setVoiceStatusText('FinBot is transcribing your voice...');

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
            sendMessage(spoken);
          } else {
            setVoiceStatusText('Could not hear clearly. Please try again.');
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

  const displayName = (() => {
    const clean = (username || '').trim();
    if (clean && clean.toLowerCase() !== 'friend' && clean.toLowerCase() !== 'user') {
      return clean;
    }
    return 'Ajay';
  })();

  const userInitial = displayName.charAt(0).toUpperCase();

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
            <View style={[styles.userAvatarCircle, !isDark && styles.userAvatarCircleLight]}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.userAvatarImg} />
              ) : (
                <Text style={[styles.userAvatarLetter, !isDark && styles.userAvatarLetterLight]}>
                  {userInitial}
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    }

    // FinBot Response
    const isExpanded = suggestionsExpanded[item.id] !== false; // default open

    return (
      <View style={styles.botMsgWrapper}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <Text style={styles.senderLabel}>FinBot AI</Text>
          <View style={styles.onlineStatusDot} />
        </View>

        <View style={styles.botMsgRow}>
          {/* Glowing FinBot Avatar Orb */}
          <LinearGradient
            colors={['#38BDF8', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiAvatarOrb}
          >
            <Ionicons name="hardware-chip-outline" size={15} color="#FFFFFF" />
          </LinearGradient>

          <View style={[styles.botCard, isDark ? styles.botCardDark : styles.botCardLight]}>
            <Text style={[styles.botMsgText, isDark ? { color: '#F8FAFC' } : { color: '#0F172A' }]}>
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
                  <Text style={[styles.suggestionsHeaderText, isDark && { color: '#94A3B8' }]}>
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
            ? ['rgba(37, 99, 235, 0.25)', 'rgba(56, 189, 248, 0.08)', 'transparent']
            : ['rgba(219, 234, 254, 0.7)', 'transparent']
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

          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, isDark && { color: '#F8FAFC' }]}>
              {messages.length === 0 ? 'FINBOT AI' : 'NEW CHAT'}
            </Text>
            <View style={styles.headerStatusRow}>
              <View style={styles.headerStatusDot} />
              <Text style={styles.headerStatusText}>Online Assistant</Text>
            </View>
          </View>

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
                HI {displayName.toUpperCase()} !
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
                  <LinearGradient
                    colors={['rgba(56, 189, 248, 0.2)', 'rgba(37, 99, 235, 0.1)']}
                    style={styles.promptCardIconBox}
                  >
                    <Ionicons name={card.icon} size={20} color="#38BDF8" />
                  </LinearGradient>
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
                  <Ionicons name="chevron-forward" size={16} color={isDark ? '#64748B' : '#94A3B8'} />
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
              FinBot is analyzing your finances...
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

      {/* ── Screen 2: Holographic Voice Overlay with Real Whisper AI ── */}
      <Modal
        visible={isVoiceOverlayVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={handleCancelVoice}
      >
        <SafeAreaView style={styles.voiceOverlaySafe}>
          {/* Deep futuristic dark atmosphere with smooth continuous gradient */}
          <LinearGradient
            colors={['#0A1124', '#080D1A', '#030712']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Smooth cyan radial glow behind prism */}
          <LinearGradient
            colors={['rgba(56, 189, 248, 0.28)', 'rgba(37, 99, 235, 0.1)', 'transparent']}
            start={{ x: 0.5, y: 0.25 }}
            end={{ x: 0.5, y: 0.75 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* Top Bar with Pinned Controls */}
          <View style={styles.voiceTopBar}>
            <TouchableOpacity
              onPress={handleCancelVoice}
              style={styles.voiceTopClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {isRecording && (
              <View style={styles.recordingTimerBadge}>
                <View style={styles.recordingLiveDot} />
                <Text style={styles.recordingTimerText}>{formatTimer(voiceRecordSeconds)}</Text>
              </View>
            )}

            <View style={styles.voiceActiveModePill}>
              <Ionicons name="sparkles" size={13} color="#38BDF8" style={{ marginRight: 4 }} />
              <Text style={styles.voiceActiveModeText}>FinBot Voice</Text>
            </View>
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
              {isTranscribing ? 'Transcribing with AI...' : 'Listening...'}
            </Text>

            <Text style={styles.voiceTranscriptText}>
              {voiceStatusText}
            </Text>
          </View>

          {/* Bottom Floating Controls Bar (Matched to reference image) */}
          <View style={styles.voiceControlsBar}>
            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (e) {}
                Alert.alert('Scan & Chat', 'You can scan your bill or receipt to ask FinBot instant questions.');
              }}
              style={styles.voiceActionIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={22} color="#CBD5E1" />
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
                    <Ionicons name="volume-medium-outline" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCancelVoice}
              style={styles.voiceActionIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerStatusText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
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
    fontSize: 14.5,
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
    borderWidth: 1.2,
  },
  promptCardDark: {
    backgroundColor: 'rgba(19, 27, 46, 0.75)',
    borderColor: 'rgba(56, 189, 248, 0.16)',
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
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
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
    paddingHorizontal: 2,
    fontWeight: '600',
  },
  onlineStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userAvatarCircleLight: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  userAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userAvatarLetter: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
  userAvatarLetterLight: {
    color: '#2563EB',
  },

  // FinBot Message
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
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  botCard: {
    flex: 1,
    borderRadius: 22,
    borderTopLeftRadius: 4,
    padding: 16,
    borderWidth: 1,
  },
  botCardDark: {
    backgroundColor: 'rgba(19, 27, 46, 0.88)',
    borderColor: 'rgba(56, 189, 248, 0.15)',
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
    lineHeight: 22,
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
  voiceOverlaySafe: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#080D1A',
  },
  voiceTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
  },
  voiceTopClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  voiceActiveModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  voiceActiveModeText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  voiceCenterBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginVertical: 'auto',
  },
  prismContainer: {
    width: 110,
    height: 110,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 32,
  },
  prismGradient: {
    width: 82,
    height: 82,
    borderRadius: 22,
  },
  listeningStatusText: {
    color: '#38BDF8',
    fontSize: 14.5,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  voiceTranscriptText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
    maxWidth: '92%',
  },
  voiceControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 32,
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
    paddingHorizontal: 38,
    paddingVertical: 14,
  },
  voiceSendPillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
