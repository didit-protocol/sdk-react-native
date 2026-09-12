import type { DiditTransactionResult } from '../types';

jest.mock('../NativeSdkReactNative', () => ({
  __esModule: true,
  default: {
    submitTransaction: jest.fn(),
    getTransaction: jest.fn(),
    onTransactionUpdated: jest.fn(),
  },
}));

import NativeSdkReactNative from '../NativeSdkReactNative';
import {
  submitTransaction,
  getTransaction,
  DiditTransactionError,
} from '../index';

const mockSubmit = NativeSdkReactNative.submitTransaction as jest.Mock;
const mockGet = NativeSdkReactNative.getTransaction as jest.Mock;
const mockOnTransactionUpdated =
  NativeSdkReactNative.onTransactionUpdated as jest.Mock;

describe('transaction result marshalling', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    mockGet.mockReset();
  });

  it('surfaces actionRequired for a verification_session action, not just wallet_ownership', async () => {
    const nativeResult: DiditTransactionResult = {
      transactionId: 'txn-1',
      status: 'pending',
      actionRequired: {
        type: 'verification_session',
        url: 'https://verify.didit.me/session/abc',
        sessionId: 'session-abc',
        sessionToken: 'session-token-abc',
        status: 'Not Started',
      },
    };
    mockSubmit.mockResolvedValue(JSON.stringify(nativeResult));

    const result = await submitTransaction('txn-token', { txnId: 'order-1' });

    // The host app relies on sessionId/sessionToken being present here to
    // launch its own verification flow - this must never be dropped or
    // gated behind the action type.
    expect(result.actionRequired).toEqual(nativeResult.actionRequired);
  });

  it('still surfaces actionRequired for wallet_ownership (regression)', async () => {
    const nativeResult: DiditTransactionResult = {
      transactionId: 'txn-2',
      status: 'pending',
      actionRequired: {
        type: 'wallet_ownership',
        url: 'https://verify.didit.me/wallet/xyz',
        widgetSessionId: 'widget-xyz',
        expiresAt: '2026-08-01T00:00:00Z',
      },
    };
    mockSubmit.mockResolvedValue(JSON.stringify(nativeResult));

    const result = await submitTransaction('txn-token', { txnId: 'order-2' });

    expect(result.actionRequired).toEqual(nativeResult.actionRequired);
  });

  it('passes autoLaunchAction straight through to native with no JS-side gating', async () => {
    mockSubmit.mockResolvedValue(
      JSON.stringify({ transactionId: 'txn-3', status: 'pending' })
    );

    await submitTransaction(
      'txn-token',
      { txnId: 'order-3' },
      { autoLaunchAction: false }
    );

    const [, , optionsJson] = mockSubmit.mock.calls[0];
    expect(JSON.parse(optionsJson)).toMatchObject({ autoLaunchAction: false });
  });

  it('getTransaction surfaces actionRequired for a verification_session action', async () => {
    const nativeResult: DiditTransactionResult = {
      transactionId: 'txn-4',
      status: 'pending',
      actionRequired: {
        type: 'verification_session',
        sessionId: 'session-def',
        sessionToken: 'session-token-def',
        status: 'Not Started',
      },
    };
    mockGet.mockResolvedValue(JSON.stringify(nativeResult));

    const result = await getTransaction('txn-token', 'txn-4');

    expect(result.actionRequired).toEqual(nativeResult.actionRequired);
  });
});

