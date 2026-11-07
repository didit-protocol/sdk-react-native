/**
 * Codes from the Didit API pass through unchanged ("invalid_grant",
 * "method_unavailable", "reauthentication_required", ...); native DiditAuth adds:
 * - "cancelled": the person closed the sign-in or step-up page
 * - "invalid_state": the page returned for a sign-in this app did not start
 * - "not_signed_in": the call needs a signed-in person
 * - "passkey_cancelled": the person dismissed the passkey prompt
 * - "passkey_unavailable": the device cannot run a passkey for this app
 * - "browser_unavailable": the page cannot be shown (iOS hosted pages need 17.4)
 * - "storage_unavailable": the Keychain or Android Keystore could not keep the tokens
 * - "invalid_publishable_key", "invalid_redirect_uri", "network_error",
 *   "rate_limited" (see `retryAfter`), "server_error"
 */
export type DiditAuthErrorCode =
  | 'cancelled'
  | 'invalid_state'
  | 'not_signed_in'
  | 'passkey_cancelled'
  | 'passkey_unavailable'
  | 'browser_unavailable'
  | 'storage_unavailable'
  | 'rate_limited'
  | 'invalid_publishable_key'
  | 'invalid_redirect_uri'
  | 'network_error'
  | 'server_error'
  | 'ERR_DIDIT_AUTH_UNAVAILABLE'
  | (string & {});

export interface DiditAuthErrorOptions {
  /** HTTP status of Didit's answer, when there was one. */
  status?: number;
  /** Per-field codes, for example { return_to: ["invalid_redirect_uri"] }. */
  fields?: Record<string, string[]>;
  /** Seconds to wait before trying again, for "rate_limited". */
  retryAfter?: number;
}

export class DiditAuthError extends Error {
  readonly code: DiditAuthErrorCode;
  readonly status?: number;
  readonly fields?: Record<string, string[]>;
  readonly retryAfter?: number;

  constructor(
    code: DiditAuthErrorCode,
    message?: string,
    options: DiditAuthErrorOptions = {}
  ) {
    super(message || code);
    this.name = 'DiditAuthError';
    this.code = code;
    this.status = options.status;
    this.fields = options.fields;
    this.retryAfter = options.retryAfter;
  }
}

/** The app was built without the native module, for example in Expo Go. */
export class DiditAuthUnavailableError extends DiditAuthError {
  constructor() {
    super(
      'ERR_DIDIT_AUTH_UNAVAILABLE',
      'DiditAuth is unavailable in this build.'
    );
    this.name = 'DiditAuthUnavailableError';
  }
}

interface NativeRejection {
  code?: unknown;
  message?: unknown;
  userInfo?: {
    status?: unknown;
    fields?: unknown;
    retryAfter?: unknown;
  } | null;
}

const number = (value: unknown) =>
  typeof value === 'number' ? value : undefined;

function isFields(value: unknown): value is Record<string, string[]> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every(
      (codes) =>
        Array.isArray(codes) && codes.every((code) => typeof code === 'string')
    )
  );
}

/** A native rejection as a DiditAuthError with the same code and message. */
export function toDiditAuthError(error: unknown): unknown {
  const rejection = error as NativeRejection | null;
  if (error instanceof DiditAuthError || typeof rejection?.code !== 'string') {
    return error;
  }
  const info = rejection.userInfo ?? {};

  return new DiditAuthError(
    rejection.code,
    typeof rejection.message === 'string' ? rejection.message : undefined,
    {
      status: number(info.status),
      fields: isFields(info.fields) ? info.fields : undefined,
      retryAfter: number(info.retryAfter),
    }
  );
}
