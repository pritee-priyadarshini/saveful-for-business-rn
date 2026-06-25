const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const MERGE_RULES = [
  {
    name: 'com.google.firebase.messaging.default_notification_channel_id',
    replace: 'android:value',
  },
  {
    name: 'com.google.firebase.messaging.default_notification_color',
    replace: 'android:resource',
  },
  {
    name: 'com.google.firebase.messaging.default_notification_icon',
    replace: 'android:resource',
  },
];

function withAndroidFirebaseNotificationManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults;

    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const metaData = application['meta-data'] ?? [];
    application['meta-data'] = metaData;

    for (const rule of MERGE_RULES) {
      const entry = metaData.find((item) => item.$?.['android:name'] === rule.name);
      if (entry?.$) {
        entry.$['tools:replace'] = rule.replace;
      }
    }

    return modConfig;
  });
}

module.exports = withAndroidFirebaseNotificationManifest;
