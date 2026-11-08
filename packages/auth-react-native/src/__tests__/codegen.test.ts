import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { codegenConfig } from '../../package.json';

const packageRoot = join(__dirname, '..', '..');
const specPath = join(packageRoot, 'src', 'NativeDiditAuth.ts');
const versions = ['react-native-codegen-077', '@react-native/codegen'];
const methods = [
  'signIn',
  'signInWithPasskey',
  'registerPasskey',
  'currentSession',
  'getToken',
  'signOut',
  'stepUp',
];

const kotlinModule = readFileSync(
  join(
    packageRoot,
    'android/src/main/java/me/didit/authreactnative/DiditAuthModule.kt'
  ),
  'utf8'
);
const objcModule = readFileSync(
  join(packageRoot, 'ios/DiditAuthReactNative.mm'),
  'utf8'
);

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

const squash = (text: string) =>
  text.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')');

// Java's abstract methods as the Kotlin overrides that implement them.
function kotlinOverrides(java: string): string[] {
  const kotlinType: Record<string, string> = {
    'String': 'String',
    '@Nullable String': 'String?',
    'boolean': 'Boolean',
    'Promise': 'Promise',
  };

  return Array.from(
    java.matchAll(/public abstract void (\w+)\(([^)]*)\);/g),
    ([, name, params]) => {
      const kotlinParams = params!.split(', ').map((param) => {
        const [, type, paramName] = param.match(/^(.+) (\w+)$/)!;
        return `${paramName}: ${kotlinType[type!]}`;
      });
      return `override fun ${name}(${kotlinParams.join(', ')})`;
    }
  );
}

// The ObjC protocol's method declarations, which the module must define.
function objcSelectors(header: string): string[] {
  return Array.from(header.matchAll(/^- \(void\)\w+:[^;]+;/gm), ([method]) =>
    squash(method!.slice(0, -1))
  ).filter((method) => !method.includes('EventEmitterCallbackWrapper'));
}

describe.each(versions)('authentication codegen with %s', (version) => {
  let java: string;
  let objc: string;

  beforeAll(() => {
    const directory = mkdtempSync(join(tmpdir(), 'didit-auth-codegen-'));

    try {
      expect(generateNativeInterfaces(version, directory)).toBe(true);
      java = readFileSync(
        join(
          directory,
          'java/me/didit/authreactnative/NativeDiditAuthSpec.java'
        ),
        'utf8'
      );
      objc = readFileSync(
        join(directory, 'DiditAuthReactNativeSpec/DiditAuthReactNativeSpec.h'),
        'utf8'
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('passes the application and each call argument to native', () => {
    expect(java).toContain('NAME = "DiditAuthReactNative"');
    expect(objc).toContain('NativeDiditAuthSpecJSI');
    methods.forEach((method) =>
      expect(java).toContain(
        `void ${method}(String publishableKey, String redirectUri, `
      )
    );
    expect(java).toContain(
      'void currentSession(String publishableKey, String redirectUri, boolean force, Promise promise)'
    );
    expect(java).toContain(
      'void stepUp(String publishableKey, String redirectUri, String action, @Nullable String amount, @Nullable String currency, Promise promise)'
    );
  });

  it('is implemented with the same signatures by the Kotlin module', () => {
    const overrides = kotlinOverrides(java);

    expect(overrides).toHaveLength(methods.length);
    const implemented = squash(kotlinModule);

    expect(overrides.filter((o) => !implemented.includes(o))).toEqual([]);
  });

  it('is implemented with the same selectors by the Objective-C++ module', () => {
    const selectors = objcSelectors(objc);

    expect(selectors).toHaveLength(methods.length);
    const implemented = squash(objcModule);

    expect(selectors.filter((s) => !implemented.includes(s))).toEqual([]);
  });
});
