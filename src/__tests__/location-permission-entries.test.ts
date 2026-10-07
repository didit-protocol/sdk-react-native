import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The Location verification step asks the OS for "when in use" location. iOS
 * terminates an app that requests it without NSLocationWhenInUseUsageDescription,
 * and App Store Connect rejects a build whose code references location APIs
 * without one, so every example app and the README carry the same purpose
 * string. The copy is the Location step's permission prompt in the design.
 *
 * The Expo example's ios/ folder is checked in next to the app.json it was
 * prebuilt from; when they drift, a fresh prebuild ships different copy than
 * the one the repository shows.
 */

const repoRoot = join(__dirname, '..', '..');

const read = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), 'utf8');

const LOCATION_KEY = 'NSLocationWhenInUseUsageDescription';
const LOCATION_PURPOSE =
  'Your location is used to confirm where you are for this verification.';
const LOCATION_PURPOSE_ES =
  'Tu ubicación se usa para confirmar dónde estás en esta verificación.';

const CLI_PLIST = 'example/ios/SdkReactNativeExample/Info.plist';
const EXPO_PLIST = 'example-expo/ios/DiditExpoExample/Info.plist';
const EXPO_APP_JSON = 'example-expo/app.json';
const CLI_ANDROID_MANIFEST = 'example/android/app/src/main/AndroidManifest.xml';

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The <string> value of a top-level plist key, or undefined when absent. */
function plistString(contents: string, key: string): string | undefined {
  const match = contents.match(
    new RegExp(`<key>${escapeRegExp(key)}</key>\\s*<string>([^<]*)</string>`)
  );
  return match?.[1];
}

function usageDescriptionKeys(contents: string): string[] {
  return Array.from(
    contents.matchAll(/<key>(\w+UsageDescription)<\/key>/g),
    (match) => String(match[1])
  ).sort();
}

const expoInfoPlist = (): Record<string, unknown> =>
  JSON.parse(read(EXPO_APP_JSON)).expo.ios.infoPlist;

describe('location purpose string', () => {
  it.each([CLI_PLIST, EXPO_PLIST])('is declared in %s', (plistPath) => {
    expect(plistString(read(plistPath), LOCATION_KEY)).toBe(LOCATION_PURPOSE);
  });

  it('is declared in the Expo example app.json', () => {
    expect(expoInfoPlist()[LOCATION_KEY]).toBe(LOCATION_PURPOSE);
  });

  it('is the one the README tells integrators to add', () => {
    expect(plistString(read('README.md'), LOCATION_KEY)).toBe(LOCATION_PURPOSE);
  });

  it('is documented with the same Spanish translation for bare and Expo apps', () => {
    const readme = read('README.md');

    expect(readme).toContain(`"${LOCATION_KEY}" = "${LOCATION_PURPOSE_ES}";`);
    expect(readme).toContain(`"${LOCATION_KEY}": "${LOCATION_PURPOSE_ES}"`);
  });
});

describe('Expo example native project', () => {
  it('declares exactly the usage descriptions of its app.json, with the same copy', () => {
    const plist = read(EXPO_PLIST);
    const infoPlist = expoInfoPlist();
    const appJsonKeys = Object.keys(infoPlist)
      .filter((key) => key.endsWith('UsageDescription'))
      .sort();

    expect(usageDescriptionKeys(plist)).toEqual(appJsonKeys);
    appJsonKeys.forEach((key) => {
      expect(plistString(plist, key)).toBe(infoPlist[key]);
    });
  });
});

describe('Android example location permissions', () => {
  it.each(['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'])(
    'declares %s so precise and approximate grants both work',
    (permission) => {
      expect(read(CLI_ANDROID_MANIFEST)).toContain(
        `<uses-permission android:name="android.permission.${permission}" />`
      );
    }
  );
});
