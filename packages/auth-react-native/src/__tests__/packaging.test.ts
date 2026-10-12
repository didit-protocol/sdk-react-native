import { execFileSync } from 'child_process';
import { join, resolve } from 'path';
import manifest from '../../package.json';

const root = resolve(__dirname, '../../../../..');
const packageRoot = resolve(__dirname, '../..');

function packedFiles(cwd: string): string[] {
  const output = execFileSync(
    process.execPath,
    [
      join(root, '.yarn/releases/yarn-4.11.0.cjs'),
      'pack',
      '--dry-run',
      '--json',
    ],
    { cwd, encoding: 'utf8' }
  );

  return output
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line).location)
    .filter((location): location is string => typeof location === 'string');
}

describe('independent authentication distribution', () => {
  it('includes native sources and registration in the archive', () => {
    const files = packedFiles(packageRoot);

    expect(files).toEqual(
      expect.arrayContaining([
        'src/index.ts',
        'src/NativeDiditAuth.ts',
        'src/errors.ts',
        'android/src/main/AndroidManifest.xml',
        'android/build.gradle',
        'android/src/main/java/me/didit/authreactnative/DiditAuthModule.kt',
        'android/src/main/java/me/didit/authreactnative/DiditAuthPackage.kt',
        'ios/DiditAuthReactNative.h',
        'ios/DiditAuthReactNative.mm',
        'DiditAuthReactNative.podspec',
        'react-native.config.js',
        'LICENSE',
      ])
    );
    expect(
      files.some((file) => /__tests__|node_modules|\.env/.test(file))
    ).toBe(false);
  });

  it('keeps authentication out of the verification release', () => {
    expect(packedFiles(root).some((file) => file.startsWith('packages/'))).toBe(
      false
    );
  });

  it('blocks publication and has no verification or credential storage dependency', () => {
    expect(manifest.private).toBe(true);
    expect(manifest).not.toHaveProperty('dependencies');
    expect(Object.keys(manifest.peerDependencies)).toEqual([
      'react',
      'react-native',
    ]);
  });

  it('autolinks beside verification with distinct native module names', () => {
    const script = `
      const config = require('@react-native-community/cli-config').default({});
      const names = ['@didit-protocol/auth-react-native', '@didit-protocol/sdk-react-native'];
      console.log(JSON.stringify(names.map(name => config.dependencies[name].platforms)));
    `;
    const output = execFileSync(process.execPath, ['-e', script], {
      cwd: join(root, 'example'),
      encoding: 'utf8',
    });
    const [auth, verification] = JSON.parse(output);

    expect(auth.android.libraryName).toBe('DiditAuthReactNativeSpec');
    expect(auth.android.packageInstance).toBe('new DiditAuthPackage()');
    expect(auth.ios.podspecPath).toMatch(/DiditAuthReactNative\.podspec$/);
    expect(verification.android.libraryName).not.toBe(auth.android.libraryName);
    expect(verification.ios.podspecPath).not.toBe(auth.ios.podspecPath);
  });
});
