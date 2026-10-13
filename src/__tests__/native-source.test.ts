import { execFileSync } from 'child_process';
import { readFileSync, realpathSync } from 'fs';

jest.mock('child_process', () => ({ execFileSync: jest.fn() }));
jest.mock('fs', () => ({
  realpathSync: jest.fn((path) => path),
  readFileSync: jest.fn(),
}));

const { diditNativeSdkVersions } = require('../../package.json');
const {
  resolveNativeSdkSource,
  resolveAndroidRepository,
} = require('../../native-sdk-source');
const git = execFileSync as jest.Mock;
const originalPath = process.env.DIDIT_SDK_SOURCE_PATH;

afterEach(() => {
  if (originalPath === undefined) delete process.env.DIDIT_SDK_SOURCE_PATH;
  else process.env.DIDIT_SDK_SOURCE_PATH = originalPath;
  jest.clearAllMocks();
});

it('requires an immutable revision for the integration branch', () => {
  expect(diditNativeSdkVersions.source.branch).toBe('integration/console-v2');
  expect(diditNativeSdkVersions.source.revision).toMatch(/^[a-f0-9]{40}$/);
});

it('fails instead of falling back to released binaries without a checkout', () => {
  delete process.env.DIDIT_SDK_SOURCE_PATH;

  expect(() => resolveNativeSdkSource('ios')).toThrow('DIDIT_SDK_SOURCE_PATH');
  expect(git).not.toHaveBeenCalled();
});

it('rejects a checkout at a different revision', () => {
  process.env.DIDIT_SDK_SOURCE_PATH = '/native';
  git.mockReturnValueOnce('different-revision');

  expect(() => resolveNativeSdkSource('android')).toThrow('must match');
  expect(realpathSync).not.toHaveBeenCalled();
});

it('rejects tracked edits to the pinned source', () => {
  process.env.DIDIT_SDK_SOURCE_PATH = '/native';
  git.mockReturnValueOnce(diditNativeSdkVersions.source.revision);
  git.mockReturnValueOnce(' M sdk-source');

  expect(() => resolveNativeSdkSource('ios')).toThrow('local changes');
});

it.each([
  ['ios', '/native/ios/sdk'],
  ['android', '/native/android'],
])(
  'resolves the %s project from the same verified checkout',
  (platform, path) => {
    process.env.DIDIT_SDK_SOURCE_PATH = '/native';
    git.mockReturnValueOnce(diditNativeSdkVersions.source.revision);
    git.mockReturnValueOnce('');

    expect(resolveNativeSdkSource(platform)).toBe(path);
    expect(git.mock.calls[0][1]).toEqual([
      '-C',
      '/native',
      'rev-parse',
      'HEAD',
    ]);
  }
);

it('rejects local artifacts built from another revision', () => {
  process.env.DIDIT_SDK_SOURCE_PATH = '/native';
  git
    .mockReturnValueOnce(diditNativeSdkVersions.source.revision)
    .mockReturnValueOnce('');
  (readFileSync as jest.Mock).mockReturnValueOnce(
    JSON.stringify({ revision: 'different' })
  );

  expect(() => resolveAndroidRepository()).toThrow('yarn native:android');
});

it('selects only the local repository built from the pin', () => {
  process.env.DIDIT_SDK_SOURCE_PATH = '/native';
  git
    .mockReturnValueOnce(diditNativeSdkVersions.source.revision)
    .mockReturnValueOnce('');
  (readFileSync as jest.Mock).mockReturnValueOnce(
    JSON.stringify(diditNativeSdkVersions.source)
  );

  expect(resolveAndroidRepository()).toContain(
    `.native-sdk/${diditNativeSdkVersions.source.revision}/maven`
  );
});
