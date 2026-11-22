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

const nativeStart = NativeSdkReactNative.startVerification as jest.Mock;
const nativeWorkflow =
  NativeSdkReactNative.startVerificationWithWorkflow as jest.Mock;

const nativeCompleted = {
  type: 'completed',
  sessionId: 'test-session',
  status: 'Approved',
};

const completed = {
  type: 'completed',
  session: { sessionId: 'test-session', status: 'Approved' },
};

const alreadyInProgress = {
  type: 'failed',
  error: { type: 'unknown', message: 'A verification is already in progress.' },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('one verification at a time', () => {
  beforeEach(() => {
    nativeStart.mockReset();
    nativeWorkflow.mockReset();
  });

  it('joins an identical startVerification call to the running verification', async () => {
    const pending = deferred<typeof nativeCompleted>();
    nativeStart.mockReturnValue(pending.promise);

    const first = startVerification('token-a', { languageCode: 'es' });
    const second = startVerification('token-a', { languageCode: 'es' });

    expect(nativeStart).toHaveBeenCalledTimes(1);

    pending.resolve(nativeCompleted);

    expect(await first).toEqual(completed);
    expect(await second).toEqual(completed);
  });

  it('joins an identical startVerificationWithWorkflow call to the running verification', async () => {
    const pending = deferred<typeof nativeCompleted>();
    nativeWorkflow.mockReturnValue(pending.promise);

    const first = startVerificationWithWorkflow('workflow-a', {
      vendorData: 'user-1',
    });
    const second = startVerificationWithWorkflow('workflow-a', {
      vendorData: 'user-1',
    });

    expect(nativeWorkflow).toHaveBeenCalledTimes(1);

    pending.resolve(nativeCompleted);

    expect(await first).toEqual(completed);
    expect(await second).toEqual(completed);
  });

  it('fails a different verification started while one is running', async () => {
    const pending = deferred<typeof nativeCompleted>();
    nativeStart.mockReturnValue(pending.promise);

    const first = startVerification('token-a');

    expect(await startVerification('token-b')).toEqual(alreadyInProgress);
    expect(await startVerificationWithWorkflow('workflow-a')).toEqual(
      alreadyInProgress
    );
    expect(nativeStart).toHaveBeenCalledTimes(1);
    expect(nativeWorkflow).not.toHaveBeenCalled();

    pending.resolve(nativeCompleted);

    expect(await first).toEqual(completed);
  });

  it('starts a new verification once the previous one settles', async () => {
    nativeStart.mockResolvedValue({ type: 'cancelled' });

    expect(await startVerification('token-a')).toEqual({
      type: 'cancelled',
      session: undefined,
    });
    expect(await startVerification('token-a')).toEqual({
      type: 'cancelled',
      session: undefined,
    });
    expect(nativeStart).toHaveBeenCalledTimes(2);
  });

  it('rejects every joined caller and releases when the native call rejects', async () => {
    const pending = deferred<typeof nativeCompleted>();
    nativeStart.mockReturnValueOnce(pending.promise);

    const first = startVerification('token-a');
    const second = startVerification('token-a');

    pending.reject(new Error('native failure'));

    await expect(first).rejects.toThrow('native failure');
    await expect(second).rejects.toThrow('native failure');

    nativeStart.mockResolvedValueOnce({ type: 'cancelled' });

    expect(await startVerification('token-b')).toEqual({
      type: 'cancelled',
      session: undefined,
    });
  });

  it('releases when the native call throws synchronously', async () => {
    nativeStart.mockImplementationOnce(() => {
      throw new Error('bridge unavailable');
    });

    await expect(startVerification('token-a')).rejects.toThrow(
      'bridge unavailable'
    );

    nativeStart.mockResolvedValueOnce({ type: 'cancelled' });

    expect(await startVerification('token-a')).toEqual({
      type: 'cancelled',
      session: undefined,
    });
  });
});
