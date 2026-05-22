const {
  withProjectBuildGradle,
  withSettingsGradle,
  withAppBuildGradle,
  withGradleProperties,
  withPodfile,
  withPodfileProperties,
  createRunOncePlugin,
} = require('@expo/config-plugins');
const {
  mergeContents,
} = require('@expo/config-plugins/build/utils/generateCode');

const MAVEN_REPO =
  'https://raw.githubusercontent.com/didit-protocol/sdk-android/main/repository';

const MAVEN_LINE = `        maven { url "${MAVEN_REPO}" }`;

const PODSPEC_URL =
  'https://raw.githubusercontent.com/didit-protocol/sdk-ios/main/DiditSDK.podspec';

// Key written into ios/Podfile.properties.json so the Podfile and the
// SdkReactNative.podspec it loads can both read the same value at
// `pod install` time. Mirrors the `apple.*` / `expo.*` pattern used by
// expo-build-properties (see https://docs.expo.dev/config-plugins/development-and-debugging/).
const PODFILE_PROPS_KEY = 'didit.iosNfcEnabled';

// Tag handed to mergeContents — drives the auto-generated marker comments
// (`# @generated begin ... - expo prebuild (DO NOT MODIFY) sync-...`) so the
// pod block is rewritten cleanly on every prebuild.
const POD_BLOCK_TAG = 'didit-sdk-react-native-pod';

function normalizeOptions(props = {}) {
  return {
    androidNfcEnabled: props.androidNfcEnabled !== false,
    iosNfcEnabled: props.iosNfcEnabled !== false,
  };
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
 * Writes `didit.iosNfcEnabled` into ios/Podfile.properties.json. This is the
 * same `withPodfileProperties` pattern used by expo-build-properties for keys
 * such as `apple.ccacheEnabled` and `expo.useHermesV1`.
 *
 * Both the host Podfile (via `withDiditIosPodspec`) and the
 * SdkReactNative.podspec read this key, so they always agree on which
 * `DiditSDK` / `DiditSDK/Core` subspec to resolve.
 */
function withDiditIosNfcProperty(config, options) {
  return withPodfileProperties(config, (mod) => {
    mod.modResults[PODFILE_PROPS_KEY] = String(options.iosNfcEnabled);
    return mod;
  });
}

/**
 * Injects a single `pod 'DiditSDK', :podspec => ...` block into the host
 * Podfile so CocoaPods knows where to fetch the Didit native iOS SDK from
 * (it isn't published to the trunk).
 *
 * Idempotency, value updates, and the `# @generated begin … sync-…` marker
 * comments are all handled by `mergeContents` — repeated `expo prebuild`
 * runs converge to a stable Podfile and toggling `iosNfcEnabled` rewrites
 * the block in place.
 */
function withDiditIosPodspec(config) {
  return withPodfile(config, (mod) => {
    const isExpoPodfile = mod.modResults.contents.includes('use_expo_modules!');
    const newSrc = [
      "didit_sdk_ios_nfc_enabled = ENV.fetch('DIDIT_SDK_IOS_NFC_ENABLED', " +
        (isExpoPodfile
          ? `podfile_properties.fetch('${PODFILE_PROPS_KEY}', 'true')`
          : "'true'") +
        ").downcase != 'false'",
      "didit_sdk_ios_pod = didit_sdk_ios_nfc_enabled ? 'DiditSDK' : 'DiditSDK/Core'",
      `pod didit_sdk_ios_pod, :podspec => '${PODSPEC_URL}'`,
    ].join('\n');

    const result = mergeContents({
      tag: POD_BLOCK_TAG,
      src: mod.modResults.contents,
      newSrc,
      anchor: isExpoPodfile ? /use_expo_modules!/ : /target\s+'.+'\s+do/,
      offset: 1,
      comment: '#',
    });

    if (result.didMerge || result.didClear) {
      mod.modResults.contents = result.contents;
    }

    return mod;
  });
}

// ── Combined Plugin ──────────────────────────────────────────────────────────

/**
 * Expo config plugin for @didit-protocol/sdk-react-native.
 *
 * Automatically configures:
 * - Android: Adds the Didit Maven repository to Gradle, packaging exclusions,
 *   and writes `diditSdkAndroidNfcEnabled` to gradle.properties.
 * - iOS: Writes `didit.iosNfcEnabled` to Podfile.properties.json and adds
 *   a single `pod 'DiditSDK', :podspec => '…'` block to the Podfile.
 *   The wrapper podspec reads the same JSON key, so both pieces always
 *   resolve to the same `DiditSDK` (NFC) or `DiditSDK/Core` subspec.
 */
function withDiditSdk(config, props) {
  const options = normalizeOptions(props);
  config = withDiditAndroidMaven(config, options);
  config = withDiditIosNfcProperty(config, options);
  config = withDiditIosPodspec(config);
  return config;
}

const pkg = require('./package.json');

module.exports = createRunOncePlugin(withDiditSdk, pkg.name, pkg.version);
