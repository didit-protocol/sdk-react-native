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
