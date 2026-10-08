const withDiditSdk = require('../../app.plugin.js');

async function podfile(props: object = {}, contents = "target 'App' do\n  use_expo_modules!\nend") {
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

it('uses the verified source for both the selected variant and Location', async () => {
  const contents = await podfile({ iosLocationEnabled: true });

  expect(contents).toContain('$DiditSdkIosLocationEnabled = true');
  expect(contents).toContain('native-sdk-source');
  expect(contents).toContain('pod didit_sdk_subspec, :path => didit_source_path');
  expect(contents).toContain("pod 'DiditSDK/Location', :path => didit_source_path");
  expect(contents).not.toContain(':podspec');
});

it('updates the Location opt-in without duplicating the generated block', async () => {
  const enabled = await podfile({ iosLocationEnabled: true });
  const disabled = await podfile({ iosLocationEnabled: false }, enabled);

  expect(disabled).toBe(await podfile({ iosLocationEnabled: false }, disabled));
  expect(disabled).not.toContain('$DiditSdkIosLocationEnabled = true');
  expect(disabled.match(/pod 'DiditSDK\/Location'/g)).toHaveLength(1);
});

it('rejects SPM instead of omitting the native Location module', async () => {
  await expect(podfile({ iosLocationEnabled: true, iosLinkage: 'spm' })).rejects.toThrow('cocoapods');
});

it('adds the Android source settings once across prebuilds', async () => {
  const config = withDiditSdk({ name: 'test', slug: 'test' });
  const request = { ...config, modResults: { contents: '' }, modRequest: { introspect: true } };
  const first = await config.mods.android.settingsGradle(request);
  const second = await config.mods.android.settingsGradle(first);

  expect(second.modResults.contents.match(/android\/native-source.gradle/g)).toHaveLength(1);
});
