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
    combined.includes('success') ||
    combined.includes('saved') ||
    combined.includes('created') ||
    combined.includes('completed') ||
    combined.includes('congratulations') ||
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
      // Normalize buttons
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
        if (theme.type === 'success') {
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
  const isMultipleButtons = alertData.buttons.length > 1;

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
              <Text style={styles.messageText}>{alertData.message}</Text>
            )}

            {/* Action Buttons */}
            <View
              style={[
                styles.buttonContainer,
                isMultipleButtons ? styles.buttonRow : styles.buttonSingle,
              ]}
            >
              {alertData.buttons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';

                if (isCancel) {
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.cancelBtn, isMultipleButtons && { flex: 1 }]}
                      onPress={() => handleClose(btn.onPress)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelBtnText}>{btn.text || 'Cancel'}</Text>
                    </TouchableOpacity>
                  );
                }

                const gradColors = isDestructive
                  ? ['#EF4444', '#B91C1C']
                  : meta.btnGrad;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.primaryBtnTouch, isMultipleButtons && { flex: 1 }]}
                    onPress={() => handleClose(btn.onPress)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={gradColors}
                      style={styles.primaryBtnGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.primaryBtnText}>{btn.text || 'OK'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
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
    zIndex: 99999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.82)',
  },
  cardContainer: {
    width: Math.min(SCREEN_WIDTH * 0.86, 360),
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 20,
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
    width: 140,
    height: 100,
    borderRadius: 70,
    opacity: 0.18,
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
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonSingle: {
    width: '100%',
  },
  primaryBtnTouch: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnGrad: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
  },
});
