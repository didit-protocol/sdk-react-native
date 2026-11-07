import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The native Location step only prompts when the host app declares its iOS
 * purpose string, and only asks once for precise location when the temporary
 * purpose key is exactly `DiditLocationVerification`. A missing or misspelled
 * entry fails silently: the step reports that the device cannot place the
 * person. iOS reads the translations from `<lang>.lproj/InfoPlist.strings`,
 * with the precise-once string under its purpose key. These tests keep the
 * example apps and the README on the design copy, in English and Spanish.
 */

const repoRoot = join(__dirname, '..', '..');

const read = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), 'utf8');

const WHEN_IN_USE =
  'Your location is used to confirm where you are for this verification.';
const WHEN_IN_USE_ES =
  'Tu ubicación se usa para confirmar dónde estás en esta verificación.';
const PRECISE_ONCE = 'This verification needs your precise location once.';
const PRECISE_ONCE_ES =
  'Esta verificación necesita tu ubicación precisa una vez.';
const PURPOSE_KEY = 'DiditLocationVerification';

const IOS_EXAMPLE_PLISTS = [
  'example/ios/SdkReactNativeExample/Info.plist',
  'example-expo/ios/DiditExpoExample/Info.plist',
];

const IOS_EXAMPLE_SPANISH_STRINGS = [
  {
    stringsFile: 'example/ios/SdkReactNativeExample/es.lproj/InfoPlist.strings',
    pbxproj: 'example/ios/SdkReactNativeExample.xcodeproj/project.pbxproj',
  },
  {
    stringsFile:
      'example-expo/ios/DiditExpoExample/Supporting/es.lproj/InfoPlist.strings',
    pbxproj: 'example-expo/ios/DiditExpoExample.xcodeproj/project.pbxproj',
  },
];

/** The `<string>` value that follows `<key>key</key>`. */
const plistString = (contents: string, key: string) =>
  contents.match(
    new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`)
  )?.[1];

/** The value of `key` in an `InfoPlist.strings` file (the key may be unquoted). */
const stringsValue = (contents: string, key: string) =>
  contents.match(new RegExp(`^"?${key}"?\\s*=\\s*"([^"]*)";`, 'm'))?.[1];

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

describe.each(IOS_EXAMPLE_SPANISH_STRINGS)(
  'iOS Spanish purpose strings in $stringsFile',
  ({ stringsFile, pbxproj }) => {
    it('translates both purpose strings', () => {
      const strings = read(stringsFile);

      expect(stringsValue(strings, 'NSLocationWhenInUseUsageDescription')).toBe(
        WHEN_IN_USE_ES
      );
      expect(stringsValue(strings, PURPOSE_KEY)).toBe(PRECISE_ONCE_ES);
    });

    it('bundles the translation with the app', () => {
      const project = read(pbxproj);

      expect(project).toMatch(/path = "?es\.lproj\/InfoPlist\.strings"?;/);
      expect(project).toMatch(
        /files = \([^)]*\/\* InfoPlist\.strings in Resources \*\//
      );
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

  it('translates them to Spanish with the same locale file it was prebuilt from', () => {
    const { locales } = JSON.parse(read('example-expo/app.json')).expo;
    const spanish = JSON.parse(read(join('example-expo', locales.es))).ios;
    const prebuilt = read(
      'example-expo/ios/DiditExpoExample/Supporting/es.lproj/InfoPlist.strings'
    );

    expect(spanish).toEqual({
      NSLocationWhenInUseUsageDescription: WHEN_IN_USE_ES,
      [PURPOSE_KEY]: PRECISE_ONCE_ES,
    });
    Object.entries(spanish).forEach(([key, value]) =>
      expect(stringsValue(prebuilt, key)).toBe(value)
    );
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

  it('documents both Spanish purpose strings for InfoPlist.strings', () => {
    expect(stringsValue(readme, 'NSLocationWhenInUseUsageDescription')).toBe(
      WHEN_IN_USE_ES
    );
    expect(stringsValue(readme, PURPOSE_KEY)).toBe(PRECISE_ONCE_ES);
  });

  it('documents the same Spanish locale file as the Expo example', () => {
    expect(readme).toContain(read('example-expo/locales/es.json').trim());
  });
});
