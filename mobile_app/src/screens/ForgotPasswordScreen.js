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
import { COLORS } from '../utils/theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1=Identifier, 2=OTP, 3=New Password
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!identifier.trim()) {
      Alert.alert('Error', 'Please enter your phone number or email');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/send-otp/', {
        identifier: identifier.trim(),
        action: 'reset'
      });
      Alert.alert('OTP Sent', res.data.message);
      setStep(2);
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Failed to send OTP';
      Alert.alert('Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/verify-otp/', {
        identifier: identifier.trim(),
        otp: otp
      });
      setStep(3);
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Invalid OTP';
      Alert.alert('Error', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/reset-password/', {
        identifier: identifier.trim(),
        otp: otp,
        new_password: newPassword
      });
      Alert.alert('Success', res.data.message);
      navigation.replace('Login');
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Failed to reset password';
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
                  <LinearGradient colors={loading ? ['#E5E7EB', '#E5E7EB'] : ['#1A73E8', '#1A73E8']} style={styles.button}>
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
                  <LinearGradient colors={loading ? ['#E5E7EB', '#E5E7EB'] : ['#1A73E8', '#1A73E8']} style={styles.button}>
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
                  <LinearGradient colors={loading ? ['#E5E7EB', '#E5E7EB'] : ['#1A73E8', '#1A73E8']} style={styles.button}>
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
    shadowColor: '#1A73E8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  linkText: { color: '#1A73E8', fontSize: 14, fontWeight: 'bold' },
});
