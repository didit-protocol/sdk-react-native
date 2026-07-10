import type { EventSubscription } from 'react-native';
import NativeSdkReactNative from './NativeSdkReactNative';
import type { VerificationResultJS } from './NativeSdkReactNative';
import { VerificationStatus, DiditTransactionError } from './types';
import type {
  VerificationResult,
  DiditConfig,
  WorkflowOptions,
  DiditTransaction,
  DiditTransactionErrorCode,
  DiditTransactionOptions,
  DiditTransactionResult,
} from './types';

// Re-export all public types
export { VerificationStatus, CameraLens, DiditTransactionError } from './types';
export type {
  VerificationResult,
  VerificationCompleted,
  VerificationCancelled,
  VerificationFailed,
  VerificationError,
  VerificationErrorType,
  SessionData,
  DiditConfig,
  ContactDetails,
  ExpectedDetails,
  WorkflowOptions,
  DiditTransaction,
  DiditTransactionInfo,
  DiditTransactionParticipant,
  DiditTransactionPaymentMethod,
  DiditTravelRule,
  DiditTransactionActionRequired,
  DiditTransactionResult,
  DiditTransactionOptions,
  DiditTransactionErrorCode,
} from './types';

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Maps a raw native result to a strongly-typed VerificationResult.
 */
function mapNativeResult(raw: VerificationResultJS): VerificationResult {
  const session =
    raw.sessionId != null
      ? {
          sessionId: raw.sessionId,
          status: mapStatus(raw.status),
        }
      : undefined;

  switch (raw.type) {
    case 'completed':
      if (!session) {
        // Should never happen for completed, but handle gracefully
        return {
          type: 'failed',
          error: {
            type: 'unknown',
            message: 'Verification completed but no session data was returned.',
          },
        };
      }
      return { type: 'completed', session };

    case 'cancelled':
      return { type: 'cancelled', session };

    case 'failed':
      return {
        type: 'failed',
        error: {
          type: mapErrorType(raw.errorType),
          message:
            raw.errorMessage ??
            'An unknown error occurred during verification.',
        },
        session,
      };

    default:
      return {
        type: 'failed',
        error: {
          type: 'unknown',
          message: `Unexpected result type: ${raw.type}`,
        },
        session,
      };
  }
}

function mapStatus(status?: string): VerificationStatus {
  switch (status) {
    case 'Approved':
      return VerificationStatus.Approved;
    case 'Declined':
      return VerificationStatus.Declined;
    case 'Pending':
    default:
      return VerificationStatus.Pending;
  }
}

