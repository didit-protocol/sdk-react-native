import { TurboModuleRegistry, type TurboModule } from 'react-native';

/**
 * Configuration for the Didit verification SDK.
 * All types must be plain objects for React Native Codegen compatibility.
 */
export type VerificationConfig = {
  /** ISO 639-1 language code (e.g. "en", "fr", "ar"). Maps to SupportedLanguage on native. */
  languageCode?: string;
  /** Whether to use a custom intro screen (skips SDK built-in intro). Default: false. */
  customIntroScreen?: boolean;
  /** Custom font family name. Must be registered by the host app. */
  fontFamily?: string;
  /** Enable SDK logging for debugging. Default: false. */
  loggingEnabled?: boolean;
};

/**
 * Contact details for session creation.
 */
export type ContactDetails = {
  email?: string;
  sendNotificationEmails?: boolean;
  emailLang?: string;
  phone?: string;
};

/**
 * Expected identity details for session creation.
 */
export type ExpectedDetails = {
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
};

/**
 * Raw verification result returned from native side.
 * The public TypeScript API maps this to a strongly-typed discriminated union.
 */
export type VerificationResultJS = {
  /** The result type: "completed", "cancelled", or "failed" */
  type: string;
  /** The session identifier (if available) */
  sessionId?: string;
  /** The verification status: "Approved", "Pending", or "Declined" */
  status?: string;
  /** The error type identifier (e.g. "sessionExpired", "networkError") */
  errorType?: string;
  /** Human-readable error message */
  errorMessage?: string;
};

/**
 * TurboModule specification for the Didit SDK native module.
 * This is the Codegen input that generates native interfaces on both platforms.
 */
export interface Spec extends TurboModule {
  /**
   * Start verification with an existing session token.
   * Launches the native verification UI and returns the result when complete.
   */
  startVerification(
    token: string,
    config: VerificationConfig | null
  ): Promise<VerificationResultJS>;

  /**
   * Start verification by creating a new session with a workflow ID.
   * Creates the session on the backend, then launches the native verification UI.
   */
  startVerificationWithWorkflow(
    workflowId: string,
    vendorData: string | null,
    metadata: string | null,
    contactDetails: ContactDetails | null,
    expectedDetails: ExpectedDetails | null,
    config: VerificationConfig | null
  ): Promise<VerificationResultJS>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('SdkReactNative');
