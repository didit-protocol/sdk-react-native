// ─── Verification Status ─────────────────────────────────────────────────────

/**
 * The status of a completed verification session.
 */
export enum VerificationStatus {
  /** The user's identity was successfully verified. */
  Approved = 'Approved',
  /** The verification is still being reviewed. */
  Pending = 'Pending',
  /** The verification was declined. */
  Declined = 'Declined',
}

// ─── Verification Error ──────────────────────────────────────────────────────

/**
 * Error type identifiers returned by the native SDK.
 */
export type VerificationErrorType =
  | 'sessionExpired'
  | 'networkError'
  | 'cameraAccessDenied'
  | 'notInitialized'
  | 'apiError'
  | 'unknown';

/**
 * Describes an error that occurred during verification.
 */
export interface VerificationError {
  /** The category of error. */
  type: VerificationErrorType;
  /** A human-readable error message. */
  message: string;
}

// ─── Session Data ────────────────────────────────────────────────────────────

/**
 * Data about the verification session.
 */
export interface SessionData {
  /** The unique session identifier. */
  sessionId: string;
  /** The verification status. */
  status: VerificationStatus;
}

// ─── Verification Result (Discriminated Union) ──────────────────────────────

/**
 * Returned when the verification flow was completed (approved, pending, or declined).
 */
export interface VerificationCompleted {
  type: 'completed';
  session: SessionData;
}

/**
 * Returned when the user cancelled/dismissed the verification flow.
 */
export interface VerificationCancelled {
  type: 'cancelled';
  session?: SessionData;
}

/**
 * Returned when the verification failed due to an error.
 */
export interface VerificationFailed {
  type: 'failed';
  error: VerificationError;
  session?: SessionData;
}

/**
 * The result of a verification flow. Use the `type` field to discriminate.
 *
 * @example
 * ```ts
 * const result = await startVerification(token);
 * switch (result.type) {
 *   case 'completed':
 *     console.log('Session:', result.session.sessionId);
 *     console.log('Status:', result.session.status);
 *     break;
 *   case 'cancelled':
 *     console.log('User cancelled');
 *     break;
 *   case 'failed':
 *     console.log('Error:', result.error.message);
 *     break;
 * }
 * ```
 */
export type VerificationResult =
  | VerificationCompleted
  | VerificationCancelled
  | VerificationFailed;

// ─── Configuration Types ─────────────────────────────────────────────────────

/**
 * Configuration options for the Didit verification SDK.
 */
export interface DiditConfig {
  /**
   * ISO 639-1 language code for the SDK UI (e.g. "en", "fr", "ar", "es").
   * If not set, the SDK uses the device locale with English as fallback.
   */
  languageCode?: string;

  /**
   * Whether to skip the SDK's built-in intro screen.
   * Set to `true` if you want to show your own intro screen before starting verification.
   * Default: `false`.
   */
  customIntroScreen?: boolean;

  /**
   * Custom font family name to use throughout the SDK UI.
   * The font must be registered in your app's native configuration.
   * If not set, falls back to the system font.
   */
  fontFamily?: string;

  /**
   * Enable SDK debug logging.
   * Default: `false`.
   */
  loggingEnabled?: boolean;
}

/**
 * Contact details for automatic session creation.
 */
export interface ContactDetails {
  /** Email address for verification notifications. */
  email?: string;
  /** Whether to send notification emails to the user. */
  sendNotificationEmails?: boolean;
  /** Language for notification emails (ISO 639-1 code). */
  emailLang?: string;
  /** Phone number for phone verification step. */
  phone?: string;
}

/**
 * Expected identity details for session creation.
 * These are pre-filled values that the SDK will validate against.
 */
export interface ExpectedDetails {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  country?: string;
  address?: string;
  identificationNumber?: string;
  ipAddress?: string;
  portraitImage?: string;
}

/**
 * Options for starting a verification with a workflow ID.
 */
export interface WorkflowOptions {
  /** Vendor-specific data to attach to the session. */
  vendorData?: string;
  /** Additional metadata for the session. */
  metadata?: string;
  /** Contact details for the verification subject. */
  contactDetails?: ContactDetails;
  /** Expected identity details for validation. */
  expectedDetails?: ExpectedDetails;
  /** SDK configuration options. */
  config?: DiditConfig;
}
