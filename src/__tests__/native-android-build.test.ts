import { spawnSync } from 'child_process';

jest.mock('child_process', () => ({
  spawnSync: jest.fn(() => ({ status: 0 })),
}));
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  writeFileSync: jest.fn(),
}));
jest.mock('../../native-sdk-source', () => ({
  resolveNativeSdkSource: jest.fn(() => '/native/android'),
  androidRepositoryPath: jest.fn(() => '/native-repository'),
}));

it('publishes every Didit module either package resolves from the source', () => {
  require('../../build-native-android');

  // The source repository is the only one Gradle reads for me.didit, so the
  // authentication package's didit-auth and didit-signals must be in it too.
  const [command, args] = (spawnSync as jest.Mock).mock.calls[0];
  expect(command).toBe('/native/android/gradlew');
  expect(args).toEqual(
    expect.arrayContaining(
      ['sdk', 'sdk-core', 'sdk-signals', 'sdk-auth'].map(
        (name) => `:${name}:publishReleasePublicationToLocalRepository`
      )
    )
  );
  expect(args).toContain('-PsdkRepoDir=/native-repository');
});
