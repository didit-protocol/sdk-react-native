import NativeDiditAuth, { type Spec } from './NativeDiditAuth';
import { DiditAuthUnavailableError, toDiditAuthError } from './errors';
import type {
  DiditAuth,
  DiditAuthOptions,
  DiditSession,
  DiditStepUpOptions,
  DiditStepUpResult,
} from './types';

export { DiditAuthError, DiditAuthUnavailableError } from './errors';
export type { DiditAuthErrorCode, DiditAuthErrorOptions } from './errors';
export type {
  DiditAuth,
  DiditAuthOptions,
  DiditOrganization,
  DiditSession,
  DiditStepUpOptions,
  DiditStepUpResult,
} from './types';

async function call<T>(operation: (native: Spec) => Promise<T>): Promise<T> {
  if (!NativeDiditAuth) throw new DiditAuthUnavailableError();
  try {
    return await operation(NativeDiditAuth);
  } catch (error) {
    throw toDiditAuthError(error);
  }
}

const parse = <T>(json: string): T => JSON.parse(json) as T;

/**
 * Didit Authentication for your app's end users, on native DiditAuth: the
 * hosted sign-in page with PKCE, passkeys, sessions in the Keychain or Android
 * Keystore, sign-out and step-ups. Create one per application and reuse it.
 */
export function createDiditAuth({
  publishableKey,
  redirectUri,
}: DiditAuthOptions): DiditAuth {
  return {
    signIn: () =>
      call(async (native) =>
        parse<DiditSession>(await native.signIn(publishableKey, redirectUri))
      ),
    signInWithPasskey: () =>
      call(async (native) =>
        parse<DiditSession>(
          await native.signInWithPasskey(publishableKey, redirectUri)
        )
      ),
    registerPasskey: () =>
      call((native) => native.registerPasskey(publishableKey, redirectUri)),
    currentSession: (options) =>
      call(async (native) => {
        const session = await native.currentSession(
          publishableKey,
          redirectUri,
          options?.force ?? false
        );

        return session === null ? null : parse<DiditSession>(session);
      }),
    getToken: () =>
      call((native) => native.getToken(publishableKey, redirectUri)),
    signOut: () =>
      call(async (native) => {
        await native.signOut(publishableKey, redirectUri);
      }),
    stepUp: (options: DiditStepUpOptions) =>
      call(async (native) => {
        const payout = options.action === 'payout' ? options : undefined;
        const result = await native.stepUp(
          publishableKey,
          redirectUri,
          options.action,
          payout?.amount ?? null,
          payout?.currency ?? null
        );

        return parse<DiditStepUpResult>(result);
      }),
  };
}
