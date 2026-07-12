/**
 * ═══════════════════════════════════════════════════════════════
 * PAISA MITRA — LOGIN SCREEN (SECURITY HARDENED)
 * Input sanitization, show/hide password, login throttling
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView, Platform,
  ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../api/config';
import {
  saveAuthData, sanitizeInput, checkLoginThrottle,
  recordLoginAttempt,
} from '../utils/auth';
import { COLORS, RADIUS } from '../utils/theme';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [throttleMsg, setThrottleMsg] = useState('');

  useEffect(() => {
    checkThrottle();
  }, []);

  const checkThrottle = async () => {
    const result = await checkLoginThrottle();
    if (!result.allowed) {
      setThrottleMsg(`Too many attempts. Try again in ${result.secsLeft}s`);
    } else {
      setThrottleMsg('');
    }
  };

  const handleLogin = async () => {
    const cleanUsername = sanitizeInput(username).trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    // Check throttle
    const throttle = await checkLoginThrottle();
    if (!throttle.allowed) {
      Alert.alert('Too Many Attempts', `Please wait ${throttle.secsLeft} seconds before trying again.`);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/login/', {
        username: cleanUsername,
        password: cleanPassword,
      });

      const { token, user_id } = response.data;
      await saveAuthData(token, user_id, cleanUsername);
      await recordLoginAttempt(true);

      navigation.replace('MainTabs');
    } catch (error) {
      console.error(error);
      await recordLoginAttempt(false);
      const throttle2 = await checkLoginThrottle();
      const remaining = throttle2.remaining || 0;

      Alert.alert(
        'Login Failed',
        `Invalid username or password.${remaining > 0 ? ` ${remaining} attempts remaining.` : ''}`
      );
      checkThrottle();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>

          <View style={styles.card}>

            {/* Top Gradient Area */}
            <LinearGradient
              colors={['#A888FF', '#9333EA']}
              style={styles.gradientSection}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.gradientTitle}>Track Expenses with a Single Text.</Text>
              <Text style={styles.gradientSubtitle}>
                Welcome to PaisaMitra. The smartest way to manage your budget directly from WhatsApp.
              </Text>

              <View style={styles.mockChat}>
                <View style={styles.botHeader}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.botName}>PaisaMitra Bot</Text>
                </View>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>500 petrol</Text>
                </View>
                <View style={styles.botBubble}>
                  <Text style={styles.botText}>💸 ₹500 for petrol saved! You have ₹14,500 remaining in your budget. 🚗</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Bottom Form Area */}
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>Sign in to continue your journey to financial freedom.</Text>

              {throttleMsg ? (
                <View style={styles.throttleBox}>
                  <Text style={styles.throttleText}>🔒 {throttleMsg}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <Text style={styles.label}>PHONE NUMBER OR USERNAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone or username"
                  placeholderTextColor="#64748b"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.button, (loading || throttleMsg) && { opacity: 0.6 }]}
                  onPress={handleLogin}
                  disabled={loading || !!throttleMsg}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Sign In to Dashboard</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.linkText}>Create one now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  scrollContent: { padding: 16, flexGrow: 1, justifyContent: 'center' },
  card: {
    backgroundColor: '#1E293B', borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  gradientSection: { padding: 30 },
  gradientTitle: { fontSize: 28, fontWeight: '900', color: '#ffffff', marginBottom: 10 },
  gradientSubtitle: { fontSize: 14, color: '#f8fafc', opacity: 0.9, marginBottom: 30, lineHeight: 20 },
  mockChat: { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  botHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80', marginRight: 8 },
  botName: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  userBubble: { backgroundColor: '#dcf8c6', alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderBottomRightRadius: 4, marginBottom: 15 },
  userText: { color: '#064e3b', fontWeight: '600' },
  botBubble: { backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderBottomLeftRadius: 4, maxWidth: '90%' },
  botText: { color: '#1e293b', fontSize: 13, lineHeight: 18 },
  formSection: { padding: 30 },
  formTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8 },
  formSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  throttleBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  throttleText: { color: COLORS.red, fontSize: 13, textAlign: 'center' },
  form: { gap: 14 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: -6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, color: '#f8fafc', fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  passwordInput: { flex: 1, padding: 16, color: '#f8fafc', fontSize: 16 },
  eyeBtn: { padding: 16 },
  button: {
    backgroundColor: '#A888FF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#A888FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { color: '#94a3b8', fontSize: 14 },
  linkText: { color: '#A888FF', fontSize: 14, fontWeight: 'bold' },
});
