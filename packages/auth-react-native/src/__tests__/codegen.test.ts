import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { codegenConfig } from '../../package.json';

const specPath = join(__dirname, '..', 'NativeDiditAuth.ts');
const methods = ['signIn', 'currentSession', 'getToken', 'signOut', 'stepUp'];
const versions = ['react-native-codegen-077', '@react-native/codegen'];

function generateNativeInterfaces(version: string, outputDirectory: string) {
  const {
    TypeScriptParser,
  } = require(`${version}/lib/parsers/typescript/parser`);
  const codegen = require(`${version}/lib/generators/RNCodegen`);
  const schema = new TypeScriptParser().parseString(
    readFileSync(specPath, 'utf8'),
    specPath
  );

  return codegen.generate(
    {
      libraryName: codegenConfig.name,
      schema,
      outputDirectory,
      packageName: codegenConfig.android.javaPackageName,
    },
    { generators: ['modulesAndroid', 'modulesIOS'] }
  );
}

describe.each(versions)('authentication codegen with %s', (version) => {
  it('generates the promise methods consumed by both native implementations', () => {
    const directory = mkdtempSync(join(tmpdir(), 'didit-auth-codegen-'));

    try {
      expect(generateNativeInterfaces(version, directory)).toBe(true);
      verifyNativeSignatures(directory);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

function verifyNativeSignatures(directory: string) {
  const java = readFileSync(
    join(directory, 'java/me/didit/authreactnative/NativeDiditAuthSpec.java'),
    'utf8'
  );
  const objc = readFileSync(
    join(directory, 'DiditAuthReactNativeSpec/DiditAuthReactNativeSpec.h'),
    'utf8'
  );

  expect(java).toContain('NAME = "DiditAuthReactNative"');
  expect(objc).toContain('NativeDiditAuthSpecJSI');
  methods.forEach((method) => {
    expect(java).toContain(`void ${method}(Promise promise)`);
    expect(objc).toContain(`(void)${method}:(RCTPromiseResolveBlock)resolve`);
  });
}
