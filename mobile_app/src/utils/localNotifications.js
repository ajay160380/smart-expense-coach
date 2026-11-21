/**
 * ═══════════════════════════════════════════════════════════════
 * SMART EXPENSE COACH — DYNAMIC LOCAL NOTIFICATION SCHEDULER
 * ═══════════════════════════════════════════════════════════════
 * Sends 1-2 thoughtful, engaging, and timely expense notifications
 * in pure English at natural randomized times across morning,
 * afternoon, day, and night.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── GLOBAL NOTIFICATION PRESENTATION HANDLER ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// ── 100% ENGLISH SMART MESSAGE POOLS ──

const MORNING_MESSAGES = [
  {
    title: "🌅 Good Morning! Today's Spending Plan",
    getBody: (ctx) =>
      ctx?.safeDailySpend
        ? `A brand new day begins! Your safe daily spend target is ₹${ctx.safeDailySpend.toLocaleString('en-IN')}. Make it count! 💰`
        : 'A brand new day begins! Take a quick moment to check your daily budget. 💰',
  },
  {
    title: '☕ Morning Coffee or Breakfast?',
    getBody: () =>
      'Enjoying your morning tea, coffee, or commute? Log it in seconds with Voice or WhatsApp! 📝',
  },
  {
    title: '🚀 Wake Up & Win Your Day',
    getBody: (ctx) =>
      ctx?.name
        ? `Good morning ${ctx.name}! 1 minute of money mindfulness today saves thousands this month. 💪`
        : '1 minute of financial awareness today saves thousands this month. Have a great day! 🚀',
  },
  {
    title: '💡 Smart Morning Money Tip',
    getBody: (ctx) =>
      ctx?.safeDailySpend
        ? `Today's safe allowance is ₹${ctx.safeDailySpend.toLocaleString('en-IN')}. Plan your essentials first and avoid impulse buys! 📊`
        : 'Plan your essential expenses first today and stay ahead of your monthly target! 📊',
  },
  {
    title: '☀️ Daily Financial Focus',
    getBody: () =>
      'Start your morning with clear financial control. Track expenses as you go and build wealth! ✨',
  },
];

const AFTERNOON_MESSAGES = [
  {
    title: '🍽️ Lunch Break Check-In',
    getBody: () =>
      "Dined out or ordered lunch? Don't forget to record your meal expenses right away! 🍛",
  },
  {
    title: '⚡ Mid-Day Spending Pulse',
    getBody: (ctx) =>
      ctx?.safeDailySpend
        ? `Half the day has passed! Your safe limit for today is ₹${ctx.safeDailySpend.toLocaleString('en-IN')}. Stay right on track! 📈`
        : "Half the day has passed! Take a quick 10-second glance at your spending pace today. 📈",
  },
  {
    title: '💡 Quick 10-Second Expense Log',
    getBody: () =>
      'Small daily expenses add up fast! Tap the mic to log any morning or afternoon spends. 🎙️',
  },
  {
    title: '🏃 Mid-Day Habit Check',
    getBody: (ctx) =>
      ctx?.name
        ? `Hey ${ctx.name}, quick check-in! Did any unexpected expenses come up this afternoon? 📝`
        : 'Take 20 seconds to update your expense tracker and keep your finances crystal clear! 📝',
  },
  {
    title: '🛒 Shopping or Errands Today?',
    getBody: () =>
      'Picked up any quick groceries or essentials? Add them now so you never forget! 🛍️',
  },
];

const EVENING_MESSAGES = [
  {
    title: '🌆 Evening Refreshment & Commute',
    getBody: () =>
      'Evening tea, snacks, or cab ride? Log it in 2 seconds and keep your daily streak alive! ☕',
  },
  {
    title: '🛋️ Evening Financial Wind-Down',
    getBody: () =>
      'How did your spending go today? Check your dashboard and relax with complete peace of mind. 🛋️',
  },
  {
    title: '🥬 Groceries & Daily Needs',
    getBody: () =>
      'Picked up supplies on the way home? Keep your budget 100% accurate by logging them now! 🥬',
  },
];

const NIGHT_MESSAGES = [
  {
    title: '🌙 Daily Wrap-Up: Check Your Expenses',
    getBody: () =>
      'Before heading to bed, take a quick look: did you log all of today’s expenses? 📝',
  },
  {
    title: '😴 Sleep Easy With A Balanced Budget',
    getBody: (ctx) =>
      ctx?.name
        ? `Great job today, ${ctx.name}! Review your daily spending and rest with confidence. 🛌`
        : 'Review your daily spending one last time before bed. Sleep peacefully and dream big! 🛌',
  },
  {
    title: '⭐ Consistency Is Key To Savings',
    getBody: () =>
      'Consistency is the foundation of wealth. Log your final spend and keep your streak strong! 🎯',
  },
  {
    title: '📊 Daily Financial Review',
    getBody: () =>
      'Check your remaining monthly budget before calling it a day. Tomorrow is a fresh start! ✨',
  },
  {
    title: '💸 Evening Budget Check',
    getBody: (ctx) =>
      ctx?.safeDailySpend
        ? `Check how close you stayed to your ₹${ctx.safeDailySpend.toLocaleString('en-IN')} target today! 🌙`
        : 'Take a quick glance at your daily spending summary before you sleep. Good night! 🌙',
  },
];

const LAST_SCHEDULE_KEY = '@last_local_notif_schedule_date';

/**
 * Configure Android Notification Channel with Max Importance & Sound
 */
