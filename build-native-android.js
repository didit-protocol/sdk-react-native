const { spawnSync } = require('child_process');
const { mkdirSync, rmSync, writeFileSync } = require('fs');
const { join } = require('path');
const {
  resolveNativeSdkSource,
  androidRepositoryPath,
} = require('./native-sdk-source');
const { diditNativeSdkVersions } = require('./package.json');
const nativePath = resolveNativeSdkSource('android');

if (!nativePath) throw new Error('No native source pin is configured.');

const repository = androidRepositoryPath();
const marker = join(repository, 'source.json');
const modules = [
  'sdk',
  'sdk-core',
  'sdk-autodetection',
  'sdk-nfc',
  'sdk-wallet',
];
const args = [
  ...modules.map(
    (name) => `:${name}:publishReleasePublicationToLocalRepository`
  ),
  `-PsdkRepoDir=${repository}`,
  '--no-daemon',
  '--console=plain',
  '--max-workers=2',
];

function publish() {
  const result = spawnSync(join(nativePath, 'gradlew'), args, {
    cwd: nativePath,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

mkdirSync(repository, { recursive: true });
rmSync(marker, { force: true });

publish();
resolveNativeSdkSource('android');
writeFileSync(
  marker,
  JSON.stringify({ revision: diditNativeSdkVersions.source.revision }) + '\n'
);
