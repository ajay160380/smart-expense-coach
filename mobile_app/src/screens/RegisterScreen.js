/**
 * ═══════════════════════════════════════════════════════════════
 * PAISA MITRA — REGISTER SCREEN (SECURITY HARDENED)
 * Password strength meter, input validation, confirmation match
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView, Platform,
  ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import api from '../api/config';
import { sanitizeInput, isValidPhone, checkPasswordStrength, saveAuthData } from '../utils/auth';
import { COLORS } from '../utils/theme';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const pwStrength = checkPasswordStrength(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;

  const handleRegister = async () => {
    const cleanUsername = sanitizeInput(username).trim();
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!cleanUsername) { Alert.alert('Error', 'Username is required'); return; }
    if (cleanUsername.length < 3) { Alert.alert('Error', 'Username must be at least 3 characters'); return; }
    if (!cleanPhone || !isValidPhone(cleanPhone)) { Alert.alert('Error', 'Enter a valid phone number (10-15 digits)'); return; }
    if (!password) { Alert.alert('Error', 'Password is required'); return; }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }

    setLoading(true);
    try {
      // 1. Register the new account
      await api.post('/api/register/', {
        username: cleanUsername,
        phone_number: cleanPhone,
        password: password,
      });

      // 2. Auto-login using the new credentials
      const loginRes = await api.post('/api/login/', {
        username: cleanUsername,
        password: password,
      });

      const { token, user_id } = loginRes.data;
      await saveAuthData(token, user_id, cleanUsername);

      // 3. Redirect directly to Dashboard
      navigation.replace('MainTabs');
    } catch (error) {
      console.error(error);
      const errData = error.response?.data;
      let errMsg = 'Registration failed';
      if (errData) {
        if (typeof errData === 'object') {
          errMsg = Object.values(errData).flat().join('\n');
        } else {
          errMsg = String(errData);
        }
      }
      Alert.alert('Error', errMsg);
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
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>

          <View style={styles.card}>

            {/* Top Gradient Area */}
            <LinearGradient
              colors={['#A888FF', '#9333EA']}
              style={styles.gradientSection}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.gradientTitle}>Join PaisaMitra Today.</Text>
              <Text style={styles.gradientSubtitle}>
                Track expenses easily through WhatsApp. Stay within your budget effortlessly.
              </Text>

              <View style={styles.mockChat}>
                <View style={styles.botHeader}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.botName}>PaisaMitra Bot</Text>
                </View>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>200 dinner</Text>
                </View>
                <View style={styles.botBubble}>
                  <Text style={styles.botText}>💬 ₹200 for dinner saved. Keep it up!</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Bottom Form Area */}
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Create Account</Text>
              <Text style={styles.formSubtitle}>Join thousands taking control of their finances.</Text>

              <View style={styles.form}>

                <Text style={styles.label}>USERNAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Choose a username (min 3 chars)"
                  placeholderTextColor="#64748b"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={50}
                />

                <Text style={styles.label}>WHATSAPP NUMBER</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 917379053923"
                  placeholderTextColor="#64748b"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={15}
                />

                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Min 6 characters"
                    placeholderTextColor="#64748b"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <View style={styles.strengthSection}>
                    <View style={styles.strengthBarBg}>
                      <View style={[styles.strengthBarFill, {
                        width: `${(pwStrength.score / 4) * 100}%`,
                        backgroundColor: pwStrength.color,
                      }]} />
                    </View>
                    <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>
                      {pwStrength.label}
                    </Text>
                  </View>
                )}

                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Re-enter password"
                    placeholderTextColor="#64748b"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  {confirmPassword.length > 0 && (
                    <View style={styles.matchIndicator}>
                      <Ionicons
                        name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                        size={20}
                        color={passwordsMatch ? COLORS.green : COLORS.red}
                      />
                    </View>
                  )}
                </View>
                {passwordsMismatch && (
                  <Text style={styles.mismatchText}>Passwords don't match</Text>
                )}

                <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Sign Up Free</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.linkText}>Log in instead</Text>
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
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, marginBottom: 20,
  },
  gradientSection: { padding: 28 },
  gradientTitle: { fontSize: 26, fontWeight: '900', color: '#ffffff', marginBottom: 8 },
  gradientSubtitle: { fontSize: 14, color: '#f8fafc', opacity: 0.9, marginBottom: 24, lineHeight: 20 },
  mockChat: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  botHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80', marginRight: 8 },
  botName: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  userBubble: { backgroundColor: '#dcf8c6', alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderBottomRightRadius: 4, marginBottom: 12 },
  userText: { color: '#064e3b', fontWeight: '600' },
  botBubble: { backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderBottomLeftRadius: 4, maxWidth: '90%' },
  botText: { color: '#1e293b', fontSize: 13, lineHeight: 18 },
  formSection: { padding: 28 },
  formTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', marginBottom: 6 },
  formSubtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 24 },
  form: { gap: 12 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: -4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#0f172a', borderRadius: 12, padding: 14, color: '#f8fafc', fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  passwordInput: { flex: 1, padding: 14, color: '#f8fafc', fontSize: 15 },
  eyeBtn: { padding: 14 },
  matchIndicator: { padding: 14 },
  strengthSection: { flexDirection: 'row', alignItems: 'center', marginTop: -4 },
  strengthBarBg: { flex: 1, height: 4, backgroundColor: '#334155', borderRadius: 2, overflow: 'hidden', marginRight: 10 },
  strengthBarFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: 'bold' },
  mismatchText: { color: COLORS.red, fontSize: 12, marginTop: -4 },
  button: {
    backgroundColor: '#A888FF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#A888FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  footerText: { color: '#94a3b8', fontSize: 14 },
  linkText: { color: '#A888FF', fontSize: 14, fontWeight: 'bold' },
});
