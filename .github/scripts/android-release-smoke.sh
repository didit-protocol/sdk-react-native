#!/usr/bin/env bash
# Launches the example's minified release APK on a running emulator and starts
# a verification through the TurboModule. Fails when the app crashes or never
# shows its screen. Screenshots and logs are written to the output directory.
#
# Usage: android-release-smoke.sh <apk> <output directory>
set -euo pipefail

APK="$1"
OUT="$2"
PACKAGE=sdkreactnative.example
mkdir -p "$OUT"

save_logs() {
  adb logcat -d >"$OUT/logcat.txt" 2>&1 || true
  adb logcat -b crash -d >"$OUT/crash.txt" 2>&1 || true
}
trap save_logs EXIT

fail() {
  echo "::error::$1"
  adb exec-out screencap -p >"$OUT/failure.png" || true
  dump_ui >"$OUT/failure-ui.xml" || true
  exit 1
}

# Prints the current view hierarchy; empty when the dump did not complete.
dump_ui() {
  adb shell rm -f /sdcard/ui.xml
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
  adb shell cat /sdcard/ui.xml 2>/dev/null || true
}

# Waits until the screen shows an element with exactly this text.
wait_for_text() {
  local deadline=$((SECONDS + $2))
  while ((SECONDS < deadline)); do
    if dump_ui | grep -qF "text=\"$1\""; then
      return 0
    fi
    sleep 2
  done
  return 1
}

# Taps the center of the first element whose attributes contain the match.
tap() {
  local bounds
  bounds=$(dump_ui | tr '>' '\n' | grep -F "$1" | head -n 1 |
    sed -nE 's/.*bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]".*/\1 \2 \3 \4/p')
  [ -n "$bounds" ] || fail "No element matching $1 on screen"
  # shellcheck disable=SC2086
  set -- $bounds
  adb shell input tap $((($1 + $3) / 2)) $((($2 + $4) / 2))
}

assert_running() {
  adb shell pidof "$PACKAGE" >/dev/null || fail "$PACKAGE is not running $1"
  if [ -n "$(adb logcat -b crash -d)" ]; then
    adb logcat -b crash -d
    fail "$PACKAGE crashed $1"
  fi
}

adb install -r "$APK"
adb logcat -b all -c

# No network: the check covers launching and the native call, not the API.
adb shell cmd connectivity airplane-mode enable || true

adb shell am start -W -n "$PACKAGE/.MainActivity"
wait_for_text "Didit SDK Example" 120 || fail "The example screen never appeared"
adb exec-out screencap -p >"$OUT/01-launched.png"
assert_running "after launch"

tap 'class="android.widget.EditText"'
adb shell input text r8-smoke-token
tap 'text="Start Verification"'

# The module resolves the call with a failed result, which the example shows
# as an alert.
wait_for_text "Verification Failed" 120 || fail "The verification call never returned"
adb exec-out screencap -p >"$OUT/02-verification-returned.png"
assert_running "after starting a verification"

echo "The minified release launched and the verification module answered."