describe('transaction update callback lifetime', () => {
  const originalMapSet = Map.prototype.set;
  let pendingUpdates: Map<string, unknown> | null = null;
  let nativeListener: ((payload: string) => void) | null = null;

  beforeAll(() => {
    // Returning a subscription keeps the module on its single shared
    // listener, exactly as the native module behaves.
    mockOnTransactionUpdated.mockImplementation(
      (listener: (payload: string) => void) => {
        nativeListener = listener;
        return { remove: jest.fn() };
      }
    );
  });

  beforeEach(() => {
    mockSubmit.mockReset();
    pendingUpdates = null;
    // The pending-callback map is module-private by design. Observe the real
    // insertions instead of exporting it: the spy delegates to the original
    // and only records which map instance received a transaction call id.
    jest
      .spyOn(Map.prototype, 'set')
      .mockImplementation(function (this: Map<unknown, unknown>, key, value) {
        if (typeof key === 'string' && key.startsWith('txn-')) {
          pendingUpdates = this as Map<string, unknown>;
        }
        return originalMapSet.call(this, key, value);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** The call id the wrapper generated for the most recent native call. */
  function lastCallId(): string {
    const [, , optionsJson] =
      mockSubmit.mock.calls[mockSubmit.mock.calls.length - 1];
    return JSON.parse(optionsJson).callId;
  }

  /** Feeds a native transaction-updated event through the shared listener. */
  function emitNativeUpdate(callId: string, result: DiditTransactionResult) {
    nativeListener!(JSON.stringify({ callId, result }));
  }

  it('releases the callback when the host must launch the verification', async () => {
    mockSubmit.mockResolvedValue(
      JSON.stringify({
        transactionId: 'txn-1',
        status: 'pending',
        actionRequired: {
          type: 'verification_session',
          sessionId: 'session-abc',
          sessionToken: 'session-token-abc',
        },
      })
    );

    await submitTransaction(
      'txn-token',
      { txnId: 'order-1' },
      { onTransactionUpdated: jest.fn() }
    );

    // Nothing can ever emit an update for a host-launched verification, so
    // holding the callback would retain it - and the screen it closes over -
    // for the life of the JavaScript runtime.
    expect(pendingUpdates!.has(lastCallId())).toBe(false);
  });

  it('does not accumulate callbacks across repeated host-launched verifications', async () => {
    mockSubmit.mockImplementation(async () =>
      JSON.stringify({
        transactionId: 'txn-repeat',
        status: 'pending',
        actionRequired: { type: 'verification_session', sessionId: 's' },
      })
    );

    const callIds: string[] = [];
    for (const txnId of ['order-1', 'order-2', 'order-3']) {
      await submitTransaction(
        'txn-token',
        { txnId },
        { onTransactionUpdated: jest.fn() }
      );
      callIds.push(lastCallId());
    }

    expect(callIds.filter((id) => pendingUpdates!.has(id))).toEqual([]);
  });

  it('releases the callback when no action is required', async () => {
    mockSubmit.mockResolvedValue(
      JSON.stringify({ transactionId: 'txn-2', status: 'approved' })
    );

    await submitTransaction(
      'txn-token',
      { txnId: 'order-2' },
      { onTransactionUpdated: jest.fn() }
    );

    expect(pendingUpdates!.has(lastCallId())).toBe(false);
  });

  it('releases the callback when the native call rejects', async () => {
    mockSubmit.mockRejectedValue({ code: 'network', message: 'offline' });

    await expect(
      submitTransaction(
        'txn-token',
        { txnId: 'order-3' },
        { onTransactionUpdated: jest.fn() }
      )
    ).rejects.toBeInstanceOf(DiditTransactionError);

    expect(pendingUpdates!.has(lastCallId())).toBe(false);
  });

  it('keeps the callback for a wallet-ownership action and delivers it once', async () => {
    mockSubmit.mockResolvedValue(
      JSON.stringify({
        transactionId: 'txn-4',
        status: 'pending',
        actionRequired: { type: 'wallet_ownership', widgetSessionId: 'w-1' },
      })
    );
    const onTransactionUpdated = jest.fn();

    await submitTransaction(
      'txn-token',
      { txnId: 'order-4' },
      { onTransactionUpdated }
    );
    const callId = lastCallId();

    // The natives auto-launch this action and report back later, so the
    // callback must survive until that event arrives.
    expect(pendingUpdates!.has(callId)).toBe(true);

    const refreshed: DiditTransactionResult = {
      transactionId: 'txn-4',
      status: 'approved',
    };
    emitNativeUpdate(callId, refreshed);

    expect(onTransactionUpdated).toHaveBeenCalledTimes(1);
    expect(onTransactionUpdated).toHaveBeenCalledWith(refreshed);
    expect(pendingUpdates!.has(callId)).toBe(false);

    emitNativeUpdate(callId, refreshed);
    expect(onTransactionUpdated).toHaveBeenCalledTimes(1);
  });

  it('registers nothing when auto-launch is disabled', async () => {
    mockSubmit.mockResolvedValue(
      JSON.stringify({
        transactionId: 'txn-5',
        status: 'pending',
        actionRequired: { type: 'wallet_ownership', widgetSessionId: 'w-2' },
      })
    );

    await submitTransaction(
      'txn-token',
      { txnId: 'order-5' },
      { autoLaunchAction: false, onTransactionUpdated: jest.fn() }
    );

    expect(pendingUpdates).toBeNull();
  });
});
