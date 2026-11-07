jest.mock('../NativeSdkReactNative', () => ({
  __esModule: true,
  default: {
    startVerification: jest.fn(),
    startVerificationWithWorkflow: jest.fn(),
    onTransactionUpdated: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

import NativeSdkReactNative from '../NativeSdkReactNative';
import { startVerification, startVerificationWithWorkflow } from '../index';

const entries = [
  {
    name: 'session',
    native: NativeSdkReactNative.startVerification,
    start: () => startVerification('test-token', { languageCode: 'es' }),
  },
  {
    name: 'workflow',
    native: NativeSdkReactNative.startVerificationWithWorkflow,
    start: () =>
      startVerificationWithWorkflow('test-workflow', {
        config: { languageCode: 'es' },
      }),
  },
];
const session = { sessionId: 'test-session', status: 'Pending' };

describe.each(entries)(
  '$name verification entry point',
  ({ native, start }) => {
    it.each(['completed', 'cancelled'])(
      'preserves the native %s outcome',
      async (type) => {
        (native as jest.Mock).mockResolvedValue({ type, ...session });

        expect(await start()).toEqual({ type, session });
      }
    );

    it.each(['retryBlocked', 'unknown', 'networkError'])(
      'preserves %s failures without losing the session',
      async (errorType) => {
        (native as jest.Mock).mockResolvedValue({
          type: 'failed',
          errorType,
          errorMessage: 'Native failure',
          ...session,
        });

        expect(await start()).toEqual({
          type: 'failed',
          error: { type: errorType, message: 'Native failure' },
          session,
        });
      }
    );

    it('does not invent a session when cancellation has none', async () => {
      (native as jest.Mock).mockResolvedValue({ type: 'cancelled' });

      expect(await start()).toEqual({ type: 'cancelled', session: undefined });
    });
  }
);
