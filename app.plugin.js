const {
  withProjectBuildGradle,
  withSettingsGradle,
  withAppBuildGradle,
  withGradleProperties,
  withPodfile,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const MAVEN_REPO =
  'https://raw.githubusercontent.com/didit-protocol/sdk-android/main/repository';

const MAVEN_LINE = `        maven { url "${MAVEN_REPO}" }`;

const PODSPEC_URL =
  'https://raw.githubusercontent.com/didit-protocol/sdk-ios/main/DiditSDK.podspec';

function normalizeOptions(props = {}) {
  return {
    androidNfcEnabled: props.androidNfcEnabled !== false,
    iosNfcEnabled: props.iosNfcEnabled !== false,
  };
}

function diditPodBlock(iosNfcEnabled) {
  return [
    `  didit_sdk_ios_nfc_enabled = ENV.fetch('DIDIT_SDK_IOS_NFC_ENABLED', '${iosNfcEnabled}').downcase != 'false'`,
    "  didit_sdk_ios_pod = didit_sdk_ios_nfc_enabled ? 'DiditSDK' : 'DiditSDK/Core'",
    `  pod didit_sdk_ios_pod, :podspec => '${PODSPEC_URL}'`,
  ].join('\n');
}

// ── Android ──────────────────────────────────────────────────────────────────

/**
 * Injects the Didit Maven repository into android/build.gradle
 * (allprojects.repositories — used by Expo projects).
 */
function withDiditBuildGradle(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes(MAVEN_REPO)) {
      return mod;
    }

    const match = mod.modResults.contents.match(
      /allprojects\s*\{[\s\S]*?repositories\s*\{/
    );

    if (match) {
      mod.modResults.contents = mod.modResults.contents.replace(
        /allprojects\s*\{[\s\S]*?repositories\s*\{/,
        (m) => `${m}\n${MAVEN_LINE}`
      );
    }

    return mod;
  });
}

/**
 * Injects the Didit Maven repository into android/settings.gradle
 * (dependencyResolutionManagement.repositories — used by React Native CLI projects).
 */
function withDiditSettingsGradle(config) {
  return withSettingsGradle(config, (mod) => {
    if (mod.modResults.contents.includes(MAVEN_REPO)) {
      return mod;
    }

    const match = mod.modResults.contents.match(
      /dependencyResolutionManagement\s*\{[^}]*repositories\s*\{/
    );

    if (match) {
      mod.modResults.contents = mod.modResults.contents.replace(
        /dependencyResolutionManagement\s*\{[^}]*repositories\s*\{/,
        (m) => `${m}\n${MAVEN_LINE}`
      );
    }

    return mod;
  });
}

/**
 * Adds BouncyCastle dependency exclusions and packaging rules to
 * android/app/build.gradle to avoid duplicate class and META-INF
 * conflicts from BouncyCastle transitive dependencies.
 *
 * The DiditSDK uses jdk18on BouncyCastle modules. Host apps may have
 * other dependencies that pull in older jdk15to18 or jdk15on variants,
 * causing duplicate class errors during Android builds.
 */
const DIDIT_ANDROID_BLOCK = `
    configurations.configureEach {
        exclude group: 'org.bouncycastle', module: 'bcprov-jdk15to18'
        exclude group: 'org.bouncycastle', module: 'bcutil-jdk15to18'
        exclude group: 'org.bouncycastle', module: 'bcpkix-jdk15to18'
        exclude group: 'org.bouncycastle', module: 'bcprov-jdk15on'
    }
    packaging {
        resources {
            pickFirsts += ['org/bouncycastle/**']
            excludes += 'META-INF/versions/9/OSGI-INF/MANIFEST.MF'
        }
    }`;

function withDiditPackagingExclusion(config, androidNfcEnabled) {
  if (!androidNfcEnabled) {
    return config;
  }

  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes('bcprov-jdk15to18')) {
      return mod;
    }

    mod.modResults.contents = mod.modResults.contents.replace(
      /android\s*\{/,
      (m) => `${m}\n${DIDIT_ANDROID_BLOCK}`
    );

    return mod;
  });
}

function withDiditAndroidNfcProperty(config, androidNfcEnabled) {
  return withGradleProperties(config, (mod) => {
    mod.modResults = mod.modResults.filter(
      (item) => item.key !== 'diditSdkAndroidNfcEnabled'
    );
    mod.modResults.push({
      type: 'property',
      key: 'diditSdkAndroidNfcEnabled',
      value: String(androidNfcEnabled),
    });
    return mod;
  });
}

/**
 * Applies all Android Gradle mods so the plugin works with either project structure.
 */
function withDiditAndroidMaven(config, options) {
  config = withDiditBuildGradle(config);
  config = withDiditSettingsGradle(config);
  config = withDiditAndroidNfcProperty(config, options.androidNfcEnabled);
  config = withDiditPackagingExclusion(config, options.androidNfcEnabled);
  return config;
}

// ── iOS ──────────────────────────────────────────────────────────────────────

/**
 * Injects the DiditSDK podspec reference into the iOS Podfile so CocoaPods
 * can resolve the native iOS SDK dependency.
 *
 * Uses the standard withPodfile mod (not withDangerousMod).
 */
function withDiditIosPodspec(config, options) {
  return withPodfile(config, (mod) => {
    if (mod.modResults.contents.includes('didit_sdk_ios_pod')) {
      return mod;
    }

    const contents = mod.modResults.contents
      .split('\n')
      .filter((line) => !line.includes(PODSPEC_URL))
      .join('\n');
    const podBlock = diditPodBlock(options.iosNfcEnabled);

    // Expo projects: inject after use_expo_modules!
    if (contents.includes('use_expo_modules!')) {
      mod.modResults.contents = contents.replace(
        /use_expo_modules!/,
        (m) => `${m}\n\n${podBlock}`
      );
    }
    // RN CLI projects: inject after the target ... do line
    else {
      mod.modResults.contents = contents.replace(
        /(target\s+'.+'\s+do)/,
        (m) => `${m}\n\n${podBlock}`
      );
    }

    return mod;
  });
}

// ── Combined Plugin ──────────────────────────────────────────────────────────

/**
 * Expo config plugin for @didit-protocol/sdk-react-native.
 *
 * Automatically configures:
 * - Android: Adds the Didit Maven repository to Gradle and packaging exclusions
 * - iOS: Adds the DiditSDK podspec to the Podfile
 */
function withDiditSdk(config, props) {
  const options = normalizeOptions(props);
  config = withDiditAndroidMaven(config, options);
  config = withDiditIosPodspec(config, options);
  return config;
}

const pkg = require('./package.json');

module.exports = createRunOncePlugin(withDiditSdk, pkg.name, pkg.version);
