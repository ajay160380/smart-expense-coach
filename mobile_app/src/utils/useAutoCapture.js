import { useEffect, useCallback } from 'react';
import { NativeModules, DeviceEventEmitter, Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import api from '../api/config';
import { getToken } from './auth';

const { AutoCaptureModule } = NativeModules;

export function useAutoCapture(onCaptureSuccess) {
  const handleCapturedPayment = useCallback(async (data) => {
    if (!data || !data.amount) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Immediate visual confirmation alert so user knows it captured
      Alert.alert(
        "⚡ Payment Auto-Captured!",
        `₹${data.amount} at ${data.merchant || 'UPI'}\nAuto-deducted from today's budget.`,
        [{ text: "Awesome!" }]
      );

      const payload = {
        amount: data.amount,
        merchant: data.merchant || 'UPI Payment',
        source: data.source || 'auto',
        timestamp: new Date().toISOString(),
        client_txn_id: `device_${data.source || 'auto'}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      };

      let res;
      try {
        res = await api.post('/api/auto-expense/', payload);
      } catch (postErr) {
        // Fallback to local Django backend if remote host doesn't have Phase 9 yet
        const token = await getToken();
        const headers = token ? { Authorization: `Token ${token}` } : {};
        try {
          res = await axios.post('http://192.168.1.61:8000/api/auto-expense/', payload, { headers, timeout: 4000 });
        } catch (localErr) {
          res = await axios.post('http://localhost:8000/api/auto-expense/', payload, { headers, timeout: 4000 });
        }
      }

      if (res && res.data && res.data.status === 'success') {
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

