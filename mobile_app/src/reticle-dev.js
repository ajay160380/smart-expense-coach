import { registerCapabilities, reticle, install } from '@reticlehq/react';

if (__DEV__) {
  install();
  // Connecting without token to default localhost:4400 bridge
  reticle.connect({});
  registerCapabilities({
    testids: [], 
    signals: [], 
    stores: [], 
  });
}
