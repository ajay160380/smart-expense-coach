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

  const handleBackendLogin = useCallback(async (accessToken, idToken) => {
    try {
      setLoading(true);
      const res = await api.post('/api/auth/google/', {
        access_token: accessToken,
        id_token: idToken,
        mode,
      });

      const { token, user_id, username } = res.data;
      await saveAuthData(token, user_id, username);
      analytics.track('google_login_success', { user_id, is_new: res.data.is_new });

      if (onSuccessRef.current) {
        onSuccessRef.current(res.data);
      }
    } catch (err) {
      console.warn('Google backend verification failed:', err);
      const errCode = err.response?.data?.code;
      const msg = err.response?.data?.error || err.message || 'Google Sign-In failed.';
      
      if (errCode === 'ACCOUNT_NOT_FOUND' && onAccountNotFoundRef.current) {
        onAccountNotFoundRef.current(err.response?.data?.email, err.response?.data?.name);
      } else {
        Alert.alert('Google Sign-In Failed', msg);
      }

      if (onErrorRef.current) {
        onErrorRef.current(err);
      }
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!response) return;
    // Prevent processing the same response object multiple times (breaks infinite alert loops)
    if (lastProcessedResponseRef.current === response) return;

    if (response.type === 'success') {
      const { authentication, params } = response;
      const accessToken = authentication?.accessToken;
      const idToken = authentication?.idToken || params?.id_token;

      if (!accessToken && !idToken) {
        // If code is present, expo-auth-session is still auto-exchanging in background
        if (params?.code) {
          return;
        }
        lastProcessedResponseRef.current = response;
        setLoading(false);
        Alert.alert('Google Sign-In Failed', 'No authentication token received from Google.');
        if (onErrorRef.current) onErrorRef.current(new Error('No token received'));
        return;
      }

      lastProcessedResponseRef.current = response;
      handleBackendLogin(accessToken, idToken);
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
  }, [response, handleBackendLogin]);

  const signInWithGoogle = async () => {
    if (!isGoogleAuthConfigured()) {
      Alert.alert(
        'Google Client ID Required',
        'Google login setup karne ke liye Google Cloud Console se apna Web Client ID `mobile_app/src/utils/googleAuth.js` me paste karein.\n\nProject ID: expense-tracker-67220',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLoading(true);
      if (onStartRef.current) onStartRef.current();
      await promptAsync();
    } catch (err) {
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
