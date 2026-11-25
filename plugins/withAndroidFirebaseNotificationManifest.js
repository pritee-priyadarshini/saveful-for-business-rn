const fs = require('fs');
const path = require('path');

const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');

const FCM_META_DATA = [
  {
    name: 'com.google.firebase.messaging.default_notification_channel_id',
    replace: 'android:value',
    attrs: { 'android:value': 'default' },
  },
  {
    name: 'com.google.firebase.messaging.default_notification_color',
    replace: 'android:resource',
    attrs: { 'android:resource': '@color/notification_icon_color' },
  },
  {
    name: 'com.google.firebase.messaging.default_notification_icon',
    replace: 'android:resource',
    attrs: { 'android:resource': '@drawable/notification_icon' },
  },
];

const MANIFEST_PATHS = [
  'app/src/main/AndroidManifest.xml',
  'app/src/debug/AndroidManifest.xml',
  'app/src/debugOptimized/AndroidManifest.xml',
];

function normalizeMetaData(application) {
  let metaData = application['meta-data'];
  if (!metaData) {
    metaData = [];
  } else if (!Array.isArray(metaData)) {
    metaData = [metaData];
  }
  return metaData;
}

function findMetaDataIndex(metaData, name) {
  return metaData.findIndex((item) => item.$?.['android:name'] === name);
}

const PORTRAIT_FEATURE = 'android.hardware.screen.portrait';

/**
 * screenOrientation="portrait" makes the manifest merger imply
 * android.hardware.screen.portrait as required. Play then hides the app from
 * phones, tablets, desktop and Android XR. The app still locks to portrait;
 * the feature is just not a device requirement.
 */
function markPortraitFeatureOptional(manifest) {
  const current = manifest.manifest['uses-feature'];
  const features = current ? (Array.isArray(current) ? current : [current]) : [];
  const existing = features.find((item) => item.$?.['android:name'] === PORTRAIT_FEATURE);

  if (existing) {
    existing.$['android:required'] = 'false';
    existing.$['tools:replace'] = 'android:required';
  } else {
    features.push({
      $: {
        'android:name': PORTRAIT_FEATURE,
        'android:required': 'false',
        'tools:replace': 'android:required',
      },
    });
  }

  manifest.manifest['uses-feature'] = features;
}

function upsertFcmMetaData(application) {
  const metaData = normalizeMetaData(application);

  for (const rule of FCM_META_DATA) {
    const index = findMetaDataIndex(metaData, rule.name);
    if (index >= 0) {
      metaData[index].$ = {
        ...metaData[index].$,
        ...rule.attrs,
        'tools:replace': rule.replace,
      };
    } else {
      metaData.push({
        $: {
          'android:name': rule.name,
          ...rule.attrs,
          'tools:replace': rule.replace,
        },
      });
    }
  }

  application['meta-data'] = metaData;
}

function ensureToolsNamespace(xml) {
  if (xml.includes('xmlns:tools=')) {
    return xml;
  }
  return xml.replace(
    '<manifest ',
    '<manifest xmlns:tools="http://schemas.android.com/tools" ',
  );
}

function patchManifestXmlString(xml) {
  let next = ensureToolsNamespace(xml);

  for (const rule of FCM_META_DATA) {
    const tagPattern = new RegExp(
      `<meta-data[^>]*android:name="${rule.name}"[^>]*/>`,
      'g',
    );

    next = next.replace(tagPattern, (tag) => {
      let updated = tag;

      if (rule.replace === 'android:value' && !updated.includes('android:value=')) {
        updated = updated.replace(
          '/>',
          ` android:value="${rule.attrs['android:value']}"/>`,
        );
      }

      if (
        rule.replace === 'android:resource' &&
        !updated.includes('android:resource=')
      ) {
        updated = updated.replace(
          '/>',
          ` android:resource="${rule.attrs['android:resource']}"/>`,
        );
      }

      if (!updated.includes('tools:replace=')) {
        updated = updated.replace(
          '/>',
          ` tools:replace="${rule.replace}"/>`,
        );
      }

      return updated;
    });
  }

  return next;
}

function patchManifestFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const patched = patchManifestXmlString(original);

  if (patched !== original) {
    fs.writeFileSync(filePath, patched);
  }
}

/**
 * expo-notifications and @react-native-firebase/messaging both declare FCM
 * notification meta-data. Patch the generated manifests so Gradle merge succeeds.
 */
function withAndroidFirebaseNotificationManifest(config) {
  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults;

    manifest.manifest.$ = {
      ...manifest.manifest.$,
      'xmlns:tools': 'http://schemas.android.com/tools',
    };

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    upsertFcmMetaData(application);
    markPortraitFeatureOptional(manifest);

    return modConfig;
  });

  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const androidRoot = modConfig.modRequest.platformProjectRoot;

      for (const relativePath of MANIFEST_PATHS) {
        patchManifestFile(path.join(androidRoot, relativePath));
      }

      return modConfig;
    },
  ]);
}

module.exports = withAndroidFirebaseNotificationManifest;
