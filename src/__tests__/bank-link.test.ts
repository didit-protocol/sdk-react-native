/**
 * The Bank Link wrapper: the Promise of a presentation, the events, the
 * resume and the return address. Native is a fake module, as the issue
 * requires: no flow of its own is tested, only the bridge contract.
 */

jest.mock('../NativeSdkReactNative', () => ({
  __esModule: true,
  default: {
    startVerification: jest.fn(),
    startVerificationWithWorkflow: jest.fn(),
    onTransactionUpdated: jest.fn(() => ({ remove: jest.fn() })),
    presentBankLink: jest.fn(),
    resumeBankLink: jest.fn(),
    handleBankLinkReturn: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import { DeviceEventEmitter } from 'react-native';
import NativeSdkReactNative from '../NativeSdkReactNative';
import {
  presentBankLink,
  resumeBankLink,
  onBankLinkEvent,
  handleBankLinkReturn,
} from '../index';
import type { BankLinkEvent, BankLinkResult } from '../index';

const present = NativeSdkReactNative.presentBankLink as jest.Mock;
const resume = NativeSdkReactNative.resumeBankLink as jest.Mock;
const handleReturn = NativeSdkReactNative.handleBankLinkReturn as jest.Mock;

const repoRoot = join(__dirname, '..', '..');

const read = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), 'utf8');

/** The body of the first braced declaration after `signature`. */
function bracedBody(source: string, signature: RegExp): string {
  const start = source.search(signature);
  expect(start).toBeGreaterThanOrEqual(0);

  const open = source.indexOf('{', start);
  let depth = 0;

  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(open, index + 1);
  }

  throw new Error('Unclosed declaration');
}

/**
 * Every payload key of the link contract (`events.md`, section 1): ids and
 * enums only, never a name, a token, an email or an account number.
 */
const CONTRACT_PAYLOAD_KEYS = [
  'link_id',
  'mode',
  'access',
  'presentation',
  'consent_version',
  'institution_id',
  'country',
  'via',
  'result',
  'count',
  'connection_id',
  'check_id',
  'reason',
  'step',
  'code',
];

/** Emits one native event, exactly as the native modules do: a JSON string. */
function emit(event: unknown): void {
  DeviceEventEmitter.emit('onBankLinkEvent', JSON.stringify(event));
}

describe('presentBankLink', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the success result native returned', async () => {
    present.mockResolvedValue(
      JSON.stringify({
        type: 'success',
        linkId: '0b9c4f1e-6a2d-4e8b-9f31-7c5d2e1a8b40',
        connectionId: 'connection-1',
        checkId: 'check-1',
        resumed: false,
      })
    );

    const result = await presentBankLink('blt_Hs8Pa4Rb6Ye0Gf2Jc7Qm3Zx9Vd2Lc5W');

    expect(result).toEqual({
      type: 'success',
      linkId: '0b9c4f1e-6a2d-4e8b-9f31-7c5d2e1a8b40',
      connectionId: 'connection-1',
      checkId: 'check-1',
      resumed: false,
    });
  });

  it('leaves absent optional ids absent, never as keys with undefined', async () => {
    present.mockResolvedValue(
      JSON.stringify({
        type: 'success',
        linkId: '0b9c4f1e-6a2d-4e8b-9f31-7c5d2e1a8b40',
      })
    );

    const result = await presentBankLink('blt_token');

    expect(Object.keys(result).sort()).toEqual(['linkId', 'type']);
  });

  it.each([
    ['closed', null],
    ['cancelled', 'bank_hop'],
    ['bank_unavailable', 'institution'],
    ['expired', 'consent'],
    ['failed', 'collecting'],
  ])('resolves an exit with reason %s', async (reason, step) => {
    present.mockResolvedValue(
      JSON.stringify({ type: 'exit', reason, step, resumed: true })
    );

    await expect(presentBankLink('blt_token')).resolves.toEqual({
      type: 'exit',
      reason,
      step,
      resumed: true,
    });
  });

  it('maps a reason it does not know to failed, never to success', async () => {
    present.mockResolvedValue(
      JSON.stringify({ type: 'exit', reason: 'something_new', step: null })
    );

    await expect(presentBankLink('blt_token')).resolves.toEqual({
      type: 'exit',
      reason: 'failed',
      step: null,
    });
  });

  it('forwards the token and the configuration to native', async () => {
    present.mockResolvedValue(
      JSON.stringify({ type: 'exit', reason: 'closed' })
    );

    await presentBankLink('blt_token', {
      config: { languageCode: 'es', loggingEnabled: true },
    });

    expect(present).toHaveBeenCalledWith('blt_token', {
      languageCode: 'es',
      showLanguageSelector: undefined,
      fontFamily: undefined,
      loggingEnabled: true,
      showCloseButton: undefined,
      showExitConfirmation: undefined,
      closeOnComplete: undefined,
      defaultDocumentCamera: undefined,
      defaultLivenessCamera: undefined,
      showDocumentCameraSwitchButton: undefined,
      showLivenessCameraSwitchButton: undefined,
    });
  });

  it('rejects a second presentation while one is open, without calling native', async () => {
    let finish: (value: string) => void = () => {};
    present.mockReturnValue(
      new Promise<string>((resolve) => {
        finish = resolve;
      })
    );

    const first = presentBankLink('blt_first');

    await expect(presentBankLink('blt_second')).rejects.toThrow(/already open/);
    expect(present).toHaveBeenCalledTimes(1);

    finish(JSON.stringify({ type: 'exit', reason: 'closed' }));
    await expect(first).resolves.toEqual({ type: 'exit', reason: 'closed' });
  });

  it('presents again once the first link settled', async () => {
    present.mockResolvedValue(
      JSON.stringify({ type: 'exit', reason: 'closed' })
    );

    await presentBankLink('blt_first');
    await presentBankLink('blt_second');

    expect(present).toHaveBeenCalledTimes(2);
  });

  it('rejects when native answers a result it cannot read', async () => {
    present.mockResolvedValue(JSON.stringify({ type: 'success' }));

    await expect(presentBankLink('blt_token')).rejects.toThrow(/link id/);
  });

  it('releases the wrapper when native rejects, so the next link can open', async () => {
    present.mockRejectedValueOnce(new Error('native failed'));
    present.mockResolvedValueOnce(
      JSON.stringify({ type: 'exit', reason: 'closed' })
    );

    await expect(presentBankLink('blt_first')).rejects.toThrow('native failed');
    await expect(presentBankLink('blt_second')).resolves.toEqual({
      type: 'exit',
      reason: 'closed',
    });
  });
});