async function setupChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('expense_tracker_alerts_v3', {
      name: 'Expense Alerts & Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: { enforceAudibility: true },
      },
    });
  }
}

/**
 * Schedules 1-2 auto notifications per day in pure English at dynamic,
 * randomized times across morning, afternoon, day, and night.
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

    // Cancel existing scheduled local notifications to prevent duplicate stacking
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Pick 2 random slots for the day (e.g., Morning + Night, or Afternoon + Night, or Morning + Afternoon)
    // to keep it naturally spaced and strictly 1-2 notifications per day.
    const allSlots = ['morning', 'afternoon', 'night'];
    // Shuffle slots
    const shuffledSlots = [...allSlots].sort(() => 0.5 - Math.random());
    const selectedSlots = shuffledSlots.slice(0, 2); // Always 2 distinct slots per day

    for (const slot of selectedSlots) {
      if (slot === 'morning') {
        const template = MORNING_MESSAGES[Math.floor(Math.random() * MORNING_MESSAGES.length)];
        // Random morning time between 8:15 AM and 9:45 AM
        const hour = 8 + (Math.random() < 0.5 ? 0 : 1);
        const minute = 15 + Math.floor(Math.random() * 40); // 15 to 54 min

        await Notifications.scheduleNotificationAsync({
          content: {
            title: template.title,
            body: template.getBody(userContext),
            data: { screen: 'Dashboard', type: 'morning_reminder' },
            sound: true,
            vibrate: [0, 250, 250, 250],
            channelId: 'expense_tracker_alerts_v3',
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: {
            type: 'daily',
            hour,
            minute,
            channelId: 'expense_tracker_alerts_v3',
          },
        });
      } else if (slot === 'afternoon') {
        const pool = Math.random() < 0.65 ? AFTERNOON_MESSAGES : EVENING_MESSAGES;
        const template = pool[Math.floor(Math.random() * pool.length)];
        // Random daytime/afternoon time between 1:15 PM and 3:45 PM (13:15 - 15:45)
        const hour = 13 + Math.floor(Math.random() * 3); // 13, 14, or 15
        const minute = 10 + Math.floor(Math.random() * 45); // 10 to 54 min

        await Notifications.scheduleNotificationAsync({
          content: {
            title: template.title,
            body: template.getBody(userContext),
            data: { screen: 'Dashboard', type: 'afternoon_reminder' },
            sound: true,
            vibrate: [0, 250, 250, 250],
            channelId: 'expense_tracker_alerts_v3',
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: {
            type: 'daily',
            hour,
            minute,
            channelId: 'expense_tracker_alerts_v3',
          },
        });
      } else if (slot === 'night') {
        const template = NIGHT_MESSAGES[Math.floor(Math.random() * NIGHT_MESSAGES.length)];
        // Random night time between 8:45 PM and 10:15 PM (20:45 - 22:15)
        const hour = Math.random() < 0.7 ? 21 : (Math.random() < 0.5 ? 20 : 22);
        const minute = 10 + Math.floor(Math.random() * 40); // 10 to 49 min

        await Notifications.scheduleNotificationAsync({
          content: {
            title: template.title,
            body: template.getBody(userContext),
            data: { screen: 'Dashboard', type: 'night_reminder' },
            sound: true,
            vibrate: [0, 250, 250, 250],
            channelId: 'expense_tracker_alerts_v3',
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: {
            type: 'daily',
            hour,
            minute,
            channelId: 'expense_tracker_alerts_v3',
          },
        });
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    await AsyncStorage.setItem(LAST_SCHEDULE_KEY, todayStr);
    console.log(`[AutoNotif] Scheduled 2 dynamic English reminders for slots: ${selectedSlots.join(', ')}`);

    // Instant confirmation alert on app open with zero delay (trigger: null)
    // so user gets visible & audible proof on their phone's notification bar immediately!
    const welcomed = await AsyncStorage.getItem('@auto_notif_welcomed_v4');
    if (!welcomed) {
      await AsyncStorage.setItem('@auto_notif_welcomed_v4', 'true');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💡 Smart Expense Coach Active',
          body: 'Daily budget & expense reminders are now enabled! You will receive 1-2 smart updates throughout the day. 🚀',
          data: { screen: 'Dashboard' },
          sound: true,
          vibrate: [0, 250, 250, 250],
          channelId: 'expense_tracker_alerts_v3',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
    }
  } catch (error) {
    console.log('[AutoNotif] Schedule Error (silent fallback):', error);
  }
}

/**
 * Fires an instant preview notification in English to test appearance immediately.
 */
export async function triggerInstantTestNotification() {
  try {
    await setupChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💡 Smart Expense Coach Active',
        body: 'Automatic daily expense reminders are active! You will receive 1-2 timely updates throughout the day. 🚀',
        data: { screen: 'Dashboard' },
        sound: true,
        vibrate: [0, 250, 250, 250],
        channelId: 'expense_tracker_alerts_v3',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // immediate
    });
  } catch (e) {
    console.log('[AutoNotif] Test Error:', e);
  }
}
