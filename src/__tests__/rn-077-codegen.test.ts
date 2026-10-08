import { readFileSync } from 'fs';
import { join } from 'path';

const {
  TypeScriptParser,
} = require('react-native-codegen-077/lib/parsers/typescript/parser');

describe('React Native 0.77 codegen compatibility', () => {
  it('parses the TurboModule spec used during pod install', () => {
    const specPath = join(__dirname, '..', 'NativeSdkReactNative.ts');
    const spec = readFileSync(specPath, 'utf8');

    const schema = new TypeScriptParser().parseString(spec, specPath);

    expect(schema.modules.NativeSdkReactNative.spec.eventEmitters).toEqual([
      expect.objectContaining({ name: 'onTransactionUpdated' }),
    ]);
  });
});
