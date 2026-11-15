/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — GOOGLE OAUTH CONFIGURATION & HOOK
 * Uses expo-auth-session with backend Django verification
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import api from '../api/config';
import { saveAuthData } from './auth';
import analytics from './analytics';
import { formatApiError } from './errors';

import Constants, { ExecutionEnvironment } from 'expo-constants';

// Ensure browser session can complete properly
WebBrowser.maybeCompleteAuthSession();

// Check if running inside standard Expo Go client
const isExpoGo =
  Constants?.appOwnership === 'expo' ||
  Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient;

// ── Google OAuth Client IDs ──
// Project Number: 600331588079 (expense-tracker-67220)
export const GOOGLE_CONFIG = {
  // Web Client ID from Firebase / Google Cloud Console (used for verification & Expo Go)
  webClientId: '600331588079-n2cpn41g5gev34u59v1v76pflsovhm93.apps.googleusercontent.com',
  // Android OAuth Client ID from Google Cloud Console (Package: com.ajay160380.paisamitra)
  androidClientId: '600331588079-97q2pl2l6impkean30df3qig5t6rl7et.apps.googleusercontent.com',
  iosClientId: '600331588079-n2cpn41g5gev34u59v1v76pflsovhm93.apps.googleusercontent.com',
};

export const isGoogleAuthConfigured = () => {
  return (
    GOOGLE_CONFIG.webClientId &&
    !GOOGLE_CONFIG.webClientId.includes('placeholder')
  );
};

/**
 * Custom hook for Google Authentication across Login and Register screens.
 */
