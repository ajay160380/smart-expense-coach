/**
 * ═══════════════════════════════════════════════════════════════
 * WHATSAPP BOT LINKING MODAL / POPUP
 * Prominently prompts new & unlinked users to link their WhatsApp
 * bot in 1-tap for automatic conversational expense tracking.
 * Persistently prompts until the user's WhatsApp is linked!
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import api from '../api/config';
import { useTheme } from '../theme/ThemeContext';
import { SHADOW } from '../utils/theme';

export default function WhatsAppLinkModal({
  visible,
  onClose,
  userPhone,
  onLinkedSuccess,
}) {
  const { isDark } = useTheme();
  const [phone, setPhone] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsSuccess(false);
      setCheckingStatus(false);
      const cleanPhone = (userPhone || '').replace(/[^0-9]/g, '');
      const tenDigits = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
      setPhone(tenDigits);
      setIsEditingPhone(!tenDigits);
    }
  }, [visible, userPhone]);

  const handleOpenWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    const sendDigits = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const linkText = sendDigits ? `Link ${sendDigits}` : 'Link 91';
    const waUrl = `https://wa.me/917379053923?text=${encodeURIComponent(linkText)}`;

    Linking.openURL(waUrl).catch(() => {});

    // Start background poll to see if user linked
    setCheckingStatus(true);
    let attempts = 0;
    const pollInterval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await api.get('/api/wa-link-status/');
        if (res.data?.linked) {
          clearInterval(pollInterval);
          setIsSuccess(true);
          setCheckingStatus(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (onLinkedSuccess) {
            onLinkedSuccess();
          }
          setTimeout(() => {
            onClose();
          }, 1800);
        }
      } catch (e) {}

      if (attempts >= 15) {
        clearInterval(pollInterval);
        setCheckingStatus(false);
      }
    }, 2000);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, isDark && styles.cardDark]}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>

          {isSuccess ? (
            /* SUCCESS STATE */
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={54} color="#10B981" />
              </View>
              <Text style={[styles.title, isDark && styles.titleDark, { marginTop: 16 }]}>
                WhatsApp Bot Linked! 🎉
              </Text>
              <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
                You can now log expenses directly on WhatsApp by texting &quot;200 dinner&quot; or voice notes to +91 7379053923!
              </Text>
            </View>
          ) : (
            /* MAIN PROMPT CONTENT */
            <>
              {/* Badge & Icon */}
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <View style={styles.iconCircle}>
                  <Ionicons name="logo-whatsapp" size={38} color="#25D366" />
                </View>
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>⚡ 10X FASTER EXPENSE LOGGING</Text>
                </View>
              </View>

              {/* Title & Subtitle */}
              <Text style={[styles.title, isDark && styles.titleDark]}>
                Link WhatsApp Bot 🤖
              </Text>
              <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
                Track expenses anytime without opening the app! Send a quick text or voice note on WhatsApp.
              </Text>

              {/* Feature Points */}
              <View style={[styles.featureList, isDark && styles.featureListDark]}>
                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={{ fontSize: 13 }}>💬</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureBold, isDark && styles.featureBoldDark]}>
                      Quick 3-Sec Entry
                    </Text>
                    <Text style={styles.featureSub}>
                      Text &quot;500 petrol&quot; or &quot;150 chai&quot; anytime
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: '#EDE9FE' }]}>
                    <Text style={{ fontSize: 13 }}>🎙️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureBold, isDark && styles.featureBoldDark]}>
                      Smart Voice Notes
                    </Text>
                    <Text style={styles.featureSub}>
                      Speak naturally in Hindi or English
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={{ fontSize: 13 }}>🔔</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureBold, isDark && styles.featureBoldDark]}>
                      Daily Safe Spend Pace
                    </Text>
                    <Text style={styles.featureSub}>
                      Get instant budget updates on WhatsApp
                    </Text>
                  </View>
                </View>
              </View>

              {/* Phone display / input */}
              {isEditingPhone ? (
                <View style={styles.phoneInputWrap}>
                  <View style={styles.countryCodeBadge}>
                    <Text style={{ fontSize: 14 }}>🇮🇳</Text>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.phoneInput, isDark && styles.phoneInputDark]}
                    placeholder="Enter 10-digit WhatsApp number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                    autoFocus
                  />
                </View>
              ) : (
                <View style={[styles.phonePill, isDark && styles.phonePillDark]}>
                  <Ionicons name="call-outline" size={15} color="#25D366" />
                  <Text style={[styles.phonePillText, isDark && styles.phonePillTextDark]}>
                    Linking WhatsApp: +91 {phone}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsEditingPhone(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.editPhoneBtnText}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Primary 1-Tap Link Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleOpenWhatsApp}
                style={{ marginTop: 14 }}
              >
                <LinearGradient
                  colors={['#25D366', '#128C7E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionBtn}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>
                    {phone ? `1-Tap Link WhatsApp (+91 ${phone})` : '1-Tap Link WhatsApp Bot'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {checkingStatus && (
                <View style={styles.checkingRow}>
                  <ActivityIndicator size="small" color="#25D366" />
                  <Text style={styles.checkingText}>
                    Waiting for WhatsApp message to send...
                  </Text>
                </View>
              )}

              {/* Remind later link */}
              <TouchableOpacity
                onPress={onClose}
                style={styles.remindBtn}
                hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              >
                <Text style={styles.remindBtnText}>Remind Me Later</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    position: 'relative',
    ...SHADOW.lg,
  },
  cardDark: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#BBF7D0',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  titleDark: {
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  subtitleDark: {
    color: '#94A3B8',
  },
  featureList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  featureListDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureBold: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  featureBoldDark: {
    color: '#F8FAFC',
  },
  featureSub: {
    fontSize: 11,
    color: '#64748B',
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 6,
  },
  phonePillDark: {
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderColor: 'rgba(37, 211, 102, 0.3)',
  },
  phonePillText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#15803D',
  },
  phonePillTextDark: {
    color: '#4ADE80',
  },
  editPhoneBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284C7',
    textDecorationLine: 'underline',
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  phoneInputDark: {
    color: '#F8FAFC',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  checkingText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  remindBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 4,
  },
  remindBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
