/**
 * ═══════════════════════════════════════════════════════════════
 * DELETE ACCOUNT OTP VERIFICATION MODAL
 * Prompts user for a 6-digit OTP sent to their WhatsApp/Email
 * before executing permanent, instant account deletion.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
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
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api from '../api/config';
import { clearAuthData } from '../utils/auth';
import { formatApiError } from '../utils/errors';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SHADOW } from '../utils/theme';

export default function DeleteAccountModal({
  visible,
  destinationInfo,
  onClose,
  navigation,
}) {
  const { isDark } = useTheme();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setOtp('');
      setErrorMessage('');
      setResendTimer(30);
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [visible]);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleResendOTP = async () => {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    setErrorMessage('');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await api.post('/api/auth/send-delete-account-otp/');
      setResendTimer(30);
      Alert.alert('OTP Resent', res.data?.message || 'A fresh 6-digit OTP has been dispatched.');
    } catch (err) {
      setErrorMessage(formatApiError(err) || 'Could not resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleConfirmDelete = async () => {
    const cleanOtp = otp.trim();
    if (cleanOtp.length < 6) {
      setErrorMessage('Please enter the full 6-digit OTP code.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    try {
      const res = await api.post('/api/auth/delete-account/', { otp: cleanOtp });
      
      // Instantly clear auth session and stored data
      await clearAuthData();
      try {
        await AsyncStorage.clear();
      } catch (e) {}

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();

      Alert.alert(
        'Account Deleted Forever',
        res.data?.message || 'Your account and all associated financial records have been permanently deleted.'
      );

      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (err) {
      const msg = err.response?.data?.error || formatApiError(err) || 'Account deletion failed. Please check your OTP.';
      setErrorMessage(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.card, isDark && styles.cardDark]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Danger Header Icon ── */}
            <View style={styles.iconCircle}>
              <LinearGradient
                colors={['#FEE2E2', '#FECACA']}
                style={styles.iconGradient}
              >
                <Ionicons name="trash" size={32} color="#DC2626" />
              </LinearGradient>
            </View>

            {/* ── Titles ── */}
            <Text style={[styles.title, isDark && styles.textLight]}>
              Delete Account Forever?
            </Text>
            <Text style={[styles.subtitle, isDark && styles.textMuted]}>
              This action is permanent and cannot be undone. Enter the 6-digit OTP code sent to your registered WhatsApp & Email to confirm deletion.
            </Text>

            {destinationInfo ? (
              <View style={[styles.destinationPill, isDark && styles.destinationPillDark]}>
                <Ionicons name="shield-checkmark" size={16} color="#DC2626" />
                <Text style={[styles.destinationText, isDark && styles.textLight]} numberOfLines={1}>
                  {destinationInfo}
                </Text>
              </View>
            ) : null}

            {/* ── Error Banner ── */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* ── 6-Digit OTP Input ── */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isDark && styles.textMuted]}>
                6-DIGIT VERIFICATION CODE
              </Text>
              <TextInput
                ref={inputRef}
                style={[styles.otpInput, isDark && styles.otpInputDark]}
                placeholder="• • • • • •"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(val) => {
                  setOtp(val.replace(/[^0-9]/g, ''));
                  if (errorMessage) setErrorMessage('');
                }}
                editable={!loading}
              />
            </View>

            {/* ── Resend Code ── */}
            <View style={styles.resendRow}>
              {resendTimer > 0 ? (
                <Text style={[styles.resendTimerText, isDark && styles.textMuted]}>
                  Resend code in <Text style={{ fontWeight: '700', color: '#DC2626' }}>{resendTimer}s</Text>
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={resending || loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.resendActionText}>
                    {resending ? 'Sending...' : 'Resend OTP Code'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Confirm Danger Button ── */}
            <TouchableOpacity
              style={[
                styles.deleteButton,
                (otp.length < 6 || loading) && styles.disabledButton,
              ]}
              onPress={handleConfirmDelete}
              disabled={otp.length < 6 || loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={otp.length === 6 ? ['#EF4444', '#DC2626'] : ['#FCA5A5', '#F87171']}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.deleteButtonText}>Deleting Forever...</Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteButtonText}>Permanently Delete Account</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Cancel Button ── */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, isDark && styles.textLight]}>
                Cancel, Keep My Account
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    ...SHADOW.large,
    elevation: 10,
  },
  cardDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 16,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  textLight: {
    color: '#F8FAFC',
  },
  textMuted: {
    color: '#94A3B8',
  },
  destinationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.round,
    marginBottom: 16,
  },
  destinationPillDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  destinationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    marginLeft: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    width: '100%',
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 16,
    height: 56,
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 10,
  },
  otpInputDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    color: '#F8FAFC',
  },
  resendRow: {
    marginBottom: 20,
    alignItems: 'center',
  },
  resendTimerText: {
    fontSize: 12,
    color: '#64748B',
  },
  resendActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  deleteButton: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  disabledButton: {
    opacity: 0.55,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
