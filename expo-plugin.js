const {
  withSettingsGradle,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const MAVEN_REPO =
  'https://raw.githubusercontent.com/didit-protocol/sdk-android/main/repository';

const MAVEN_BLOCK = `        maven { url "${MAVEN_REPO}" }`;

/**
 * Adds the Didit Maven repository to android/settings.gradle so Gradle
 * can resolve the native Android SDK dependency.
 */
function withDiditMavenRepo(config) {
  return withSettingsGradle(config, (mod) => {
    if (mod.modResults.contents.includes(MAVEN_REPO)) {
      return mod;
    }

    mod.modResults.contents = mod.modResults.contents.replace(
      /dependencyResolutionManagement\s*\{[^}]*repositories\s*\{/,
      (match) => `${match}\n${MAVEN_BLOCK}`
    );

    return mod;
  });
}

const pkg = require('./package.json');

module.exports = createRunOncePlugin(withDiditMavenRepo, pkg.name, pkg.version);
