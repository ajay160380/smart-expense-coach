import { useEffect, useCallback } from 'react';
import { NativeModules, DeviceEventEmitter, Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import api from '../api/config';

const { AutoCaptureModule } = NativeModules;

export function useAutoCapture(onCaptureSuccess) {
  const handleCapturedPayment = useCallback(async (data) => {
    if (!data || !data.amount) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const res = await api.post('/api/auto-expense/', {
        amount: data.amount,
        merchant: data.merchant || 'UPI Payment',
        source: data.source || 'auto',
        timestamp: new Date().toISOString(),
        client_txn_id: `device_${data.source || 'auto'}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      });

      if (res.data && res.data.status === 'success') {
        if (onCaptureSuccess) {
          onCaptureSuccess(res.data);
        }
      }
    } catch (err) {
      console.log('Auto-capture sync error:', err.message);
    }
  }, [onCaptureSuccess]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const notifSub = DeviceEventEmitter.addListener('onPaymentCaptured', handleCapturedPayment);
    const screenSub = DeviceEventEmitter.addListener('onPaymentScreenDetected', handleCapturedPayment);

    return () => {
      notifSub.remove();
      screenSub.remove();
    };
  }, [handleCapturedPayment]);

  return {
    isSupported: Platform.OS === 'android',
    checkPermissions: async () => {
      if (Platform.OS !== 'android' || !AutoCaptureModule) {
        return { notification: false, accessibility: false, batteryIgnored: false };
      }
      try {
        const [notification, accessibility, batteryIgnored] = await Promise.all([
          AutoCaptureModule.isNotificationListenerEnabled(),
          AutoCaptureModule.isAccessibilityServiceEnabled(),
          AutoCaptureModule.isBatteryOptimizationIgnored()
        ]);
        return { notification, accessibility, batteryIgnored };
      } catch (e) {
        return { notification: false, accessibility: false, batteryIgnored: false };
      }
    },
    openNotificationSettings: () => {
      if (AutoCaptureModule?.openNotificationListenerSettings) {
        AutoCaptureModule.openNotificationListenerSettings();
      }
    },
    openAccessibilitySettings: () => {
      if (AutoCaptureModule?.openAccessibilitySettings) {
        AutoCaptureModule.openAccessibilitySettings();
      }
    },
    openBatteryOptimizationSettings: () => {
      if (AutoCaptureModule?.openBatteryOptimizationSettings) {
        AutoCaptureModule.openBatteryOptimizationSettings();
      }
    }
  };
}
