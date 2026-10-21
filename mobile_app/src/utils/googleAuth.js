/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — GOOGLE OAUTH CONFIGURATION & HOOK
 * Uses expo-auth-session with backend Django verification
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import api from '../api/config';
import { saveAuthData } from './auth';
import analytics from './analytics';

// Ensure browser session can complete properly
WebBrowser.maybeCompleteAuthSession();

// ── Google OAuth Client IDs ──
// Project Number: 600331588079 (expense-tracker-67220)
export const GOOGLE_CONFIG = {
  // Web Client ID from Firebase / Google Cloud Console (used for verification)
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
export function useGoogleAuth({ onSuccess, onError, onStart } = {}) {
  const [loading, setLoading] = useState(false);

  // Google OAuth 2.0 policy on Android requires the reverse client ID scheme
  const androidRedirectUri = 'com.googleusercontent.apps.600331588079-97q2pl2l6impkean30df3qig5t6rl7et:/oauthredirect';
  const defaultRedirectUri = makeRedirectUri({
    scheme: 'paisamitra',
  });
  const redirectUri = Platform.OS === 'android' ? androidRedirectUri : defaultRedirectUri;

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CONFIG.webClientId,
    webClientId: GOOGLE_CONFIG.webClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
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
      });

      const { token, user_id, username } = res.data;
      await saveAuthData(token, user_id, username);
      analytics.track('google_login_success', { user_id, is_new: res.data.is_new });

      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (err) {
      console.warn('Google backend verification failed:', err);
      const msg = err.response?.data?.error || err.message || 'Google Sign-In failed.';
      Alert.alert('Google Sign-In Failed', msg);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const { authentication, params } = response;
      const accessToken = authentication?.accessToken;
      const idToken = authentication?.idToken || params?.id_token;

      if (!accessToken && !idToken) {
        setLoading(false);
        Alert.alert('Google Sign-In Failed', 'No authentication token received from Google.');
        if (onError) onError(new Error('No token received'));
        return;
      }

      handleBackendLogin(accessToken, idToken);
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      setLoading(false);
    } else if (response.type === 'error') {
      setLoading(false);
      console.warn('Google OAuth error:', response.error);
      Alert.alert('Google Sign-In Failed', response.error?.message || 'Authentication cancelled or failed.');
      if (onError) onError(response.error);
    }
  }, [response, handleBackendLogin, onError]);

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
      if (onStart) onStart();
      await promptAsync();
    } catch (err) {
      setLoading(false);
      console.warn('Google prompt exception:', err);
      Alert.alert('Google Sign-In Error', err.message || 'Could not open Google Sign-In.');
      if (onError) onError(err);
    }
  };

  return {
    signInWithGoogle,
    loading,
    ready: !!request,
  };
}
