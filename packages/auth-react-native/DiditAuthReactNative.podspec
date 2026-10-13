require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name = "DiditAuthReactNative"
  s.version = package["version"]
  s.summary = package["description"]
  s.homepage = package["homepage"]
  s.license = package["license"]
  s.authors = "Didit"
  s.platforms = { :ios => min_ios_version_supported }
  s.source = { :git => "https://github.com/didit-protocol/sdk-react-native.git", :tag => "auth-react-native-v#{s.version}" }
  s.source_files = "ios/**/*.{h,mm}"
  s.private_header_files = "ios/**/*.h"

  # No DiditAuth dependency until a reviewed native artifact is available.
  install_modules_dependencies(s)
end
