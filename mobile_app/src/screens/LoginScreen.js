/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — LOGIN SCREEN (COMPACT, NO SCROLL)
 * Clean single-screen login with security features
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, ActivityIndicator, Image, StyleSheet, Dimensions, Platform, Alert, Animated, FlatList, Modal, Switch, Pressable, Keyboard, SectionList, DeviceEventEmitter, RefreshControl, Linking, LayoutAnimation, UIManager } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import Logo from '../components/Logo';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useGoogleAuth } from '../utils/googleAuth';

import api from '../api/config';
import {
  saveAuthData, sanitizeInput, checkLoginThrottle, recordLoginAttempt
} from '../utils/auth';
import { COLORS } from '../utils/theme';
import { formatApiError } from '../utils/errors';
import analytics from '../utils/analytics';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth({
    mode: 'login',
    onSuccess: () => {
      navigation.replace('MainTabs');
    },
    onAccountNotFound: (email, name) => {
      Alert.alert(
        'Account Not Found',
        `No account found with this email ID (${email || 'Google email'}).\n\nPlease create an account to get started.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Account',
            onPress: () => navigation.navigate('Register', { email, name }),
          },
        ]
      );
    },
    onError: (err) => {
      console.warn('Google sign-in error:', err);
    },
  });

  const handleLogin = async () => {
    const cleanUsername = sanitizeInput(username).trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      Alert.alert('Required Field', 'Please enter your username, email, or phone number.');
      return;
    }
    if (!cleanPassword) {
      Alert.alert('Required Field', 'Please enter your password.');
      return;
    }

    // Check client lockout throttle (Item 7 & 8)
    const throttle = await checkLoginThrottle();
    if (!throttle.allowed) {
      Alert.alert(
        'Too Many Attempts',
        `Account login is temporarily locked for security. Please try again in ${throttle.secsLeft || 60} seconds.`
      );
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/login/', {
        username: cleanUsername,
        password: cleanPassword,
      });
      const { token, user_id, username: apiUsername } = response.data;
      await recordLoginAttempt(true);
      await saveAuthData(token, user_id, apiUsername || cleanUsername);
      analytics.track('login_success', { user_id });
      navigation.replace('MainTabs');
    } catch (error) {
      await recordLoginAttempt(false);
      console.warn('Login error:', error);
      const isNotFound = error.response?.status === 404 || error.response?.data?.code === 'ACCOUNT_NOT_FOUND';
      if (isNotFound) {
        Alert.alert(
          'Account Not Found',
          error.response?.data?.error || 'No account found with this identifier. Please create an account to get started.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Create Account',
              onPress: () => navigation.navigate('Register', {
                email: cleanUsername.includes('@') ? cleanUsername : '',
                phone: !cleanUsername.includes('@') && cleanUsername.replace('+', '').match(/^\d+$/) ? cleanUsername : '',
              }),
            },
          ]
        );
      } else {
        Alert.alert('Login Failed', formatApiError(error, 'Invalid identifier or password.'));
      }
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
            <Text style={styles.label}>USERNAME, EMAIL OR PHONE</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your identifier"
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

            <View style={{alignItems: 'flex-end', marginTop: -4, marginBottom: 4}}>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={{color: '#1A73E8', fontSize: 13, fontWeight: '600'}}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading || googleLoading}
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

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In */}
            <GoogleSignInButton
              onPress={signInWithGoogle}
              loading={googleLoading}
              disabled={loading}
              title="Continue with Google"
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { color: '#6B7280', fontSize: 14 },
  linkText: { color: '#1A73E8', fontSize: 14, fontWeight: 'bold' },
});
