import { registerRootComponent } from 'expo';
// import messaging from '@react-native-firebase/messaging';
// import { saveNotification } from './src/utils/notifications';

import App from './App';

// Register background handler
/*
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  await saveNotification(remoteMessage);
});
*/

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
