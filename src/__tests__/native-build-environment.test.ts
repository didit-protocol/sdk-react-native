import { execFileSync } from 'child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const root = join(__dirname, '..', '..');
const fixture = mkdtempSync(join(tmpdir(), 'native-build-environment-'));
const turbo = require.resolve('turbo/bin/turbo');
const sourcePath = '/native-source-fixture';
const probe = `console.log('NATIVE_BUILD_ENV=' + JSON.stringify({
  source: process.env.DIDIT_SDK_SOURCE_PATH,
  location: process.env.DIDIT_SDK_IOS_LOCATION_ENABLED,
  unrelated: process.env.UNRELATED_BUILD_SETTING,
}));`;

function writeJson(path: string, value: object) {
  writeFileSync(join(fixture, path), JSON.stringify(value));
}

beforeAll(() => {
  mkdirSync(join(fixture, 'app'));
  writeJson('package.json', {
    name: 'native-build-fixture',
    private: true,
    packageManager: 'npm@10.0.0',
    workspaces: ['app'],
  });
  writeJson('package-lock.json', { lockfileVersion: 3, packages: {} });
  writeJson('app/package.json', {
    name: 'native-build-app',
    scripts: {
      'build:ios': 'node check.cjs',
      'build:android': 'node check.cjs',
    },
  });
  writeFileSync(join(fixture, 'app/check.cjs'), probe);
  writeFileSync(
    join(fixture, 'turbo.json'),
    readFileSync(join(root, 'turbo.json'))
  );
  writeFileSync(join(fixture, '.gitignore'), '.turbo/\n');
});

afterAll(() => rmSync(fixture, { recursive: true, force: true }));

function runBuild(task: string, location: string, dry = false) {
  const args = [turbo, 'run', task, '--env-mode=strict', '--force'];

  return execFileSync(process.execPath, dry ? [...args, '--dry=json'] : args, {
    cwd: fixture,
    encoding: 'utf8',
    env: {
      ...process.env,
      DIDIT_SDK_SOURCE_PATH: sourcePath,
      DIDIT_SDK_IOS_LOCATION_ENABLED: location,
      UNRELATED_BUILD_SETTING: 'must-not-leak',
      TURBO_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

it.each(['false', 'true'])(
  'preserves the iOS Location flag (%s) and source checkout in strict mode',
  (location) => {
    const output = runBuild('build:ios', location);

    expect(output).toContain(
      `NATIVE_BUILD_ENV=${JSON.stringify({
        source: sourcePath,
        location,
      })}`
    );
  }
);

it('preserves the Android source checkout in strict mode', () => {
  const output = runBuild('build:android', 'false');

  expect(output).toContain(
    `NATIVE_BUILD_ENV=${JSON.stringify({
      source: sourcePath,
    })}`
  );
});

it('invalidates the iOS build cache when Location is toggled', () => {
  const disabled = JSON.parse(runBuild('build:ios', 'false', true));
  const enabled = JSON.parse(runBuild('build:ios', 'true', true));

  expect(disabled.tasks[0].hash).not.toBe(enabled.tasks[0].hash);
});
