import { registerCapabilities, reticle, install } from '@reticlehq/react';

const TOKEN = '690eb6417686514dcb823852a3af23a1e1b9885d10f97259';

if (__DEV__) {
  install();

  // Pre-fill auth for testing
  (async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const existing = await AsyncStorage.getItem('userToken');
      if (!existing) {
        await AsyncStorage.multiSet([
          ['userToken', '24f472e0978d5d7db97e0bac39ad4c6f683bcb3f'],
          ['userId', '11'],
          ['username', 'ajaymobile'],
          ['loginTime', String(Date.now())],
        ]);
        window.location.reload();
        return;
      }
    } catch (e) {
      // AsyncStorage not available (web)
    }
    reticle.connect({ token: TOKEN });
    registerCapabilities({ testids: [], signals: [], stores: [] });
  })();
}
