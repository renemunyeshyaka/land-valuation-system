const { withAppBuildGradle } = require('@expo/config-plugins');

const ENV_BLOCK = `
def releaseKeystorePath = System.getenv('ANDROID_KEYSTORE_PATH')
def releaseKeystorePassword = System.getenv('ANDROID_KEYSTORE_PASSWORD')
def releaseKeyAlias = System.getenv('ANDROID_KEY_ALIAS')
def releaseKeyPassword = System.getenv('ANDROID_KEY_PASSWORD')
def hasReleaseSigning = releaseKeystorePath && releaseKeystorePassword && releaseKeyAlias && releaseKeyPassword
def allowDebugSigningForRelease = (findProperty('android.allowDebugSigningForRelease') ?: true).toBoolean()
`;

const RELEASE_SIGNING_CONFIG = `        if (hasReleaseSigning) {
            release {
                storeFile file(releaseKeystorePath)
                storePassword releaseKeystorePassword
                keyAlias releaseKeyAlias
                keyPassword releaseKeyPassword
            }
        }`;

const RELEASE_BUILD_TYPE_SIGNING = `            if (hasReleaseSigning) {
                signingConfig signingConfigs.release
            } else {
                if (!allowDebugSigningForRelease) {
                    throw new GradleException("Release signing is not configured. Set ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, and ANDROID_KEY_PASSWORD.")
                }
                logger.warn("Release build is using debug signing. Configure release signing env vars for production builds.")
                signingConfig signingConfigs.debug
            }`;

const withAndroidSigning = (config) => {
  return withAppBuildGradle(config, (config) => {
    // Idempotent — skip if already applied
    if (config.modResults.contents.includes('ANDROID_KEYSTORE_PATH')) {
      return config;
    }

    let contents = config.modResults.contents;

    // 1. Inject env var declarations after jscFlavor line
    contents = contents.replace(
      "def jscFlavor = 'org.webkit:android-jsc:+'",
      `def jscFlavor = 'org.webkit:android-jsc:+'${ENV_BLOCK}`
    );

    // 2. Inject release signingConfig block inside signingConfigs, after the debug block.
    //    Anchor: the closing of signingConfigs debug block followed by buildTypes.
    contents = contents.replace(
      '        }\n    }\n    buildTypes {',
      `        }\n${RELEASE_SIGNING_CONFIG}\n    }\n    buildTypes {`
    );

    // 3. Replace the Caution comment + debug signing in the release buildType
    //    with conditional env-based signing.
    contents = contents.replace(
      [
        '            // Caution! In production, you need to generate your own keystore file.',
        '            // see https://reactnative.dev/docs/signed-apk-android.',
        '            signingConfig signingConfigs.debug',
      ].join('\n'),
      RELEASE_BUILD_TYPE_SIGNING
    );

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withAndroidSigning;
