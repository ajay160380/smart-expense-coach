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

  const [loginMethod, setLoginMethod] = useState('password'); // 'password' | 'otp'
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

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

  const handleSendLoginOTP = async () => {
    const cleanUsername = sanitizeInput(username).trim();
    if (!cleanUsername) {
      Alert.alert('Required Field', 'Please enter your username, email, or phone number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/send-otp/', {
        identifier: cleanUsername,
        action: 'login',
      });
      setOtpSent(true);
      setResendTimer(30);
      Alert.alert(
        'OTP Sent 📬',
        res.data?.message || 'Verification OTP sent to your registered WhatsApp & Email. Enter the code to verify & sign in.'
      );
    } catch (error) {
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
        Alert.alert('Error Sending OTP', formatApiError(error, 'Could not send verification OTP.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOTP = async () => {
    const cleanUsername = sanitizeInput(username).trim();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auth/login-otp/', {
        identifier: cleanUsername,
        otp: cleanOtp,
      });
      const { token, user_id, username: apiUsername } = response.data;
      await recordLoginAttempt(true);
      await saveAuthData(token, user_id, apiUsername || cleanUsername);
      analytics.track('login_otp_success', { user_id });
      navigation.replace('MainTabs');
    } catch (error) {
      console.warn('Login OTP error:', error);
      Alert.alert('Verification Failed', formatApiError(error, 'Invalid or expired OTP code.'));
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
            {/* Login Method Toggle */}
            <View style={styles.methodToggleWrap}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.methodTab, loginMethod === 'password' && styles.methodTabActive]}
                onPress={() => { setLoginMethod('password'); setOtpSent(false); }}
              >
                <Ionicons
                  name="key-outline"
                  size={15}
                  color={loginMethod === 'password' ? '#1A73E8' : '#6B7280'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.methodTabText, loginMethod === 'password' && styles.methodTabTextActive]}>
                  Password
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.methodTab, loginMethod === 'otp' && styles.methodTabActive]}
                onPress={() => setLoginMethod('otp')}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={15}
                  color={loginMethod === 'otp' ? '#10B981' : '#6B7280'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.methodTabText, loginMethod === 'otp' && { color: '#10B981', fontWeight: '700' }]}>
                  Verify with OTP
                </Text>
                <View style={styles.secureBadge}>
                  <Text style={styles.secureBadgeText}>VERIFY</Text>
                </View>
              </TouchableOpacity>
            </View>

            {loginMethod === 'otp' ? (
              <>
                <Text style={styles.label}>USERNAME, EMAIL OR PHONE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. user@gmail.com or 9876543210"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={(val) => { setUsername(val); if (otpSent) setOtpSent(false); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />

                {otpSent ? (
                  <>
                    <View style={styles.otpBanner}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                      <Text style={styles.otpBannerText}>
                        OTP sent to WhatsApp & Email. Enter 6-digit code:
                      </Text>
                    </View>

                    <Text style={styles.label}>6-DIGIT VERIFICATION CODE</Text>
                    <TextInput
                      style={[styles.input, { textAlign: 'center', fontSize: 22, letterSpacing: 6, fontWeight: '700' }]}
                      placeholder="••••••"
                      placeholderTextColor="#9CA3AF"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={() => setOtpSent(false)}
                        disabled={loading}
                      >
                        <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600' }}>← Change Input</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleSendLoginOTP}
                        disabled={loading || resendTimer > 0}
                      >
                        <Text style={{ color: resendTimer > 0 ? '#9CA3AF' : '#10B981', fontSize: 13, fontWeight: '700' }}>
                          {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleVerifyLoginOTP}
                      disabled={loading || googleLoading}
                    >
                      <LinearGradient
                        colors={loading ? ['#E5E7EB', '#E5E7EB'] : ['#10B981', '#059669']}
                        style={styles.button}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="shield-checkmark" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Verify & Sign In</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.otpHelperBox}>
                      <Ionicons name="information-circle-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
                      <Text style={styles.otpHelperText}>
                        We&apos;ll send an OTP to your WhatsApp & Email to verify and log you in simultaneously.
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleSendLoginOTP}
                      disabled={loading || googleLoading}
                    >
                      <LinearGradient
                        colors={loading ? ['#E5E7EB', '#E5E7EB'] : ['#10B981', '#059669']}
                        style={styles.button}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Send Verification OTP</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </>
            ) : (
              <>
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
              </>
            )}

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

  methodToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 4,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  methodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  methodTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  methodTabTextActive: {
    color: '#1A73E8',
    fontWeight: '700',
  },
  secureBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  secureBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  otpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  otpBannerText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  otpHelperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  otpHelperText: {
    color: '#065F46',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
});
