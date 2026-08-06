import { join } from 'path';

/**
 * The DiditSDK Android variants that bundle didit-sdk-core (all, autodetection,
 * nfc) pull Bouncy Castle jdk18on through Reown/Web3j, while host apps commonly
 * pull the jdk15to18 family (e.g. via expo-updates). Without the plugin's
 * exclusion block in app/build.gradle the release build fails with duplicate
 * classes. Issue #34: the block was skipped for `autodetection`.
 */

const repoRoot = join(__dirname, '..', '..');

const MINIMAL_APP_BUILD_GRADLE = [
  'apply plugin: "com.android.application"',
  '',
  'android {',
  "    namespace 'com.example.app'",
  '    defaultConfig {',
  '        applicationId "com.example.app"',
  '    }',
  '}',
  '',
  'dependencies {',
  '    implementation("com.facebook.react:react-android")',
  '}',
].join('\n');

const EXCLUDED_MODULES = [
  'bcprov-jdk15to18',
  'bcutil-jdk15to18',
  'bcpkix-jdk15to18',
  'bcprov-jdk15on',
];

async function runAppBuildGradleMod(props: object, contents: string) {
  const withDiditSdk = require('../../app.plugin.js');
  const config = withDiditSdk({ name: 'test', slug: 'test' }, props);
  // Variants without the exclusion register no appBuildGradle mod at all,
  // which is equivalent to leaving the file untouched.
  if (!config.mods?.android?.appBuildGradle) {
    return contents;
  }
  const result = await config.mods.android.appBuildGradle({
    ...config,
    modResults: { contents, language: 'groovy', path: '' },
    modRequest: {
      projectRoot: repoRoot,
      platformProjectRoot: repoRoot,
      modName: 'appBuildGradle',
      platform: 'android',
      introspect: true,
    },
  });
  return result.modResults.contents as string;
}

const expectExclusionBlock = (contents: string) => {
  EXCLUDED_MODULES.forEach((module) => {
    expect(contents).toContain(
      `exclude group: 'org.bouncycastle', module: '${module}'`
    );
  });
  expect(contents).toContain("pickFirsts += ['org/bouncycastle/**']");
};

describe('Bouncy Castle packaging exclusion (app/build.gradle)', () => {
  it.each(['all', 'autodetection', 'nfc'])(
    'injects the exclusion block for the %s variant',
    async (androidVariant) => {
      const contents = await runAppBuildGradleMod(
        { androidVariant },
        MINIMAL_APP_BUILD_GRADLE
      );

      expectExclusionBlock(contents);
    }
  );

  it('injects the exclusion block when no variant is configured (legacy default: all)', async () => {
    const contents = await runAppBuildGradleMod({}, MINIMAL_APP_BUILD_GRADLE);

    expectExclusionBlock(contents);
  });

  it('leaves the core variant untouched', async () => {
    const contents = await runAppBuildGradleMod(
      { androidVariant: 'core' },
      MINIMAL_APP_BUILD_GRADLE
    );

    expect(contents).toBe(MINIMAL_APP_BUILD_GRADLE);
  });

  it('stays idempotent across repeated prebuilds', async () => {
    const once = await runAppBuildGradleMod(
      { androidVariant: 'autodetection' },
      MINIMAL_APP_BUILD_GRADLE
    );
    const twice = await runAppBuildGradleMod(
      { androidVariant: 'autodetection' },
      once
    );

    expect(twice).toBe(once);
  });
});
