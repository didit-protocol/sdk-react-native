import type { DiditTransactionResult } from '../types';

jest.mock('../NativeSdkReactNative', () => ({
  __esModule: true,
  default: {
    startVerification: jest.fn(),
    startVerificationWithWorkflow: jest.fn(),
    submitTransaction: jest.fn(),
    getTransaction: jest.fn(),
    onTransactionUpdated: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

import NativeSdkReactNative from '../NativeSdkReactNative';
import {
  startVerification,
  startVerificationWithWorkflow,
  submitTransaction,
  getTransaction,
  VerificationStatus,
} from '../index';

const mockStartVerification =
  NativeSdkReactNative.startVerification as jest.Mock;
const mockStartWithWorkflow =
  NativeSdkReactNative.startVerificationWithWorkflow as jest.Mock;
const mockSubmit = NativeSdkReactNative.submitTransaction as jest.Mock;
const mockGet = NativeSdkReactNative.getTransaction as jest.Mock;
const mockOnUpdated = NativeSdkReactNative.onTransactionUpdated as jest.Mock;

/** The callId the SDK handed native on the most recent submitTransaction. */
function lastCallId(): string {
  const calls = mockSubmit.mock.calls;
  const [, , optionsJson] = calls[calls.length - 1];
  return JSON.parse(optionsJson).callId as string;
}

/**
 * Replays a native transaction-updated event through the SDK's own listener.
 * The callback is only reachable while its callId is still registered, so a
 * replay that lands nowhere is how a released registration is observed without
 * exporting the private map.
 */
function emitNativeUpdate(
  callId: string,
  result: DiditTransactionResult
): void {
  const [listener] = mockOnUpdated.mock.calls[0];
  listener(JSON.stringify({ callId, result }));
}

function pendingResult(
  transactionId: string,
  actionType?: string
): DiditTransactionResult {
  return {
    transactionId,
    status: 'pending',
    ...(actionType
      ? { actionRequired: { type: actionType, url: 'https://example.test/a' } }
      : {}),
  };
}

describe('verification configuration marshalling', () => {
  beforeEach(() => {
    mockStartVerification.mockReset();
    mockStartVerification.mockResolvedValue({
      type: 'completed',
      sessionId: 'test-session',
      status: 'Approved',
    });
  });

  it('forwards an enabled language selector to native', async () => {
    await startVerification('test-token', { showLanguageSelector: true });

    expect(mockStartVerification).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({ showLanguageSelector: true })
    );
  });

  it('leaves the selector disabled when the option is omitted', async () => {
    await startVerification('test-token', {});

    expect(mockStartVerification).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({ showLanguageSelector: undefined })
    );
  });
});

/**
 * The Bank and Location steps are drawn by the native SDKs and decided by the
 * server, so the bridge adds nothing for them: the language reaches native on
 * both entry points and the decided session comes back as an ordinary result.
 */
describe('Bank and Location steps pass-through', () => {
  beforeEach(() => {
    mockStartVerification.mockReset();
    mockStartWithWorkflow.mockReset();
  });

  it('forwards the language to native when starting with a session token', async () => {
    mockStartVerification.mockResolvedValue({ type: 'cancelled' });

    await startVerification('test-token', { languageCode: 'es' });

    expect(mockStartVerification).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({ languageCode: 'es' })
    );
  });

  it('forwards the language to native when starting with a workflow', async () => {
    mockStartWithWorkflow.mockResolvedValue({ type: 'cancelled' });

    await startVerificationWithWorkflow('workflow-id', {
      config: { languageCode: 'es' },
    });

    const [workflowId, , , , , nativeConfig] =
      mockStartWithWorkflow.mock.calls[0];
    expect(workflowId).toBe('workflow-id');
    expect(nativeConfig).toMatchObject({ languageCode: 'es' });
  });

  it.each([
    ['Approved', VerificationStatus.Approved],
    ['Pending', VerificationStatus.Pending],
    ['Declined', VerificationStatus.Declined],
  ])(
    'returns a session the server decided as %s as a completed result',
    async (nativeStatus, expected) => {
      mockStartWithWorkflow.mockResolvedValue({
        type: 'completed',
        sessionId: 'session-step',
        status: nativeStatus,
      });

      const result = await startVerificationWithWorkflow('workflow-id');

      expect(result).toEqual({
        type: 'completed',
        session: { sessionId: 'session-step', status: expected },
      });
    }
  );

  it('keeps the native message when a newer native step reports an error type the bridge does not know', async () => {
    mockStartVerification.mockResolvedValue({
      type: 'failed',
      errorType: 'locationUnavailable',
      errorMessage: 'Location could not be determined.',
      sessionId: 'session-step',
      status: 'Pending',
    });

    const result = await startVerification('test-token');

    expect(result).toEqual({
      type: 'failed',
      error: {
        type: 'unknown',
        message: 'Location could not be determined.',
      },
      session: {
        sessionId: 'session-step',
        status: VerificationStatus.Pending,
      },
    });
  });
});

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

/**
 * The callback registered for a call is held until a native update event
 * releases it. Only a wallet-ownership action is auto-launched natively, so it
 * is the only action that can still produce that event once submitTransaction
 * has resolved; holding a callback for any other outcome retains it, and
 * everything it closes over, until the JavaScript runtime is destroyed.
 */
describe('transaction update callback lifetime', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
  });

  it('releases the callback when the host must launch the verification', async () => {
    const onTransactionUpdated = jest.fn();
    mockSubmit.mockResolvedValue(
      JSON.stringify(pendingResult('txn-10', 'verification_session'))
    );

    const result = await submitTransaction(
      'txn-token',
      { txnId: 'order-10' },
      { onTransactionUpdated }
    );
    expect(result.actionRequired?.type).toBe('verification_session');

    emitNativeUpdate(lastCallId(), {
      transactionId: 'txn-10',
      status: 'Approved',
    });
    expect(onTransactionUpdated).not.toHaveBeenCalled();
  });

  it('keeps the callback for a wallet-ownership action and delivers it exactly once', async () => {
    const onTransactionUpdated = jest.fn();
    mockSubmit.mockResolvedValue(
      JSON.stringify(pendingResult('txn-11', 'wallet_ownership'))
    );

    await submitTransaction(
      'txn-token',
      { txnId: 'order-11' },
      { onTransactionUpdated }
    );
    const callId = lastCallId();
    const refreshed: DiditTransactionResult = {
      transactionId: 'txn-11',
      status: 'Approved',
      travelRuleStatus: 'completed',
    };

    emitNativeUpdate(callId, refreshed);
    expect(onTransactionUpdated).toHaveBeenCalledTimes(1);
    expect(onTransactionUpdated).toHaveBeenCalledWith(refreshed);

    emitNativeUpdate(callId, refreshed);
    expect(onTransactionUpdated).toHaveBeenCalledTimes(1);
  });

  it('releases the callback when no action is required', async () => {
    const onTransactionUpdated = jest.fn();
    mockSubmit.mockResolvedValue(JSON.stringify(pendingResult('txn-12')));

    await submitTransaction(
      'txn-token',
      { txnId: 'order-12' },
      { onTransactionUpdated }
    );

    emitNativeUpdate(lastCallId(), {
      transactionId: 'txn-12',
      status: 'Approved',
    });
    expect(onTransactionUpdated).not.toHaveBeenCalled();
  });

  it('releases the callback when the native call rejects', async () => {
    const onTransactionUpdated = jest.fn();
    mockSubmit.mockRejectedValue({ code: 'validation', message: 'bad txnId' });

    await expect(
      submitTransaction('txn-token', { txnId: '' }, { onTransactionUpdated })
    ).rejects.toMatchObject({ code: 'validation' });

    emitNativeUpdate(lastCallId(), {
      transactionId: 'txn-13',
      status: 'Approved',
    });
    expect(onTransactionUpdated).not.toHaveBeenCalled();
  });

  it('accumulates nothing across repeated host-launched submissions', async () => {
    const callbacks: jest.Mock[] = [];
    const callIds: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const onTransactionUpdated = jest.fn();
      mockSubmit.mockResolvedValue(
        JSON.stringify(pendingResult(`txn-2${index}`, 'verification_session'))
      );
      await submitTransaction(
        'txn-token',
        { txnId: `order-2${index}` },
        { onTransactionUpdated }
      );
      callbacks.push(onTransactionUpdated);
      callIds.push(lastCallId());
    }

    expect(new Set(callIds).size).toBe(3);
    callIds.forEach((callId, index) => {
      emitNativeUpdate(callId, {
        transactionId: `txn-2${index}`,
        status: 'Approved',
      });
    });
    callbacks.forEach((callback) => expect(callback).not.toHaveBeenCalled());
  });
});
