## 4.0.8

- Update native iOS SDK to 4.0.8.
- Update native Android SDK to 4.0.8.
- Add the Document AI verification step — prompts the user to upload the requested document(s) for AI-based data extraction, localized across all supported languages (both platforms).
- KYB: the document-upload step now lists the fields the uploaded document must clearly show (company name, type, incorporation date, jurisdiction of registration, registered address), and the key-people ownership percentage is now optional unless the session marks it required (both platforms).
- Fix passive-liveness video recorded horizontally stretched on iPhone 17 / 17 Pro / 17 Pro Max — the new Center Stage front sensor is now pinned to a portrait orientation (iOS).
- Fix the active-liveness face intro screen briefly appearing behind the processing overlay when the liveness step finishes (iOS).
- Correct the success and failure status texts shown after a face (liveness) upload (iOS).
- Hide the document detection corner guides when auto-detection isn't bundled (Core/NFC variants) or fails to load — only the static document frame guide remains (both platforms).
- Fix a KYB company-select crash when the registry returns accounts/industries as an object/string instead of an array (Android).
- No breaking changes to the public JS verification result shape.

## 4.0.6

- Update native iOS SDK to 4.0.6.
- Update native Android SDK to 4.0.6.
- iOS: fix the App Store privacy-manifest rejection ITMS-91061 (and the sibling signature check ITMS-91065) for `OpenSSL.framework` — the native SDK now resolves OpenSSL-Universal 3.3.3001, which ships its own `PrivacyInfo.xcprivacy` and code signature; the NFC dependency `NFCPassportReader` was bumped 2.1.2 → 2.3.0 and verified end-to-end against a real chip read. No JS API or runtime change.
- Android: add PACE (Password Authenticated Connection Establishment) support for NFC passport / ID chip reading.
- KYB on both platforms: new company card, key-people and associated-parties screens, with key-people reuse across steps.
- KYB on both platforms: a country-style US state selector in company search and confirmation (Android replaces the old state dropdown; iOS adds the selector), white-labeled company country/state search inputs with a region label, and an editable company country in the confirmation view.
- KYB on both platforms: key-people data is now prefilled/preserved when the preceding step is backend-only, and email is no longer required for a key person when KYC isn't required for them.
- KYB fixes: company selection failing to advance on partial registry data (both platforms), company-search auto-detection (Android), and accepted-country resolution for alpha-2 codes (Android).
- Fix the backend-processing loader getting stuck on the AML screening step (both platforms).
- Fix country/region display issues: some countries showed their alpha-3 code instead of the country name (both platforms); the flag not updating when changing the selected country (iOS); dropdown chevron visibility in KYB and document country inputs (Android).
- White-label / UI fixes: incorporation date-picker colors and KYB company input caret color (Android); document back-scan preview rotation, country/state picker search-icon visibility, start-screen feature icons aligned with Android & web, phone country picker aligned with the KYB selector, and KYB button spacing/separator cleanup (iOS).
- Add Russian ID & passport document-override translations, plus a general translations refresh, on both platforms.
- iOS (React Native): fix the verification UI opening twice and a promise double-resolve crash when reopening verification.
- No breaking changes to the public JS verification result shape.

## 4.0.5

