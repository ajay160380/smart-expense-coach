/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — CLIENT ERROR TRACKING SERVICE (ITEM 15)
 * Captures unhandled JS exceptions, React error boundaries,
 * and reports them to the centralized server backend.
 * ═══════════════════════════════════════════════════════════════
 */

import api from '../api/config';
import { Platform } from 'react-native';

export function captureException(error, context = {}) {
  try {
    const errorMessage = error?.message || String(error);
    const stackTrace = error?.stack || (typeof context === 'object' ? JSON.stringify(context) : '');

    if (__DEV__) {
      console.warn('[ErrorTracker] 🚨 Exception captured:', errorMessage);
    }

    // Report error to backend asynchronously
    api.post('/api/analytics/log-error/', {
      error_message: errorMessage,
      stack_trace: stackTrace,
      device_info: {
        platform: Platform.OS,
        os_version: Platform.Version,
        context: context,
        timestamp: new Date().toISOString(),
      },
    }).catch(() => {});
  } catch (e) {
    // Fail silently so error reporting never crashes the app
  }
}
