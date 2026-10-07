import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The native Location step only prompts when the host app declares its iOS
 * purpose string, and only asks once for precise location when the temporary
 * purpose key is exactly `DiditLocationVerification`. A missing or misspelled
 * entry fails silently: the step reports that the device cannot place the
 * person. These tests keep the example apps and the README on the design copy.
 */

const repoRoot = join(__dirname, '..', '..');

const read = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), 'utf8');

const WHEN_IN_USE =
  'Your location is used to confirm where you are for this verification.';
const WHEN_IN_USE_ES =
  'Tu ubicación se usa para confirmar dónde estás en esta verificación.';
const PRECISE_ONCE = 'This verification needs your precise location once.';
const PURPOSE_KEY = 'DiditLocationVerification';

const IOS_EXAMPLE_PLISTS = [
  'example/ios/SdkReactNativeExample/Info.plist',
  'example-expo/ios/DiditExpoExample/Info.plist',
];

/** The `<string>` value that follows `<key>key</key>`. */
const plistString = (contents: string, key: string) =>
  contents.match(
    new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`)
  )?.[1];

/** The body of the `<dict>` that follows `<key>key</key>`. */
const plistDict = (contents: string, key: string) =>
  contents.match(
    new RegExp(`<key>${key}</key>\\s*<dict>([\\s\\S]*?)</dict>`)
  )?.[1];

describe.each(IOS_EXAMPLE_PLISTS)(
  'iOS location purpose strings in %s',
  (path) => {
    const plist = read(path);

    it('declares the when-in-use purpose string', () => {
      expect(plistString(plist, 'NSLocationWhenInUseUsageDescription')).toBe(
        WHEN_IN_USE
      );
    });

    it('declares the precise-once purpose under the key the native step asks for', () => {
      const temporary =
        plistDict(plist, 'NSLocationTemporaryUsageDescriptionDictionary') ?? '';

      expect(plistString(temporary, PURPOSE_KEY)).toBe(PRECISE_ONCE);
    });
  }
);

describe('Expo example app config', () => {
  it('declares the same location purpose strings as its prebuilt Info.plist', () => {
    const infoPlist = JSON.parse(read('example-expo/app.json')).expo.ios
      .infoPlist;

    expect(infoPlist.NSLocationWhenInUseUsageDescription).toBe(WHEN_IN_USE);
    expect(infoPlist.NSLocationTemporaryUsageDescriptionDictionary).toEqual({
      [PURPOSE_KEY]: PRECISE_ONCE,
    });
  });
});

describe('README location setup', () => {
  const readme = read('README.md');

  it('documents the same purpose strings and key as the example apps', () => {
    const temporary =
      plistDict(readme, 'NSLocationTemporaryUsageDescriptionDictionary') ?? '';

    expect(plistString(readme, 'NSLocationWhenInUseUsageDescription')).toBe(
      WHEN_IN_USE
    );
    expect(plistString(temporary, PURPOSE_KEY)).toBe(PRECISE_ONCE);
  });

  it('documents the Spanish purpose string for InfoPlist.strings and Expo locales', () => {
    expect(readme).toContain(
      `"NSLocationWhenInUseUsageDescription" = "${WHEN_IN_USE_ES}";`
    );
    expect(readme).toContain(
      `{ "ios": { "NSLocationWhenInUseUsageDescription": "${WHEN_IN_USE_ES}" } }`
    );
  });
});
