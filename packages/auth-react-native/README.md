# DiditAuth for React Native

`@didit-protocol/auth-react-native` signs your app's end users up and in with Didit
Authentication. It calls native DiditAuth (`me.didit:didit-auth` on Android,
`DiditSDK/Auth` on iOS): your application's hosted Didit page with PKCE, passkeys,
sessions in the Keychain or Android Keystore, sign-out and step-ups before
sensitive actions. Every request carries the device signals of DiditSignals.

**Not published yet.** The package is private and pins native SDK 4.10.0
(`diditNativeSdkVersions` in its `package.json`), the first release with DiditAuth.

## Requirements

- React Native 0.77 or later with the New Architecture. Expo Go cannot load the
  native module; use a development build.
- iOS 15 or later; the hosted pages (sign-in and step-up checks) need iOS 17.4.
  Below 17.4 those calls fail with `browser_unavailable`.
- Android: passkeys need Android 9 or later.

## Set up the redirect

Didit sends the person back to your app with an HTTPS redirect; it accepts no
custom URL schemes.

1. In the Didit console (Authentication, Developers), add the redirect URI, for
   example `https://app.example.com/didit/callback`, and copy the publishable key.
2. Android: make that address an App Link of your app and declare DiditAuth's
   redirect activity with it in `android/app/src/main/AndroidManifest.xml` (add
   `xmlns:tools="http://schemas.android.com/tools"` to the manifest element):

   ```xml
   <activity
       android:name="me.didit.sdk.auth.DiditAuthRedirectActivity"
       android:exported="true"
       android:theme="@android:style/Theme.Translucent.NoTitleBar"
       tools:node="replace">
       <intent-filter android:autoVerify="true">
           <action android:name="android.intent.action.VIEW" />
           <category android:name="android.intent.category.DEFAULT" />
           <category android:name="android.intent.category.BROWSABLE" />
           <data android:scheme="https" android:host="app.example.com" android:path="/didit/callback" />
       </intent-filter>
   </activity>
   ```

   Publish `https://app.example.com/.well-known/assetlinks.json` for your package
   and signing certificate.
3. iOS: add `webcredentials:app.example.com` to the app's Associated Domains and
   serve `https://app.example.com/.well-known/apple-app-site-association` listing
   your app under `webcredentials`.
4. Passkeys: add your Android package and certificate fingerprints, and your iOS
   app ID, under Native apps in the console.

The native SDK guides have the details: [Android](https://github.com/didit-protocol/sdk-android)
and [iOS](https://github.com/didit-protocol/sdk-ios).

## Install the native SDK

Android resolves `me.didit:didit-auth` from the Didit Maven repository. Add it to the
project-level `settings.gradle` (the verification package needs the same entry):

```groovy
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven {
            url "https://raw.githubusercontent.com/didit-protocol/sdk-android/main/repository"
            content { includeGroup "me.didit" }
        }
    }
}
```

On iOS, CocoaPods is the default. DiditSDK is not on the CocoaPods trunk, so the
Podfile names its podspec at the pinned version:

```ruby
pod 'DiditSDK/Auth', :podspec => 'https://raw.githubusercontent.com/didit-protocol/sdk-ios/4.10.0/DiditSDK.podspec'
```

To resolve it with Swift Package Manager instead, set `$DiditSdkIosLinkage = 'spm'`
before `use_native_modules!` and leave the `pod` line out. The package then adds the
`DiditAuth` product of `sdk-ios`.

## Use

```ts
import { createDiditAuth, DiditAuthError } from '@didit-protocol/auth-react-native';

// One per application; reuse it.
const auth = createDiditAuth({
  publishableKey: 'pk_live_...',
  redirectUri: 'https://app.example.com/didit/callback',
});

const session = await auth.signIn(); // hosted page: sign-up and sign-in
await auth.signInWithPasskey(); // a passkey of this device
const passkeyId = await auth.registerPasskey(); // needs a session at most five minutes old

await auth.currentSession(); // DiditSession or null, cached for 30 seconds
await auth.currentSession({ force: true }); // asks Didit now
const token = await auth.getToken(); // five-minute token for your backend, or null
await auth.signOut();

const result = await auth.stepUp({ action: 'payout', amount: '900.00', currency: 'EUR' });
if (result.approved) {
  // Your backend confirms with GET step-up/{result.id}/ before it pays out.
}
```

`stepUp` also takes `{ action: 'bank' }` (adding or changing a bank account) and
`{ action: 'contact' }` (changing the email or phone). The result's `status` is
`not_required`, `approved`, `pending`, `review`, `declined` or `expired`.

A `DiditSession` has `userId`, `sessionId`, `applicationId`, `vendorData`, `email`,
`emailVerified`, `phone`, `methods`, `mfaVerified`, `verified`, `organizations` and
`expiresAt`. Verify the access token on your backend against the issuer's JWKS.
Refresh tokens stay in native storage and never reach JavaScript.

## Errors

Every call rejects with a `DiditAuthError` carrying native DiditAuth's `code` and
`message` unchanged, plus `status`, `fields` and `retryAfter` when Didit sent them:

- the Didit API's own codes, such as `invalid_grant`, `method_unavailable` or
  `reauthentication_required`;
- `cancelled`, `invalid_state`, `not_signed_in`, `passkey_cancelled`,
  `passkey_unavailable`, `browser_unavailable`, `storage_unavailable`,
  `invalid_publishable_key`, `invalid_redirect_uri`, `network_error`,
  `rate_limited` (see `retryAfter`) and `server_error`.

```ts
try {
  await auth.signIn();
} catch (error) {
  if (error instanceof DiditAuthError && error.code === 'cancelled') return;
  throw error;
}
```

Calls also fail with `browser_unavailable` when no screen of the app is in the
foreground. In a build without the native module, such as Expo Go, importing the
package works and every call rejects with `DiditAuthUnavailableError` (code
`ERR_DIDIT_AUTH_UNAVAILABLE`).

## With the verification package

`@didit-protocol/sdk-react-native` and this package pin the same native release, so
both can be installed in one app. On iOS the verification SDK's `DiditSDK` binary
also contains DiditAuth; with both packages the app ships a second copy of
DiditAuth and DiditSignals in the `DiditAuth` binary.
