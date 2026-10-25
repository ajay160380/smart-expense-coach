import { Linking, Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/config';

// Current App Version dynamically read from installed app config
export const CURRENT_APP_VERSION = Constants?.expoConfig?.version || '1.3.1';
export const CURRENT_VERSION_CODE = Number(Constants?.expoConfig?.android?.versionCode || 3);

let _updateStatusCache = null;
const listeners = new Set();

export function subscribeToUpdateStatus(listener) {
  listeners.add(listener);
  if (_updateStatusCache !== null) {
    listener(_updateStatusCache);
  }
  return () => listeners.delete(listener);
}

function notifyListeners(status) {
  _updateStatusCache = status;
  listeners.forEach((listener) => {
    try {
      listener(status);
    } catch (e) {}
  });
}

/**
 * Checks backend API to see if a newer APK is available.
 */
export async function checkAppVersion(silent = true) {
  try {
    const response = await fetch(`${BASE_URL}/api/app-version/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (!silent) Alert.alert('Check Failed', 'Could not check for updates.');
      return { hasUpdate: false };
    }

    const data = await response.json();
const GITHUB_APK_CDN_URL = 'https://github.com/ajay160380/smart-expense-coach/raw/main/backend/tracker/static/downloads/ExpenseTracker.apk';

    const latestCode = Number(data.latest_version_code || 0);
    const latestVersion = data.latest_version || CURRENT_APP_VERSION;
    const apkUrl = data.apk_url || GITHUB_APK_CDN_URL;
    const directUrl = data.direct_expo_url || apkUrl;
    const releaseNotes = data.release_notes || 'New features and performance improvements.';

    // Has update if server version code is greater than current device's version code
    const hasUpdate = latestCode > CURRENT_VERSION_CODE;

    const result = {
      hasUpdate,
      latestVersion,
      latestCode,
      currentVersion: CURRENT_APP_VERSION,
      currentCode: CURRENT_VERSION_CODE,
      apkUrl,
      directUrl,
      releaseNotes,
    };

    notifyListeners(result);
    return result;
  } catch (error) {
    console.log('App version check error:', error);
    if (!silent) Alert.alert('Connection Error', 'Could not reach update server.');
    return { hasUpdate: false };
  }
}

/**
 * Initiates the 1-tap download and installation of the latest APK.
 */
export function downloadAndInstallLatestApk(apkUrl) {
  const targetUrl = apkUrl || 'https://github.com/ajay160380/smart-expense-coach/raw/main/backend/tracker/static/downloads/ExpenseTracker.apk';

  Alert.alert(
    'Download Latest APK 🚀',
    'Would you like to download and install the latest Expense Tracker APK now?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Download Now',
        onPress: () => {
          Linking.openURL(targetUrl).catch((err) => {
            console.error('Failed to open APK URL:', err);
            Alert.alert('Download Error', 'Could not open download link in browser.');
          });
        },
      },
    ]
  );
}
