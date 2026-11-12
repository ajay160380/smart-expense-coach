import { registerRootComponent } from 'expo';
import messaging from './src/utils/messaging';
import { saveNotification } from './src/utils/notifications';

import App from './App';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { registerWidgetTaskHandler } from './src/utils/widgetCompat';
import { widgetTaskHandler } from './src/widgets/WidgetTaskHandler';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.executionEnvironment === 'storeClient' ||
  Boolean(Constants.expoVersion);

if (!isExpoGo) {
  try {
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (e) {
    console.log('Error registering widget handler:', e);
  }

  // Register background handler safely
  try {
    messaging().setBackgroundMessageHandler?.(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
      await saveNotification(remoteMessage);
    });
  } catch (error) {
    console.log('Error registering background message handler:', error);
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
