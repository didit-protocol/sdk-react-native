import { TurboModuleRegistry } from 'react-native';
import {
  createDiditAuth,
  DiditAuthError,
  DiditAuthUnavailableError,
} from '../index';

const auth = createDiditAuth({
  publishableKey: 'pk_test_key',
  redirectUri: 'https://app.example.com/didit/callback',
});

const operations = {
  signIn: () => auth.signIn(),
  signInWithPasskey: () => auth.signInWithPasskey(),
  registerPasskey: () => auth.registerPasskey(),
  currentSession: () => auth.currentSession(),
  getToken: () => auth.getToken(),
  signOut: () => auth.signOut(),
  stepUp: () => auth.stepUp({ action: 'bank' }),
};

describe('authentication without a linked native module', () => {
  it('can be imported and configured before the native application is rebuilt', () => {
    expect(TurboModuleRegistry.get('DiditAuthReactNative')).toBeNull();
    expect(Object.keys(operations)).toEqual(Object.keys(auth));
  });

  it.each(Object.entries(operations))(
    '%s rejects instead of returning a session or success',
    async (_, operation) => {
      await expect(operation()).rejects.toMatchObject({
        name: 'DiditAuthUnavailableError',
        code: 'ERR_DIDIT_AUTH_UNAVAILABLE',
        message: 'DiditAuth is unavailable in this build.',
      });
    }
  );

  it('reports unavailability as a DiditAuthError', async () => {
    await expect(auth.signIn()).rejects.toBeInstanceOf(
      DiditAuthUnavailableError
    );
    await expect(auth.signOut()).rejects.toBeInstanceOf(DiditAuthError);
    await expect(auth.getToken()).rejects.toBeInstanceOf(Error);
  });
});
