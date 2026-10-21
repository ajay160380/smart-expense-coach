

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, ActivityIndicator, Image, StyleSheet, Dimensions, Platform, Alert, Animated, FlatList, Modal, Switch, Pressable, Keyboard, SectionList, DeviceEventEmitter, RefreshControl, Linking, LayoutAnimation, UIManager } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import Logo from '../components/Logo';











import api from '../api/config';
import { formatApiError } from '../utils/errors';
import { validatePassword } from '../utils/validation';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1=Identifier, 2=OTP, 3=New Password
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendOTP = async () => {
    if (!identifier.trim()) {
      Alert.alert('Required Field', 'Please enter your registered phone number or email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/send-otp/', {
        identifier: identifier.trim(),
        action: 'reset'
      });
      Alert.alert('Code Sent! 📬', res.data?.message || 'Verification code sent. Please enter the OTP.');
      setOtp('');
      setStep(2);
      setResendCooldown(60);
    } catch (error) {
      Alert.alert('Request Failed', formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.trim().length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit OTP code sent to your phone or email.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/verify-otp/', {
        identifier: identifier.trim(),
        otp: otp.trim()
      });
      setStep(3);
    } catch (error) {
      Alert.alert('Verification Failed', formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const passCheck = validatePassword(newPassword, confirmPassword);
    if (!passCheck.isValid) {
      Alert.alert('Password Error', passCheck.error);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/reset-password/', {
        identifier: identifier.trim(),
        otp: otp.trim(),
        new_password: newPassword
      });
      Alert.alert('Password Reset Success! 🔒', res.data?.message || 'Your password was updated. You can now login.', [
        { text: 'Go to Login', onPress: () => navigation.replace('Login') }
      ]);
    } catch (error) {
      Alert.alert('Reset Failed', formatApiError(error));
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
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            if (step > 1) setStep(step - 1);
            else navigation.goBack();
          }}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoSmall}>
              <Logo size={0.7} circle={true} showText={false} />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'Enter your details to receive an OTP' : step === 2 ? 'Enter the OTP sent to you' : 'Create a new secure password'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            {step === 1 && (
              <>
                <Text style={styles.label}>REGISTERED PHONE OR EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 0000000000 or ajay@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity activeOpacity={0.85} onPress={handleSendOTP} disabled={loading} style={{marginTop: 10}}>
                  <LinearGradient colors={loading ? ['#E5E7EB', '#E5E7EB'] : ['#7C3AED', '#6D28D9']} style={styles.button}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.label}>ENTER 6-DIGIT OTP</Text>
                <TextInput
                  style={[styles.input, {fontSize: 24, textAlign: 'center', letterSpacing: 4}]}
                  placeholder="------"
                  placeholderTextColor="#9CA3AF"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity activeOpacity={0.85} onPress={handleVerifyOTP} disabled={loading} style={{marginTop: 10}}>
                  <LinearGradient colors={loading ? ['#E5E7EB', '#E5E7EB'] : ['#7C3AED', '#6D28D9']} style={styles.button}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSendOTP} style={{alignItems: 'center', marginTop: 15}}>
                  <Text style={styles.linkText}>Resend OTP</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 3 && (
              <>
                <Text style={styles.label}>NEW PASSWORD</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Min 6 characters"
                    placeholderTextColor="#9CA3AF"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
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
                </View>

                <TouchableOpacity activeOpacity={0.85} onPress={handleResetPassword} disabled={loading} style={{marginTop: 10}}>
                  <LinearGradient colors={loading ? ['#E5E7EB', '#E5E7EB'] : ['#7C3AED', '#6D28D9']} style={styles.button}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Set New Password</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7FB' },
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
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 },
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
  button: {
    height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  linkText: { color: '#FF6B35', fontSize: 14, fontWeight: 'bold' },
});