export function useGoogleAuth({ mode = 'login', onSuccess, onError, onStart, onAccountNotFound } = {}) {
  const [loading, setLoading] = useState(false);
  const lastProcessedResponseRef = useRef(null);
  const loginInProgressRef = useRef(false);
  const loginCompletedRef = useRef(false);

  // Keep callback refs stable to prevent infinite re-render / effect loops
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onStartRef = useRef(onStart);
  const onAccountNotFoundRef = useRef(onAccountNotFound);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onStartRef.current = onStart;
    onAccountNotFoundRef.current = onAccountNotFound;
  });

  // Pre-warm the Android Chrome Custom Tabs daemon so Google Sign-In pops up instantly (sub-100ms)
  useEffect(() => {
    try {
      WebBrowser.warmUpAsync();
    } catch (_) {}
    return () => {
      try {
        WebBrowser.coolDownAsync();
      } catch (_) {}
    };
  }, []);

  // In standalone APK on Android, Google requires reverse client ID scheme
  const androidRedirectUri = 'com.googleusercontent.apps.600331588079-97q2pl2l6impkean30df3qig5t6rl7et:/oauthredirect';
  const defaultRedirectUri = makeRedirectUri({
    scheme: 'paisamitra',
  });
  
  // Expo Go needs standard proxy redirect; Standalone Android uses native scheme
  const redirectUri = isExpoGo
    ? makeRedirectUri()
    : Platform.OS === 'android'
    ? androidRedirectUri
    : defaultRedirectUri;

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: isExpoGo ? GOOGLE_CONFIG.webClientId : GOOGLE_CONFIG.webClientId,
    webClientId: GOOGLE_CONFIG.webClientId,
    androidClientId: isExpoGo ? undefined : GOOGLE_CONFIG.androidClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId || GOOGLE_CONFIG.webClientId,
    redirectUri,
    scopes: ['profile', 'email'],
  });

  const handleBackendLogin = useCallback(async ({ accessToken, idToken, code, codeVerifier, redirectUri: targetUri, profile }) => {
    // Prevent duplicate concurrent requests or processing after success
    if (loginInProgressRef.current || loginCompletedRef.current) return;
    loginInProgressRef.current = true;

    try {
      setLoading(true);

      let activeAccessToken = accessToken;
      let activeIdToken = idToken;
      let activeProfile = profile;

      // 1. If tokens not present but code is returned, perform PKCE token exchange directly on device
      if (!activeAccessToken && !activeIdToken && code) {
        try {
          const clientId = Platform.OS === 'android' && !isExpoGo ? GOOGLE_CONFIG.androidClientId : GOOGLE_CONFIG.webClientId;
          const bodyParams = new URLSearchParams({
            client_id: clientId,
            code,
            grant_type: 'authorization_code',
            redirect_uri: targetUri || redirectUri,
          });
          if (codeVerifier) {
            bodyParams.append('code_verifier', codeVerifier);
          }
          const tokRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyParams.toString(),
          });
          if (tokRes.ok) {
            const tokJson = await tokRes.json();
            activeAccessToken = tokJson.access_token || activeAccessToken;
            activeIdToken = tokJson.id_token || activeIdToken;
          }
        } catch (exErr) {
          console.warn('Client token exchange error:', exErr);
        }
      }

      // 2. If access token exists, directly retrieve Google profile for instant verification
      if (activeAccessToken && !activeProfile) {
        try {
          const uInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${activeAccessToken}` },
          });
          if (uInfoRes.ok) {
            activeProfile = await uInfoRes.json();
          }
        } catch (profErr) {
          console.warn('Direct userinfo fetch error:', profErr);
        }
      }

      const res = await api.post('/api/auth/google/', {
        access_token: activeAccessToken,
        id_token: activeIdToken,
        code,
        code_verifier: codeVerifier,
        redirect_uri: targetUri || redirectUri,
        client_id: Platform.OS === 'android' && !isExpoGo ? GOOGLE_CONFIG.androidClientId : GOOGLE_CONFIG.webClientId,
        profile: activeProfile,
        mode,
      }, { timeout: 15000 });

      loginCompletedRef.current = true;
      const { token, user_id, username, needs_phone } = res.data;
      if (!needs_phone) {
        await saveAuthData(token, user_id, username);
        analytics.track('google_login_success', { user_id, is_new: res.data.is_new });
      }

      if (onSuccessRef.current) {
        onSuccessRef.current(res.data);
      }
    } catch (err) {
      console.warn('Google backend verification failed:', err);
      const errCode = err.response?.data?.code;
      const msg = err.response?.data?.error || formatApiError(err, 'Google Sign-In failed. Please try again.');
      
      if (errCode === 'ACCOUNT_NOT_FOUND' && onAccountNotFoundRef.current) {
        onAccountNotFoundRef.current(err.response?.data?.email, err.response?.data?.name);
      } else {
        Alert.alert('Google Sign-In Failed', msg);
      }

      if (onErrorRef.current) {
        onErrorRef.current(err);
      }
    } finally {
      loginInProgressRef.current = false;
      setLoading(false);
    }
  }, [mode, redirectUri]);

  useEffect(() => {
    if (!response) return;
    if (loginCompletedRef.current || loginInProgressRef.current) return;
    // Prevent processing the same response object multiple times (breaks infinite alert loops)
    if (lastProcessedResponseRef.current === response) return;

    if (response.type === 'success') {
      const accessToken = response.authentication?.accessToken || response.params?.access_token;
      const idToken = response.authentication?.idToken || response.params?.id_token;
      const code = response.params?.code;

      if (!accessToken && !idToken && !code) {
        return;
      }

      lastProcessedResponseRef.current = response;
      handleBackendLogin({
        accessToken,
        idToken,
        code,
        codeVerifier: request?.codeVerifier,
        redirectUri,
      });
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      lastProcessedResponseRef.current = response;
      setLoading(false);
    } else if (response.type === 'error') {
      lastProcessedResponseRef.current = response;
      setLoading(false);
      console.warn('Google OAuth error:', response.error);
      Alert.alert('Google Sign-In Failed', response.error?.message || 'Authentication cancelled or failed.');
      if (onErrorRef.current) onErrorRef.current(response.error);
    }
  }, [response, handleBackendLogin, request?.codeVerifier, redirectUri]);

  const signInWithGoogle = async () => {
    if (!isGoogleAuthConfigured()) {
      Alert.alert(
        'Google Client ID Required',
        'Google login setup karne ke liye Google Cloud Console se apna Web Client ID `mobile_app/src/utils/googleAuth.js` me paste karein.\n\nProject ID: expense-tracker-67220',
        [{ text: 'OK' }]
      );
      return;
    }

    // Dismiss any old lingering auth session lock
    try {
      WebBrowser.dismissAuthSession();
    } catch (_) {}

    // Safety watchdog timer: maximum 15 seconds of loading state
    const watchdogTimer = setTimeout(() => {
      setLoading(false);
    }, 15000);

    try {
      setLoading(true);
      if (onStartRef.current) onStartRef.current();

      const res = await promptAsync();

      if (!res || res.type === 'cancel' || res.type === 'dismiss' || res.type === 'locked') {
        clearTimeout(watchdogTimer);
        setLoading(false);
        if (res?.type === 'locked') {
          try {
            WebBrowser.dismissAuthSession();
          } catch (_) {}
        }
        return;
      }

      if (res.type === 'error') {
        clearTimeout(watchdogTimer);
        setLoading(false);
        console.warn('Google prompt error:', res.error);
        Alert.alert('Google Sign-In Failed', res.error?.message || 'Authentication cancelled or failed.');
        if (onErrorRef.current) onErrorRef.current(res.error);
        return;
      }

      if (res.type === 'success') {
        clearTimeout(watchdogTimer);
        lastProcessedResponseRef.current = res;
        const accessToken = res.authentication?.accessToken || res.params?.access_token;
        const idToken = res.authentication?.idToken || res.params?.id_token;
        const code = res.params?.code;

        if (accessToken || idToken || code) {
          await handleBackendLogin({
            accessToken,
            idToken,
            code,
            codeVerifier: request?.codeVerifier,
            redirectUri,
          });
        } else {
          setLoading(false);
          Alert.alert('Google Sign-In Failed', 'No authentication token received from Google.');
        }
      }
    } catch (err) {
      clearTimeout(watchdogTimer);
      setLoading(false);
      console.warn('Google prompt exception:', err);
      Alert.alert('Google Sign-In Error', err.message || 'Could not open Google Sign-In.');
      if (onErrorRef.current) onErrorRef.current(err);
    }
  };

  return {
    signInWithGoogle,
    loading,
    ready: !!request,
  };
}
