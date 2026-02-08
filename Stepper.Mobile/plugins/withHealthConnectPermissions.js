const { withMainActivity, withAndroidManifest } = require('@expo/config-plugins');

const withHealthConnectMainActivity = (config) => {
  return withMainActivity(config, async (config) => {
    let mainActivity = config.modResults.contents;

    // Add import
    if (!mainActivity.includes('HealthConnectPermissionDelegate')) {
      mainActivity = mainActivity.replace(
        'import com.facebook.react.ReactActivity',
        'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate\nimport com.facebook.react.ReactActivity'
      );
    }

    // Register permission delegate in onCreate
    if (!mainActivity.includes('HealthConnectPermissionDelegate.setPermissionDelegate')) {
      mainActivity = mainActivity.replace(
        'super.onCreate(null)',
        'super.onCreate(null)\n    HealthConnectPermissionDelegate.setPermissionDelegate(this)'
      );
    }

    config.modResults.contents = mainActivity;
    return config;
  });
};

const withHealthConnectManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // Health Connect permission declarations
    const healthPermissions = [
      'android.permission.health.READ_STEPS',
      'android.permission.health.READ_DISTANCE',
    ];

    // Get existing permissions
    const existingPermissions = (manifest['uses-permission'] || []).map(
      (p) => p.$['android:name']
    );

    // Add missing health permissions
    for (const permission of healthPermissions) {
      if (!existingPermissions.includes(permission)) {
        manifest['uses-permission'] = manifest['uses-permission'] || [];
        manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    }

    return config;
  });
};

const withHealthConnectPermissions = (config) => {
  config = withHealthConnectMainActivity(config);
  config = withHealthConnectManifest(config);
  return config;
};

module.exports = withHealthConnectPermissions;
