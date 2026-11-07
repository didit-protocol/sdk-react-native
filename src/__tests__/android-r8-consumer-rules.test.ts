import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * R8's optimizing pass (proguard-android-optimize.txt) drops unused
 * constructor parameters. Picking a ReactModuleInfo constructor by its
 * parameter count then threw during React Native startup, so every minified
 * host app crashed at launch (issue #61). These tests pin the direct
 * constructor call in both packages and the consumer rule every host app
 * receives from the published archive.
 */

const root = join(__dirname, '..', '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const KEEP_RULE =
  '-keep class com.facebook.react.module.model.ReactModuleInfo { public <init>(...); }';

const PACKAGE_SOURCES = [
  'android/src/main/java/com/sdkreactnative/SdkReactNativePackage.kt',
  'packages/auth-react-native/android/src/main/java/me/didit/authreactnative/DiditAuthPackage.kt',
];

function packedFiles(): string[] {
  const output = execFileSync(
    process.execPath,
    [
      join(root, '.yarn/releases/yarn-4.11.0.cjs'),
      'pack',
      '--dry-run',
      '--json',
    ],
    { cwd: root, encoding: 'utf8' }
  );

  return output
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line).location)
    .filter((location): location is string => typeof location === 'string');
}

describe('Android R8 safety', () => {
  it('ships the ReactModuleInfo keep rule as a consumer rule', () => {
    const rules = read('android/consumer-rules.pro')
      .split('\n')
      .map((line) => line.trim());

    expect(rules).toContain(KEEP_RULE);
    expect(read('android/build.gradle')).toMatch(
      /defaultConfig\s*\{[^}]*consumerProguardFiles\s+"consumer-rules\.pro"/
    );
    expect(packedFiles()).toContain('android/consumer-rules.pro');
  });

  it.each(PACKAGE_SOURCES)('%s constructs ReactModuleInfo directly', (path) => {
    const source = read(path);

    expect(source).not.toMatch(/ReactModuleInfo::class\.java/);
    expect(source).not.toMatch(/\.constructors\b|\.newInstance\(/);
    expect(source).toMatch(/\bReactModuleInfo\(/);
  });
});
