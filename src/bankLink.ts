import { NativeEventEmitter } from 'react-native';
import type { EventSubscription } from 'react-native';
import NativeSdkReactNative from './NativeSdkReactNative';
import { toNativeConfig } from './nativeConfig';
import type {
  BankLinkEvent,
  BankLinkEventListener,
  BankLinkEventName,
  BankLinkEventPayload,
  BankLinkExit,
  BankLinkExitReason,
  BankLinkOptions,
  BankLinkResult,
  BankLinkStep,
  BankLinkSuccess,
} from './types';

/**
 * The event name the native modules emit on: the name of the TurboModule
 * `EventEmitter` property, shared by every platform.
 */
const EVENT_NAME = 'onBankLinkEvent';

const EVENT_NAMES: readonly BankLinkEventName[] = [
  'opened',
  'consent_shown',
  'consent_accepted',
  'institution_selected',
  'bank_redirect',
  'bank_returned',
  'accounts_selected',
  'success',
  'exit',
  'error',
];

const EXIT_REASONS: readonly BankLinkExitReason[] = [
  'closed',
  'cancelled',
  'bank_unavailable',
  'expired',
  'failed',
];

/** The raw shape native returns, as JSON. */
interface BankLinkResultJS {
  type?: string;
  linkId?: string;
  connectionId?: string;
  checkId?: string;
  reason?: string;
  step?: string | null;
  resumed?: boolean;
}

// ─── Events ──────────────────────────────────────────────────────────────────

const listeners = new Set<BankLinkEventListener>();
let emitter: NativeEventEmitter | null = null;
let nativeSubscription: EventSubscription | null = null;

