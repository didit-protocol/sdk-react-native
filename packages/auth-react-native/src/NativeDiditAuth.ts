import { TurboModuleRegistry, type TurboModule } from 'react-native';

/**
 * Unavailable-only seam, not the final native DiditAuth API.
 * Arguments and successful results require the reviewed native contract.
 */
export interface Spec extends TurboModule {
  signIn(): Promise<void>;
  currentSession(): Promise<void>;
  getToken(): Promise<void>;
  signOut(): Promise<void>;
  stepUp(): Promise<void>;
}

// Importing the package must also work before a native rebuild, or in Expo Go.
export default TurboModuleRegistry.get<Spec>('DiditAuthReactNative');
