import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('../NativeSdkReactNative', () => ({
  __esModule: true,
  default: {
    startVerification: jest.fn(),
    onTransactionUpdated: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

import NativeSdkReactNative from '../NativeSdkReactNative';
import { startVerification } from '../index';

/**
 * Each native bridge turns the native SDK's VerificationError into the
 * `errorType` string the JS layer reads, and a case a bridge leaves out falls
 * through to "unknown". The iOS bridge once had no retryBlocked case, so the
 * same native error reached JS as "retryBlocked" on Android and "unknown" on
 * iOS. Both switches are read here so the bridges keep sending the same string
 * for every error both native SDKs share, and JS keeps every string they send.
 */

const repoRoot = join(__dirname, '..', '..');

const read = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), 'utf8');

/** The body of the bridge's mapErrorType, up to its closing brace. */
function mapErrorTypeBody(source: string, signature: RegExp): string {
  const start = source.search(signature);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf('\n    }\n', start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

/** Native case name in lower camel case -> errorType string sent to JS. */
function iosErrorTypes(): Map<string, string> {
  const body = mapErrorTypeBody(
    read('ios/DiditSdkBridge.swift'),
    /private static func mapErrorType\(/
  );
  return new Map(
    Array.from(
      body.matchAll(/case \.(\w+)[^:]*:\s*return "(\w+)"/g),
      (match) => [String(match[1]), String(match[2])]
    )
  );
}

function androidErrorTypes(): Map<string, string> {
  const body = mapErrorTypeBody(
    read('android/src/main/java/com/sdkreactnative/SdkReactNativeModule.kt'),
    /private fun mapErrorType\(/
  );
  return new Map(
    Array.from(
      body.matchAll(/is VerificationError\.(\w+) -> "(\w+)"/g),
      (match) => {
        const name = String(match[1]);
        return [name[0]!.toLowerCase() + name.slice(1), String(match[2])];
      }
    )
  );
}

describe('native error type mapping', () => {
  const ios = iosErrorTypes();
  const android = androidErrorTypes();

  it('reads both bridge switches', () => {
    const shared = ['sessionExpired', 'networkError', 'cameraAccessDenied'];
    expect([...ios.keys()]).toEqual(
      expect.arrayContaining([...shared, 'unknown'])
    );
    expect([...android.keys()]).toEqual(
      expect.arrayContaining([...shared, 'notInitialized', 'apiError'])
    );
  });

  it('sends retryBlocked from both bridges', () => {
    expect(ios.get('retryBlocked')).toBe('retryBlocked');
    expect(android.get('retryBlocked')).toBe('retryBlocked');
  });

  it('sends the same string from Android for every error the iOS bridge maps', () => {
    for (const [nativeCase, errorType] of ios) {
      expect([nativeCase, android.get(nativeCase)]).toEqual([
        nativeCase,
        errorType,
      ]);
    }
  });

  it.each([...new Set([...ios.values(), ...android.values()])])(
    'keeps the %s error type in the JS result',
    async (errorType) => {
      (NativeSdkReactNative.startVerification as jest.Mock).mockResolvedValue({
        type: 'failed',
        errorType,
        errorMessage: 'native message',
        sessionId: 'test-session',
        status: 'Declined',
      });

      const result = await startVerification('test-token');

      expect(result).toMatchObject({
        type: 'failed',
        error: { type: errorType, message: 'native message' },
        session: { sessionId: 'test-session' },
      });
    }
  );
});
