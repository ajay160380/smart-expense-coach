import Constants from 'expo-constants';

let messaging = null;

if (Constants.appOwnership !== 'expo') {
  try {
    messaging = require('@react-native-firebase/messaging').default;
  } catch (e) {
    console.log("Native firebase messaging not available:", e);
  }
}

if (!messaging) {
  messaging = () => ({
    requestPermission: async () => 1,
    subscribeToTopic: async () => {},
    getToken: async () => 'expo-go-mock-token',
    onMessage: () => () => {},
    onNotificationOpenedApp: () => {},
    getInitialNotification: async () => null,
    setBackgroundMessageHandler: () => {},
  });
  messaging.AuthorizationStatus = { AUTHORIZED: 1, PROVISIONAL: 2 };
}

export default messaging;
