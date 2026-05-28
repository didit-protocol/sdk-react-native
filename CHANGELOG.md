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
