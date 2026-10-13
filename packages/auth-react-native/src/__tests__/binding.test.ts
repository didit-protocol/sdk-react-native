import NativeDiditAuth from '../NativeDiditAuth';
import {
  createDiditAuth,
  DiditAuthError,
  type DiditSession,
  type DiditStepUpResult,
} from '../index';

jest.mock('../NativeDiditAuth', () => ({
  __esModule: true,
  default: {
    signIn: jest.fn(),
    signInWithPasskey: jest.fn(),
    registerPasskey: jest.fn(),
    currentSession: jest.fn(),
    getToken: jest.fn(),
    signOut: jest.fn(),
    stepUp: jest.fn(),
  },
}));

const native = NativeDiditAuth as unknown as Record<string, jest.Mock>;
const publishableKey = 'pk_test_key';
const redirectUri = 'https://app.example.com/didit/callback';
const auth = createDiditAuth({ publishableKey, redirectUri });

// The JSON native DiditAuth's bridge writes for a DiditSession.
const session: DiditSession = {
  userId: 'user-id',
  sessionId: 'session-id',
  applicationId: 'application-id',
  vendorData: null,
  email: 'person@example.com',
  emailVerified: true,
  phone: null,
  methods: ['password'],
  mfaVerified: false,
  verified: null,
  organizations: [{ id: 'organization-id', name: 'Example', role: 'member' }],
  expiresAt: '2026-11-12T08:36:53Z',
};

// Native's own codes, plus some of the API's that native passes through.
const codes = [
  'cancelled',
  'invalid_state',
  'not_signed_in',
  'passkey_cancelled',
  'passkey_unavailable',
  'browser_unavailable',
  'storage_unavailable',
  'rate_limited',
  'invalid_publishable_key',
  'invalid_redirect_uri',
  'network_error',
  'server_error',
  'invalid_grant',
  'reauthentication_required',
];

afterEach(() => jest.resetAllMocks());

describe('calls native DiditAuth with the application', () => {
  it.each([
    ['signIn', () => auth.signIn()],
    ['signInWithPasskey', () => auth.signInWithPasskey()],
  ] as const)('%s resolves with the native session', async (method, call) => {
    native[method]!.mockResolvedValue(JSON.stringify(session));

    await expect(call()).resolves.toEqual(session);
    expect(native[method]).toHaveBeenCalledWith(publishableKey, redirectUri);
  });

  it('registerPasskey resolves with the passkey id', async () => {
    native.registerPasskey!.mockResolvedValue('passkey-id');

    await expect(auth.registerPasskey()).resolves.toBe('passkey-id');
    expect(native.registerPasskey).toHaveBeenCalledWith(
      publishableKey,
      redirectUri
    );
  });

  it('currentSession uses the native cache unless forced', async () => {
    native.currentSession!.mockResolvedValue(JSON.stringify(session));

    await expect(auth.currentSession()).resolves.toEqual(session);
    await expect(auth.currentSession({ force: true })).resolves.toEqual(
      session
    );
    expect(native.currentSession!.mock.calls).toEqual([
      [publishableKey, redirectUri, false],
      [publishableKey, redirectUri, true],
    ]);
  });

  it('reports a signed-out person as null, not as an error', async () => {
    native.currentSession!.mockResolvedValue(null);
    native.getToken!.mockResolvedValue(null);

    await expect(auth.currentSession()).resolves.toBeNull();
    await expect(auth.getToken()).resolves.toBeNull();
  });

  it('getToken resolves with the native access token', async () => {
    native.getToken!.mockResolvedValue('access-token');

    await expect(auth.getToken()).resolves.toBe('access-token');
    expect(native.getToken).toHaveBeenCalledWith(publishableKey, redirectUri);
  });

  it('signOut resolves once native signed out', async () => {
    native.signOut!.mockResolvedValue(null);

    await expect(auth.signOut()).resolves.toBeUndefined();
    expect(native.signOut).toHaveBeenCalledWith(publishableKey, redirectUri);
  });
});

describe('step-ups', () => {
  const result: DiditStepUpResult = {
    id: 'step-up-id',
    status: 'approved',
    approved: true,
    rule: 'payout',
    method: 'liveness',
  };

  it.each([
    [
      { action: 'payout', amount: '900.00', currency: 'EUR' },
      ['payout', '900.00', 'EUR'],
    ],
    [{ action: 'payout', amount: '900.00' }, ['payout', '900.00', null]],
    [{ action: 'bank' }, ['bank', null, null]],
    [{ action: 'contact' }, ['contact', null, null]],
  ] as const)('passes %j to native', async (options, args) => {
    native.stepUp!.mockResolvedValue(JSON.stringify(result));

    await expect(auth.stepUp(options)).resolves.toEqual(result);
    expect(native.stepUp).toHaveBeenCalledWith(
      publishableKey,
      redirectUri,
      ...args
    );
  });

  it('returns what Didit recorded when no rule applies', async () => {
    const notRequired = {
      id: null,
      status: 'not_required',
      approved: true,
      rule: null,
      method: null,
    };
    native.stepUp!.mockResolvedValue(JSON.stringify(notRequired));

    await expect(auth.stepUp({ action: 'bank' })).resolves.toEqual(
      notRequired
    );
  });
});

describe('native errors', () => {
  it.each(codes)('surfaces %s unchanged', async (code) => {
    native.signIn!.mockRejectedValue(
      Object.assign(new Error(`${code} message`), { code, userInfo: null })
    );

    const error = await auth.signIn().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DiditAuthError);
    expect(error).toMatchObject({ code, message: `${code} message` });
  });

  it('keeps the status, fields and retry delay Didit sent', async () => {
    native.stepUp!.mockRejectedValue(
      Object.assign(new Error('Too many requests.'), {
        code: 'rate_limited',
        userInfo: {
          status: 429,
          retryAfter: 30,
          fields: { return_to: ['invalid_redirect_uri'] },
        },
      })
    );

    await expect(auth.stepUp({ action: 'bank' })).rejects.toMatchObject({
      code: 'rate_limited',
      message: 'Too many requests.',
      status: 429,
      retryAfter: 30,
      fields: { return_to: ['invalid_redirect_uri'] },
    });
  });

  it('ignores malformed native details instead of reporting wrong ones', async () => {
    native.getToken!.mockRejectedValue(
      Object.assign(new Error('Server error.'), {
        code: 'server_error',
        userInfo: { status: '500', fields: { email: 'invalid' } },
      })
    );

    const error = (await auth.getToken().catch((e: unknown) => e)) as
      | DiditAuthError
      | undefined;

    expect(error).toMatchObject({ code: 'server_error' });
    expect(error?.status).toBeUndefined();
    expect(error?.fields).toBeUndefined();
  });

  it('rethrows failures that carry no code as they are', async () => {
    const failure = new TypeError('Expected a string');
    native.signOut!.mockRejectedValue(failure);

    await expect(auth.signOut()).rejects.toBe(failure);
  });
});
