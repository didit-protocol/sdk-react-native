import { TurboModuleRegistry } from 'react-native';
import {
  currentSession,
  DiditAuthUnavailableError,
  getToken,
  signIn,
  signOut,
  stepUp,
} from '../index';

const operations = [signIn, currentSession, getToken, signOut, stepUp];

describe('authentication without a linked native module', () => {
  it('can be imported before the native application is rebuilt', () => {
    expect(TurboModuleRegistry.get('DiditAuthReactNative')).toBeNull();
    expect(operations).toHaveLength(5);
  });

  it.each(operations)(
    '%p rejects instead of returning a session or success',
    async (operation) => {
      await expect(operation()).rejects.toMatchObject({
        name: 'DiditAuthUnavailableError',
        code: 'ERR_DIDIT_AUTH_UNAVAILABLE',
        message: 'DiditAuth is unavailable in this build.',
      });
    }
  );

  it('keeps concurrent and repeated calls unavailable', async () => {
    const results = await Promise.allSettled(
      [...operations, ...operations].map((operation) => operation())
    );

    expect(results.every((result) => result.status === 'rejected')).toBe(true);
  });

  it('uses an Error subclass for JavaScript failures', async () => {
    await expect(signIn()).rejects.toBeInstanceOf(DiditAuthUnavailableError);
    await expect(signOut()).rejects.toBeInstanceOf(Error);
  });
});
