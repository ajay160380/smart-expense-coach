/**
 * ═══════════════════════════════════════════════════════════════
 * EXPENSE TRACKER — AUTH & SECURITY UTILITIES
 * Secure token storage, input sanitization, session management
 * ═══════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Token Keys ──
const TOKEN_KEY = 'userToken';
const USER_ID_KEY = 'userId';
const USERNAME_KEY = 'username';
const LOGIN_TIME_KEY = 'loginTime';

// ── Session Config ──
const SESSION_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// ═══════════════════════════════════════════════
// TOKEN MANAGEMENT
// ═══════════════════════════════════════════════

export async function saveAuthData(token, userId, username) {
  try {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_ID_KEY, String(userId)],
      [USERNAME_KEY, username],
      [LOGIN_TIME_KEY, String(Date.now())],
    ]);
    return true;
  } catch (e) {
    console.error('Failed to save auth data:', e);
    return false;
  }
}

export async function getToken() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    // Check session expiry
    const loginTime = await AsyncStorage.getItem(LOGIN_TIME_KEY);
    if (loginTime && Date.now() - parseInt(loginTime) > SESSION_TIMEOUT_MS) {
      await clearAuthData();
      return null;
    }

    return token;
  } catch (e) {
    console.error('Failed to get token:', e);
    return null;
  }
}

export async function getUsername() {
  try {
    return await AsyncStorage.getItem(USERNAME_KEY);
  } catch (e) {
    return 'User';
  }
}

export async function getUserId() {
  try {
    return await AsyncStorage.getItem(USER_ID_KEY);
  } catch (e) {
    return null;
  }
}

export async function clearAuthData() {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_ID_KEY, USERNAME_KEY, LOGIN_TIME_KEY]);
    return true;
  } catch (e) {
    console.error('Failed to clear auth data:', e);
    return false;
  }
}

export async function isAuthenticated() {
  const token = await getToken();
  return !!token;
}

// ═══════════════════════════════════════════════
// INPUT SANITIZATION
// ═══════════════════════════════════════════════

/**
 * Strip HTML tags and script injections from user input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')        // Remove HTML tags
    .replace(/javascript:/gi, '')    // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')      // Remove event handlers
    .replace(/[<>]/g, '')            // Remove angle brackets
    .trim();
}

/**
 * Validate amount input — only numbers and one decimal point
 */
export function sanitizeAmount(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}

/**
 * Validate phone number
 */
export function isValidPhone(phone) {
  return /^[0-9]{10,15}$/.test(phone.replace(/[\s\-\+]/g, ''));
}

/**
 * Validate email
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Password strength checker
 * Returns: { score: 0-4, label: string, color: string }
 */
export function checkPasswordStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Very Weak', color: '#ef4444' },
    { label: 'Weak',      color: '#f97316' },
    { label: 'Fair',      color: '#facc15' },
    { label: 'Strong',    color: '#22c55e' },
    { label: 'Very Strong', color: '#10b981' },
  ];

  return { score, ...levels[Math.min(score, 4)] };
}

// ═══════════════════════════════════════════════
// LOGIN THROTTLING
// ═══════════════════════════════════════════════

export async function checkLoginThrottle() {
  try {
    const data = await AsyncStorage.getItem('login_attempts');
    if (!data) return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };

    const { count, lockUntil } = JSON.parse(data);

    if (lockUntil && Date.now() < lockUntil) {
      const secsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
      return { allowed: false, remaining: 0, secsLeft };
    }

    if (lockUntil && Date.now() >= lockUntil) {
      await AsyncStorage.removeItem('login_attempts');
      return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
    }

    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - count };
  } catch (e) {
    return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS };
  }
}

export async function recordLoginAttempt(success) {
  if (success) {
    await AsyncStorage.removeItem('login_attempts');
    return;
  }

  try {
    const data = await AsyncStorage.getItem('login_attempts');
    let count = 1;

    if (data) {
      const parsed = JSON.parse(data);
      count = (parsed.count || 0) + 1;
    }

    if (count >= MAX_LOGIN_ATTEMPTS) {
      await AsyncStorage.setItem('login_attempts', JSON.stringify({
        count,
        lockUntil: Date.now() + LOCKOUT_DURATION_MS,
      }));
    } else {
      await AsyncStorage.setItem('login_attempts', JSON.stringify({ count }));
    }
  } catch (e) {
    console.error('Failed to record login attempt:', e);
  }
}
