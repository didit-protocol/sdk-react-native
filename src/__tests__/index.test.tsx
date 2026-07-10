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
import { submitTransaction, getTransaction } from '../index';

const mockSubmit = NativeSdkReactNative.submitTransaction as jest.Mock;
const mockGet = NativeSdkReactNative.getTransaction as jest.Mock;

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
