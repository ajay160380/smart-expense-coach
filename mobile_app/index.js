import { registerRootComponent } from 'expo';
import messaging from './src/utils/messaging';
import { saveNotification } from './src/utils/notifications';

import App from './App';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/WidgetTaskHandler';

registerWidgetTaskHandler(widgetTaskHandler);

import RNAndroidNotificationListener, { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';
import { headlessNotificationListener } from './src/utils/paymentListener';

// Register background headless task for reading Android Push Notifications (PhonePe, GPay, etc.)
import { AppRegistry } from 'react-native';
AppRegistry.registerHeadlessTask(RNAndroidNotificationListenerHeadlessJsName, () => headlessNotificationListener);

// Register background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  await saveNotification(remoteMessage);
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
