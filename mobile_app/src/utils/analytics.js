/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — CLIENT ANALYTICS TRACKING (ITEM 14)
 * Fire-and-forget event telemetry and screen tracking.
 * ═══════════════════════════════════════════════════════════════
 */

import api from '../api/config';
import { Platform } from 'react-native';

class AnalyticsService {
  constructor() {
    this.currentScreen = null;
  }

  /**
   * Track user screen navigation
   */
  trackScreen(screenName, extra = {}) {
    if (!screenName || screenName === this.currentScreen) return;
    this.currentScreen = screenName;

    this.track('screen_view', {
      screen_name: screenName,
      platform: Platform.OS,
      ...extra,
    });
  }

  /**
   * Track specific app actions (expense added, goal created, budget set, etc.)
   */
  async track(eventName, properties = {}) {
    try {
      const payload = {
        event_name: eventName,
        properties: {
          ...properties,
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
        },
      };

      if (__DEV__) {
        console.log(`[Analytics] 📊 ${eventName}:`, properties);
      }

      // Fire and forget, never block UI or throw
      api.post('/api/analytics/track/', payload).catch(() => {});
    } catch (e) {
      // Intentionally silent
    }
  }
}

export const analytics = new AnalyticsService();
export default analytics;
