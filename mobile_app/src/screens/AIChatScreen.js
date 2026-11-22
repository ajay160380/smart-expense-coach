/**
 * ═══════════════════════════════════════════════════════════════
 * PAISAMITRA — AI FINANCIAL COMPANION & INTELLIGENCE CHAT
 * Ultra-Luxury Futuristic Glassmorphic Design
 * Inspired by modern AI interfaces with blue ambient glow,
 * category cards, interactive suggestions, and voice overlay.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  FlatList,
  Keyboard,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

import api from '../api/config';
import { getUsername, sanitizeInput } from '../utils/auth';
import { useTheme } from '../theme/ThemeContext';

const { width, height } = Dimensions.get('window');

const PROMPT_CARDS = [
  {
    id: 'budget',
    icon: 'wallet-outline',
    title: 'Daily Budget & Safe Spend',
    subtitle: 'How much can I safely spend for the rest of today?',
    prompt: 'How much budget do I have left, and what is my daily safe spending limit today?',
  },
  {
    id: 'afford',
    icon: 'flash-outline',
    title: 'Can I Afford This?',
    subtitle: 'Simulate impulse buys before spending money',
    prompt: 'I am planning an impulse buy. How will a ₹2,500 purchase impact my month-end runway?',
  },
  {
    id: 'breakdown',
    icon: 'pie-chart-outline',
    title: 'Where Did My Money Go?',
    subtitle: 'Break down my highest expense categories this month',
    prompt: 'Where did I spend the most money this month? Give me my top spending categories.',
  },
  {
    id: 'savings',
    icon: 'trending-up-outline',
    title: 'Smart Savings Tips',
    subtitle: 'Actionable micro-tips to save an extra ₹3,000',
    prompt: 'Give me 3 realistic, witty, and practical tips to save more money this month.',
  },
];

const SUGGESTION_ACTIONS = [
  { icon: 'receipt-outline', text: 'Break down my top food expenses', label: 'Food Spends Breakdown' },
  { icon: 'speedometer-outline', text: 'Check my month-end runway date', label: 'Runway Forecast Check' },
  { icon: 'sparkles-outline', text: 'Give me 3 practical saving tips', label: 'Savings Micro-Coach' },
];

export default function AIChatScreen({ navigation }) {
  const { isDark, colors } = useTheme();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [username, setUserName] = useState('User');
  const [isVoiceOverlayVisible, setIsVoiceOverlayVisible] = useState(false);
  const [voiceText, setVoiceText] = useState('Listening to your financial question...');
  const [isListening, setIsListening] = useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState({});

  const flatListRef = useRef(null);
  const prismPulseAnim = useRef(new Animated.Value(1)).current;
  const prismRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getUsername().then((name) => {
      if (name) setUserName(name);
    });
  }, []);

  // Pulsing animation for the 3D prism in voice overlay
  useEffect(() => {
    if (isVoiceOverlayVisible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(prismPulseAnim, {
            toValue: 1.15,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(prismPulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(prismRotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isVoiceOverlayVisible]);

  const spin = prismRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sendMessage = async (textToSend) => {
    const raw = textToSend !== undefined ? textToSend : inputText;
    const cleanText = sanitizeInput(raw || '').trim();
    if (!cleanText || loading) return;

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
        text: response.data?.reply || 'I am having a brief network hitch. Please try asking again!',
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

  const handleOpenVoice = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    setVoiceText('Listening... "Can I afford dinner tonight?"');
    setIsListening(true);
    setIsVoiceOverlayVisible(true);

    // Simulate smart voice recognition after 2.5s for demonstration/ease
    setTimeout(() => {
      setVoiceText('What is my remaining daily budget for today?');
    }, 2000);
  };

  const handleVoiceSend = () => {
    setIsVoiceOverlayVisible(false);
    if (voiceText && !voiceText.includes('Listening')) {
      sendMessage(voiceText);
    }
  };

  const clearChat = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    setMessages([]);
  };

  const initialLetter = (username || 'User').trim().charAt(0).toUpperCase();

  // ── Render Message Bubble ──
  const renderMessage = ({ item, index }) => {
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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

      {/* Ambient Blue Background Glow (Replaces Green) */}
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

        {/* ── Typing / Thinking Indicator ── */}
        {loading && (
          <View style={styles.thinkingContainer}>
            <LinearGradient
              colors={['#38BDF8', '#2563EB']}
              style={styles.thinkingDot}
            >
              <ActivityIndicator size="small" color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.thinkingText, isDark && { color: '#94A3B8' }]}>
              PaisaMitra is analyzing your financials...
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

      {/* ── Screen 2: Holographic Voice / Listening Overlay ── */}
      <Modal
        visible={isVoiceOverlayVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVoiceOverlayVisible(false)}
      >
        <View style={styles.voiceOverlay}>
          <LinearGradient
            colors={['rgba(37, 99, 235, 0.45)', 'rgba(15, 23, 42, 0.98)', '#090D16']}
            start={{ x: 0.8, y: 0 }}
            end={{ x: 0.2, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Top Left Close */}
          <TouchableOpacity
            onPress={() => setIsVoiceOverlayVisible(false)}
            style={styles.voiceTopClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Center Holographic Prism / Aura */}
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

            <Text style={styles.listeningStatusText}>Listening</Text>

            <Text style={styles.voiceTranscriptText}>{voiceText}</Text>
          </View>

          {/* Bottom Controls Bar */}
          <View style={styles.voiceControlsBar}>
            <TouchableOpacity
              onPress={() => setIsVoiceOverlayVisible(false)}
              style={styles.voiceActionIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="keypad-outline" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleVoiceSend}
              style={styles.voiceSendPill}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#38BDF8', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.voiceSendPillGrad}
              >
                <Text style={styles.voiceSendPillText}>Send</Text>
                <Ionicons name="volume-medium-outline" size={17} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsVoiceOverlayVisible(false)}
              style={styles.voiceActionIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#CBD5E1" />
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
    alignSelf: 'flex-end',
    maxWidth: '82%',
    marginBottom: 16,
  },
  userMsgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userBubbleContainer: {
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
    alignSelf: 'flex-start',
    maxWidth: '92%',
    marginBottom: 16,
  },
  botMsgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
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
    paddingVertical: 48,
  },
  voiceTopClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
    opacity: 0.9,
  },
  listeningStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  voiceTranscriptText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
  },
  voiceControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  voiceActionIconBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceSendPill: {
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  voiceSendPillGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  voiceSendPillText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
