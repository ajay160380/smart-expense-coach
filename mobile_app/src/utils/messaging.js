import { NativeModules, TurboModuleRegistry } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

let messaging = null;

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.executionEnvironment === 'storeClient' ||
  Boolean(Constants.expoVersion);

const hasNativeFirebase =
  !isExpoGo &&
  (Boolean(NativeModules?.RNFBAppModule) ||
   Boolean(TurboModuleRegistry?.get?.('RNFBAppModule')));

if (hasNativeFirebase) {
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
