import { TurboModuleRegistry, type TurboModule } from 'react-native';

/**
 * TurboModule specification for native DiditAuth (`me.didit:didit-auth` on
 * Android, `DiditSDK/Auth` on iOS). Every method names the application with its
 * publishable key and redirect URI; native keeps one DiditAuth per pair.
 * Sessions and step-up results cross the bridge as JSON strings.
 */
export interface Spec extends TurboModule {
  signIn(publishableKey: string, redirectUri: string): Promise<string>;
  signInWithPasskey(publishableKey: string, redirectUri: string): Promise<string>;
  /** Resolves with the new passkey's id. */
  registerPasskey(publishableKey: string, redirectUri: string): Promise<string>;
  /** Resolves with null when nobody is signed in. */
  currentSession(
    publishableKey: string,
    redirectUri: string,
    force: boolean
  ): Promise<string | null>;
  /** Resolves with null when nobody is signed in. */
  getToken(publishableKey: string, redirectUri: string): Promise<string | null>;
  signOut(publishableKey: string, redirectUri: string): Promise<void>;
  /** `action` is "payout", "bank" or "contact"; amount and currency apply to payouts. */
  stepUp(
    publishableKey: string,
    redirectUri: string,
    action: string,
    amount: string | null,
    currency: string | null
  ): Promise<string>;
}

// Importing the package must also work before a native rebuild, or in Expo Go.
export default TurboModuleRegistry.get<Spec>('DiditAuthReactNative');
