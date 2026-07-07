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
  | 'retryBlocked'
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
 * Which physical camera lens to use for a capture step.
 */
export enum CameraLens {
  Front = 'front',
  Back = 'back',
}

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

  /**
   * Show close (X) button on verification step screens.
   * Default: `true`.
   */
  showCloseButton?: boolean;

  /**
   * Show confirmation dialog when user attempts to exit.
   * Default: `true`.
   */
  showExitConfirmation?: boolean;

  /**
   * Automatically dismiss verification UI when complete.
   * Default: `false`.
   */
  closeOnComplete?: boolean;

  /**
   * Lens used when first entering the document capture screen.
   * If omitted, the native SDK uses its default (back camera).
   */
  defaultDocumentCamera?: CameraLens;

  /**
   * Lens used when first entering the liveness (passive face) capture screen.
   * If omitted, the native SDK uses its default (front camera).
   */
  defaultLivenessCamera?: CameraLens;

  /**
   * Show the in-capture camera switcher on the document capture screen.
   * Set to `false` to lock the user to `defaultDocumentCamera`.
   * Default: `true`.
   */
  showDocumentCameraSwitchButton?: boolean;

  /**
   * Show the in-capture camera switcher on the liveness capture screen.
   * Set to `false` to lock the user to `defaultLivenessCamera`.
   * Default: `true`.
   */
  showLivenessCameraSwitchButton?: boolean;
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

// ─── Transactions ────────────────────────────────────────────────────────────

/**
 * Monetary or crypto details of a transaction.
 */
export interface DiditTransactionInfo {
  /** Transaction direction, e.g. "inbound" or "outbound". */
  direction?: string;
  amount?: number;
  /** Currency code, e.g. "USD" or "ETH". */
  currency?: string;
  /** Currency type, e.g. "fiat" or "crypto". */
  currencyType?: string;
  amountInDefaultCurrency?: number;
  defaultCurrencyCode?: string;
  paymentDetails?: string;
  paymentTxnId?: string;
  type?: string;
  /** Crypto transfer parameters, e.g. { address, chain }. */
  cryptoParams?: Record<string, unknown>;
}

/**
 * Payment method of a transaction participant.
 */
export interface DiditTransactionPaymentMethod {
  type?: string;
  /** Account identifier, e.g. an IBAN, card fingerprint, or wallet address. */
  accountId?: string;
  /** ISO 3166-1 alpha-2 issuing country. */
  issuingCountry?: string;
}

/**
 * A transaction participant (subject or counterparty).
 */
export interface DiditTransactionParticipant {
  /** Participant type, e.g. "individual" or "company". */
  type?: string;
  externalUserId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  /** Date of birth (ISO 8601 date). */
  dob?: string;
  address?: Record<string, unknown>;
  institutionInfo?: Record<string, unknown>;
  device?: Record<string, unknown>;
  paymentMethod?: DiditTransactionPaymentMethod;
}

/**
 * Travel rule information attached to a transaction.
 */
export interface DiditTravelRule {
  status?: string;
  protocol?: string;
  required?: boolean;
  obligationsCount?: number;
  originatorData?: Record<string, unknown>;
  beneficiaryData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * A transaction to submit from the device.
 * Mirrors the Didit transaction wire contract (camelCase aliases).
 */
export interface DiditTransaction {
  /** Your unique transaction identifier. */
  txnId: string;
  /** Transaction timestamp (ISO 8601). */
  txnDate?: string;
  /** Time zone identifier, e.g. "Europe/Madrid". */
  zoneId?: string;
  /** Transaction category, e.g. "crypto". */
  type?: string;
  info?: DiditTransactionInfo;
  subject?: DiditTransactionParticipant;
  counterparty?: DiditTransactionParticipant;
  /** Custom properties attached to the transaction. */
  props?: Record<string, unknown>;
  travelRule?: DiditTravelRule;
  includeCryptoScreening?: boolean;
}

/**
 * A user action required to complete the transaction.
 */
export interface DiditTransactionActionRequired {
  /** Action type: "verification_session" or "wallet_ownership". */
  type: string;
  /** Hosted URL to complete the action. */
  url?: string;
  sessionId?: string;
  sessionToken?: string;
  status?: string;
  widgetSessionId?: string;
  /** Expiry timestamp of the wallet-ownership widget session. */
  expiresAt?: string;
}

/**
 * The result of a submitted or fetched transaction.
 */
export interface DiditTransactionResult {
  transactionId: string;
  status?: string;
  travelRuleStatus?: string;
  actionRequired?: DiditTransactionActionRequired;
}

/**
 * Options for submitting or fetching a transaction.
 */
export interface DiditTransactionOptions {
  /** Override the verification API base URL. */
  baseUrl?: string;
  /**
   * Automatically launch any required user action (verification session
   * or wallet-ownership widget). Default: `true`.
   */
  autoLaunchAction?: boolean;
  /**
   * Called with the refreshed transaction after an auto-launched action
   * completes and the transaction status has been re-fetched.
   */
  onTransactionUpdated?: (result: DiditTransactionResult) => void;
}

/**
 * Error categories thrown by {@link submitTransaction} and {@link getTransaction}.
 */
export type DiditTransactionErrorCode =
  | 'invalid_token'
  | 'expired_token'
  | 'validation'
  | 'network';

/**
 * Typed error thrown by the transaction methods. Use the `code` field to
 * discriminate; `fieldErrors` carries per-field details for `validation`.
 */
export class DiditTransactionError extends Error {
  readonly code: DiditTransactionErrorCode;
  readonly fieldErrors?: Record<string, unknown>;

  constructor(
    code: DiditTransactionErrorCode,
    message: string,
    fieldErrors?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DiditTransactionError';
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
