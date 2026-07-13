/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — LOGIN SCREEN (COMPACT, NO SCROLL)
 * Clean single-screen login with security features
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
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
import {
  saveAuthData, sanitizeInput,
} from '../utils/auth';
import { COLORS } from '../utils/theme';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);



  const handleLogin = async () => {
    const cleanUsername = sanitizeInput(username).trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      Alert.alert('Error', 'Please enter username and password');
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
      navigation.replace('MainTabs');
    } catch (error) {
      console.error(error);
      Alert.alert('Login Failed', 'Invalid username or password.');
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            <Text style={styles.label}>USERNAME OR PHONE</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
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

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#E5E7EB', '#E5E7EB'] : ['#1A73E8', '#1A73E8']}
                style={styles.button}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.replace('Register')}>
              <Text style={styles.linkText}>Create one</Text>
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

  header: { alignItems: 'center', marginBottom: 36 },
  logoSmall: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6B7280' },

  formSection: { gap: 14 },
  throttleBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  throttleText: { color: COLORS.red, fontSize: 13, textAlign: 'center' },
  label: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: -6 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    color: '#111827', fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  passwordInput: { flex: 1, padding: 16, color: '#111827', fontSize: 16 },
  eyeBtn: { padding: 16 },
  button: {
    height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    marginTop: 4,
    shadowColor: '#1A73E8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { color: '#6B7280', fontSize: 14 },
  linkText: { color: '#1A73E8', fontSize: 14, fontWeight: 'bold' },
});