- Update native iOS SDK to 4.0.5.
- Update native Android SDK to 4.0.5 (Android moves directly from 4.0.3 to 4.0.5 to stay in lockstep with iOS).
- iOS: fix App Store rejection ITMS-90338 — the bundled native libraries (MediaPipe's RE2 / ICU / TensorFlow Lite) are no longer exported in the framework's dyld export trie, so App Store / TestFlight uploads of apps embedding the SDK are no longer flagged for the `re2::*` private-symbol collision. No JS API or runtime change.
- Align every input and selector to the white-label theme on both platforms (text fields, OTP, dropdowns, country/phone pickers, questionnaire fields); unselected radio buttons now use the selected color at reduced opacity so they stay visible on every theme.
- Align the KYB screens to the white-label theme on both platforms: documents upload view, key-people cards and editor, the awaiting-users view, and company search/results — including status badges, low-contrast text/icons, and the "enter company data manually" link color.
- Fix passive liveness on both platforms: Android no longer shows a frozen preview after capture (the camera restarts correctly on retry), iOS no longer occasionally exceeds the backend upload size limit, and face-image compression now matches the web frontend.
- Android: fix the KYB accepted-countries list disappearing when navigating back to the company search.
- Add Algeria-specific NFC intro videos (`DZA`) for ID and passport on both platforms; the instructional video is now resolved from the document's detected country.
- iOS: suppress the camera shutter sound on still capture (iOS 18+, where allowed) and fix a stretched / rotated front-camera preview on newer devices.
- No breaking changes to the public JS verification result shape.

## 4.0.4

- Update native iOS SDK to 4.0.4.
- iOS: improve the post-active-liveness loader — the liveness WebView is dismissed immediately on success and the native processing/success sheet is shown over an opaque background, then cross-fades into the next step, removing the residual blank/flash between active liveness and the next step.
- Android SDK unchanged at 4.0.3.
- No breaking changes to the public JS verification result shape.

## 4.0.2

- Update native Android SDK to 4.0.3.
- Update native iOS SDK to 4.0.3.
- Pin both native SDKs to an exact `4.0.3` version: the iOS dependency was previously `~> 4.0`, and the iOS podspec source (README, example Podfiles, and the Expo config plugin) is now tag-pinned to `4.0.3`, so every install resolves the same tested native SDKs.
- Add a native active-liveness backend-processing loader shown after the liveness step while the session finishes processing on the backend, with rotating localized status messages and a smooth transition into the next step.
- Add native `Social Security Card` (`SSC`) OCR document type support so document selectors on both platforms match the web frontend's full document list.
- Fix front-camera document capture being saved mirrored: the captured/uploaded document image is now un-mirrored on the front lens, while the live preview and selfie/liveness capture stay mirrored as before.
- Add proper retry error messaging for liveness and face-match failures, translated across all supported locales.
- iOS: fix an active-liveness failure that could occur when the network connection (Wi-Fi) dropped during the liveness WebView flow.
- iOS: remove the unused Location usage — you can drop `NSLocationWhenInUseUsageDescription` from your app's `Info.plist`.
- Android: KYB document upload now only requests the required document subtypes.
- Android: stop emitting a false worker-service failure log event (auto-detection not bundled, or API < 24, are no longer reported as errors).
- Emit a Tier-B device-class `composite_hash` device fingerprint for parity with the web SDK and the backend device-identification contract.
- No breaking changes to the public JS verification result shape.

## 4.0.1

- Update native Android SDK to 4.0.2.
- Update native iOS SDK to 4.0.2.
- Add native SDK variant selection on both platforms: `all`, `core`, `autodetection`, and `nfc`.
- Keep `all` as the default full SDK variant while allowing apps to remove NFC and/or MediaPipe auto-detection dependencies.
- Add explicit Expo config plugin options `iosVariant` and `androidVariant`, with backwards-compatible support for the legacy `iosNfcEnabled`, `iosAutoDetectionEnabled`, and `androidNfcEnabled` options.
- Switch iOS variant selection to the stable `$DiditSdkIosVariant` Ruby global so the selected subspec survives every CocoaPods install.
- Add public `CameraLens` enum (`front` / `back`) and four new `DiditConfig` camera options:
  - `defaultDocumentCamera`
  - `defaultLivenessCamera`
  - `showDocumentCameraSwitchButton`
  - `showLivenessCameraSwitchButton`
- Preserve and bridge the existing close-behavior options: `showCloseButton`, `showExitConfirmation`, and `closeOnComplete`.
- Add native `Tax Card` (`TC`) OCR document type support through the native SDKs, including the India PAN Card country override and `expected_document_types` filtering.
- Fix iOS selected-country and selected-document upload badges to use the white-label `bc-pill-text` token.
- Fix the iOS manual capture button disappearing after switching the camera mid-session on document and liveness capture screens.
- No breaking changes to the public JS verification result shape.
