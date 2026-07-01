# DiditSDK for React Native

A React Native wrapper for the Didit Identity Verification SDK. Supports both iOS and Android with a unified TypeScript API built on React Native's New Architecture (TurboModules).

## Requirements

- React Native 0.76+ (New Architecture / TurboModules)
- Node.js 20+
- TypeScript 5+

### Platform Requirements

| Platform | Minimum Version | Notes |
|----------|----------------|-------|
| iOS | 13.0+ | NFC passport reading requires iOS 15.0+ |
| Android | API 24+ (7.0) | Kotlin 1.9+, Java 17+ |

## Permissions

The SDK uses the camera, location, and optionally NFC on both platforms. Native permissions are declared by the underlying native SDKs and merged automatically where the platform supports it.

### iOS

Add the following keys to your app's `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required to scan your identity documents for verification.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access is required to record video for liveness verification.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Photo library access is required to upload document images.</string>
<key>NFCReaderUsageDescription</key>
<string>NFC is used to read passport chip data for identity verification.</string>
```

Missing required iOS privacy keys will cause iOS to terminate the app as soon as the SDK accesses that protected resource.

#### NFC Configuration (for passport/ID chip reading)

1. **Add NFC Capability** in Xcode:
   - Select your target > Signing & Capabilities > + Capability > Near Field Communication Tag Reading

2. **Add ISO7816 Identifiers** to `Info.plist`:
   ```xml
   <key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
   <array>
       <string>D23300000045737445494420763335</string>
       <string>A0000002471001</string>
       <string>A0000002472001</string>
       <string>00000000000000</string>
   </array>
   ```

3. **Add an entitlements file** with NFC tag reading enabled:
   ```xml
   <key>com.apple.developer.nfc.readersession.formats</key>
   <array>
       <string>TAG</string>
   </array>
   ```

Make sure the app's provisioning profile includes the NFC Tag Reading capability. This NFC configuration is not needed when NFC is disabled.

### Android

The following permissions are declared in the native SDK's `AndroidManifest.xml` and merged automatically:

| Permission | Description |
|------------|-------------|
| `INTERNET` | Network access for API communication |
| `ACCESS_NETWORK_STATE` | Detect network availability |
| `CAMERA` | Document scanning and face verification |
| `NFC` | Read NFC chips in passports/ID cards |

Camera and NFC hardware features are declared as optional (`android:required="false"`), so your app can be installed on devices without these features.

#### Runtime Permissions

The SDK handles Android runtime permission requests automatically. When the user reaches a step that requires camera access:

1. The SDK prompts for camera permission if not already granted
2. If the user **denies** the permission, an error message is displayed with a "Try Again" button
3. If the user **grants** the permission, the verification flow continues

You do not need to request camera permission in your app code before calling `startVerification()` — the SDK manages this internally.

## Native SDK Variants

NFC and auto-detection are enabled by default on both platforms.

The React Native plugin can install the same native SDK variants exposed by the iOS and Android SDKs:

| Variant | Automatic capture | NFC passport reading | Use when |
|---------|-------------------|----------------------|----------|
| `all` | Yes | Yes | You want the complete SDK (default) |
| `core` | No | No | You only need manual capture and the smallest binary |
| `autodetection` | Yes | No | You need automatic capture without NFC |
| `nfc` | No | Yes | You need NFC passport reading without automatic capture |

### Empirical iOS Sizes

Measured against the React Native example app using a Release `iphoneos` build with native iOS SDK 4.0.2. `DiditSDK` is linked statically into the app executable, so the app executable is the most useful place to see the SDK's impact. Compressed values are IPA-like zips of the `.app` payload.

| Variant | `.app` bundle | App executable Mach-O | OpenSSL framework | Compressed IPA-like zip |
|---------|--------------:|----------------------:|------------------:|------------------------:|
| `core` | 30.3 MB | 22.1 MB | - | 9.1 MB |
| `autodetection` | 49.4 MB | 41.1 MB | - | 15.2 MB |
| `nfc` | 41.3 MB | 23.1 MB | 9.8 MB | 14.2 MB |
| `all` | 60.3 MB | 42.2 MB | 9.8 MB | 20.3 MB |

When NFC is disabled, you do not need iOS NFC capabilities, NFC entitlements, Android NFC packaging rules, or NFC-related provisioning setup. When auto-detection is disabled, the document and face capture steps fall back to a manual shutter button.

## Installation

### Expo

```sh
npx expo install @didit-protocol/sdk-react-native
```

Then add the config plugin to your `app.json` (or `app.config.js`). The default native variant is `all`:

```json
{
  "expo": {
    "plugins": ["@didit-protocol/sdk-react-native"]
  }
}
```

To choose a smaller native variant:

```json
{
  "expo": {
    "plugins": [
      [
        "@didit-protocol/sdk-react-native",
        {
          "iosVariant": "core",
          "androidVariant": "core"
        }
      ]
    ]
  }
}
```

That's it. The plugin automatically configures both platforms:
- **Android:** Adds the Didit Maven repository to Gradle and writes `diditSdkAndroidVariant`
- **iOS:** Adds the DiditSDK podspec to the Podfile and sets `$DiditSdkIosVariant`

Supported `iosVariant` / `androidVariant` values are `all`, `core`, `autodetection`, and `nfc`. The legacy booleans (`iosNfcEnabled`, `iosAutoDetectionEnabled`, `androidNfcEnabled`) still work, but `iosVariant` / `androidVariant` are preferred for new integrations.

> **Note:** This SDK uses native modules (camera, NFC) that are not available in Expo Go. You must use a [development build](https://docs.expo.dev/develop/development-builds/introduction/) or run `npx expo prebuild` to generate the native projects.

### React Native CLI

```sh
npm install @didit-protocol/sdk-react-native
# or
yarn add @didit-protocol/sdk-react-native
```

#### iOS

Add the DiditSDK pod to your `Podfile` (it's not on CocoaPods trunk). The default native variant is `all`:

```ruby
# Pick one: 'all', 'core', 'autodetection', 'nfc'
$DiditSdkIosVariant = 'all'

