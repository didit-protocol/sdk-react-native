import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * The Android bridge used to log the first characters of the session token, the
 * workflow's vendorData and metadata, the contact and expected details and the
 * parsed configuration, all through plain Log.d. The library's release build
 * type does not minify, so nothing stripped them and a release build wrote
 * credentials and personal data to logcat. Every diagnostic now goes through a
 * helper gated on BuildConfig.DEBUG and carries no token, personal data or
 * native error message. These tests read the bridge sources and fail when a log
 * call leaks one of them again or drops the debug-only gate.
 */

const repoRoot = join(__dirname, '..', '..');

const read = (relativePath: string) =>
  readFileSync(join(repoRoot, relativePath), 'utf8');

/** A diagnostic log call, in Kotlin or in an Apple source file. */
const LOG_CALL =
  /\b(?:Log\.[deiwv]|logDebug(?:Error)?|NSLog|os_log|print(?:ln)?)\s*\(/g;

/** A log call that reaches the platform logger directly, so it needs a gate. */
const RAW_LOG = /\b(?:Log\.[deiwv]|NSLog|os_log|print(?:ln)?)\s*\(/;

/** A credential, personal data, or a native error message. */
const SENSITIVE =
  /\b(?:transactionToken|token|vendorData|metadata|contactDetails|expectedDetails|config(?:uration)?|session(?:Id)?|state\.message)\b/i;

type Gate = (index: number) => boolean;

/** Every file under `directory` whose name ends with one of `extensions`. */
function sources(directory: string, extensions: string[]): string[] {
  const entries = readdirSync(join(repoRoot, directory), {
    recursive: true,
    encoding: 'utf8',
  });

  return entries
    .filter((name) => extensions.some((extension) => name.endsWith(extension)))
    .map((name) => join(directory, name));
}

/** The index of the character that closes the opener at `open`. */
function closingIndex(
  source: string,
  open: number,
  opener: string,
  closer: string
): number {
  let depth = 0;

  for (let index = open; index < source.length; index += 1) {
    if (source[index] === opener) depth += 1;
    if (source[index] === closer) depth -= 1;
    if (depth === 0) return index;
  }

  return source.length;
}

/** The argument list of the call whose opening parenthesis is at `open`. */
const callText = (source: string, open: number) =>
  source.slice(open, closingIndex(source, open, '(', ')') + 1);

/** The body of the Kotlin function that contains `index`. */
function functionBody(source: string, index: number): string {
  const start = source.lastIndexOf('fun ', index);
  const brace = source.indexOf('{', start);

  return start < 0
    ? ''
    : source.slice(brace, closingIndex(source, brace, '{', '}') + 1);
}

/** True when `index` sits inside one of the file's `#if DEBUG` regions. */
const inDebugRegion = (source: string, index: number) =>
  Array.from(source.matchAll(/#if DEBUG/g), (match) => match.index ?? 0).some(
    (start) => index >= start && index <= source.indexOf('#endif', start)
  );

/** Kotlin logs are allowed inside a function gated on BuildConfig.DEBUG. */
const kotlinGate =
  (source: string): Gate =>
  (index) =>
    functionBody(source, index).includes('BuildConfig.DEBUG');

/** Apple logs are allowed inside a `#if DEBUG` region. */
const appleGate =
  (source: string): Gate =>
  (index) =>
    inDebugRegion(source, index);

const lineOf = (source: string, index: number) =>
  source.slice(0, index).split('\n').length;

/**
 * Why one log call is not allowed, or null when it is. A call that goes through
 * a gated helper is gated by construction, so only its text matters.
 */
function violation(source: string, match: RegExpMatchArray, gated: Gate) {
  const index = match.index ?? 0;
  const text = callText(source, index + match[0].length - 1);
  const leaked = text.match(SENSITIVE)?.[0];

  if (leaked) return `line ${lineOf(source, index)}: logs ${leaked}`;
  if (!RAW_LOG.test(match[0]) || gated(index)) return null;

  return `line ${lineOf(source, index)}: is not behind a debug-only gate`;
}

/** Every log call in `source` that leaks data or is not debug-only. */
function violations(source: string, gate: (source: string) => Gate): string[] {
  const gated = gate(source);

  return Array.from(source.matchAll(LOG_CALL), (match) =>
    violation(source, match, gated)
  ).filter((reason): reason is string => reason !== null);
}

const KOTLIN_SOURCES = sources('android/src', ['.kt', '.java']);
const APPLE_SOURCES = sources('ios', ['.swift', '.mm', '.m', '.h']);

describe('wrapper diagnostic logging', () => {
  it('reads both bridges', () => {
    expect(KOTLIN_SOURCES).toContain(
      'android/src/main/java/com/sdkreactnative/SdkReactNativeModule.kt'
    );
    expect(APPLE_SOURCES).toContain('ios/DiditSdkBridge.swift');
  });

  it.each(KOTLIN_SOURCES)(
    '%s keeps every log call debug-only and free of personal data',
    (path) => {
      expect(violations(read(path), kotlinGate)).toEqual([]);
    }
  );

  it.each(APPLE_SOURCES)(
    '%s keeps every log call debug-only and free of personal data',
    (path) => {
      expect(violations(read(path), appleGate)).toEqual([]);
    }
  );
});

describe('the logging guard itself', () => {
  const lines = (...body: string[]) => body.join('\n');

  it('rejects the token log this change removed', () => {
    const fixture = lines(
      'fun startVerification(token: String, config: ReadableMap?) {',
      '    Log.d(TAG, "startVerification: token=${token.take(8)}..., config=$config")',
      '}'
    );

    expect(violations(fixture, kotlinGate)).toEqual(['line 2: logs token']);
  });

  it('rejects personal data even behind the debug gate', () => {
    const fixture = lines(
      'private fun logDebug(message: String) {',
      '    if (BuildConfig.DEBUG) Log.d(TAG, "vendorData=$vendorData")',
      '}'
    );

    expect(violations(fixture, kotlinGate)).toEqual([
      'line 2: logs vendorData',
    ]);
  });

  it('rejects a structural log with no debug gate', () => {
    const fixture = lines('fun start() {', '    Log.d(TAG, "started")', '}');

    expect(violations(fixture, kotlinGate)).toEqual([
      'line 2: is not behind a debug-only gate',
    ]);
  });

  it('accepts the shipped helper', () => {
    const fixture = lines(
      'private fun logDebug(message: String) {',
      '    if (BuildConfig.DEBUG) Log.d(TAG, message)',
      '}'
    );

    expect(violations(fixture, kotlinGate)).toEqual([]);
  });

  it('rejects a helper that reaches the logger without a gate', () => {
    const fixture = lines(
      'private fun logDebug(message: String) {',
      '    Log.d(TAG, message)',
      '}'
    );

    expect(violations(fixture, kotlinGate)).toEqual([
      'line 2: is not behind a debug-only gate',
    ]);
  });

  it('accepts an Apple log inside #if DEBUG and rejects one outside it', () => {
    expect(
      violations(lines('#if DEBUG', 'NSLog("started")', '#endif'), appleGate)
    ).toEqual([]);
    expect(violations('NSLog("started")', appleGate)).toEqual([
      'line 1: is not behind a debug-only gate',
    ]);
  });
});
