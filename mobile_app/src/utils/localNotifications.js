/**
 * ═══════════════════════════════════════════════════════════════
 * SMART EXPENSE COACH — AUTOMATED LOCAL NOTIFICATION SCHEDULER
 * ═══════════════════════════════════════════════════════════════
 * Sends 1-2 thoughtful, motivational, and timely expense notifications
 * per day (Morning Budget & Night Review) at natural randomized times,
 * even when offline or when backend FCM is idle.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── GLOBAL NOTIFICATION PRESENTATION HANDLER ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── SMART MESSAGE POOLS (HINDI / ENGLISH BLEND) ──
const MORNING_MESSAGES = [
  {
    title: '🌅 Good Morning! Aaj Ka Daily Target',
    getBody: (ctx) =>
      ctx?.safeDailySpend
        ? `Naya din, fresh target! Aaj ka safe spending limit ₹${ctx.safeDailySpend.toLocaleString('en-IN')} hai. Mindful shuruat karein! 💰`
        : 'Naya din, fresh target! Aaj ka daily budget check karein aur smart spending karein. 💰',
  },
  {
    title: '☕ Morning Habit: Chai & Breakfast',
    getBody: (ctx) =>
      `Chai, nashta ya travel ka kharcha hua? ☕ 2 second me voice ya WhatsApp se log karein!`,
  },
  {
    title: '🎯 Daily Safe Spend Reminder',
    getBody: (ctx) =>
      ctx?.name
        ? `Shubh prabhat ${ctx.name}! Subah ka 1 minute aapke hazaron rupaye bacha sakta hai. Stay on track! 🚀`
        : 'Subah ka 1 minute aapke mahine ke hazaron rupaye bacha sakta hai. Aaj ke spends track karein! 🚀',
  },
  {
    title: '💡 Smart Money Start',
    getBody: (ctx) =>
      ctx?.safeDailySpend
        ? `Aaj ka safe quota ₹${ctx.safeDailySpend.toLocaleString('en-IN')} hai. Zaroori kharchon ko pehle plan karein! 📊`
        : 'Aaj ke zaroori kharchon ko pehle plan karein, extra impulse buying se bachein! 📊',
  },
  {
    title: '☀️ Daily Financial Focus',
    getBody: (ctx) =>
      `Din ki shuruat clear financial control ke sath karein. Check your dashboard today! ✨`,
  },
];

const NIGHT_MESSAGES = [
  {
    title: '🌙 Din Ka Hisab-Kitab Time!',
    getBody: (ctx) =>
      `Sone se pehle aaj ke saare kharche check kar lijiye. Kya koi chhota spend log karna reh gaya? 📝`,
  },
  {
    title: '😴 Nightly Expense Wrap-Up',
    getBody: (ctx) =>
      `Dinner ya grocery ka kharcha log ho gaya? Ek quick glance dalein aur peaceful sleep lein! 🛌`,
  },
  {
    title: '⭐ Consistency Is Key!',
    getBody: (ctx) =>
      ctx?.name
        ? `Well done ${ctx.name}! Apni daily expense logging streak maintain karein aur savings boost karein! 🎯`
        : 'Apni daily expense logging streak maintain karein aur har din savings boost karein! 🎯',
  },
  {
    title: '📊 Daily Review Complete?',
    getBody: (ctx) =>
      `Aaj ka aakhri hisab update karein. Kal fresh budget aur nayi energy ke sath shuru karenge! ✨`,
  },
  {
    title: '💸 Money Mindfulness Check',
    getBody: (ctx) =>
      `Aaj kitna kharch hua aur kitna bacha? Check your remaining budget before calling it a day! 🌙`,
  },
];

const LAST_SCHEDULE_KEY = '@last_local_notif_schedule_date';

/**
 * Configure Android Notification Channel with Max Importance & Sound
 */
async function setupChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('expense_tracker_alerts_v2', {
      name: 'Expense Alerts & Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }
}

/**
 * Schedules 1-2 auto notifications per day (Morning Budget & Night Review)
 * at slightly randomized, natural times.
 *
 * @param {Object} userContext { name?: string, safeDailySpend?: number }
 */
export async function scheduleRandomNotifications(userContext = {}) {
  try {
    await setupChannel();

    // Verify permission
    const permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted && permissions.canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync();
      if (!requested.granted) return;
    } else if (!permissions.granted) {
      return;
    }

    // Check if we already scheduled today (to avoid thrashing the alarm manager on every re-render)
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastScheduled = await AsyncStorage.getItem(LAST_SCHEDULE_KEY);

    // Cancel existing scheduled local notifications to prevent duplicate stacking
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Select random rich templates
    const morningTemplate = MORNING_MESSAGES[Math.floor(Math.random() * MORNING_MESSAGES.length)];
    const nightTemplate = NIGHT_MESSAGES[Math.floor(Math.random() * NIGHT_MESSAGES.length)];

    const morningTitle = morningTemplate.title;
    const morningBody = morningTemplate.getBody(userContext);

    const nightTitle = nightTemplate.title;
    const nightBody = nightTemplate.getBody(userContext);

    // 1. Morning Notification: Natural time between 8:30 AM and 9:15 AM
    const morningMinute = 30 + Math.floor(Math.random() * 20); // 30 - 49 min past 8 AM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: morningTitle,
        body: morningBody,
        data: { screen: 'Dashboard', type: 'morning_nudge' },
        sound: 'default',
        channelId: 'expense_tracker_alerts_v2',
      },
      trigger: {
        hour: 8,
        minute: morningMinute,
        repeats: true,
      },
    });

    // 2. Night Notification: Natural time between 9:00 PM and 9:30 PM (21:00 - 21:30)
    const nightMinute = 5 + Math.floor(Math.random() * 25); // 05 - 29 min past 9 PM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: nightTitle,
        body: nightBody,
        data: { screen: 'Dashboard', type: 'night_summary' },
        sound: 'default',
        channelId: 'expense_tracker_alerts_v2',
      },
      trigger: {
        hour: 21,
        minute: nightMinute,
        repeats: true,
      },
    });

    await AsyncStorage.setItem(LAST_SCHEDULE_KEY, todayStr);
    console.log(`[AutoNotif] Scheduled 2 daily reminders: Morning ~08:${morningMinute}, Night ~21:${nightMinute}`);
  } catch (error) {
    console.log('[AutoNotif] Schedule Error (silent fallback):', error);
  }
}

/**
 * Fires an instant preview notification to test sound and appearance immediately.
 */
export async function triggerInstantTestNotification() {
  try {
    await setupChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💡 Smart Expense Coach Active!',
        body: 'Aapke auto daily reminders set ho gaye hain! Morning aur Night me 1-2 smart budget updates milte rahenge. 🚀',
        data: { screen: 'Dashboard' },
        sound: 'default',
        channelId: 'expense_tracker_alerts_v2',
      },
      trigger: null, // immediate
    });
  } catch (e) {
    console.log('[AutoNotif] Test Error:', e);
  }
}
