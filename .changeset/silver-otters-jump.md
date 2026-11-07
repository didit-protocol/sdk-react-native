---
"@didit-protocol/sdk-react-native": patch
---

Fix iOS NFC plugin / podspec mismatch when `iosNfcEnabled: false` is set on the Expo config plugin.

Previously the plugin only injected `didit_sdk_ios_nfc_enabled` as a local Ruby variable inside the Podfile target, while `SdkReactNative.podspec` evaluated its own `ENV.fetch('DIDIT_SDK_IOS_NFC_ENABLED', 'true')`. With no environment variable set by `expo prebuild`, the wrapper podspec defaulted to the full `DiditSDK` (NFC) subspec even when the Podfile selected `DiditSDK/Core`, so apps configured with `iosNfcEnabled: false` still pulled the NFC build.

### Fixed

- `app.plugin.js` now writes `didit.iosNfcEnabled` into `ios/Podfile.properties.json` (the canonical Expo pattern, mirroring `expo-build-properties`) and uses `mergeContents` from `@expo/config-plugins/build/utils/generateCode` to inject the `pod 'DiditSDK', :podspec => '…'` declaration. The block is wrapped in `# @generated begin … sync-…` markers so repeated `expo prebuild` runs are idempotent and toggling `iosNfcEnabled` is rewritten in place — no more hand-rolled regex or marker stripping.
- `SdkReactNative.podspec` now reads `didit.iosNfcEnabled` from `ios/Podfile.properties.json` when `DIDIT_SDK_IOS_NFC_ENABLED` is not set in the environment. The podspec and the Podfile pod declaration always resolve to the same `DiditSDK` / `DiditSDK/Core` subspec.
- An explicit `DIDIT_SDK_IOS_NFC_ENABLED=...` set in the shell before `pod install` still wins for both pieces (kept for React Native CLI projects without the Expo plugin).

### Migration

No JavaScript / TypeScript API changes. Existing Expo apps just need to reinstall pods after upgrading:

```sh
yarn add @didit-protocol/sdk-react-native@latest
npx expo prebuild --platform ios --clean
cd ios && bundle exec pod install
```

The manual `DIDIT_SDK_IOS_NFC_ENABLED=false bundle exec pod install` workaround is no longer required for Expo projects that set `iosNfcEnabled: false` on the plugin; it remains the recommended override for React Native CLI projects without the plugin.
