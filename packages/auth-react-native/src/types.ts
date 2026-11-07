export interface DiditAuthOptions {
  /** The application's publishable key (`pk_live_...` or `pk_test_...`), from the Didit console. */
  publishableKey: string;
  /**
   * The HTTPS address registered as a redirect URI in the Didit console, and
   * an App Link (Android) and associated domain (iOS) of your app. Didit
   * accepts no custom URL schemes.
   */
  redirectUri: string;
}

export interface DiditOrganization {
  id: string;
  name: string;
  role: string;
}

/** The signed-in person, as Didit reports their session. */
export interface DiditSession {
  /** The person's Didit identity id (`sub`). */
  userId: string;
  sessionId: string;
  applicationId: string;
  /** Your id for the person: ties them to their verifications and transactions. */
  vendorData: string | null;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  /** How the session was created, for example ["password"] or ["passkey"]. */
  methods: string[];
  mfaVerified: boolean;
  /** The verified identity level and the claims your application selected, or null. */
  verified: Record<string, unknown> | null;
  organizations: DiditOrganization[];
  /** When the session ends (ISO 8601). */
  expiresAt: string;
}

/** A sensitive action your application's step-up rules can apply to. */
export type DiditStepUpOptions =
  /** A payout; `amount` is a decimal string such as "900.00", `currency` an ISO 4217 code. */
  | { action: 'payout'; amount: string; currency?: string }
  /** "bank": adding or changing a bank account. "contact": changing the email or phone. */
  | { action: 'bank' | 'contact' };

/**
 * What came of a step-up. Before acting, your backend reads the outcome itself
 * with `GET step-up/{id}/`: an app can be tampered with, Didit's record cannot.
 */
export interface DiditStepUpResult {
  /** The step-up's id; null when no rule asked for one. */
  id: string | null;
  /** "not_required", "approved", "pending", "review", "declined" or "expired". */
  status: string;
  /** The action may go ahead: no step-up was needed, or the person passed it. */
  approved: boolean;
  /** The rule that asked for it, for example "payout" or "device". */
  rule: string | null;
  /** "liveness", "selfie" or "full_id". */
  method: string | null;
}

export interface DiditAuth {
  /** Signs the person up or in on the application's hosted Didit page. */
  signIn(): Promise<DiditSession>;
  /** Signs the person in with a passkey of this device. */
  signInWithPasskey(): Promise<DiditSession>;
  /** Adds a passkey of this device to the signed-in person and returns its id. */
  registerPasskey(): Promise<string>;
  /**
   * The signed-in person, or null. Answers are reused for 30 seconds; pass
   * `force` before a decision that must see a revocation immediately.
   */
  currentSession(options?: { force?: boolean }): Promise<DiditSession | null>;
  /** A five-minute access token for your backend, renewed when needed; null when signed out. */
  getToken(): Promise<string | null>;
  /** Signs the person out on this device, and ends the session at Didit when it can be reached. */
  signOut(): Promise<void>;
  /** Runs the identity check a step-up rule asks for, and returns what Didit recorded. */
  stepUp(options: DiditStepUpOptions): Promise<DiditStepUpResult>;
}
