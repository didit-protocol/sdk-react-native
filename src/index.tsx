import NativeSdkReactNative from './NativeSdkReactNative';
import type { VerificationResultJS } from './NativeSdkReactNative';
import { VerificationStatus } from './types';
import type { VerificationResult, DiditConfig, WorkflowOptions } from './types';

// Re-export all public types
export { VerificationStatus } from './types';
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
      }
    : null;

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
      }
    : null;

  const nativeContactDetails = options?.contactDetails
    ? {
        email: options.contactDetails.email,
        sendNotificationEmails: options.contactDetails.sendNotificationEmails,
        emailLang: options.contactDetails.emailLang,
        phone: options.contactDetails.phone,
      }
    : null;

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
    : null;

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
