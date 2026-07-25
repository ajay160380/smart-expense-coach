import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_KEY = '@app_notifications';

export const saveNotification = async (remoteMessage) => {
  try {
    const newNotification = {
      id: remoteMessage.messageId || Math.random().toString(),
      title: remoteMessage.notification?.title || 'New Alert',
      body: remoteMessage.notification?.body || '',
      date: new Date().toISOString(),
      read: false,
    };
    
    const existingStr = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    const existing = existingStr ? JSON.parse(existingStr) : [];
    
    // Check if it already exists to prevent duplicates (especially from background + app open)
    if (!existing.find(n => n.id === newNotification.id)) {
      const updated = [newNotification, ...existing];
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated.slice(0, 50))); // Keep last 50
    }
  } catch (e) {
    console.error('Error saving notification:', e);
  }
};

export const getNotifications = async () => {
  try {
    const existingStr = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (e) {
    return [];
  }
};

export const clearNotifications = async () => {
  try {
    await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
  } catch (e) {
    console.error('Error clearing notifications', e);
  }
};
