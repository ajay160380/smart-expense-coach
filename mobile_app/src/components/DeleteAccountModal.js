/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — CONFIRM DELETE ACCOUNT MODAL
 * Prompts user to type "DELETE" to permanently erase their account.
 * Ultra-fast atomic execution (<1s), zero OTP delays, zero waiting.
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api from '../api/config';
import { clearAuthData, getToken } from '../utils/auth';
import { formatApiError } from '../utils/errors';
import { useTheme } from '../theme/ThemeContext';
import { SHADOW } from '../utils/theme';

export default function DeleteAccountModal({
  visible,
  onClose,
  navigation,
}) {
  const { isDark } = useTheme();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef(null);

  const isConfirmed = confirmText.trim().toUpperCase() === 'DELETE';

  useEffect(() => {
    if (visible) {
      setConfirmText('');
      setErrorMessage('');
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [visible]);

  const handleAutofill = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfirmText('DELETE');
    if (errorMessage) setErrorMessage('');
  };

  const handleConfirmDelete = async () => {
    if (!isConfirmed) {
      setErrorMessage('Please type "DELETE" exactly to confirm.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (loading) return;

    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Get active token BEFORE clearing local auth
      const token = await getToken();

      // 2. Call backend deletion API with explicit token
      await api.post(
        '/api/auth/delete-account/',
        {
          confirmation: 'DELETE',
          otp: 'DELETE',
        },
        {
          headers: token ? { Authorization: `Token ${token}` } : {},
          timeout: 15000,
        }
      );

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      // 3. Clear local auth and all storage
      await clearAuthData();
      try {
        await AsyncStorage.clear();
      } catch (e) {}

      onClose();

      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been permanently erased from the server.'
      );

      // 4. Safe navigation reset to Login screen
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } catch (navErr) {
        try {
          navigation.getParent()?.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        } catch (e2) {}
      }
    } catch (err) {
      console.error('Delete account error:', err);
      const errMsg = formatApiError(err, 'Failed to delete account from server. Please try again.');
      setErrorMessage(errMsg);
      Alert.alert('Deletion Error', errMsg);
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
            This action is permanent and cannot be undone. All your expenses, budgets, savings goals, and history will be completely erased.
          </Text>

          {/* Instruction Card */}
          <View style={[styles.instructionBox, isDark && styles.instructionBoxDark]}>
            <View style={styles.instructionHeader}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={[styles.instructionTitle, isDark && styles.textLight]}>
                CONFIRM DELETION
              </Text>
            </View>
            <Text style={[styles.instructionText, isDark && styles.textMuted]}>
              To confirm, please type <Text style={styles.boldKeyword}>DELETE</Text> in the box below:
            </Text>
            <TouchableOpacity
              style={styles.autofillChip}
              onPress={handleAutofill}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Ionicons name="flash" size={12} color="#DC2626" style={{ marginRight: 4 }} />
              <Text style={styles.autofillChipText}>1-Tap Fill "DELETE"</Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {Boolean(errorMessage) && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Text Input for "DELETE" */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                isDark && styles.textInputDark,
                isConfirmed && styles.textInputConfirmed,
              ]}
              placeholder="Type DELETE"
              placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
              autoCapitalize="characters"
              autoCorrect={false}
              value={confirmText}
              onChangeText={(val) => {
                setConfirmText(val);
                if (errorMessage) setErrorMessage('');
              }}
              editable={!loading}
            />
          </View>

          {/* Delete Danger Button */}
          <TouchableOpacity
            style={[
              styles.deleteButton,
              (!isConfirmed || loading) && styles.disabledButton,
            ]}
            onPress={handleConfirmDelete}
            disabled={!isConfirmed || loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isConfirmed ? ['#DC2626', '#B91C1C'] : ['#F87171', '#EF4444']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.deleteButtonText}>Deleting Forever...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.deleteButtonText}>
                    {isConfirmed ? 'Permanently Delete My Account' : 'Type DELETE to confirm'}
                  </Text>
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
  instructionBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  instructionBoxDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  instructionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.8,
  },
  instructionText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  boldKeyword: {
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 1,
  },
  autofillChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  autofillChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
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
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 14,
    height: 54,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
  },
  textInputDark: {
    backgroundColor: '#0F172A',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    color: '#F8FAFC',
  },
  textInputConfirmed: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
  },
  deleteButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    ...SHADOW.medium,
  },
  disabledButton: {
    opacity: 0.5,
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
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});