describe('resumeBankLink', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when nothing is pending', async () => {
    resume.mockResolvedValue('null');

    await expect(resumeBankLink()).resolves.toBeNull();
  });

  it('returns the replayed result with resumed: true', async () => {
    resume.mockResolvedValue(
      JSON.stringify({
        type: 'success',
        linkId: '0b9c4f1e-6a2d-4e8b-9f31-7c5d2e1a8b40',
        connectionId: 'connection-1',
        resumed: true,
      })
    );

    await expect(resumeBankLink()).resolves.toEqual({
      type: 'success',
      linkId: '0b9c4f1e-6a2d-4e8b-9f31-7c5d2e1a8b40',
      connectionId: 'connection-1',
      resumed: true,
    });
  });
});

describe('onBankLinkEvent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [
      'opened',
      {
        link_id: 'link-1',
        mode: 'connect',
        access: 'ongoing',
        presentation: 'rn',
      },
    ],
    ['consent_shown', { link_id: 'link-1', consent_version: '2026-11-22.1' }],
    [
      'consent_accepted',
      { link_id: 'link-1', consent_version: '2026-11-22.1' },
    ],
    [
      'institution_selected',
      { institution_id: 'es-banco-norte', country: 'ES' },
    ],
    ['bank_redirect', { via: 'popup' }],
    ['bank_returned', { result: 'ok' }],
    ['accounts_selected', { count: 2 }],
    [
      'success',
      { link_id: 'link-1', connection_id: 'connection-1', check_id: 'check-1' },
    ],
    ['exit', { reason: 'closed', step: 'bank_hop' }],
    ['error', { code: 'network' }],
  ])('delivers %s once with its payload as sent', (name, payload) => {
    const listener = jest.fn();
    const stop = onBankLinkEvent(listener);

    emit({ name, payload });
    emit({ name, payload });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, { name, payload });
    stop();
  });

  it('delivers to every listener and stops after unsubscribe', () => {
    const first = jest.fn();
    const second = jest.fn();
    const stopFirst = onBankLinkEvent(first);
    const stopSecond = onBankLinkEvent(second);

    emit({ name: 'opened', payload: { link_id: 'link-1' } });
    stopFirst();
    emit({ name: 'opened', payload: { link_id: 'link-1' } });
    stopSecond();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('is safe to unsubscribe twice', () => {
    const listener = jest.fn();
    const stop = onBankLinkEvent(listener);

    stop();
    expect(() => stop()).not.toThrow();
    emit({ name: 'opened', payload: {} });
    expect(listener).not.toHaveBeenCalled();
  });

  it('ignores an event name this version does not know, and a broken payload', () => {
    const listener = jest.fn();
    const stop = onBankLinkEvent(listener);

    emit({
      name: 'a_name_from_a_newer_server',
      payload: { link_id: 'link-1' },
    });
    DeviceEventEmitter.emit('onBankLinkEvent', 'not json');
    stop();

    expect(listener).not.toHaveBeenCalled();
  });

  it('declares no payload field of a person, a token or an account', () => {
    // The link contract allows ids only. The wrapper's own payload type is the
    // list of everything a listener can read, so a field outside the contract
    // is a privacy defect here.
    const body = bracedBody(
      read('src/types.ts'),
      /export interface BankLinkEventPayload {/
    );
    const keys = Array.from(body.matchAll(/^ {2}(\w+)\??:/gm), (match) =>
      String(match[1])
    );

    expect(keys).toEqual(
      expect.arrayContaining(['link_id', 'connection_id', 'reason', 'step'])
    );
    expect(keys.filter((key) => !CONTRACT_PAYLOAD_KEYS.includes(key))).toEqual(
      []
    );
  });
});

describe('handleBankLinkReturn', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the address to native unchanged', () => {
    const url =
      'https://app.example.com/bank/return?didit_resume=rsc_0b9c4f1e6a2d4e8b9f317c5d2e1a8b40.7Hq3Zx9Wd2Lm5Tn8Vc1Ks4Pa6Rb0Uv3';

    handleBankLinkReturn(url);

    expect(handleReturn).toHaveBeenCalledWith(url);
  });
});

describe('result narrowing', () => {
  it('narrows success and exit exhaustively', () => {
    const describeResult = (result: BankLinkResult): string => {
      switch (result.type) {
        case 'success':
          return `success:${result.linkId}`;
        case 'exit':
          return `exit:${result.reason}`;
      }
    };

    expect(describeResult({ type: 'success', linkId: 'link-1' })).toBe(
      'success:link-1'
    );
    expect(describeResult({ type: 'exit', reason: 'expired' })).toBe(
      'exit:expired'
    );
  });

  it('types an event listener payload', () => {
    const listener = (event: BankLinkEvent) => event.payload.link_id;

    expect(typeof listener).toBe('function');
  });
});
