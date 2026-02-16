const {
  withProjectBuildGradle,
  withSettingsGradle,
  withPodfile,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const MAVEN_REPO =
  'https://raw.githubusercontent.com/didit-protocol/sdk-android/main/repository';

const MAVEN_LINE = `        maven { url "${MAVEN_REPO}" }`;

const PODSPEC_URL =
  'https://raw.githubusercontent.com/didit-protocol/sdk-ios/main/DiditSDK.podspec';

const POD_LINE = `  pod 'DiditSDK', :podspec => '${PODSPEC_URL}'`;

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
 * Applies both Gradle mods so the plugin works with either project structure.
 */
function withDiditAndroidMaven(config) {
  config = withDiditBuildGradle(config);
  config = withDiditSettingsGradle(config);
  return config;
}

// ── iOS ──────────────────────────────────────────────────────────────────────

/**
 * Injects the DiditSDK podspec reference into the iOS Podfile so CocoaPods
 * can resolve the native iOS SDK dependency.
 *
 * Uses the standard withPodfile mod (not withDangerousMod).
 */
function withDiditIosPodspec(config) {
  return withPodfile(config, (mod) => {
    if (mod.modResults.contents.includes(PODSPEC_URL)) {
      return mod;
    }

    const contents = mod.modResults.contents;

    // Expo projects: inject after use_expo_modules!
    if (contents.includes('use_expo_modules!')) {
      mod.modResults.contents = contents.replace(
        /use_expo_modules!/,
        (m) => `${m}\n\n${POD_LINE}`
      );
    }
    // RN CLI projects: inject after the target ... do line
    else {
      mod.modResults.contents = contents.replace(
        /(target\s+'.+'\s+do)/,
        (m) => `${m}\n\n${POD_LINE}`
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
 * - Android: Adds the Didit Maven repository to Gradle
 * - iOS: Adds the DiditSDK podspec to the Podfile
 */
function withDiditSdk(config) {
  config = withDiditAndroidMaven(config);
  config = withDiditIosPodspec(config);
  return config;
}

const pkg = require('./package.json');

module.exports = createRunOncePlugin(withDiditSdk, pkg.name, pkg.version);
