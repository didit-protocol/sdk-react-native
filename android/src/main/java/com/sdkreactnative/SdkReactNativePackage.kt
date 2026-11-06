package com.sdkreactnative

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class SdkReactNativePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == SdkReactNativeModule.NAME) {
      SdkReactNativeModule(reactContext)
    } else {
      null
    }
  }

  // Direct call, never a reflective lookup: R8's optimizing pass rewrites
  // ReactModuleInfo's constructors, so counting their parameters at runtime
  // crashed minified apps on launch (issue #61). This 6-parameter constructor
  // exists in every supported React Native release (0.76+), and the library
  // compiles inside the host build, so a React Native that dropped it fails
  // that build instead of the app.
  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      SdkReactNativeModule.NAME to ReactModuleInfo(
        SdkReactNativeModule.NAME,
        SdkReactNativeModule.NAME,
        false, // canOverrideExistingModule
        false, // needsEagerInit
        false, // isCxxModule
        true   // isTurboModule
      )
    )
  }
}
