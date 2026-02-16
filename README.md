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
| Android | API 23+ (6.0) | Kotlin 1.9+, Java 17+ |

## Permissions

The SDK uses the camera, NFC, and location on both platforms. Native permissions are declared by the underlying native SDKs and merged automatically.

### iOS

Add the following keys to your app's `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required to scan your identity documents for verification.</string>
<key>NFCReaderUsageDescription</key>
<string>NFC is used to read passport chip data for identity verification.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Location access is used to detect your country for identity verification.</string>
```

#### NFC Configuration (for passport/ID chip reading)

1. **Add NFC Capability** in Xcode:
   - Select your target > Signing & Capabilities > + Capability > Near Field Communication Tag Reading

2. **Add ISO7816 Identifiers** to `Info.plist`:
   ```xml
   <key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
   <array>
       <string>A0000002471001</string>
   </array>
   ```

### Android

The following permissions are declared in the native SDK's `AndroidManifest.xml` and merged automatically:

| Permission | Description |
|------------|-------------|
| `INTERNET` | Network access for API communication |
| `ACCESS_NETWORK_STATE` | Detect network availability |
| `CAMERA` | Document scanning and face verification |
| `NFC` | Read NFC chips in passports/ID cards |

Camera and NFC hardware features are declared as optional (`android:required="false"`), so your app can be installed on devices without these features.

## Installation

### Expo

```sh
npx expo install @didit-protocol/sdk-react-native
```

Then add the config plugin to your `app.json` (or `app.config.js`):

```json
{
  "expo": {
    "plugins": ["@didit-protocol/sdk-react-native"]
  }
}
```

That's it. The plugin automatically configures both platforms:
- **Android:** Adds the Didit Maven repository to Gradle
- **iOS:** Adds the DiditSDK podspec to the Podfile

> **Note:** This SDK uses native modules (camera, NFC) that are not available in Expo Go. You must use a [development build](https://docs.expo.dev/develop/development-builds/introduction/) or run `npx expo prebuild` to generate the native projects.

### React Native CLI

```sh
npm install @didit-protocol/sdk-react-native
# or
yarn add @didit-protocol/sdk-react-native
```

#### iOS

Add the DiditSDK pod to your `Podfile` (it's not on CocoaPods trunk):

```ruby
# In your ios/Podfile, inside the target block:
pod 'DiditSDK', :podspec => 'https://raw.githubusercontent.com/didit-protocol/sdk-ios/main/DiditSDK.podspec'
```

Then install dependencies:

```sh
cd ios
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
});

