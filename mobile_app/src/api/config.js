/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — API CONFIGURATION (SECURED)
 * Axios instance with interceptors, token refresh, and timeout
 * ═══════════════════════════════════════════════════════════════
 */

import axios from 'axios';
import { getToken, clearAuthData } from '../utils/auth';

// ── Base URL — configurable for environment ──
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://expense-coach-prxm.onrender.com';

// ── Axios Instance ──
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  },
});

// ── Cold-Start & Server Warming State ──
let isFirstRequest = true;
let serverWarmingListeners = [];

export function subscribeServerWarming(listener) {
  serverWarmingListeners.push(listener);
  return () => {
    serverWarmingListeners = serverWarmingListeners.filter((l) => l !== listener);
  };
}

function notifyServerWarming(isWarming) {
  serverWarmingListeners.forEach((fn) => {
    try { fn(isWarming); } catch (e) {}
  });
}

// ── Request Interceptor ──
api.interceptors.request.use(
  async (config) => {
    // ── First request cold-start tolerance: allow up to 60s for Render free-tier spin-up ──
    if (isFirstRequest) {
      config.timeout = Math.max(config.timeout || 30000, 60000);
      isFirstRequest = false;
    }

    // ── Notify if request takes longer than 3.5s (server waking up) ──
    const warmTimer = setTimeout(() => {
      notifyServerWarming(true);
    }, 3500);
    config.__warmTimer = warmTimer;

    // ── Auto-prefix /api/ to endpoints if missing ──
    if (config.url && !config.url.startsWith('/api') && !config.url.startsWith('/ai_chat')) {
      const formattedPath = config.url.startsWith('/') ? config.url : `/${config.url}`;
      config.url = `/api${formattedPath}`;
    }

    // ── Force absolute URL prefixing to avoid browser origin resolution issues ──
    if (config.url && !config.url.startsWith('http')) {
      const path = config.url.startsWith('/') ? config.url : `/${config.url}`;
      config.url = `${BASE_URL}${path}`;
    }

    // ── Cache-busting: add _t timestamp to every GET request ──
    if (config.method === 'get' || config.method === 'GET') {
      config.params = { ...config.params, _t: Date.now() };
    }

    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
    } catch (e) {
      console.error('Token retrieval error:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──
let onUnauthorized = null;
let isHandling401 = false;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => {
    if (response?.config?.__warmTimer) {
      clearTimeout(response.config.__warmTimer);
    }
    notifyServerWarming(false);
    return response;
  },
  async (error) => {
    const config = error.config;
    if (config?.__warmTimer) {
      clearTimeout(config.__warmTimer);
    }
    notifyServerWarming(false);

    // ── Auto-retry on transient network / timeout failure (up to 2 retries) ──
    if (config && (!error.response || error.code === 'ECONNABORTED')) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < 2) {
        config.__retryCount += 1;
        console.warn(`[Network Retry ${config.__retryCount}/2] Retrying ${config.url}...`);
        await new Promise((resolve) => setTimeout(resolve, 1200 * config.__retryCount));
        return api(config);
      }
    }

    if (error.response) {
      const { status } = error.response;

      // ── 401: Token expired / invalid (AUTH-002: handled once without duplicate alerts) ──
      if (status === 401) {
        if (!isHandling401) {
          isHandling401 = true;
          await clearAuthData();
          if (onUnauthorized) {
            onUnauthorized();
          }
          setTimeout(() => { isHandling401 = false; }, 3000);
        }
      }

      // ── 429: Rate Limited (Item 8) ──
      if (status === 429) {
        const msg = error.response?.data?.error || error.response?.data?.detail || 'Too many requests. Please wait a moment before trying again.';
        console.warn('Rate limited by server:', msg);
        try {
          const { Alert } = require('react-native');
          Alert.alert('Rate Limit Exceeded', msg);
        } catch (e) {}
      }
    }

    // ── Network Error ──
    if (!error.response && error.message === 'Network Error') {
      console.warn('🔴 Network error — no connection. URL WAS:', error.config ? error.config.url : 'UNKNOWN');
    }

    // ── Timeout ──
    if (error.code === 'ECONNABORTED') {
      console.warn('Request timed out');
    }

    return Promise.reject(error);
  }
);

export default api;
