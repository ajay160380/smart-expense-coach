const { withAndroidManifest } = require('@expo/config-plugins');

const withNotificationListener = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const manifest = androidManifest.manifest;
    const app = manifest.application[0];

    // Ensure xmlns:tools is present
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Add tools:replace="android:allowBackup"
    if (app.$['tools:replace']) {
      if (!app.$['tools:replace'].includes('android:allowBackup')) {
        app.$['tools:replace'] += ',android:allowBackup';
      }
    } else {
      app.$['tools:replace'] = 'android:allowBackup';
    }

    // Ensure services array exists
    if (!app.service) {
      app.service = [];
    }

    // Check if the service is already added to prevent duplicates
    const hasService = app.service.some(
      (s) => s.$['android:name'] === 'nl.vigo.rnnotificationlistener.RNNotificationListenerService'
    );

    if (!hasService) {
      // Add the NotificationListenerService
      app.service.push({
        $: {
          'android:name': 'nl.vigo.rnnotificationlistener.RNNotificationListenerService',
          'android:label': 'RN Notification Listener',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withNotificationListener;