function mapErrorType(errorType?: string) {
  switch (errorType) {
    case 'sessionExpired':
    case 'networkError':
    case 'cameraAccessDenied':
    case 'notInitialized':
    case 'apiError':
    case 'retryBlocked':
      return errorType;
    default:
      return 'unknown' as const;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Start identity verification with an existing session token.
 *
 * This launches the native Didit verification UI as a full-screen modal.
 * The returned promise resolves when the user completes, cancels, or
 * encounters an error during the verification flow.
 *
 * @param token - A valid session token obtained from the Didit API.
 * @param config - Optional SDK configuration (language, font, logging, etc.).
 * @returns A promise that resolves with the verification result.
 *
 * @example
 * ```ts
 * import { startVerification, VerificationStatus } from '@didit-protocol/sdk-react-native';
 *
 * const result = await startVerification('session-token-here');
 * if (result.type === 'completed' && result.session.status === VerificationStatus.Approved) {
 *   console.log('Identity verified!');
 * }
 * ```
 */
export async function startVerification(
  token: string,
  config?: DiditConfig
): Promise<VerificationResult> {
  const nativeConfig = config
    ? {
        languageCode: config.languageCode,
        fontFamily: config.fontFamily,
        loggingEnabled: config.loggingEnabled,
        showCloseButton: config.showCloseButton,
        showExitConfirmation: config.showExitConfirmation,
        closeOnComplete: config.closeOnComplete,
        defaultDocumentCamera: config.defaultDocumentCamera,
        defaultLivenessCamera: config.defaultLivenessCamera,
        showDocumentCameraSwitchButton: config.showDocumentCameraSwitchButton,
        showLivenessCameraSwitchButton: config.showLivenessCameraSwitchButton,
      }
    : {};

  const raw = await NativeSdkReactNative.startVerification(token, nativeConfig);
  return mapNativeResult(raw);
}

/**
 * Start identity verification by creating a new session with a workflow ID.
 *
 * This creates a verification session on the Didit backend, then launches
 * the native verification UI. The returned promise resolves when the flow completes.
 *
 * @param workflowId - The workflow ID that defines the verification steps.
 * @param options - Optional parameters including vendor data, metadata, contact/expected details, and config.
 * @returns A promise that resolves with the verification result.
 *
 * @example
 * ```ts
 * import { startVerificationWithWorkflow } from '@didit-protocol/sdk-react-native';
 *
 * const result = await startVerificationWithWorkflow('workflow-id', {
 *   vendorData: 'user-123',
 *   contactDetails: { email: 'user@example.com' },
 *   config: { languageCode: 'es' },
 * });
 * ```
 */
export async function startVerificationWithWorkflow(
  workflowId: string,
  options?: WorkflowOptions
): Promise<VerificationResult> {
  const nativeConfig = options?.config
    ? {
        languageCode: options.config.languageCode,
        fontFamily: options.config.fontFamily,
        loggingEnabled: options.config.loggingEnabled,
        showCloseButton: options.config.showCloseButton,
        showExitConfirmation: options.config.showExitConfirmation,
        closeOnComplete: options.config.closeOnComplete,
        defaultDocumentCamera: options.config.defaultDocumentCamera,
        defaultLivenessCamera: options.config.defaultLivenessCamera,
        showDocumentCameraSwitchButton:
          options.config.showDocumentCameraSwitchButton,
        showLivenessCameraSwitchButton:
          options.config.showLivenessCameraSwitchButton,
      }
    : {};

  const nativeContactDetails = options?.contactDetails
    ? {
        email: options.contactDetails.email,
        sendNotificationEmails: options.contactDetails.sendNotificationEmails,
        emailLang: options.contactDetails.emailLang,
        phone: options.contactDetails.phone,
      }
    : {};

  const nativeExpectedDetails = options?.expectedDetails
    ? {
        firstName: options.expectedDetails.firstName,
        lastName: options.expectedDetails.lastName,
        dateOfBirth: options.expectedDetails.dateOfBirth,
        gender: options.expectedDetails.gender,
        nationality: options.expectedDetails.nationality,
        country: options.expectedDetails.country,
        address: options.expectedDetails.address,
        identificationNumber: options.expectedDetails.identificationNumber,
        ipAddress: options.expectedDetails.ipAddress,
        portraitImage: options.expectedDetails.portraitImage,
      }
    : {};

  const raw = await NativeSdkReactNative.startVerificationWithWorkflow(
    workflowId,
    options?.vendorData ?? null,
    options?.metadata ?? null,
    nativeContactDetails,
    nativeExpectedDetails,
    nativeConfig
  );

  return mapNativeResult(raw);
}

// ─── Transactions ────────────────────────────────────────────────────────────

const TRANSACTION_ERROR_CODES: DiditTransactionErrorCode[] = [
  'invalid_token',
  'expired_token',
  'validation',
  'network',
];

let transactionCallCounter = 0;
let transactionUpdateSubscription: EventSubscription | null = null;
const pendingTransactionUpdates = new Map<
  string,
  (result: DiditTransactionResult) => void
>();

/**
 * Dispatches native transaction-updated events to the callback registered
 * for the originating call. A single module-level subscription is shared
 * by all in-flight calls and events are matched by `callId`.
 */
function registerTransactionUpdate(
  callId: string,
  callback: (result: DiditTransactionResult) => void
): void {
  if (!transactionUpdateSubscription) {
    transactionUpdateSubscription = NativeSdkReactNative.onTransactionUpdated(
      (payload: string) => {
        let event: { callId?: string; result?: DiditTransactionResult };
        try {
          event = JSON.parse(payload);
        } catch {
          return;
        }
        if (!event.callId || !event.result) {
          return;
        }
        const pending = pendingTransactionUpdates.get(event.callId);
        if (pending) {
          pendingTransactionUpdates.delete(event.callId);
          pending(event.result);
        }
      }
    );
  }
  pendingTransactionUpdates.set(callId, callback);
}

/**
 * Normalizes a native module rejection into a DiditTransactionError with a
 * stable `code` field and parsed `fieldErrors` for validation failures.
 */
function toTransactionError(error: unknown): DiditTransactionError {
  if (error instanceof DiditTransactionError) {
    return error;
  }
  const raw = error as {
    code?: string;
    message?: string;
    userInfo?: { fieldErrors?: string };
  } | null;
  const code = TRANSACTION_ERROR_CODES.includes(
    raw?.code as DiditTransactionErrorCode
  )
    ? (raw?.code as DiditTransactionErrorCode)
    : 'network';
  let fieldErrors: Record<string, unknown> | undefined;
  if (raw?.userInfo?.fieldErrors) {
    try {
      fieldErrors = JSON.parse(raw.userInfo.fieldErrors);
    } catch {
      fieldErrors = undefined;
    }
  }
  return new DiditTransactionError(
    code,
    raw?.message ?? 'Transaction request failed.',
    fieldErrors
  );
}

/**
 * Submit a transaction directly from the device.
 *
 * Requires a transaction SDK token minted by your backend via
 * `POST /v3/transactions/sdk-token/`. Device intelligence is attached
 * automatically. If the response contains a required user action
 * (verification session or wallet-ownership widget) and
 * `options.autoLaunchAction` is not disabled, the SDK launches it natively
 * and later invokes `options.onTransactionUpdated` with the refreshed
 * transaction.
 *
 * @param transactionToken - Transaction SDK token (X-Transaction-Token).
 * @param transaction - The transaction payload (camelCase wire contract).
 * @param options - Optional base URL override, auto-launch flag, and update callback.
 * @returns A promise that resolves with the created transaction.
 * @throws {DiditTransactionError} With `code` set to `invalid_token`,
 *   `expired_token`, `validation` (see `fieldErrors`), or `network`.
 *
 * @example
 * ```ts
 * import { submitTransaction } from '@didit-protocol/sdk-react-native';
 *
 * const result = await submitTransaction(sdkToken, {
 *   txnId: 'order-123',
 *   type: 'crypto',
 *   info: { direction: 'outbound', amount: 0.25, currency: 'ETH' },
 *   travelRule: { required: true },
 * }, {
 *   onTransactionUpdated: (updated) => console.log(updated.status),
 * });
 * console.log(result.transactionId, result.actionRequired?.type);
 * ```
 */
export async function submitTransaction(
  transactionToken: string,
  transaction: DiditTransaction,
  options?: DiditTransactionOptions
): Promise<DiditTransactionResult> {
  const callId = `txn-${Date.now()}-${++transactionCallCounter}`;
  const autoLaunchAction = options?.autoLaunchAction ?? true;
  if (autoLaunchAction && options?.onTransactionUpdated) {
    registerTransactionUpdate(callId, options.onTransactionUpdated);
  }
  try {
    const resultJson = await NativeSdkReactNative.submitTransaction(
      transactionToken,
      JSON.stringify(transaction),
      JSON.stringify({
        callId,
        autoLaunchAction,
        baseUrl: options?.baseUrl,
      })
    );
    const result = JSON.parse(resultJson) as DiditTransactionResult;
    if (!result.actionRequired) {
      pendingTransactionUpdates.delete(callId);
    }
    return result;
  } catch (error) {
    pendingTransactionUpdates.delete(callId);
    throw toTransactionError(error);
  }
}

/**
 * Fetch a transaction previously submitted with the same transaction token.
 *
 * @param transactionToken - Transaction SDK token (X-Transaction-Token).
 * @param transactionId - The `transactionId` returned by {@link submitTransaction}.
 * @param options - Optional base URL override.
 * @returns A promise that resolves with the current transaction state.
 * @throws {DiditTransactionError} With `code` set to `invalid_token`,
 *   `expired_token`, `validation`, or `network`.
 */
export async function getTransaction(
  transactionToken: string,
  transactionId: string,
  options?: DiditTransactionOptions
): Promise<DiditTransactionResult> {
  try {
    const resultJson = await NativeSdkReactNative.getTransaction(
      transactionToken,
      transactionId,
      JSON.stringify({ baseUrl: options?.baseUrl })
    );
    return JSON.parse(resultJson) as DiditTransactionResult;
  } catch (error) {
    throw toTransactionError(error);
  }
}
