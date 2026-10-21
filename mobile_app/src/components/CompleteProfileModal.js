/**
 * ═══════════════════════════════════════════════════════════════
 * COMPLETE PROFILE MODAL (GOOGLE ONBOARDING)
 * Prompts user for Mobile Number & Full Name after Google Sign-In
 * Verifies mobile number with OTP and checks uniqueness
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api/config';
import { saveAuthData } from '../utils/auth';
import analytics from '../utils/analytics';
import { formatApiError } from '../utils/errors';

export default function CompleteProfileModal({
  visible,
  userData,
  onComplete,
  onCancel,
}) {
  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (visible && userData) {
      setName(userData.name || userData.username || '');
      setPhone('');
      setOtp('');
      setStep(1);
      setErrorMessage('');
      setResendTimer(0);
    }
  }, [visible, userData]);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOTP = async () => {
    setErrorMessage('');
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    if (cleanDigits.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const phoneTarget = `91${cleanDigits}`;
      const res = await api.post('/api/auth/send-otp/', {
        phone_number: phoneTarget,
        identifier: phoneTarget,
        action: 'link_phone',
      });

      setStep(2);
      setResendTimer(30);
      Alert.alert(
        'OTP Sent 📬',
        res.data?.message || `A 6-digit verification code has been sent to +91 ${cleanDigits} via WhatsApp & SMS.`
      );
    } catch (err) {
      const code = err.response?.data?.code;
      const errorText = err.response?.data?.error || formatApiError(err, 'Failed to send OTP.');
      if (code === 'PHONE_ALREADY_EXISTS') {
        setErrorMessage('This mobile number is already registered with another account. Please use a different number.');
      } else {
        setErrorMessage(errorText);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndComplete = async () => {
    setErrorMessage('');
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }

    const cleanDigits = phone.replace(/[^0-9]/g, '');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/complete-google-profile/', {
        token: userData?.token,
        phone_number: `91${cleanDigits}`,
        otp: cleanOtp,
        name: name.trim(),
      });

      const { token, user_id, username } = res.data;
      await saveAuthData(token || userData?.token, user_id || userData?.user_id, username || userData?.username);
      analytics.track('google_onboarding_completed', { user_id: user_id || userData?.user_id });

      Alert.alert('Profile Complete! 🎉', 'Your mobile number and Google email are verified.');
      if (onComplete) {
        onComplete(res.data);
      }
    } catch (err) {
      const code = err.response?.data?.code;
      const errorText = err.response?.data?.error || formatApiError(err, 'Verification failed.');
      if (code === 'PHONE_ALREADY_EXISTS') {
        setErrorMessage('This mobile number is already registered with another account.');
        setStep(1);
      } else {
        setErrorMessage(errorText);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View style={styles.sheetContainer}>
            {/* Handle Bar */}
            <View style={styles.handleBar} />

            {/* Close Button */}
            <TouchableOpacity style={styles.closeBtn} onPress={onCancel} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Badge */}
              <View style={styles.badgeWrap}>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={13} color="#10B981" style={{ marginRight: 4 }} />
                  <Text style={styles.verifiedBadgeText}>Google Account Verified</Text>
                </View>
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.sheetTitle}>
                {step === 1 ? 'Almost There! 🚀' : 'Verify Mobile Number 📲'}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {step === 1
                  ? 'Please link your WhatsApp mobile number to complete your profile setup.'
                  : `Enter the 6-digit OTP code sent to +91 ${phone}`}
              </Text>

              {/* Google User Info Box */}
              <View style={styles.googleBox}>
                <Ionicons name="logo-google" size={18} color="#4285F4" style={{ marginRight: 8 }} />
                <Text style={styles.googleBoxText} numberOfLines={1}>
                  {userData?.email || 'Google Account'}
                </Text>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginLeft: 6 }} />
              </View>

              {/* Inline Error Message */}
              {Boolean(errorMessage) && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {step === 1 ? (
                /* STEP 1: Full Name & Mobile Number */
                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>FULL NAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                    editable={!loading}
                  />

                  <Text style={styles.inputLabel}>WHATSAPP / MOBILE NUMBER</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCodeBox}>
                      <Text style={styles.flagEmoji}>🇮🇳</Text>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <View style={styles.phoneDivider} />
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="98765 43210"
                      placeholderTextColor="#9CA3AF"
                      value={phone}
                      onChangeText={(val) => {
                        setPhone(val);
                        if (errorMessage) setErrorMessage('');
                      }}
                      keyboardType="phone-pad"
                      maxLength={10}
                      editable={!loading}
                      autoFocus
                    />
                  </View>

                  <Text style={styles.helperText}>
                    🔒 We will send a 6-digit OTP to verify your mobile number.
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleSendOTP}
                    disabled={loading}
                    style={{ marginTop: 10 }}
                  >
                    <LinearGradient
                      colors={loading ? ['#E5E7EB', '#E5E7EB'] : ['#1A73E8', '#1557B0']}
                      style={styles.primaryBtn}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={styles.primaryBtnText}>Send Verification OTP</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                /* STEP 2: Enter OTP */
                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>ENTER 6-DIGIT VERIFICATION CODE</Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="••••••"
                    placeholderTextColor="#9CA3AF"
                    value={otp}
                    onChangeText={(val) => {
                      setOtp(val);
                      if (errorMessage) setErrorMessage('');
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    editable={!loading}
                  />

                  {/* Resend & Change row */}
                  <View style={styles.otpActionsRow}>
                    <TouchableOpacity
                      onPress={() => { setStep(1); setErrorMessage(''); }}
                      disabled={loading}
                    >
                      <Text style={styles.changePhoneText}>← Change Number</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSendOTP}
                      disabled={loading || resendTimer > 0}
                    >
                      <Text style={[styles.resendText, resendTimer > 0 && { color: '#9CA3AF' }]}>
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleVerifyAndComplete}
                    disabled={loading}
                    style={{ marginTop: 14 }}
                  >
                    <LinearGradient
                      colors={loading ? ['#E5E7EB', '#E5E7EB'] : ['#10B981', '#059669']}
                      style={styles.primaryBtn}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="shield-checkmark" size={18} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={styles.primaryBtnText}>Verify & Complete Setup 🚀</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollContent: {
    paddingTop: 6,
    paddingBottom: 20,
  },
  badgeWrap: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  verifiedBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  googleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  googleBoxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  formSection: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
  },
  flagEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#D1D5DB',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 13,
    fontSize: 16,
    color: '#111827',
    letterSpacing: 1,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -2,
    marginBottom: 4,
  },
  otpInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  otpActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  changePhoneText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  resendText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '700',
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
