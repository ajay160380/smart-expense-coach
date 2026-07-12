/**
 * ═══════════════════════════════════════════════════════════════
 * PAISA MITRA — AI CHAT SCREEN
 * Full PaisaMitra chatbot with Hinglish support
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  SafeAreaView, Platform, FlatList, KeyboardAvoidingView,
  ActivityIndicator, Keyboard,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import api from '../api/config';
import { getUsername } from '../utils/auth';
import { sanitizeInput } from '../utils/auth';
import { COLORS, RADIUS, SPACING, FONT } from '../utils/theme';

const QUICK_CHIPS = [
  { label: '💰 Budget Check', text: 'Budget kitna bacha hai?' },
  { label: '📊 Summary', text: 'Mera spending summary batao' },
  { label: '🍜 Top Category', text: 'Sabse jyada kaha kharcha kiya?' },
  { label: '💡 Save Tips', text: 'Paise bachane ke tips do' },
  { label: '📈 This Month', text: 'Is mahine ka total kharcha?' },
];

export default function AIChatScreen({ navigation }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [username, setUserName] = useState('User');
  const flatListRef = useRef(null);

  useEffect(() => {
    getUsername().then((name) => {
      if (name) setUserName(name);
    });
    // Welcome message
    setMessages([{
      id: 'welcome',
      role: 'bot',
      text: `Hey ${username}! 🤖 Main hoon PaisaMitra, tumhara personal AI financial coach.\n\nMujhse kuch bhi pucho — budget, savings tips, kaha kharcha kiya, ya koi bhi finance ka sawaal! 💰`,
      time: new Date(),
    }]);
  }, []);

  const sendMessage = async (text) => {
    const cleanText = sanitizeInput(text || inputText).trim();
    if (!cleanText || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: cleanText,
      time: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    Keyboard.dismiss();
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      const response = await api.post('/ai_chat/', {
        message: cleanText,
        history,
      });

      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: response.data?.reply || 'Oops! Kuch gadbad hui. Phir try karo! 😅',
        time: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      const errMsg = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: error.response?.status === 429
          ? '⏰ Rate limit reached! Thoda wait karo, phir try karo.'
          : '😅 Network issue. Please check your connection and try again.',
        time: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Text style={{ fontSize: 16 }}>🤖</Text>
          </View>
        )}
        <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.msgText, isUser ? styles.userText : styles.botText]}>
            {item.text}
          </Text>
          <Text style={[styles.msgTime, isUser && { color: 'rgba(255,255,255,0.5)' }]}>
            {item.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Text style={{ fontSize: 20 }}>🤖</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>PaisaMitra AI</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Chat List ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <View style={styles.chipContainer}>
              {QUICK_CHIPS.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.chip}
                  onPress={() => sendMessage(chip.text)}
                  disabled={loading}
                >
                  <Text style={styles.chipText}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          }
        />

      {/* ── Typing Indicator ── */}
      {loading && (
        <View style={styles.typingRow}>
          <View style={styles.botAvatar}>
            <Text style={{ fontSize: 14 }}>🤖</Text>
          </View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={COLORS.cyan} />
            <Text style={styles.typingText}>PaisaMitra is thinking...</Text>
          </View>
        </View>
      )}

        {/* ── Input Bar ── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything... (Hinglish bhi chalega!)"
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || loading}
          >
            <LinearGradient
              colors={inputText.trim() ? COLORS.gradCyan : ['#334155', '#334155']}
              style={styles.sendGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  backBtn: { padding: 8 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.cyan,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green, marginRight: 4 },
  onlineText: { color: COLORS.green, fontSize: 11 },

  // ── Chat List ──
  chatList: { padding: 16, paddingBottom: 8 },

  // ── Quick Chips ──
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  chip: {
    backgroundColor: COLORS.bgCard, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    marginRight: 8, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500' },

  // ── Messages ──
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  botAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center',
    marginRight: 8,
  },
  msgBubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: {
    backgroundColor: COLORS.primary, borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: COLORS.bgCard, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  msgText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  botText: { color: COLORS.textPrimary },
  msgTime: { color: COLORS.textMuted, fontSize: 10, marginTop: 4, textAlign: 'right' },

  // ── Typing ──
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  typingText: { color: COLORS.textMuted, fontSize: 12, marginLeft: 8 },

  // ── Input Bar ──
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.bg,
  },
  input: {
    flex: 1, backgroundColor: COLORS.bgCard,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    color: COLORS.textPrimary, fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: { marginLeft: 8 },
  sendBtnDisabled: { opacity: 0.5 },
  sendGrad: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
  },
});
