/**
 * ═══════════════════════════════════════════════════════════════
 * PAISA MITRA — API CONFIGURATION (SECURED)
 * Axios instance with interceptors, token refresh, and timeout
 * ═══════════════════════════════════════════════════════════════
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Base URL — change for production ──
export const BASE_URL = 'https://ajay160380-paisa-mitra.hf.space';
console.log('🔴🔴🔴 CURRENT API URL IS:', BASE_URL);

// ── Axios Instance ──
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  },
});

// ── Request Interceptor ──
api.interceptors.request.use(
  async (config) => {
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
      const token = await AsyncStorage.getItem('userToken');
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

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const { status } = error.response;

      // ── 401: Token expired / invalid ──
      if (status === 401) {
        await AsyncStorage.multiRemove(['userToken', 'userId', 'username', 'loginTime']);
        if (onUnauthorized) {
          onUnauthorized();
        }
      }

      // ── 429: Rate Limited ──
      if (status === 429) {
        console.warn('Rate limited by server');
      }
    }

    // ── Network Error ──
    if (!error.response && error.message === 'Network Error') {
      console.error('🔴 Network error — no connection. URL WAS:', error.config ? error.config.url : 'UNKNOWN');
    }

    // ── Timeout ──
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
    }

    return Promise.reject(error);
  }
);

export default api;
