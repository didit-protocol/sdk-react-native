## 4.7.4

- Android: native active liveness now uses Didit Android SDK 4.7.3, which keeps
  the camera WebView visible while the web camera pipeline starts and avoids
  Android 16/API 36 preview starvation where `cameraReady` fired but no camera
  preview appeared.
- Android native SDK 4.7.2 -> 4.7.3. Fixes the "Try Again", "Scan the front" and "Scan Back" buttons doing nothing on the upload status sheets on physical Android devices (didit-protocol/sdk-android#8). The sheets' full-screen touch-blocking overlay consumed every pointer event, and Compose cancels a button's in-progress tap when an ancestor consumes a MOVE event - which a real finger tap always produces between DOWN and UP. Emulator mouse clicks have no MOVE in between, so the flow only broke on real hardware.
- iOS is unchanged and still pins native SDK 4.7.2.

## 4.7.3

- Native SDKs 4.7.2 on both platforms.
- Both platforms: a document or proof-of-address upload that never reached the server no longer leaves the flow spinning. An upload proven not to have been delivered is now reported as a failure with a retry, and the recovery poll that follows a genuinely ambiguous upload is bounded instead of running forever against a server the device cannot reach.
- Both platforms: per-step welcome copy overrides (`welcome.step.document`, `welcome.step.selfie`, `welcome.step.questionnaire`) now resolve against their own workflow step instead of always the first one.
- Android: fixes a crash on the completion screen as the result icon's animation settled (observed on Android 16).

## 4.7.2

- Expo plugin: the injected Didit Maven repository is now scoped with `content { includeGroup "me.didit" }`. Unfiltered, Gradle probed raw.githubusercontent.com for every dependency in the consumer build; a 429 rate limit then disabled the repository for the rest of the run and hard-failed unrelated dependencies (#40). Existing apps with a previously generated android/ directory should re-run `npx expo prebuild --clean` to pick up the filtered declaration.
- README: the manual Gradle snippet carries the same content filter.

## 4.7.1

- Native SDKs 4.7.1 on both platforms.
- iOS: fixes consumer builds failing with `no such module 'TensorFlowLite'` - the 4.7.0 `all` and `autodetection` binaries leaked an internal import into their Swift interface (didit-protocol/sdk-ios#9). The dependency is implementation-only again and the release pipeline now gates on the emitted interface.
- Android: process-death capture recovery no longer resurrects a dead flow, and its diagnostics are attributable.
- Both platforms: `welcome.title` copy overrides now apply on whitelabel apps.

## 4.7.0

- Native SDKs 4.7.0 on both platforms.
- iOS: document and face auto-capture now run on a leaner TFLite engine instead of MediaPipe. The `autodetection` and `all` variants are about 12 MB smaller to download and roughly 8.5 MB smaller inside the app, detection behavior was verified frame-for-frame identical on a physical-device matrix before release, and document inference is about 40% faster.
- iOS: auto-capture inference degrades gracefully through a runtime retry ladder; total engine failure still falls back to manual capture, never a crash.
- Android: the native SDK gained an optional `didit-sdk-autodetection-play` artifact that runs auto-capture on the Google Play services ML runtime (~43 MB smaller universal APK). This plugin's `androidVariant` options are unchanged in this release; wrapper-level opt-in support is planned as a follow-up.
- Both platforms: new session diagnostics (engine selection and inference latency) help support teams pinpoint device-specific capture issues.

## 4.6.0

- Native SDKs 4.6.0 on both platforms.
- Smaller SDK: every iOS variant is 7 to 8 MB smaller on device - build metadata and unused media are no longer embedded in the shipped frameworks.
- Android: WalletConnect wallet-signing now ships as the optional `me.didit:didit-sdk-wallet` artifact instead of being bundled in `didit-sdk-core`, shrinking every integration that does not use it. The full `didit-sdk` bundle (the `all` variant) is unchanged; without the new artifact, wallet-ownership flows complete in the browser instead.
- iOS: NFC chip-read failures now surface as localized errors in the scan sheet and are reported as session events for server-side visibility.
- Both platforms: support for application-scoped copy overrides.
- iOS: improved camera diagnostics during liveness capture.

## 4.5.4

- Native SDKs 4.5.4 on both platforms.
- Support for React Native 0.77 codegen.

## 4.5.3

- Android: fixed a hard crash of the host app right after passive-liveness selfie capture on high-megapixel cameras (reported on Samsung Galaxy S25 Ultra): captured face images are now capped at 4096px before processing and upload, and video segment recorder finalization is hardened so a codec failure can no longer take the process down.
- Android: if a capture ever does kill the app process, the SDK now detects it on the next launch and reports a `CAPTURE_PROCESS_DEATH` diagnostic event, making these crashes visible server-side instead of silent.
- Android: Hebrew localization now loads the complete translation set - previously large parts of the flow fell back to English.
- iOS: no source changes (rebuilt at 4.5.3 for version lockstep).

## 4.5.2

- Android: fixed a fatal `NoSuchMethodError` crash (`FlowLayoutKt.FlowRow`) in host apps that resolve Jetpack Compose 1.8+/1.9 - e.g. React Native 0.74+ projects - hit at the selfie upload sheet and in KYB screens (fixes #33). The SDK no longer uses experimental Compose layout APIs, so it is binary-compatible with any host Compose version from its 1.7 floor upward.
- iOS: no changes (rebuilt at 4.5.2 for version lockstep).

## 4.5.1

- Native SDKs 4.5.1 on both platforms: the white-label page background now fills the top and bottom safe areas on iOS (no more white letterboxing on custom dark themes, fixes #32), and the status bar / system bar icon style follows the theme background on both platforms, with a camera-screen override so icons stay readable over camera previews.

## 4.5.0

- Native SDKs 4.5.0 on both platforms
- The image-capture review screen now defaults to off, matching the backend, so a capture is no longer stranded behind a confirm step the workflow never enabled
- iOS: the front-camera document preview no longer shows mirrored when the camera session finishes configuring after the view is built
- Android: SMS OTP one-tap autofill, plus device and runtime integrity signals for injection-attack detection
- Both platforms: RTL layout and Arabic support
- Android: the native SDK now declares minSdk 23 on every module. That was always the real floor, set by Reown AppKit inside the native core
- All Didit SDKs now share the same version number

## 4.4.0

- iOS: the native SDK can now be resolved through Swift Package Manager instead of CocoaPods. Set `$DiditSdkIosLinkage = 'spm'` in your Podfile (or `DIDIT_SDK_IOS_LINKAGE=spm`, or `"iosLinkage": "spm"` in the Expo config plugin) and DiditSDK is fetched straight from the sdk-ios repository through SwiftPM - no `pod 'DiditSDK', :podspec => ...` line is needed at all. Requires React Native 0.75 or newer; CocoaPods remains the default, so existing projects are unaffected. When switching an existing project over, remove the old pod line or the framework is linked twice.
- Native SDKs unchanged: iOS and Android remain 4.3.1.

## 4.3.2

- Fix the Expo config plugin pinning the iOS podspec URL to 4.1.0 while the package required a matching newer DiditSDK, so `pod install` failed with a CocoaPods version conflict on every release from 4.2.0 onward. The native SDK version is now declared once, in `diditNativeSdkVersions` in `package.json`, and drives both the plugin's podspec URL and the podspec dependency - the two can no longer drift apart.
- New `iosPodspecUrl` plugin property for pointing CocoaPods at a fork, mirror, or prerelease podspec.

## 4.3.1

- Update native SDKs to 4.3.1 on both platforms: the face flow no longer resets to its intro screen when the upload response advances within the face family (FACE_MATCH / AGE_ESTIMATION); the flow now waits for the backend to settle and navigates once.

## 4.3.0

- Update native SDKs to 4.3.0 on both platforms: redesigned document/face upload status with a full-screen, theme-native view and an animated per-character "thinking" status line (localized), per-country document type ordering, KYB UBO/shareholder role hiding, un-mirrored front-camera preview, and capture/build fixes.
- iOS: the native dependency was still pinned to 4.1.0 in the 4.2.0 release, so iOS apps never received the 4.2.0 sandbox test-mode features; the pin now correctly tracks the native release (4.3.0).
- Android: the library now declares the JitPack repository alongside the Didit Maven repository, fixing resolution of the SDK's transitive wallet dependencies (Reown/WalletConnect, KEthereum).

## 4.2.0

- Update native Android SDK to 4.2.0: sandbox (test-mode) support - banner on every screen, bundled sample documents for ID/POA/Document AI uploads, scenario picker with Verified / Needs review / Declined outcomes, any-value guidance on email and phone steps.
- Note: the iOS native dependency remained pinned to 4.1.0 in this release by mistake; fixed in 4.3.0.

## 4.1.0

- Update native iOS SDK to 4.1.0.
- Update native Android SDK to 4.1.0.
- Native wallet-ownership verification flow and native transaction submission (`submitTransaction` / `getTransaction`) with required-action auto-launch (both platforms); Android also includes WalletConnect message signing.
- New document quality-check screen before upload, and the full-color Didit logo with SVG white-label support (both platforms).
- KYB company search now uses two separate fields — company name and registration number — instead of a single unified query (both platforms).
- Requests now send an `X-Didit-Device-Model` header used for backend IP-analysis / device identification (both platforms).
- Fixes: passive liveness no longer gets stuck after tapping Continue and records correctly on iPhone 17 (iOS); front-camera document images are no longer mirrored on upload; the backend loader no longer flickers on passive-liveness success; the KYB processing screen could stall and the colored logo rendered incorrectly on some devices (Android).
- No breaking changes to the public JS verification result shape.

## 4.0.9

- Update native iOS SDK to 4.0.9.
- Update native Android SDK to 4.0.9.
- Questionnaire: fields are now validated against their expected format before the step can be submitted, with a localized inline error message shown on invalid input (both platforms).
- Questionnaire: improved the inline validation error UI/UX for text, number, and text-area fields (both platforms).
- KYB key people: the person/company editor now shows company-appropriate labels and placeholders (company name, country of incorporation), and the key-people field definitions are parsed whether the backend returns them as strings or objects — preventing a deserialization crash (Android).
- Add internal front-camera orientation diagnostics (LOG telemetry) to investigate the iPhone 17 / Center Stage preview and recorded-video rotation — no user-facing change (iOS).
- No breaking changes to the public JS verification result shape.

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