def max_ios_version(*versions)
  versions.map(&:to_s).max_by { |version| Gem::Version.new(version) }
end

didit_sdk_ios_deployment_target = ['all', 'nfc'].include?($DiditSdkIosVariant) ? max_ios_version(min_ios_version_supported, '15.0') : min_ios_version_supported
platform :ios, didit_sdk_ios_deployment_target

# Inside your app target:
didit_sdk_subspec = case $DiditSdkIosVariant
                    when 'all'           then 'DiditSDK/All'
                    when 'core'          then 'DiditSDK/Core'
                    when 'autodetection' then 'DiditSDK/AutoDetection'
                    when 'nfc'           then 'DiditSDK/NFC'
                    else
                      raise "Invalid $DiditSdkIosVariant '#{$DiditSdkIosVariant}'. Supported values: all, core, autodetection, nfc."
                    end
pod didit_sdk_subspec, :podspec => 'https://raw.githubusercontent.com/didit-protocol/sdk-ios/4.0.9/DiditSDK.podspec'
```

Then install dependencies:

```sh
cd ios
bundle exec pod install
```

To switch variants, clean CocoaPods first so the previous variant is not reused:

```sh
cd ios
rm -rf Pods Podfile.lock

# Edit $DiditSdkIosVariant in your Podfile, then:
bundle exec pod install
```

#### Android

Add the Didit Maven repository to your project-level `settings.gradle`:

```groovy
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url "https://raw.githubusercontent.com/didit-protocol/sdk-android/main/repository" }
    }
}
```

By default, the React Native plugin depends on the full Android SDK (`all`). To choose another variant, add this to `android/gradle.properties`:

```properties
diditSdkAndroidVariant=core
```

Supported values are `all`, `core`, `autodetection`, and `nfc`. The legacy `diditSdkAndroidNfcEnabled=false` property still maps to `core` for backwards compatibility, but `diditSdkAndroidVariant` is preferred for new integrations.

The native SDK dependencies for both platforms are declared in the library and resolved automatically.

## Quick Start

### Option A: Start verification with a session token

If your backend creates the verification session and returns a token:

```tsx
import { startVerification, VerificationStatus } from '@didit-protocol/sdk-react-native';

