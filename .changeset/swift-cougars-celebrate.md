---
"@didit-protocol/sdk-react-native": minor
---

Bump native Didit SDKs and refresh the Expo example.

### Native dependencies

- Android native SDK `3.5.8 → 3.5.10` (`me.didit:didit-sdk` / `me.didit:didit-sdk-core`).
- iOS native SDK pin widened from `~> 3.5` to `~> 3.6`, resolving `DiditSDK 3.6.2` (Full and Core subspecs).

### Added

- New `mn` (Mongolian) localization on both Android and iOS (`SupportedLanguage.MONGOLIAN` / `SupportedLanguage.mongolian`).
- Programmatic dismissal hook from the iOS native SDK: `DiditSdk.shared.dismiss()` ends an active verification through the standard completion pipeline and fires `onComplete` with `.cancelled(session:)`.
- Device fingerprint headers attached to verification API calls on Android.
- Localized translations for special-case countries on Android.

### Changed

- Android header back arrow now matches `fe-didit-verification`: it is hidden when there is no real previous screen and no longer routes to the exit confirmation as a fallback (phone, email, and questionnaire flows).
- Android white-label fixes for country selectors, questionnaire inputs, and KYB chips so the rendered colors match `fe-didit-verification` (country list text, KYB chevrons, questionnaire placeholders, selected-country chip placeholders).
- Android questionnaire placeholders now fall back to the localized resource when the backend omits one (`SHORT_TEXT`, `EMAIL`, `LONG_TEXT`, `NUMBER`).
- iOS questionnaire whitelabel colors in checkbox, radio and dropdown now use panel / pillText (matches web `bc-panel` / `bc-pill-text`) instead of `button1` / `primary`.
- Expo example app (`example-expo`) now opts into the lighter no-NFC build via the config plugin (`iosNfcEnabled: false`, `androidNfcEnabled: false`) and the matching `diditSdkAndroidNfcEnabled=false` Gradle property, demonstrating the recommended setup for apps that do not need NFC passport reading.

### Fixed

- Android crash parsing questionnaires whose graph branches omit the optional `id` field.
- iOS `EXC_BAD_ACCESS` crash on iOS 13–17 (e.g. iPhone X on iOS 16) when tapping Continue on the start screen, caused by `swift_getExtendedFunctionTypeMetadata` (Swift 6.0+ runtime symbol). The 3.6.1 binary is now built with `SWIFT_APPROACHABLE_CONCURRENCY=NO` and explicit `-disable-upcoming-feature` flags so it links only the always-available `swift_getFunctionTypeMetadata0`.

### Migration

No JavaScript / TypeScript API changes. Existing apps pick up the new native SDKs automatically by reinstalling pods and Gradle dependencies:

```sh
yarn install
cd ios && bundle exec pod install
```

Apps that disable NFC must keep using `DIDIT_SDK_IOS_NFC_ENABLED=false` (iOS) and `diditSdkAndroidNfcEnabled=false` (Android) before reinstalling, exactly as documented in the README.
