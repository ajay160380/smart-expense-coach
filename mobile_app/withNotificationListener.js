const { withAndroidManifest } = require('@expo/config-plugins');

const withNotificationListener = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const app = androidManifest.manifest.application[0];

    // Ensure services array exists
    if (!app.service) {
      app.service = [];
    }

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

    return config;
  });
};

module.exports = withNotificationListener;
