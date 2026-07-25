import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The native Didit SDK version is pinned in several places that CocoaPods and
 * Gradle read independently. When they drift apart, `pod install` fails for
 * every consumer with "CocoaPods could not find compatible versions for pod
 * DiditSDK/..." (issues #19 and #28), so every pin is asserted here against the
 * single declared source of truth in package.json.
 */

const repoRoot = join(__dirname, '..', '..');

const read = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), 'utf8');

const pkg = JSON.parse(read('package.json'));
const declaredIosVersion: string = pkg.diditNativeSdkVersions?.ios;
const declaredAndroidVersion: string = pkg.diditNativeSdkVersions?.android;

const PODSPEC_URL_PATTERN =
  /raw\.githubusercontent\.com\/didit-protocol\/sdk-ios\/([^/'"\s]+)\/DiditSDK\.podspec/g;

const podspecUrlRefs = (contents: string): string[] =>
  Array.from(contents.matchAll(PODSPEC_URL_PATTERN), (match) =>
    String(match[1])
  );

const SEMVER = /^\d+\.\d+\.\d+$/;

const EXPO_PODFILE = [
  "require 'json'",
  "target 'App' do",
  '  use_expo_modules!',
  'end',
].join('\n');

const BARE_PODFILE = ["target 'App' do", '  use_native_modules!', 'end'].join(
  '\n'
);

async function runPodfileMod(props: object, podfile: string) {
  const withDiditSdk = require('../../app.plugin.js');
  const config = withDiditSdk({ name: 'test', slug: 'test' }, props);
  const result = await config.mods.ios.podfile({
    ...config,
    modResults: { contents: podfile },
    modRequest: {
      projectRoot: repoRoot,
      platformProjectRoot: repoRoot,
      modName: 'podfile',
      platform: 'ios',
      introspect: true,
    },
  });
  return result.modResults.contents as string;
}

describe('declared native SDK versions', () => {
  it('declares an iOS and an Android native SDK version in package.json', () => {
    expect(declaredIosVersion).toMatch(SEMVER);
    expect(declaredAndroidVersion).toMatch(SEMVER);
  });
});

describe('expo config plugin podspec pin', () => {
  it('injects the declared iOS version into an Expo Podfile', async () => {
    const contents = await runPodfileMod({}, EXPO_PODFILE);

    expect(podspecUrlRefs(contents)).toEqual([declaredIosVersion]);
  });

  it('injects the declared iOS version into a bare React Native Podfile', async () => {
    const contents = await runPodfileMod({}, BARE_PODFILE);

    expect(podspecUrlRefs(contents)).toEqual([declaredIosVersion]);
  });

  it('lets a consumer override the podspec URL as an escape hatch', async () => {
    const iosPodspecUrl = 'https://example.com/custom/DiditSDK.podspec';

    const contents = await runPodfileMod({ iosPodspecUrl }, EXPO_PODFILE);

    expect(contents).toContain(`:podspec => '${iosPodspecUrl}'`);
  });

  it('rejects an override that would break the generated Podfile', async () => {
    await expect(
      runPodfileMod(
        { iosPodspecUrl: "https://example.com/'.podspec" },
        EXPO_PODFILE
      )
    ).rejects.toThrow(/iosPodspecUrl/);
  });

  it('does not hardcode a version literal in the plugin source', () => {
    const hardcoded = podspecUrlRefs(read('app.plugin.js')).filter((version) =>
      SEMVER.test(version)
    );

    expect(hardcoded).toEqual([]);
  });
});

describe('SdkReactNative.podspec dependency pin', () => {
  const podspec = read('SdkReactNative.podspec');

  it('derives the DiditSDK dependency version from package.json', () => {
    expect(podspec).toMatch(
      /s\.dependency\s+didit_sdk_subspec\s*,\s*didit_sdk_ios_version/
    );
  });

  it('does not hardcode a version literal for the DiditSDK dependency', () => {
    expect(podspec).not.toMatch(
      /s\.dependency\s+didit_sdk_subspec\s*,\s*["']\d+\.\d+\.\d+["']/
    );
  });
});

describe('hand-maintained pins stay in lockstep', () => {
  it.each(['README.md', 'example/ios/Podfile', 'example-expo/ios/Podfile'])(
    '%s references only the declared iOS version',
    (relativePath) => {
      const refs = podspecUrlRefs(read(relativePath));

      expect(refs.length).toBeGreaterThan(0);
      refs.forEach((version) => expect(version).toBe(declaredIosVersion));
    }
  );

  it('android/build.gradle pins the declared Android version', () => {
    const match = read('android/build.gradle').match(
      /me\.didit:\$diditSdkAndroidArtifact:([\d.]+)/
    );

    expect(match?.[1]).toBe(declaredAndroidVersion);
  });
});
