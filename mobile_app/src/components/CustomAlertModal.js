import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  Alert as RNAlert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Global Singleton Dispatcher ──
let alertListener = null;
let pendingAlert = null;
const originalRNAlert = RNAlert.alert;

export function showCustomAlert(title, message, buttons, options) {
  if (alertListener) {
    alertListener({ title, message, buttons, options });
  } else {
    // Queue it so that when CustomAlertModal mounts, it presents the custom modal instead of falling back to native alert
    pendingAlert = { title, message, buttons, options };
  }
}

// Monkey-patch React Native's Alert.alert globally
export function installGlobalAlert() {
  RNAlert.alert = (title, message, buttons, options) => {
    showCustomAlert(title, message, buttons, options);
  };
}

// Helper to determine type and styling
function getAlertType(title = '', message = '') {
  const combined = `${title} ${message}`.toLowerCase();

  // WhatsApp Bot specific styling
  if (combined.includes('whatsapp')) {
    return {
      type: 'whatsapp',
      badge: 'WHATSAPP BOT',
      badgeBg: 'rgba(37, 211, 102, 0.16)',
      badgeBorder: 'rgba(37, 211, 102, 0.35)',
      badgeColor: '#25D366',
      icon: 'logo-whatsapp',
      iconGrad: ['#25D366', '#128C7E'],
      glow: '#25D366',
      btnGrad: ['#25D366', '#128C7E'],
    };
  }

  if (
    combined.includes('update') ||
    combined.includes('restart') ||
    combined.includes('version') ||
    combined.includes('ready') ||
    combined.includes('🚀') ||
    combined.includes('🔄')
  ) {
    return {
      type: 'update',
      badge: 'APP UPDATE',
      badgeBg: 'rgba(139, 92, 246, 0.16)',
      badgeBorder: 'rgba(139, 92, 246, 0.35)',
      badgeColor: '#A78BFA',
      icon: 'rocket-outline',
      iconGrad: ['#8B5CF6', '#6366F1'],
      glow: '#8B5CF6',
      btnGrad: ['#8B5CF6', '#6366F1'],
    };
  }

  if (
    combined.includes('warning') ||
    combined.includes('caution') ||
    combined.includes('⚠️')
  ) {
    return {
      type: 'warning',
      badge: 'WARNING',
      badgeBg: 'rgba(245, 158, 11, 0.16)',
      badgeBorder: 'rgba(245, 158, 11, 0.35)',
      badgeColor: '#FBBF24',
      icon: 'warning-outline',
      iconGrad: ['#F59E0B', '#D97706'],
      glow: '#F59E0B',
      btnGrad: ['#F59E0B', '#D97706'],
    };
  }

  if (
    combined.includes('success') ||
    combined.includes('saved') ||
    combined.includes('created') ||
    combined.includes('completed') ||
    combined.includes('congratulations') ||
    combined.includes('linked') ||
    combined.includes('🎉') ||
    combined.includes('✅') ||
    combined.includes('💰') ||
    combined.includes('enabled')
  ) {
    return {
      type: 'success',
      badge: 'SUCCESS',
      badgeBg: 'rgba(16, 185, 129, 0.16)',
      badgeBorder: 'rgba(16, 185, 129, 0.35)',
      badgeColor: '#34D399',
      icon: 'checkmark-circle-outline',
      iconGrad: ['#10B981', '#059669'],
      glow: '#10B981',
      btnGrad: ['#10B981', '#059669'],
    };
  }

  if (
    combined.includes('error') ||
    combined.includes('failed') ||
    combined.includes('denied') ||
    combined.includes('invalid') ||
    combined.includes('wrong') ||
    combined.includes('exceeded') ||
    combined.includes('delete') ||
    combined.includes('❌')
  ) {
    return {
      type: 'error',
      badge: 'ATTENTION',
      badgeBg: 'rgba(239, 68, 68, 0.16)',
      badgeBorder: 'rgba(239, 68, 68, 0.35)',
      badgeColor: '#F87171',
      icon: 'alert-circle-outline',
      iconGrad: ['#EF4444', '#DC2626'],
      glow: '#EF4444',
      btnGrad: ['#EF4444', '#DC2626'],
    };
  }

  // Default: Notice / Info
  return {
    type: 'info',
    badge: 'NOTICE',
    badgeBg: 'rgba(6, 182, 212, 0.16)',
    badgeBorder: 'rgba(6, 182, 212, 0.35)',
    badgeColor: '#22D3EE',
    icon: 'sparkles-outline',
    iconGrad: ['#06B6D4', '#3B82F6'],
    glow: '#06B6D4',
    btnGrad: ['#3B82F6', '#6366F1'],
  };
}

