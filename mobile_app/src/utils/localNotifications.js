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
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Cancel all previously scheduled local notifications so we don't spam
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule for the next 7 days
    for (let i = 0; i < 7; i++) {
      // 1 or 2 notifications per day
      const numNotifications = Math.random() < 0.5 ? 1 : 2;

      for (let j = 0; j < numNotifications; j++) {
        // Random time between 18:00 (6 PM) and 22:00 (10 PM)
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        // Random hour between 18 and 21 (so max is 21:59)
        const randomHour = 18 + Math.floor(Math.random() * 4);
        const randomMinute = Math.floor(Math.random() * 60);
        
        date.setHours(randomHour, randomMinute, 0, 0);

        // Don't schedule in the past
        if (date.getTime() > Date.now()) {
          const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)];
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Expense Tracker 💡",
              body: randomMessage,
              sound: true,
            },
            trigger: date,
          });
          console.log(`Scheduled notification for ${date.toLocaleString()}`);
        }
      }
    }
  } catch (error) {
    console.error('Error scheduling notifications:', error);
  }
}
