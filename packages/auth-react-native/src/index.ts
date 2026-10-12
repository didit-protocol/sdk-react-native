import NativeDiditAuth, { type Spec } from './NativeDiditAuth';
import { DiditAuthUnavailableError } from './errors';

export { DiditAuthUnavailableError } from './errors';

async function unavailable(method: keyof Spec): Promise<never> {
  if (NativeDiditAuth) {
    await NativeDiditAuth[method]();
  }

  // Never interpret an absent or mismatched native implementation as success.
  throw new DiditAuthUnavailableError();
}

/** Reserved for native hosted sign-in. Always rejects in this build. */
export function signIn(): Promise<never> {
  return unavailable('signIn');
}

/** Unavailability is a failure, not a signed-out session. */
export function currentSession(): Promise<never> {
  return unavailable('currentSession');
}

/** Reserved for native token retrieval/refresh. Always rejects in this build. */
export function getToken(): Promise<never> {
  return unavailable('getToken');
}

/** Unavailability must not be reported as a successful logout. */
export function signOut(): Promise<never> {
  return unavailable('signOut');
}

/** Reserved for native step-up authentication. Always rejects in this build. */
export function stepUp(): Promise<never> {
  return unavailable('stepUp');
}
