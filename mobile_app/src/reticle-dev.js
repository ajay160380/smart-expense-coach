// Reticle dev tool integration
// NOTE: Private tokens or credentials should NEVER be hardcoded here.
// Developer must configure RETICLE_TOKEN via environment or local config if needed.

import { registerCapabilities, reticle, install } from '@reticlehq/react';

const TOKEN = process.env.EXPO_PUBLIC_RETICLE_TOKEN || '';

if (__DEV__ && TOKEN) {
  install();
  reticle.connect({ token: TOKEN });
  registerCapabilities({ testids: [], signals: [], stores: [] });
}
