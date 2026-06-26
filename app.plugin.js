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
  'https://raw.githubusercontent.com/didit-protocol/sdk-ios/4.0.8/DiditSDK.podspec';

const VALID_VARIANTS = ['all', 'core', 'autodetection', 'nfc'];
const PODFILE_PROPS_KEY = 'didit.iosVariant';
const POD_BLOCK_TAG = 'didit-sdk-react-native-pod';

function normalizeVariant(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.toLowerCase();
  return VALID_VARIANTS.includes(normalized) ? normalized : fallback;
}

function variantFromBooleans(nfcEnabled, autoDetectionEnabled = true) {
  if (nfcEnabled && autoDetectionEnabled) return 'all';
  if (!nfcEnabled && autoDetectionEnabled) return 'autodetection';
  if (nfcEnabled && !autoDetectionEnabled) return 'nfc';
  return 'core';
}

function normalizeOptions(props = {}) {
  const legacyIosVariant = variantFromBooleans(
    props.iosNfcEnabled !== false,
    props.iosAutoDetectionEnabled !== false
  );
  const legacyAndroidVariant =
    props.androidNfcEnabled === false ? 'core' : 'all';

  return {
    androidVariant: normalizeVariant(
      props.androidVariant,
      legacyAndroidVariant
    ),
    iosVariant: normalizeVariant(props.iosVariant, legacyIosVariant),
  };
}

function diditPodBlock(iosVariant, isRubyExpression = false) {
  const variantAssignment = isRubyExpression
    ? `  $DiditSdkIosVariant = ${iosVariant}`
    : `  $DiditSdkIosVariant = '${iosVariant}'`;
  return [
    variantAssignment,
    '  didit_sdk_subspec = case $DiditSdkIosVariant',
    "                      when 'all'           then 'DiditSDK/All'",
    "                      when 'core'          then 'DiditSDK/Core'",
    "                      when 'autodetection' then 'DiditSDK/AutoDetection'",
    "                      when 'nfc'           then 'DiditSDK/NFC'",
    '                      else',
    '                        raise "Invalid $DiditSdkIosVariant \'#{$DiditSdkIosVariant}\'. Supported values: all, core, autodetection, nfc."',
    '                      end',
    `  pod didit_sdk_subspec, :podspec => '${PODSPEC_URL}'`,
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

function withDiditPackagingExclusion(config, androidVariant) {
  if (!['all', 'nfc'].includes(androidVariant)) {
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

function withDiditAndroidVariantProperty(config, androidVariant) {
  return withGradleProperties(config, (mod) => {
    mod.modResults = mod.modResults.filter(
      (item) =>
        item.key !== 'diditSdkAndroidVariant' &&
        item.key !== 'diditSdkAndroidNfcEnabled'
    );
    mod.modResults.push({
      type: 'property',
      key: 'diditSdkAndroidVariant',
      value: androidVariant,
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
  config = withDiditAndroidVariantProperty(config, options.androidVariant);
  config = withDiditPackagingExclusion(config, options.androidVariant);
  return config;
}

// ── iOS ──────────────────────────────────────────────────────────────────────

function withDiditIosVariantProperty(config, options) {
  return withPodfileProperties(config, (mod) => {
    mod.modResults[PODFILE_PROPS_KEY] = options.iosVariant;
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
function withDiditIosPodspec(config, options) {
  return withPodfile(config, (mod) => {
    const isExpoPodfile = mod.modResults.contents.includes('use_expo_modules!');
    const newSrc = isExpoPodfile
      ? diditPodBlock(
          `podfile_properties.fetch('${PODFILE_PROPS_KEY}', '${options.iosVariant}')`,
          true
        )
      : diditPodBlock(options.iosVariant);

    const result = mergeContents({
      tag: POD_BLOCK_TAG,
      src: mod.modResults.contents,
      newSrc,
      anchor: isExpoPodfile ? /use_expo_modules!/ : /target\s+'.+'\s+do/,
      offset: isExpoPodfile ? 0 : 1,
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
 *   and writes `diditSdkAndroidVariant` to gradle.properties.
 * - iOS: Writes `didit.iosVariant` to Podfile.properties.json and adds
 *   a DiditSDK variant block to the Podfile.
 */
function withDiditSdk(config, props) {
  const options = normalizeOptions(props);
  config = withDiditAndroidMaven(config, options);
  config = withDiditIosVariantProperty(config, options);
  config = withDiditIosPodspec(config, options);
  return config;
}

const pkg = require('./package.json');

module.exports = createRunOncePlugin(withDiditSdk, pkg.name, pkg.version);
