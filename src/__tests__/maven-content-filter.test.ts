import { join } from 'path';

/**
 * The Expo plugin injects the Didit Maven repository into the consumer's
 * allprojects.repositories (build.gradle) and
 * dependencyResolutionManagement.repositories (settings.gradle). Without a
 * `content { includeGroup "me.didit" }` filter, Gradle probes
 * raw.githubusercontent.com for EVERY dependency in the build; the host
 * 429-rate-limits and Gradle disables the repository for the rest of the run,
 * hard-failing unrelated dependencies (issue #40). These tests pin the filter
 * into the generated declaration and the mods' idempotency.
 */

const repoRoot = join(__dirname, '..', '..');

const MAVEN_REPO =
  'https://raw.githubusercontent.com/didit-protocol/sdk-android/main/repository';

const PROJECT_BUILD_GRADLE = [
  'allprojects {',
  '    repositories {',
  '        google()',
  '        mavenCentral()',
  '    }',
  '}',
].join('\n');

const SETTINGS_GRADLE = [
  'dependencyResolutionManagement {',
  '    repositories {',
  '        google()',
  '        mavenCentral()',
  '    }',
  '}',
].join('\n');

async function runMod(
  modName: 'projectBuildGradle' | 'settingsGradle',
  contents: string
) {
  const withDiditSdk = require('../../app.plugin.js');
  const config = withDiditSdk({ name: 'test', slug: 'test' }, {});
  const mod = config.mods?.android?.[modName];
  expect(mod).toBeDefined();
  const result = await mod({
    ...config,
    modResults: { contents, language: 'groovy', path: '' },
    modRequest: {
      projectRoot: repoRoot,
      platformProjectRoot: repoRoot,
      modName,
      platform: 'android',
      introspect: true,
    },
  });
  return result.modResults.contents as string;
}

const expectFilteredRepo = (contents: string) => {
  expect(contents).toContain(MAVEN_REPO);
  // The declaration must carry the group filter, in the SAME maven block as
  // the URL, so no other group's lookups ever reach the rate-limited host.
  expect(contents).toMatch(
    new RegExp(
      'maven \\{\\s*\\n\\s*url "' +
        MAVEN_REPO.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') +
        '"\\s*\\n\\s*content \\{ includeGroup "me\\.didit" \\}\\s*\\n\\s*\\}'
    )
  );
};

describe('Didit Maven repository injection', () => {
  it('injects a me.didit-scoped repository into build.gradle', async () => {
    const out = await runMod('projectBuildGradle', PROJECT_BUILD_GRADLE);
    expectFilteredRepo(out);
  });

  it('injects a me.didit-scoped repository into settings.gradle', async () => {
    const out = await runMod('settingsGradle', SETTINGS_GRADLE);
    expectFilteredRepo(out);
  });

  it('does not duplicate the repository on a second run', async () => {
    const once = await runMod('projectBuildGradle', PROJECT_BUILD_GRADLE);
    const twice = await runMod('projectBuildGradle', once);
    expect(twice.match(new RegExp(MAVEN_REPO, 'g'))).toHaveLength(1);
  });
});
