/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — DELETE ACCOUNT OTP MODAL
 * Prompts user for a 6-digit OTP sent to WhatsApp & Email.
 * Executes ultra-fast atomic deletion (<1s) and resets to Welcome.
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
  onClose,
  navigation,
}) {
  const { isDark } = useTheme();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [destination, setDestination] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const inputRef = useRef(null);

  // Auto-send OTP whenever the modal is opened
  useEffect(() => {
    if (visible) {
      setOtp('');
      setErrorMessage('');
      setLoading(false);
      setResendTimer(30);
      setSendingOtp(true);

      api.post('/api/auth/send-delete-account-otp/')
        .then((res) => {
          const dest = res.data?.destination || res.data?.message || 'your registered WhatsApp & Email';
          setDestination(dest);
        })
        .catch((err) => {
          setErrorMessage(formatApiError(err) || 'Could not dispatch OTP. You can try resending below.');
        })
        .finally(() => {
          setSendingOtp(false);
          setTimeout(() => {
            inputRef.current?.focus();
          }, 300);
        });
    }
  }, [visible]);

  // Resend countdown timer
  useEffect(() => {
    let interval = null;
    if (visible && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [visible, resendTimer]);

  const handleResendOTP = async () => {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    setErrorMessage('');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await api.post('/api/auth/send-delete-account-otp/');
      const dest = res.data?.destination || 'your registered contact';
      setDestination(dest);
      setResendTimer(30);
      Alert.alert('OTP Resent', res.data?.message || 'A fresh 6-digit OTP has been sent.');
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

      // Instantly clear auth session and local storage
      await clearAuthData();
      try {
        await AsyncStorage.clear();
      } catch (e) {}

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();

      Alert.alert(
        'Account Deleted',
        res.data?.message || 'Your account and all associated records have been permanently removed.'
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
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, isDark && styles.cardDark]}>
          {/* Header Row with Danger Icon & Close Button */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="trash" size={24} color="#DC2626" />
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[styles.closeBtn, isDark && styles.closeBtnDark]}
              disabled={loading}
            >
              <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Titles */}
          <Text style={[styles.title, isDark && styles.textLight]}>
            Delete Account Forever?
          </Text>
          <Text style={[styles.subtitle, isDark && styles.textMuted]}>
            This action is permanent and cannot be undone. Enter the 6-digit OTP code sent to confirm deletion.
          </Text>

          {/* Sending or Sent Banner */}
          {sendingOtp ? (
            <View style={[styles.statusBanner, isDark && styles.statusBannerDark]}>
              <ActivityIndicator size="small" color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.statusBannerText}>Sending OTP to WhatsApp & Email...</Text>
            </View>
          ) : destination ? (
            <View style={[styles.destinationPill, isDark && styles.destinationPillDark]}>
              <Ionicons name="shield-checkmark" size={15} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={[styles.destinationText, isDark && styles.textLight]} numberOfLines={2}>
                OTP sent to {destination}
              </Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {Boolean(errorMessage) && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* 6-Digit OTP Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, isDark && styles.textMuted]}>
              6-DIGIT VERIFICATION CODE
            </Text>
            <TextInput
              ref={inputRef}
              style={[styles.otpInput, isDark && styles.otpInputDark]}
              placeholder="• • • • • •"
              placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
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

          {/* Resend Row */}
          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <Text style={[styles.resendTimerText, isDark && styles.textMuted]}>
                Resend code in <Text style={{ fontWeight: '700', color: '#DC2626' }}>{resendTimer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={resending || loading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.resendActionText}>
                  {resending ? 'Sending...' : 'Resend OTP Code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Delete Danger Button */}
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
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.deleteButtonText}>Deleting Forever...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.deleteButtonText}>Permanently Delete Account</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnText, isDark && styles.textMuted]}>
              Cancel, Keep My Account
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  cardDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(239, 68, 68, 0.30)',
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnDark: {
    backgroundColor: '#334155',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 14,
  },
  textLight: {
    color: '#F8FAFC',
  },
  textMuted: {
    color: '#94A3B8',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
  },
  statusBannerDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  destinationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
  },
  destinationPillDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  destinationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  otpInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 14,
    height: 56,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 8,
  },
  otpInputDark: {
    backgroundColor: '#0F172A',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    color: '#F8FAFC',
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 16,
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
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    ...SHADOW.medium,
  },
  disabledButton: {
    opacity: 0.6,
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});
