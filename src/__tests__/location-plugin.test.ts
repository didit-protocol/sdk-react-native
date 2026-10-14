export {};

const withDiditSdk = require('../../app.plugin.js');

async function podfile(
  props: object = {},
  contents = "target 'App' do\n  use_expo_modules!\nend"
) {
  const config = withDiditSdk({ name: 'test', slug: 'test' }, props);
  const result = await config.mods.ios.podfile({
    ...config,
    modResults: { contents },
    modRequest: { introspect: true },
  });

  return result.modResults.contents;
}

it('keeps Location opt-in even with the all variant', async () => {
  expect(await podfile()).toContain('$DiditSdkIosLocationEnabled = false');
});

const SOURCE_PIN = { branch: 'dev', revision: 'a'.repeat(40) };

async function podfileWithSource(props: object) {
  jest.resetModules();
  jest.doMock('../../package.json', () => ({
    ...jest.requireActual('../../package.json'),
    diditNativeSdkVersions: {
      ...jest.requireActual('../../package.json').diditNativeSdkVersions,
      source: SOURCE_PIN,
    },
  }));
  const plugin = require('../../app.plugin.js');
  const config = plugin({ name: 'test', slug: 'test' }, props);
  const result = await config.mods.ios.podfile({
    ...config,
    modResults: { contents: "target 'App' do\n  use_expo_modules!\nend" },
    modRequest: { introspect: true },
  });
  jest.dontMock('../../package.json');

  return result.modResults.contents as string;
}

it('declares one released pod line with the mapped Location subspec', async () => {
  const contents = await podfile({ iosLocationEnabled: true });

  expect(contents).toContain('$DiditSdkIosLocationEnabled = true');
  expect(contents).toContain('"DiditSDK/All#{didit_sdk_location_suffix}"');
  expect(contents).toContain("'DiditSDK/Core-Location'");
  expect(contents).toContain('"DiditSDK/NFC#{didit_sdk_location_suffix}"');
  expect(contents.match(/^\s*pod /gm)).toHaveLength(1);
  expect(contents).toContain(`pod didit_sdk_subspec, :podspec => '`);
  expect(contents).not.toContain("pod 'DiditSDK/Location'");
  expect(contents).not.toContain('native-sdk-source');
});

it('declares one source pod line with the mapped Location subspec', async () => {
  const contents = await podfileWithSource({ iosLocationEnabled: true });

  expect(contents).toContain('native-sdk-source');
  expect(contents.match(/^\s*pod /gm)).toHaveLength(1);
  expect(contents).toContain(
    'pod didit_sdk_subspec, :path => didit_source_path'
  );
  expect(contents).not.toContain(':podspec');
  expect(contents).not.toContain('DiditSDK/Location');
});

it('updates the Location opt-in without duplicating the generated block', async () => {
  const enabled = await podfile({ iosLocationEnabled: true });
  const disabled = await podfile({ iosLocationEnabled: false }, enabled);

  expect(disabled).toBe(await podfile({ iosLocationEnabled: false }, disabled));
  expect(disabled).not.toContain('$DiditSdkIosLocationEnabled = true');
  expect(disabled.match(/pod didit_sdk_subspec/g)).toHaveLength(1);
});

it('allows SPM linkage with Location and declares no pod line', async () => {
  const contents = await podfile({
    iosLocationEnabled: true,
    iosLinkage: 'spm',
  });

  expect(contents).toContain('$DiditSdkIosLocationEnabled = true');
  expect(contents).not.toContain('pod didit_sdk_subspec');
});

it('rejects SPM with a native source pin', async () => {
  await expect(podfileWithSource({ iosLinkage: 'spm' })).rejects.toThrow(
    'cocoapods'
  );
});

it('adds the Android source settings once across prebuilds', async () => {
  const config = withDiditSdk({ name: 'test', slug: 'test' });
  const request = {
    ...config,
    modResults: { contents: '' },
    modRequest: { introspect: true },
  };
  const first = await config.mods.android.settingsGradle(request);
  const second = await config.mods.android.settingsGradle(first);

  expect(
    second.modResults.contents.match(/android\/native-source.gradle/g)
  ).toHaveLength(1);
});