export default function CustomAlertModal() {
  const [visible, setVisible] = useState(false);
  const [alertData, setAlertData] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    alertListener = ({ title, message, buttons, options }) => {
      let safeButtons = buttons;
      if (!safeButtons || safeButtons.length === 0) {
        safeButtons = [{ text: 'OK', style: 'default' }];
      }

      setAlertData({
        title: title || 'Notice',
        message: message || '',
        buttons: safeButtons,
        options: options || {},
      });
      setVisible(true);

      // Trigger soft haptic feedback
      try {
        const theme = getAlertType(title, message);
        if (theme.type === 'success' || theme.type === 'whatsapp') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (theme.type === 'error') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (e) {}

      // Animate in
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    };

    if (pendingAlert) {
      const queued = pendingAlert;
      pendingAlert = null;
      setTimeout(() => {
        if (alertListener) {
          alertListener(queued);
        }
      }, 100);
    }

    return () => {
      alertListener = null;
    };
  }, []);

  const handleClose = (callback) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setAlertData(null);
      if (typeof callback === 'function') {
        callback();
      }
    });
  };

  if (!visible || !alertData) return null;

  const meta = getAlertType(alertData.title, alertData.message);

  // Analyze button layout requirements
  const rawButtons = alertData.buttons && alertData.buttons.length > 0
    ? alertData.buttons
    : [{ text: 'OK', style: 'default' }];
  const numButtons = rawButtons.length;

  // Decide whether to stack vertically or display horizontally
  // Rule:
  // - 1 button: full width single button
  // - 3+ buttons: ALWAYS stack vertically (3 horizontal buttons never fit on mobile)
  // - 2 buttons: stack vertically if any button text > 9 characters or total chars > 16
  const hasLongText = rawButtons.some((b) => (b.text || '').length > 9);
  const totalChars = rawButtons.reduce((acc, b) => acc + (b.text || '').length, 0);
  const shouldStack = numButtons >= 3 || (numButtons === 2 && (hasLongText || totalChars > 16));

  // If stacked, reorder buttons so that 'cancel' style is placed at the bottom,
  // while non-cancel action buttons preserve their logical order at the top.
  let displayButtons = [...rawButtons];
  if (shouldStack) {
    const cancelButtons = displayButtons.filter((b) => b.style === 'cancel');
    const actionButtons = displayButtons.filter((b) => b.style !== 'cancel');
    displayButtons = [...actionButtons, ...cancelButtons];
  }

  let actionCount = 0;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => {
        if (alertData.options?.cancelable) {
          handleClose(alertData.options?.onDismiss);
        }
      }}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        {/* Animated backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              if (alertData.options?.cancelable) {
                handleClose(alertData.options?.onDismiss);
              }
            }}
          />
        </Animated.View>

        {/* Premium Alert Container */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#172036', '#0C111F']}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Ambient Top Glow */}
            <View style={[styles.topGlow, { backgroundColor: meta.glow }]} />

            {/* Glowing Icon Badge */}
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={meta.iconGrad}
                style={styles.iconCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={meta.icon} size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>

            {/* Type Pill Badge */}
            <View style={[styles.typeBadge, { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder }]}>
              <Text style={[styles.typeBadgeText, { color: meta.badgeColor }]}>{meta.badge}</Text>
            </View>

            {/* Title */}
            <Text style={styles.titleText}>{alertData.title}</Text>

            {/* Message Body */}
            {Boolean(alertData.message) && (
              <ScrollView
                style={styles.messageScroll}
                contentContainerStyle={styles.messageScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <Text style={styles.messageText}>{alertData.message}</Text>
              </ScrollView>
            )}

            {/* Action Buttons */}
            <View
              style={[
                styles.buttonContainer,
                shouldStack
                  ? styles.buttonStack
                  : numButtons === 1
                  ? styles.buttonSingle
                  : styles.buttonRow,
              ]}
            >
              {displayButtons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';

                if (isCancel) {
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.cancelBtn, (!shouldStack && numButtons > 1) && { flex: 1 }]}
                      onPress={() => handleClose(btn.onPress)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelBtnText} numberOfLines={1} ellipsizeMode="tail">
                        {btn.text || 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                  );
                }

                if (isDestructive) {
                  const isPrimaryDestructive = actionCount === 0 && displayButtons.length <= 2;
                  actionCount++;
                  if (isPrimaryDestructive) {
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.primaryBtnTouch, (!shouldStack && numButtons > 1) && { flex: 1 }]}
                        onPress={() => handleClose(btn.onPress)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#EF4444', '#DC2626']}
                          style={styles.primaryBtnGrad}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Text style={styles.primaryBtnText} numberOfLines={1} ellipsizeMode="tail">
                            {btn.text || 'Delete'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  } else {
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.destructiveBtn, (!shouldStack && numButtons > 1) && { flex: 1 }]}
                        onPress={() => handleClose(btn.onPress)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.destructiveBtnText} numberOfLines={1} ellipsizeMode="tail">
                          {btn.text || 'Delete'}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                }

                const isPrimaryAction = actionCount === 0;
                actionCount++;

                if (isPrimaryAction) {
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.primaryBtnTouch, (!shouldStack && numButtons > 1) && { flex: 1 }]}
                      onPress={() => handleClose(btn.onPress)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={meta.btnGrad}
                        style={styles.primaryBtnGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.primaryBtnText} numberOfLines={1} ellipsizeMode="tail">
                          {btn.text || 'OK'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                } else {
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.secondaryBtn, (!shouldStack && numButtons > 1) && { flex: 1 }]}
                      onPress={() => handleClose(btn.onPress)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.secondaryBtnText} numberOfLines={1} ellipsizeMode="tail">
                        {btn.text || 'OK'}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              })}
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 99999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.84)',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 22,
    overflow: 'hidden',
  },
  cardGradient: {
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  topGlow: {
    position: 'absolute',
    top: -50,
    width: 150,
    height: 110,
    borderRadius: 75,
    opacity: 0.22,
  },
  iconWrapper: {
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  messageScroll: {
    maxHeight: 180,
    width: '100%',
    marginBottom: 18,
  },
  messageScrollContent: {
    paddingHorizontal: 4,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#94A3B8',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonStack: {
    flexDirection: 'column',
    gap: 9,
    width: '100%',
  },
  buttonSingle: {
    width: '100%',
  },
  primaryBtnTouch: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
  },
  primaryBtnGrad: {
    height: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  secondaryBtnText: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  destructiveBtn: {
    height: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.32)',
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  destructiveBtnText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cancelBtn: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
});
