require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
didit_sdk_ios_nfc_enabled = ENV.fetch("DIDIT_SDK_IOS_NFC_ENABLED", "true").downcase != "false"
max_ios_version = lambda do |*versions|
  versions.map(&:to_s).max_by { |version| Gem::Version.new(version) }
end

didit_sdk_ios_min_version = didit_sdk_ios_nfc_enabled ? max_ios_version.call(min_ios_version_supported, "15.0") : min_ios_version_supported

Pod::Spec.new do |s|
  s.name         = "SdkReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => didit_sdk_ios_min_version }
  s.source       = { :git => "https://github.com/didit-protocol/sdk-react-native.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"
  s.private_header_files = "ios/**/*.h"

  # Required for MediaPipe static binary in DiditSDK
  s.static_framework = true

  # Swift version for the bridge files
  s.swift_version = "5.0"
  s.pod_target_xcconfig = {
    "FRAMEWORK_SEARCH_PATHS" => '$(inherited) "${PODS_CONFIGURATION_BUILD_DIR}/DiditSDK" "${PODS_XCFRAMEWORKS_BUILD_DIR}/DiditSDK" "${PODS_XCFRAMEWORKS_BUILD_DIR}/DiditSDK/Core" "${PODS_XCFRAMEWORKS_BUILD_DIR}/DiditSDK/Full"'
  }

  # Didit native iOS SDK dependency
  didit_sdk_ios_pod = didit_sdk_ios_nfc_enabled ? "DiditSDK" : "DiditSDK/Core"
  s.dependency didit_sdk_ios_pod, "~> 3.5"

  install_modules_dependencies(s)
end