// With startVerificationWithWorkflow — config is inside options
const result = await startVerificationWithWorkflow('your-workflow-id', {
  vendorData: 'user-123',
  config: {
    languageCode: 'es',
    loggingEnabled: true,
  },
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `languageCode` | `string` | Device locale | ISO 639-1 language code (e.g. `"en"`, `"fr"`, `"ar"`) |
| `fontFamily` | `string` | System font | Custom font family name |
| `loggingEnabled` | `boolean` | `false` | Enable SDK debug logging |

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

### Language Settings

The SDK supports 40+ languages. If no language is specified, the SDK uses the device locale with English as fallback.

```tsx
// Use device locale (default)
await startVerification(token);

// Force a specific language
await startVerification(token, { languageCode: 'fr' });
```

#### Supported Languages

| Language | Code | Language | Code |
|----------|------|----------|------|
| English | `en` | Korean | `ko` |
| Arabic | `ar` | Lithuanian | `lt` |
| Bulgarian | `bg` | Latvian | `lv` |
| Bengali | `bn` | Macedonian | `mk` |
| Catalan | `ca` | Malay | `ms` |
| Czech | `cs` | Dutch | `nl` |
| Danish | `da` | Norwegian | `no` |
| German | `de` | Polish | `pl` |
| Greek | `el` | Portuguese | `pt` |
| Spanish | `es` | Portuguese (Brazil) | `pt-BR` |
| Estonian | `et` | Romanian | `ro` |
| Persian | `fa` | Russian | `ru` |
| Finnish | `fi` | Slovak | `sk` |
| French | `fr` | Slovenian | `sl` |
| Hebrew | `he` | Serbian | `sr` |
| Hindi | `hi` | Swedish | `sv` |
| Croatian | `hr` | Thai | `th` |
| Hungarian | `hu` | Turkish | `tr` |
| Armenian | `hy` | Ukrainian | `uk` |
| Indonesian | `id` | Uzbek | `uz` |
| Italian | `it` | Vietnamese | `vi` |
| Japanese | `ja` | Chinese (Simplified) | `zh` |
| Georgian | `ka` | Chinese (Traditional) | `zh-TW` |
| Montenegrin | `cnr` | Somali | `so` |

## Advanced Options

These options are only available with `startVerificationWithWorkflow`, where the SDK creates the session on your behalf.

### Contact Details (Prefill)

Provide contact details to prefill verification forms and enable email notifications:

```tsx
const result = await startVerificationWithWorkflow('your-workflow-id', {
  contactDetails: {
    email: 'user@example.com',
    sendNotificationEmails: true,
    emailLang: 'en',
    phone: '+14155552671',
  },
});
```

| Field | Type | Description |
|-------|------|-------------|
| `email` | `string` | Email address for verification notifications |
| `sendNotificationEmails` | `boolean` | Whether to send status update emails to the user |
| `emailLang` | `string` | ISO 639-1 language code for notification emails |
| `phone` | `string` | Phone number in E.164 format (e.g. `"+14155552671"`) |

All fields are optional. Only provide the ones relevant to your use case.

### Expected Details (Cross-Validation)

Provide expected user details for cross-validation against data extracted from documents. The SDK compares these values with what it reads from the user's ID:

```tsx
const result = await startVerificationWithWorkflow('your-workflow-id', {
  expectedDetails: {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-05-15',
    nationality: 'USA',
    country: 'USA',
  },
});
```

| Field | Type | Format | Description |
|-------|------|--------|-------------|
| `firstName` | `string` | — | Expected first name |
| `lastName` | `string` | — | Expected last name |
| `dateOfBirth` | `string` | `YYYY-MM-DD` | Expected date of birth |
| `gender` | `string` | — | Expected gender |
| `nationality` | `string` | ISO 3166-1 alpha-3 | Expected nationality (e.g. `"USA"`, `"GBR"`) |
| `country` | `string` | ISO 3166-1 alpha-3 | Expected country of residence |
| `address` | `string` | — | Expected address |
| `identificationNumber` | `string` | — | Expected document ID number |
| `ipAddress` | `string` | — | Expected IP address |
| `portraitImage` | `string` | — | Base64-encoded portrait image for face comparison |

All fields are optional.

### Metadata

Store custom JSON metadata with the session (not displayed to the user):

```tsx
const result = await startVerificationWithWorkflow('your-workflow-id', {
  vendorData: 'user-123',
  metadata: '{"internalId": "abc123", "source": "mobile"}',
});
```

### Full Workflow Example

```tsx
const result = await startVerificationWithWorkflow('your-workflow-id', {
  vendorData: 'user-123',
  metadata: '{"source": "react-native"}',
  contactDetails: {
    email: 'user@example.com',
    sendNotificationEmails: true,
  },
  expectedDetails: {
    firstName: 'John',
    lastName: 'Doe',
  },
  config: {
    languageCode: 'en',
    loggingEnabled: true,
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
| `metadata` | `string` | Custom JSON metadata for the session |
| `contactDetails` | `ContactDetails` | Prefill contact information |
| `expectedDetails` | `ExpectedDetails` | Expected identity details for cross-validation |
| `config` | `DiditConfig` | SDK configuration options |

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

Copyright (c) 2025 Didit. All rights reserved.