const result = await startVerification('your-session-token');

switch (result.type) {
  case 'completed':
    console.log('Status:', result.session.status);
    console.log('Session ID:', result.session.sessionId);
    break;
  case 'cancelled':
    console.log('User cancelled');
    break;
  case 'failed':
    console.log('Error:', result.error.type, result.error.message);
    break;
}
```

### Option B: Start verification with a workflow ID

If you want the SDK to create the session using a workflow ID:

```tsx
import { startVerificationWithWorkflow } from '@didit-protocol/sdk-react-native';

const result = await startVerificationWithWorkflow('your-workflow-id', {
  vendorData: 'user-123',
  config: { loggingEnabled: true },
});
```

## Configuration

Both `startVerification` and `startVerificationWithWorkflow` accept a `DiditConfig` object to customize the SDK behavior. For `startVerification`, pass it as the second argument. For `startVerificationWithWorkflow`, pass it inside the `options.config` field.

```tsx
import { startVerification } from '@didit-protocol/sdk-react-native';

// With startVerification — config is the second argument
const result = await startVerification('your-session-token', {
  languageCode: 'es',
  fontFamily: 'Avenir',
  loggingEnabled: true,
  showCloseButton: true,
  showExitConfirmation: true,
  closeOnComplete: false,
});

// With startVerificationWithWorkflow — config is inside options
const result = await startVerificationWithWorkflow('your-workflow-id', {
  vendorData: 'user-123',
  config: {
    languageCode: 'es',
    loggingEnabled: true,
    showCloseButton: true,
    showExitConfirmation: true,
  },
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `languageCode` | `string` | Device locale | ISO 639-1 language code (e.g. `"en"`, `"fr"`, `"ar"`) |
| `fontFamily` | `string` | System font | Custom font family name |
| `loggingEnabled` | `boolean` | `false` | Enable SDK debug logging |
| `showCloseButton` | `boolean` | `true` | Show close (X) button on verification step screens |
| `showExitConfirmation` | `boolean` | `true` | Show confirmation dialog when user attempts to exit |
| `closeOnComplete` | `boolean` | `false` | Automatically dismiss verification UI when complete |
| `defaultDocumentCamera` | `CameraLens` | Native default (`back`) | Lens used when first entering the document capture screen |
| `defaultLivenessCamera` | `CameraLens` | Native default (`front`) | Lens used when first entering the liveness (passive face) capture screen |
| `showDocumentCameraSwitchButton` | `boolean` | `true` | Show the in-capture camera switcher on the document screen |
| `showLivenessCameraSwitchButton` | `boolean` | `true` | Show the in-capture camera switcher on the liveness screen |

All fields are optional. If no config is provided, the SDK uses sensible defaults.

### `languageCode`

Sets the language for the entire verification UI. Pass an ISO 639-1 code (e.g. `"en"`, `"fr"`, `"es"`, `"ar"`). If not set, the SDK automatically detects the device locale and falls back to English.

```tsx
// Force French
await startVerification(token, { languageCode: 'fr' });

// Use device locale (default — no config needed)
await startVerification(token);
```

### `fontFamily`

Overrides the font used throughout the SDK UI. The font must be registered in your app's native configuration:

- **iOS:** Add the font file to your Xcode project and list it in `Info.plist` under `UIAppFonts`.
- **Android:** Place the font file in `android/app/src/main/res/font/`.

```tsx
await startVerification(token, { fontFamily: 'Avenir' });
```

If not set, the SDK uses the platform's default system font.

### `loggingEnabled`

Enables verbose debug logging from the native SDK. Useful during development to inspect the SDK's internal state, API calls, and error details. Should be disabled in production.

```tsx
// Enable logging for debugging
await startVerification(token, { loggingEnabled: true });
```

### Camera Settings

Control which camera lens opens by default on the document and liveness capture screens, and whether the in-capture camera switcher is shown to the user.

```tsx
import { CameraLens, startVerification } from '@didit-protocol/sdk-react-native';

await startVerification(token, {
  defaultDocumentCamera: CameraLens.Back, // back is the native default
  defaultLivenessCamera: CameraLens.Front, // front is the native default
  showDocumentCameraSwitchButton: true, // false to lock to the chosen lens
  showLivenessCameraSwitchButton: true,
});
```

If the requested lens is not present on the device, the native SDK falls back to the first available camera so capture still works. The switcher is also automatically hidden on single-camera devices regardless of the `show…SwitchButton` flag.

### Language Settings

The SDK supports 54 languages. If no language is specified, the SDK uses the device locale with English as fallback.

```tsx
// Use device locale (default)
await startVerification(token);

// Force a specific language
await startVerification(token, { languageCode: 'fr' });
```

#### Supported Languages

| Language | Code | Language | Code |
|----------|------|----------|------|
| Albanian | `sq` | Kazakh | `kk` |
| Arabic | `ar` | Korean | `ko` |
| Armenian | `hy` | Kyrgyz | `ky` |
| Bengali | `bn` | Latvian | `lv` |
| Bosnian | `bs` | Lithuanian | `lt` |
| Bulgarian | `bg` | Macedonian | `mk` |
| Catalan | `ca` | Malay | `ms` |
| Chinese | `zh` | Montenegrin | `cnr` |
| Chinese (Simplified) | `zh-CN` | Norwegian | `no` |
| Chinese (Traditional) | `zh-TW` | Persian | `fa` |
| Croatian | `hr` | Polish | `pl` |
| Czech | `cs` | Portuguese | `pt` |
| Danish | `da` | Portuguese (Brazil) | `pt-BR` |
| Dutch | `nl` | Romanian | `ro` |
| English | `en` | Russian | `ru` |
| Estonian | `et` | Serbian | `sr` |
| Finnish | `fi` | Slovak | `sk` |
| French | `fr` | Slovenian | `sl` |
| Georgian | `ka` | Somali | `so` |
| German | `de` | Spanish | `es` |
| Greek | `el` | Swedish | `sv` |
| Hebrew | `he` | Thai | `th` |
| Hindi | `hi` | Turkish | `tr` |
| Hungarian | `hu` | Ukrainian | `uk` |
| Indonesian | `id` | Uzbek | `uz` |
| Italian | `it` | Vietnamese | `vi` |
| Japanese | `ja` | Mongolian | `mn` |

## Advanced Session Parameters

For advanced session parameters such as `contact_details`, `expected_details`, `metadata`, and `callback`, use the **Backend Session** method. Your backend calls [POST /v3/session/](https://docs.didit.me) with full parameters, then passes the `session_token` to the SDK:

```tsx
// Your backend creates the session with advanced parameters:
// POST /v3/session/ with contact_details, expected_details, metadata, etc.
// Then passes the session_token to the SDK:
const result = await startVerification(sessionTokenFromBackend);
```

> **Note:** The `startVerificationWithWorkflow` method only supports `vendorData`. For any other session parameters, use the Backend Session method.

### Full Workflow Example

```tsx
const result = await startVerificationWithWorkflow('your-workflow-id', {
  vendorData: 'user-123',
  config: {
    languageCode: 'en',
    loggingEnabled: true,
    showCloseButton: true,
    showExitConfirmation: true,
  },
});
```

## Verification Results

Both `startVerification` and `startVerificationWithWorkflow` return a `Promise<VerificationResult>`. The result is a discriminated union — use the `type` field to determine the outcome.

### Result Types

| Type | Description | Fields |
|------|-------------|--------|
| `completed` | Verification flow completed | `session` (always present) |
| `cancelled` | User cancelled the flow | `session` (optional) |
| `failed` | An error occurred | `error` (always present), `session` (optional) |

### SessionData

| Property | Type | Description |
|----------|------|-------------|
| `sessionId` | `string` | The unique session identifier |
| `status` | `VerificationStatus` | `Approved`, `Pending`, or `Declined` |

### VerificationError

| Property | Type | Description |
|----------|------|-------------|
| `type` | `VerificationErrorType` | Error category (see table below) |
| `message` | `string` | Human-readable error description |

### Error Types

| Error Type | Description |
|------------|-------------|
| `sessionExpired` | The session has expired |
| `networkError` | Network connectivity issue |
| `cameraAccessDenied` | Camera permission not granted |
| `notInitialized` | SDK not initialized (Android only) |
| `apiError` | API request failed |
| `unknown` | Other error with message |

### Handling Results

```tsx
import {
  startVerification,
  VerificationStatus,
  type VerificationResult,
} from '@didit-protocol/sdk-react-native';

async function verify(token: string) {
  const result: VerificationResult = await startVerification(token);

  switch (result.type) {
    case 'completed':
      switch (result.session.status) {
        case VerificationStatus.Approved:
          console.log('Identity verified!');
          break;
        case VerificationStatus.Pending:
          console.log('Verification under review.');
          break;
        case VerificationStatus.Declined:
          console.log('Verification declined.');
          break;
      }
      console.log('Session ID:', result.session.sessionId);
      break;

    case 'cancelled':
      console.log('User cancelled the verification.');
      if (result.session) {
        console.log('Session ID:', result.session.sessionId);
      }
      break;

    case 'failed':
      console.log(`Error [${result.error.type}]: ${result.error.message}`);
      break;
  }
}
```

## Complete Example

```tsx
import { useState, useCallback } from 'react';
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import {
  startVerification,
  startVerificationWithWorkflow,
  VerificationStatus,
  type VerificationResult,
} from '@didit-protocol/sdk-react-native';

export default function App() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = useCallback(async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Please enter a session token.');
      return;
    }

    setLoading(true);
    try {
      const result = await startVerification(token.trim(), {
        loggingEnabled: true,
      });
      showResult(result);
    } catch (error) {
      Alert.alert('Error', `Unexpected error: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const showResult = (result: VerificationResult) => {
    switch (result.type) {
      case 'completed':
        Alert.alert(
          'Verification Complete',
          `Status: ${result.session.status}\nSession: ${result.session.sessionId}`
        );
        break;
      case 'cancelled':
        Alert.alert('Cancelled', 'The user cancelled the verification.');
        break;
      case 'failed':
        Alert.alert('Failed', `${result.error.type}: ${result.error.message}`);
        break;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <TextInput
        placeholder="Enter session token..."
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
        }}
      />
      <TouchableOpacity
        onPress={handleVerify}
        disabled={loading}
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: 8,
          padding: 16,
          alignItems: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            Start Verification
          </Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}
```

## API Reference

### `startVerification(token, config?)`

Start verification with an existing session token.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | `string` | Yes | Session token from the Didit API |
| `config` | `DiditConfig` | No | SDK configuration options |

Returns: `Promise<VerificationResult>`

### `startVerificationWithWorkflow(workflowId, options?)`

Start verification by creating a new session with a workflow ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workflowId` | `string` | Yes | Workflow ID that defines verification steps |
| `options` | `WorkflowOptions` | No | Workflow options (see below) |

Returns: `Promise<VerificationResult>`

#### WorkflowOptions

| Field | Type | Description |
|-------|------|-------------|
| `vendorData` | `string` | Your user identifier or reference |
| `config` | `DiditConfig` | SDK configuration options |

> **Note:** For advanced session parameters (`contactDetails`, `expectedDetails`, `metadata`), use the Backend Session method (`startVerification` with a token created via POST /v3/session/).

## Exported Types

```tsx
import {
  // Functions
  startVerification,
  startVerificationWithWorkflow,

  // Enum
  VerificationStatus,

  // Types
  type VerificationResult,
  type VerificationCompleted,
  type VerificationCancelled,
  type VerificationFailed,
  type VerificationError,
  type VerificationErrorType,
  type SessionData,
  type DiditConfig,
  type ContactDetails,
  type ExpectedDetails,
  type WorkflowOptions,
} from '@didit-protocol/sdk-react-native';
```

## Running the Example App

The repository includes a fully functional example app.

### iOS

```sh
yarn install
cd example/ios && bundle exec pod install && cd ../..
yarn run:ios
```

To run on a real device, open `example/ios/SdkReactNativeExample.xcworkspace` in Xcode, configure your signing team, and select your device.

### Android

```sh
yarn install
yarn run:android
```

## License

Copyright (c) 2026 Didit. All rights reserved.
