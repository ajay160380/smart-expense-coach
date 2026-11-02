import { useEffect, useCallback, useRef } from 'react';
import { NativeModules, DeviceEventEmitter, Platform, Alert, AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import api from '../api/config';

const { AutoCaptureModule } = NativeModules;

export function useAutoCapture(onCaptureSuccess) {
  const processedTxnsRef = useRef(new Set());

  const handleCapturedPayment = useCallback(async (data) => {
    if (!data || !data.amount) return;

    // Deduplicate in JS memory: don't process same amount + merchant within 20s
    const key = `${data.amount}_${data.merchant || ''}_${Math.floor(Date.now() / 20000)}`;
    if (processedTxnsRef.current.has(key)) {
      return;
    }
    processedTxnsRef.current.add(key);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Visual confirmation alert
      Alert.alert(
        "⚡ Payment Auto-Captured!",
        `₹${data.amount} at ${data.merchant || 'UPI'}\nAuto-deducted from today's budget.`,
        [{ text: "Awesome!" }]
      );

      // If already synced by native background thread, no need to post duplicate
      let res = null;
      if (!data.synced) {
        try {
          res = await api.post('/api/quick-add/', {
            amount: data.amount,
            category: 'other',
            description: `⚡ ${data.merchant || 'UPI Payment'}`,
            date: new Date().toISOString().split('T')[0],
          });
        } catch (quickErr) {
          console.log('Quick add error:', quickErr.message);
        }
      }

      // Immediately refresh dashboard spent, budget, and transaction list
      DeviceEventEmitter.emit('EXPENSE_UPDATED');

      if (onCaptureSuccess) {
        onCaptureSuccess(res?.data);
      }
    } catch (err) {
      console.log('Auto-capture handle error:', err.message);
    }
  }, [onCaptureSuccess]);

  const checkPending = useCallback(async () => {
    if (Platform.OS !== 'android' || !AutoCaptureModule?.getAndClearPendingExpenses) return;
    try {
      const json = await AutoCaptureModule.getAndClearPendingExpenses();
      const list = JSON.parse(json || '[]');
      if (Array.isArray(list) && list.length > 0) {
        for (const item of list) {
          await handleCapturedPayment(item);
        }
      }
      // Always refresh dashboard data on checkPending
      DeviceEventEmitter.emit('EXPENSE_UPDATED');
    } catch (e) {
      console.log('checkPending error:', e.message);
    }
  }, [handleCapturedPayment]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // 1. Initial check when hook mounts
    checkPending();

    // 2. Critical: Whenever user switches back from banking app / SMS back to PaisaMitra
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkPending();
        DeviceEventEmitter.emit('EXPENSE_UPDATED');
      }
    });

    // 3. Listen to native events while app is open
    const notifSub = DeviceEventEmitter.addListener('onPaymentCaptured', (data) => {
      handleCapturedPayment(data);
    });
    const screenSub = DeviceEventEmitter.addListener('onPaymentScreenDetected', (data) => {
      handleCapturedPayment(data);
    });

    return () => {
      appStateSub.remove();
      notifSub.remove();
      screenSub.remove();
    };
  }, [checkPending, handleCapturedPayment]);

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