function parseEvent(raw: string): BankLinkEvent | null {
  let parsed: { name?: unknown; payload?: unknown } | null;
  try {
    parsed = JSON.parse(raw) as { name?: unknown; payload?: unknown } | null;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const name = parsed.name;
  // A name this version does not know is ignored, as the link contract
  // requires: new events are additive.
  if (
    typeof name !== 'string' ||
    !EVENT_NAMES.includes(name as BankLinkEventName)
  ) {
    return null;
  }
  const payload = parsed.payload;
  return {
    name: name as BankLinkEventName,
    payload:
      payload && typeof payload === 'object'
        ? (payload as BankLinkEventPayload)
        : {},
  };
}

function dispatch(raw: string): void {
  const event = parseEvent(raw);
  if (!event) {
    return;
  }
  // Copied, so a listener that unsubscribes while being called does not make
  // the loop skip the next one.
  for (const listener of Array.from(listeners)) {
    listener(event);
  }
}

function subscribeNative(): void {
  if (nativeSubscription || listeners.size === 0) {
    return;
  }
  if (!emitter) {
    emitter = new NativeEventEmitter(NativeSdkReactNative);
  }
  nativeSubscription = emitter.addListener(EVENT_NAME, (raw: string) =>
    dispatch(raw)
  );
}

function unsubscribeNative(): void {
  if (!nativeSubscription || listeners.size > 0) {
    return;
  }
  nativeSubscription.remove();
  nativeSubscription = null;
}

/**
 * Listen to the events of a Bank Link: the names and payload keys of the link
 * contract, identical to native and web, ids only.
 *
 * Subscribe before {@link presentBankLink} to see `opened` and every step
 * after it. The returned function unsubscribes; a listener is never called
 * after it returns.
 *
 * @param listener - Called once per event.
 * @returns An unsubscribe function.
 *
 * @example
 * ```ts
 * const stop = onBankLinkEvent(({ name, payload }) => {
 *   console.log(name, payload.link_id);
 * });
 * ```
 */
export function onBankLinkEvent(listener: BankLinkEventListener): () => void {
  listeners.add(listener);
  subscribeNative();
  return () => {
    if (!listeners.delete(listener)) {
      return;
    }
    unsubscribeNative();
  };
}

// ─── Results ─────────────────────────────────────────────────────────────────

function mapResult(raw: BankLinkResultJS): BankLinkResult {
  if (raw.type === 'success') {
    if (typeof raw.linkId !== 'string' || raw.linkId.length === 0) {
      throw new Error('The Bank Link completed without a link id.');
    }
    const success: BankLinkSuccess = { type: 'success', linkId: raw.linkId };
    if (raw.connectionId != null) {
      success.connectionId = raw.connectionId;
    }
    if (raw.checkId != null) {
      success.checkId = raw.checkId;
    }
    if (raw.resumed != null) {
      success.resumed = raw.resumed;
    }
    return success;
  }

  if (raw.type === 'exit') {
    // Native only sends these five, per the contract; anything else is a
    // failure, never a success.
    const reason = EXIT_REASONS.includes(raw.reason as BankLinkExitReason)
      ? (raw.reason as BankLinkExitReason)
      : 'failed';
    const exit: BankLinkExit = { type: 'exit', reason };
    if (raw.step !== undefined) {
      exit.step = raw.step as BankLinkStep | null;
    }
    if (raw.resumed != null) {
      exit.resumed = raw.resumed;
    }
    return exit;
  }

  throw new Error(
    `The native SDK returned an unrecognized Bank Link result: ${String(
      raw.type
    )}`
  );
}

function parseResult(raw: string): BankLinkResult {
  return mapResult(JSON.parse(raw) as BankLinkResultJS);
}

// ─── Presentation ────────────────────────────────────────────────────────────

/**
 * The link being presented, so a second `presentBankLink` cannot replace the
 * result of the first one.
 */
let activeBankLink: Promise<BankLinkResult> | null = null;

/**
 * Open a Bank Link.
 *
 * Every screen, state and string is native: the wrapper only carries the
 * result and the events. The promise settles exactly once, with `success` or
 * `exit`; the same two events also arrive on {@link onBankLinkEvent}.
 *
 * @param token - The link's `client_token` (`blt_...`) from
 *   `POST /v3/bank/links/`. The API key never reaches the app.
 * @param options - Optional SDK configuration.
 * @returns A promise that resolves with the result.
 * @throws When a Bank Link is already open, or the native result is unusable.
 *
 * @example
 * ```ts
 * const result = await presentBankLink(clientToken);
 * if (result.type === 'success') {
 *   console.log('Connected', result.connectionId);
 * }
 * ```
 */
export function presentBankLink(
  token: string,
  options?: BankLinkOptions
): Promise<BankLinkResult> {
  if (activeBankLink) {
    return Promise.reject(
      new Error(
        'A Bank Link is already open. Await its result before presenting another one.'
      )
    );
  }

  const result = (async () => {
    const raw = await NativeSdkReactNative.presentBankLink(
      token,
      toNativeConfig(options?.config)
    );
    return parseResult(raw);
  })();

  activeBankLink = result;
  const release = () => {
    if (activeBankLink === result) {
      activeBankLink = null;
    }
  };
  result.then(release, release);
  return result;
}

/**
 * Pick up a Bank Link whose bank hop outlived the app.
 *
 * Call it once at start-up, before rendering, after the person comes back to
 * the app: it replays the result if the link finished while the app was
 * closed, and otherwise carries on at the step the server says, with
 * `resumed: true` on the result.
 *
 * @returns The result, or `null` when nothing is pending.
 */
export async function resumeBankLink(): Promise<BankLinkResult | null> {
  const raw = await NativeSdkReactNative.resumeBankLink();
  const parsed = JSON.parse(raw) as BankLinkResultJS | null;
  return parsed ? mapResult(parsed) : null;
}

/**
 * Hand an address the app was opened with to the Bank Link, for hosts whose
 * bank return is an app link or universal link.
 *
 * Call it from `onOpenURL`/`onNewIntent` with every address: native decides
 * whether the address is a link return, and the poll decides the screen. The
 * address is never parsed here, so a resume code keeps its dot.
 *
 * @param url - The address the app was opened with.
 */
export function handleBankLinkReturn(url: string): void {
  NativeSdkReactNative.handleBankLinkReturn(url);
}
