import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A configuration option the JavaScript layer accepts is only useful when both
 * native bridges hand it to the native SDK. The bridges parse the config
 * independently (an Objective-C dictionary on iOS, a ReadableMap on Android),
 * so a key added to the JS type and one bridge can silently be dropped by the
 * other. The language selector shipped this way once: JS and Android forwarded
 * it, while the iOS dictionary never included it and the selector could not be
 * enabled on iOS at all.
 *
 * These tests read the public config type and both parsers and fail when a key
 * has no counterpart on a platform.
 */

const repoRoot = join(__dirname, '..', '..');

const read = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), 'utf8');

/** The body of the first braced declaration after `signature`. */
function bracedBody(source: string, signature: RegExp): string {
  const start = source.search(signature);
  expect(start).toBeGreaterThanOrEqual(0);

  const open = source.indexOf('{', start);
  let depth = 0;

  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(open, index + 1);
  }

  throw new Error('Unclosed declaration');
}

/** Every optional property declared on the public VerificationConfig type. */
function configKeys(): string[] {
  const source = read('src/NativeSdkReactNative.ts');
  const start = source.indexOf('export type VerificationConfig = {');
  expect(start).toBeGreaterThanOrEqual(0);

  const end = source.indexOf('\n};', start);
  expect(end).toBeGreaterThan(start);

  return Array.from(
    source.slice(start, end).matchAll(/^\s{2}(\w+)\?:/gm),
    (match) => String(match[1])
  );
}

const keys = configKeys();
const iosConfig = bracedBody(
  read('ios/SdkReactNative.mm'),
  /- \(NSDictionary \*\)configDictFrom:/
);
const androidConfig = bracedBody(
  read('android/src/main/java/com/sdkreactnative/SdkReactNativeModule.kt'),
  /private fun parseConfiguration\(/
);

describe('verification configuration forwarding', () => {
  it('reads every key both bridges must forward', () => {
    expect(keys).toEqual(
      expect.arrayContaining([
        'languageCode',
        'showLanguageSelector',
        'fontFamily',
        'loggingEnabled',
        'showCloseButton',
        'showExitConfirmation',
        'closeOnComplete',
        'defaultDocumentCamera',
        'defaultLivenessCamera',
        'showDocumentCameraSwitchButton',
        'showLivenessCameraSwitchButton',
      ])
    );
  });

  it.each(keys)('forwards %s to the native SDK on iOS', (key) => {
    expect(iosConfig).toContain(`config.${key}()`);
  });

  it.each(keys)('forwards %s to the native SDK on Android', (key) => {
    expect(androidConfig).toContain(`"${key}"`);
  });
});
