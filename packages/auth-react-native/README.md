# DiditAuth for React Native

**Not ready for authentication or publication.** This private workspace prepares
`@didit-protocol/auth-react-native` as an independent native module. Both native
implementations currently reject every operation. There is no released native
DiditAuth dependency or reviewed initialization/result contract to connect yet.

## Current behavior

The named exports `signIn`, `currentSession`, `getToken`, `signOut` and `stepUp`
take no arguments and return `Promise<never>` in this unavailable-only build.
They reserve the native method names, not the final integration API. Configuration,
options, successful session/token types and cancellation semantics must be added
with the reviewed native contract before publication.

Importing the package without a linked native module is safe. Calling an operation
rejects with `code: 'ERR_DIDIT_AUTH_UNAVAILABLE'`. The native placeholders use the
same code as the JavaScript `DiditAuthUnavailableError`. Match the `code` across
the native boundary; native errors are not instances of the JavaScript class.
Other native rejections propagate unchanged. An unexpected native resolution also
rejects as unavailable, so this build never reports a successful authentication,
signed-out session, token retrieval, logout or step-up.

No credentials are accepted, stored, logged or sent. The package has no dependency
on the verification wrapper or its camera, NFC and location features. It registers
its own `DiditAuthReactNative` TurboModule and `DiditAuthReactNativeSpec` codegen
library. It adds no screens, network calls, URL schemes or OS permissions.

## Local integration

Use React Native's New Architecture. Codegen is checked with React Native 0.77 and
the repository's 0.83 version; platform support remains subject to native builds
and the eventual DiditAuth dependency's minimum versions. Expo Go cannot load the
native module; a development build will be needed for a real native integration.

From the repository root:

```sh
yarn install --immutable
yarn build:auth
yarn workspace @didit-protocol/auth-react-native pack --out /tmp/didit-auth-react-native.tgz
```

The archive can be installed in a disposable React Native application for
autolinking checks, either alone or alongside the verification package. `private:
true` blocks registry publication. The root verification release does not include
this workspace. This package uses the existing Bob toolchain for CommonJS, ESM,
TypeScript declarations and React Native source exports.

## Completing the native integration

Before enabling or publishing the package:

1. Connect the reviewed native DiditAuth initialization and method contracts.
   Replace the rejecting native implementations and the JavaScript success gate
   together. Define typed session results, options and distinct cancellation,
   signed-out, expired/revoked and failure outcomes from that contract.
2. Add real distribution coordinates with native versions single-sourced through
   `diditNativeSdkVersions`; never borrow the verification package's pins.
3. Keep PKCE/state validation, callback ownership, passkeys, secure token storage,
   serialized refresh, logout/revocation and automatic signals in native DiditAuth.
   Treat access tokens as opaque values. Never expose refresh tokens to JavaScript.
4. Document and test the native callback/associated-domain setup against the
   supported backend contract before adding an Expo configuration plugin. Verify
   app/environment isolation, process restoration and callback replay rejection.
5. Run real native sign-in, cancel, session restore/expiry/revocation, concurrent
   refresh, sign-out and step-up tests. Capture the launched hosted/native flows
   in both themes and required sizes. iOS compilation and device/passkey checks
   require a Mac. Codegen and package tests alone do not prove native runtime or
   authentication readiness.

The matching Flutter `didit_auth` requires its own package in `sdk-flutter`, with
the same native dependency and acceptance checks. It is not included in this
React Native workspace. Hosted pages, backend contracts and native DiditAuth
remain separate dependencies; this package does not replace their implementations.
