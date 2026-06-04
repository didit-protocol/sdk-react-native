require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

legacy_nfc_enabled            = ENV.fetch("DIDIT_SDK_IOS_NFC_ENABLED",            "true").downcase != "false"
legacy_auto_detection_enabled = ENV.fetch("DIDIT_SDK_IOS_AUTO_DETECTION_ENABLED", "true").downcase != "false"
legacy_variant = case [legacy_nfc_enabled, legacy_auto_detection_enabled]
                 when [true,  true]  then "all"
                 when [false, true]  then "autodetection"
                 when [true,  false] then "nfc"
                 when [false, false] then "core"
                 end
didit_sdk_ios_variant = (
  defined?($DiditSdkIosVariant) && $DiditSdkIosVariant ?
    $DiditSdkIosVariant.to_s :
    ENV.fetch("DIDIT_SDK_IOS_VARIANT", legacy_variant)
).downcase

max_ios_version = lambda do |*versions|
  versions.map(&:to_s).max_by { |version| Gem::Version.new(version) }
end

didit_sdk_ios_min_version = ["all", "nfc"].include?(didit_sdk_ios_variant) ? max_ios_version.call(min_ios_version_supported, "15.0") : min_ios_version_supported

didit_sdk_subspec = case didit_sdk_ios_variant
                    when "all"           then "DiditSDK/All"
                    when "core"          then "DiditSDK/Core"
                    when "autodetection" then "DiditSDK/AutoDetection"
                    when "nfc"           then "DiditSDK/NFC"
                    else
                      raise "Invalid DiditSdk iOS variant '#{didit_sdk_ios_variant}'. Set $DiditSdkIosVariant or DIDIT_SDK_IOS_VARIANT to one of: all, core, autodetection, nfc."
                    end

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

  s.static_framework = true
  s.swift_version    = "5.0"

  s.pod_target_xcconfig = {
    "FRAMEWORK_SEARCH_PATHS" => [
      '$(inherited)',
      '"${PODS_CONFIGURATION_BUILD_DIR}/DiditSDK"',
      '"${PODS_XCFRAMEWORKS_BUILD_DIR}/DiditSDK"',
      '"${PODS_XCFRAMEWORKS_BUILD_DIR}/DiditSDK/All"',
      '"${PODS_XCFRAMEWORKS_BUILD_DIR}/DiditSDK/Core"',
      '"${PODS_XCFRAMEWORKS_BUILD_DIR}/DiditSDK/AutoDetection"',
      '"${PODS_XCFRAMEWORKS_BUILD_DIR}/DiditSDK/NFC"'
    ].join(" ")
  }

  s.dependency didit_sdk_subspec, "4.0.3"

  install_modules_dependencies(s)
end
