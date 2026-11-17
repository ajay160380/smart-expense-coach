/**
 * ═══════════════════════════════════════════════════════════════
 * WHATSAPP BOT LINKING MODAL / POPUP
 * Prominently prompts new & unlinked users to link their WhatsApp
 * bot in 1-tap for automatic conversational expense tracking.
 * Persistently prompts until the user's WhatsApp is linked!
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
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
  const pollRef = useRef(null);

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const clearPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    if (visible) {
      setIsSuccess(false);
      setCheckingStatus(false);
      const cleanPhone = (userPhone || '').replace(/[^0-9]/g, '');
      const tenDigits = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
      setPhone(tenDigits);
      setIsEditingPhone(!tenDigits);

      scaleAnim.setValue(0.92);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      clearPolling();
    }
    return () => clearPolling();
  }, [visible, userPhone]);

  const handleClose = () => {
    clearPolling();
    onClose();
  };

  const handleOpenWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    const sendDigits = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const linkText = sendDigits ? `Link ${sendDigits}` : 'Link 91';
    const waUrl = `https://wa.me/917379053923?text=${encodeURIComponent(linkText)}`;

    Linking.openURL(waUrl).catch(() => {});

    clearPolling();
    setCheckingStatus(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await api.get('/api/wa-link-status/');
        if (res.data?.linked) {
          clearPolling();
          setIsSuccess(true);
          setCheckingStatus(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (onLinkedSuccess) {
            onLinkedSuccess();
          }
          setTimeout(() => {
            handleClose();
          }, 1800);
        }
      } catch (e) {}

      if (attempts >= 15) {
        clearPolling();
        setCheckingStatus(false);
      }
    }, 2000);
  };

  if (!visible) return null;

  const formattedDisplayPhone = phone.length === 10
    ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
    : (phone ? `+91 ${phone}` : '');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            isDark && styles.cardDark,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeBtn, isDark && styles.closeBtnDark]}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>

          {isSuccess ? (
            /* SUCCESS STATE */
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={56} color="#10B981" />
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
              {/* Top Hero Icon & Badge */}
              <View style={{ alignItems: 'center', marginBottom: 14 }}>
                <View style={styles.iconCircle}>
                  <Ionicons name="logo-whatsapp" size={40} color="#25D366" />
                </View>
                <View style={styles.badgePill}>
                  <Ionicons name="flash" size={11} color="#059669" style={{ marginRight: 3 }} />
                  <Text style={styles.badgePillText}>10X FASTER EXPENSE LOGGING</Text>
                </View>
              </View>

              {/* Title & Subtitle */}
              <Text style={[styles.title, isDark && styles.titleDark]}>
                Link WhatsApp Bot
              </Text>
              <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
                Log expenses in 3 seconds by sending a text or voice note without opening the app.
              </Text>

              {/* Clean Benefit Items */}
              <View style={[styles.featureList, isDark && styles.featureListDark]}>
                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="chatbubble-ellipses" size={15} color="#15803D" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureBold, isDark && styles.featureBoldDark]}>
                      Quick Text Entry
                    </Text>
                    <Text style={styles.featureSub}>
                      Send &quot;150 chai&quot; or &quot;500 petrol&quot; anytime
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={[styles.featureDot, { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons name="mic" size={15} color="#7C3AED" />
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
                    <Ionicons name="notifications" size={15} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureBold, isDark && styles.featureBoldDark]}>
                      Daily Spend Alerts
                    </Text>
                    <Text style={styles.featureSub}>
                      Get safe limit & balance updates instantly
                    </Text>
                  </View>
                </View>
              </View>

              {/* Clean Phone Display / Input */}
              {isEditingPhone ? (
                <View style={styles.phoneInputWrap}>
                  <View style={styles.countryCodeBadge}>
                    <Text style={{ fontSize: 13 }}>🇮🇳</Text>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.phoneInput, isDark && styles.phoneInputDark]}
                    placeholder="Enter 10-digit mobile number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                    autoFocus
                  />
                  {phone.length === 10 && (
                    <TouchableOpacity
                      onPress={() => setIsEditingPhone(false)}
                      style={styles.donePhoneBtn}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={[styles.phonePill, isDark && styles.phonePillDark]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons name="phone-portrait-outline" size={15} color="#059669" />
                    <Text style={[styles.phonePillText, isDark && styles.phonePillTextDark]}>
                      {formattedDisplayPhone || 'No phone set'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsEditingPhone(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.changePhoneBtn}
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
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionBtn}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>Connect on WhatsApp</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </LinearGradient>
              </TouchableOpacity>

              {checkingStatus && (
                <View style={styles.checkingRow}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={styles.checkingText}>
                    Waiting for WhatsApp message to send...
                  </Text>
                </View>
              )}

              {/* Remind later link */}
              <TouchableOpacity
                onPress={handleClose}
                style={styles.remindBtn}
                hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
                activeOpacity={0.65}
              >
                <Text style={[styles.remindBtnText, isDark && { color: '#64748B' }]}>Remind Me Later</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    position: 'relative',
    ...SHADOW.lg,
  },
  cardDark: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#A7F3D0',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 5,
    letterSpacing: -0.3,
  },
  titleDark: {
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  subtitleDark: {
    color: '#94A3B8',
  },
  featureList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  featureBoldDark: {
    color: '#F8FAFC',
  },
  featureSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  phonePillDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  phonePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  phonePillTextDark: {
    color: '#34D399',
  },
  changePhoneBtn: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  editPhoneBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#10B981',
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  phoneInputDark: {
    color: '#F8FAFC',
  },
  donePhoneBtn: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 8,
    marginRight: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnText: {
    fontSize: 15,
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
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 4,
  },
  remindBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
});


