const { execFileSync } = require('child_process');
const { readFileSync, realpathSync } = require('fs');
const { join } = require('path');
const { diditNativeSdkVersions } = require('./package.json');

function git(sourcePath, args) {
  return execFileSync('git', ['-C', sourcePath, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function verifySource(sourcePath, pin) {
  if (git(sourcePath, ['rev-parse', 'HEAD']) !== pin.revision) {
    throw new Error(
      `Didit native source must match ${pin.branch} at ${pin.revision}.`
    );
  }
  if (git(sourcePath, ['status', '--porcelain', '--untracked-files=no'])) {
    throw new Error(
      'Didit native source has tracked changes; use the pinned checkout.'
    );
  }
}

function resolveNativeSdkSource(platform) {
  const pin = diditNativeSdkVersions.source;
  const sourcePath = process.env.DIDIT_SDK_SOURCE_PATH;

  if (!pin) return '';
  if (!sourcePath) {
    throw new Error(
      'Set DIDIT_SDK_SOURCE_PATH to the pinned native source checkout. Released binaries cannot provide these steps.'
    );
  }
  verifySource(sourcePath, pin);

  return realpathSync(
    join(sourcePath, platform === 'ios' ? 'ios/sdk' : 'android')
  );
}

function androidRepositoryPath() {
  return join(__dirname, '.native-sdk', diditNativeSdkVersions.source.revision, 'maven');
}

function resolveAndroidRepository() {
  const repository = diditNativeSdkVersions.source ? androidRepositoryPath() : '';

  if (!repository) return '';
  resolveNativeSdkSource('android');
  const marker = JSON.parse(readFileSync(join(repository, 'source.json'), 'utf8'));

  if (marker.revision !== diditNativeSdkVersions.source.revision) {
    throw new Error('Native Android artifacts do not match the pin. Run yarn native:android.');
  }

  return repository;
}

module.exports = { resolveNativeSdkSource, resolveAndroidRepository, androidRepositoryPath };

if (require.main === module) {
  process.stdout.write(process.argv[2] === 'android-repository'
    ? resolveAndroidRepository() : resolveNativeSdkSource(process.argv[2]));
}
