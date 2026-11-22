import type { VerificationConfig } from './NativeSdkReactNative';
import type { DiditConfig } from './types';

/**
 * The Codegen struct of a `DiditConfig`.
 *
 * The native bridges parse these keys independently, so every key the public
 * type accepts must be listed here: `native-config-forwarding.test.ts` fails
 * when a bridge and this mapping drift apart. The object is always returned
 * (`{}` for no config) because the TurboModule struct is a required parameter.
 */
export function toNativeConfig(
  config?: DiditConfig | null
): VerificationConfig {
  if (!config) {
    return {};
  }
  return {
    languageCode: config.languageCode,
    showLanguageSelector: config.showLanguageSelector,
    fontFamily: config.fontFamily,
    loggingEnabled: config.loggingEnabled,
    showCloseButton: config.showCloseButton,
    showExitConfirmation: config.showExitConfirmation,
    closeOnComplete: config.closeOnComplete,
    defaultDocumentCamera: config.defaultDocumentCamera,
    defaultLivenessCamera: config.defaultLivenessCamera,
    showDocumentCameraSwitchButton: config.showDocumentCameraSwitchButton,
    showLivenessCameraSwitchButton: config.showLivenessCameraSwitchButton,
  };
}
