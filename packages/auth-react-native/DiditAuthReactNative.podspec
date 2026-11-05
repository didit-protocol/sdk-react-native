require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# Single source of truth for the native iOS version: the same release as the
# verification package's, so both can share one app.
didit_sdk_ios_version = package.dig("diditNativeSdkVersions", "ios").to_s
if didit_sdk_ios_version.empty?
  raise "Missing 'diditNativeSdkVersions.ios' in package.json - cannot pin DiditSDK/Auth."
end

# "cocoapods" (default) depends on the DiditSDK/Auth subspec, whose podspec the
# host declares; "spm" adds the DiditAuth product of the sdk-ios package. One
# setting for both Didit packages, as in SdkReactNative.podspec.
didit_sdk_ios_linkage = (
  defined?($DiditSdkIosLinkage) && $DiditSdkIosLinkage ?
    $DiditSdkIosLinkage.to_s :
    ENV.fetch("DIDIT_SDK_IOS_LINKAGE", "cocoapods")
).downcase

unless ["spm", "cocoapods"].include?(didit_sdk_ios_linkage)
  raise "Invalid DiditSdk iOS linkage '#{didit_sdk_ios_linkage}'. Set $DiditSdkIosLinkage or DIDIT_SDK_IOS_LINKAGE to one of: spm, cocoapods."
end
if didit_sdk_ios_linkage == "spm" && !defined?(spm_dependency)
  raise "DiditSdk iOS linkage 'spm' requires React Native 0.75 or newer (spm_dependency is unavailable). Use the 'cocoapods' linkage instead."
end

Pod::Spec.new do |s|
  s.name = "DiditAuthReactNative"
  s.version = package["version"]
  s.summary = package["description"]
  s.homepage = package["homepage"]
  s.license = package["license"]
  s.authors = "Didit"
  # DiditAuth needs iOS 15; its hosted pages need 17.4 at run time.
  s.platforms = { :ios => [min_ios_version_supported, "15.0"].max_by { |version| Gem::Version.new(version) } }
  s.source = { :git => "https://github.com/didit-protocol/sdk-react-native.git", :tag => "auth-react-native-v#{s.version}" }
  s.source_files = "ios/**/*.{h,mm,swift}"
  s.private_header_files = "ios/**/*.h"

  s.static_framework = true
  s.swift_version = "5.0"

  s.pod_target_xcconfig = {
    "FRAMEWORK_SEARCH_PATHS" => [
      '$(inherited)',
      '"${PODS_CONFIGURATION_BUILD_DIR}/DiditSDK"',
      '"${PODS_XCFRAMEWORKS_BUILD_DIR}/DiditSDK"',
      '"${PODS_XCFRAMEWORKS_BUILD_DIR}/DiditSDK/Auth"'
    ].join(" ")
  }

  if didit_sdk_ios_linkage == "spm"
    spm_dependency(s,
      url: "https://github.com/didit-protocol/sdk-ios.git",
      requirement: { kind: "exactVersion", version: didit_sdk_ios_version },
      products: ["DiditAuth"]
    )
  else
    s.dependency "DiditSDK/Auth", didit_sdk_ios_version
  end

  install_modules_dependencies(s)
end
