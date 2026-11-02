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
        // Fallback to live /api/quick-add/ which saves directly to user's database
        try {
          res = await api.post('/api/quick-add/', {
            amount: data.amount,
            category: 'other',
            description: `⚡ ${data.merchant || 'UPI Payment'}`,
            date: new Date().toISOString().split('T')[0],
          });
        } catch (quickErr) {
          console.log('Quick add fallback error:', quickErr.message);
        }
      }

      // Trigger dashboard to refresh spent, budget, and transaction list immediately
      DeviceEventEmitter.emit('EXPENSE_UPDATED');

      if (onCaptureSuccess) {
        onCaptureSuccess(res?.data);
      }
    } catch (err) {
      console.log('Auto-capture sync error:', err.message);
    }
  }, [onCaptureSuccess]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Process any payments captured while app was closed / killed
    if (AutoCaptureModule?.getAndClearPendingExpenses) {
      AutoCaptureModule.getAndClearPendingExpenses().then(json => {
        try {
          const list = JSON.parse(json || '[]');
          if (Array.isArray(list) && list.length > 0) {
            list.forEach(item => {
              handleCapturedPayment(item);
            });
          }
        } catch (e) {}
      }).catch(() => {});
    }

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

