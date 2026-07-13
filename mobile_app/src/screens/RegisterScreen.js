/**
 * ═══════════════════════════════════════════════════════════════
 * PAISA MITRA — REGISTER SCREEN (COMPACT, NO SCROLL)
 * Clean single-screen registration
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo';
import api from '../api/config';
import { sanitizeInput, isValidPhone, checkPasswordStrength, saveAuthData } from '../utils/auth';
import { COLORS } from '../utils/theme';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
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
      await api.post('/api/register/', {
        username: cleanUsername,
        phone_number: cleanPhone,
        password: password,
      });
      const loginRes = await api.post('/api/login/', {
        username: cleanUsername,
        password: password,
      });
      const { token, user_id } = loginRes.data;
      await saveAuthData(token, user_id, cleanUsername);
      navigation.replace('MainTabs');
    } catch (error) {
      console.error(error);
      const errData = error.response?.data;
      let errMsg = 'Registration failed';
      if (errData) {
        errMsg = typeof errData === 'object' ? Object.values(errData).flat().join('\n') : String(errData);
      }
      Alert.alert('Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoSmall}>
              <Logo size={0.7} circle={true} showText={false} />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join EXPANSE TRACKER — it's free!</Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            <Text style={styles.label}>USERNAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a username"
              placeholderTextColor="#9CA3AF"
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
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={15}
            />

            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Min 6 characters"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Password Strength */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBg}>
                  <View style={[styles.strengthFill, { width: `${(pwStrength.score / 4) * 100}%`, backgroundColor: pwStrength.color }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text>
              </View>
            )}

            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              {confirmPassword.length > 0 && (
                <View style={styles.matchIcon}>
                  <Ionicons
                    name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={passwordsMatch ? COLORS.green : COLORS.red}
                  />
                </View>
              )}
            </View>
            {passwordsMismatch && <Text style={styles.mismatchText}>Passwords don't match</Text>}

            <TouchableOpacity activeOpacity={0.85} onPress={handleRegister} disabled={loading}>
              <LinearGradient
                colors={loading ? ['#E5E7EB', '#E5E7EB'] : ['#1A73E8', '#1A73E8']}
                style={styles.button}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up Free</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.replace('Login')}>
              <Text style={styles.linkText}>Log in</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  keyboardView: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },

  backBtn: {
    position: 'absolute', top: 10, left: 0, zIndex: 10,
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    justifyContent: 'center', alignItems: 'center',
  },

  header: { alignItems: 'center', marginBottom: 28 },
  logoSmall: { marginBottom: 14 },
  title: { fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },

  formSection: { gap: 10 },
  label: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: -4 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    color: '#111827', fontSize: 15, borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  passwordInput: { flex: 1, padding: 14, color: '#111827', fontSize: 15 },
  eyeBtn: { padding: 14 },
  matchIcon: { padding: 14 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: -4 },
  strengthBg: { flex: 1, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginRight: 10 },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: 'bold' },
  mismatchText: { color: COLORS.red, fontSize: 12, marginTop: -4 },
  button: {
    height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    marginTop: 4,
    shadowColor: '#1A73E8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  footerText: { color: '#6B7280', fontSize: 14 },
  linkText: { color: '#1A73E8', fontSize: 14, fontWeight: 'bold' },
});
