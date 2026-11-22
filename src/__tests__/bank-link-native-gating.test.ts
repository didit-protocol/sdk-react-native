import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Bank Link is not in the released native SDK yet. The wrapper must still
 * compile against it (the public CI's released-compatibility jobs link the
 * released binaries), so the native calls are compiled only when the pinned
 * native SDK carries them: a source pin, or `bankLink: true` once a release
 * has them. Otherwise a stand-in compiles and the module rejects
 * `not_available`. Without this gate those jobs fail on unresolved
 * `BankLinkEvent` / `BankLinkResult` symbols.
 */

const repoRoot = join(__dirname, '..', '..');
const read = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), 'utf8');

const pkg = JSON.parse(read('package.json'));

describe('native Bank Link compile gate', () => {
  it('declares the released-SDK capability next to the version pins', () => {
    expect(typeof pkg.diditNativeSdkVersions.bankLink).toBe('boolean');
  });

  it('selects one Android Bank Link source set from the same gate', () => {
    const gradle = read('android/build.gradle');

    expect(gradle).toContain(
      'def bankLinkEnabled = nativePins.source != null || nativePins.bankLink == true'
    );
    expect(gradle).toContain('src/bankLink/java');
    expect(gradle).toContain('src/released/java');
  });

  it('keeps the native Android calls out of the released-only source', () => {
    const nativeCalls =
      'android/src/bankLink/java/com/sdkreactnative/BankLinkSupport.kt';
    const released =
      'android/src/released/java/com/sdkreactnative/BankLinkSupport.kt';

    expect(existsSync(join(repoRoot, nativeCalls))).toBe(true);
    expect(read(nativeCalls)).toContain('DiditSdk.presentBankLink');
    expect(existsSync(join(repoRoot, released))).toBe(true);
    expect(read(released)).toContain('const val available = false');
    expect(
      read('android/src/main/java/com/sdkreactnative/SdkReactNativeModule.kt')
    ).not.toContain('me.didit.sdk.BankLink');
  });

  it('maps the native Android types, wire names and a declined presentation', () => {
    // The enabled adapter compiles only when the pinned native source carries
    // Bank Link, so CI's released jobs build the stand-in and never see it.
    // These assertions stand in for that compile: the package the native
    // types live in, the wire names JavaScript listens for, the wrapped
    // result variants, and a declined presentation that still settles.
    const json = read(
      'android/src/bankLink/java/com/sdkreactnative/BankLinkJson.kt'
    );
    const support = read(
      'android/src/bankLink/java/com/sdkreactnative/BankLinkSupport.kt'
    );

    expect(json).toContain(
      'import me.didit.sdk.features.bank.link.BankLinkEvent'
    );
    expect(json).toContain(
      'import me.didit.sdk.features.bank.link.BankLinkResult'
    );
    // The enum constants read `OPENED`; JavaScript listens for `opened`.
    expect(json).toContain('.put("name", event.name.wire)');
    expect(json).not.toMatch(/name\.toString\(\)|event\.name\.name/);
    // Success and exit fields hang under the result variant that wraps them.
    expect(json).toContain('is BankLinkResult.Success ->');
    expect(json).toContain('result.success.linkId');
    expect(json).toContain('is BankLinkResult.Exit ->');
    expect(json).toContain('result.exit.reason.wire');
    expect(json).toContain('result.exit.step?.wire');
    // A declined presentation resolves no result, so the adapter must fail the
    // call instead of leaving the host waiting and the slot occupied.
    expect(support).toContain('val presented = DiditSdk.presentBankLink(');
    expect(support).toContain('check(presented)');
  });

  it('defines the iOS compile condition only when the native SDK has it', () => {
    const podspec = read('SdkReactNative.podspec');

    expect(podspec).toMatch(
      /didit_sdk_bank_link_enabled = \([\s\S]*diditNativeSdkVersions", "source"[\s\S]*bankLink"\) == true/
    );
    expect(podspec).toContain(
      's.pod_target_xcconfig["SWIFT_ACTIVE_COMPILATION_CONDITIONS"] = "$(inherited) DIDIT_BANK_LINK"'
    );
  });

  it('guards the native iOS calls and keeps a released stand-in', () => {
    const bridge = read('ios/DiditSdkBridge.swift');

    expect(bridge).toContain('#if DIDIT_BANK_LINK');
    expect(bridge).toContain('public var bankLinkAvailable: Bool');
    expect(bridge).toContain('DiditSdk.shared.presentBankLink');
    expect(bridge).toContain('#else');

    const objc = read('ios/SdkReactNative.mm');
    expect(objc).toContain(
      'reject(@"not_available", @"This native SDK version does not include Bank Link.", nil)'
    );
    expect(objc).toContain('_bridge.bankLinkAvailable');
  });

  it('calls the Bank Link selectors Swift exports for both bridge variants', () => {
    // `@objcMembers` derives the Objective-C names. Swift adds `With` before a
    // first label like `token`, but not before one that starts with a
    // preposition like `onEvent`, so `resumeBankLink(onEvent:completion:)`
    // is `resumeBankLinkOnEvent:completion:`. The `With` spelling fails the
    // iOS build for every app, Bank Link or not.
    const bridge = read('ios/DiditSdkBridge.swift');
    const objc = read('ios/SdkReactNative.mm');

    const swiftCount = (signature: string) =>
      bridge.split(signature).length - 1;
    expect(
      swiftCount('public func presentBankLink(\n        token: String,')
    ).toBe(2);
    expect(swiftCount('public func resumeBankLink(\n        onEvent:')).toBe(2);
    expect(swiftCount('public func handleBankLinkReturn(url: String)')).toBe(2);

    expect(objc).toContain('[_bridge presentBankLinkWithToken:');
    expect(objc).toContain('[_bridge resumeBankLinkOnEvent:');
    expect(objc).not.toContain('resumeBankLinkWithOnEvent');
    expect(objc).toContain('[_bridge handleBankLinkReturnWithUrl:');
  });
});
