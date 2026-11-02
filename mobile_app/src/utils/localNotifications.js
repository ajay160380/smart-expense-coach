import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const randomMessages = [
  "Did you log your expenses today? 📝",
  "Don't forget to track your spending! 💰",
  "Time for a quick budget check! 🔍",
  "Keep your finances in check, log your expenses! 💸",
  "A small step for tracking, a giant leap for savings. 🚀",
  "What did you spend on today? Log it now! 🛍️",
  "Stay on top of your budget! 📊",
  "Got a minute? Record your recent transactions! ⏱️",
  "Money saved is money earned. Track it! 🏦"
];

export async function scheduleRandomNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('expense_tracker_alerts_v2', {
        name: 'Expense Alerts & Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        showBadge: true,
      });
    }

    // Cancel all previously scheduled notifications so there is never duplicate spam
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule strictly ONE daily reminder every evening at 8:30 PM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Expense Tracker 💡",
        body: "Time for a quick daily budget check! 📊",
        channelId: 'expense_tracker_alerts_v2',
      },
      trigger: {
        hour: 20,
        minute: 30,
        repeats: true,
      },
    });
  } catch (error) {
    console.warn('Notice scheduling notifications:', error?.message || error);
  }
}
