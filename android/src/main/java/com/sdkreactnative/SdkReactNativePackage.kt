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

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    val constructors = ReactModuleInfo::class.java.constructors
    val sevenParamCtor = constructors.firstOrNull { it.parameterTypes.size == 7 }
    val info = if (sevenParamCtor != null) {
      // RN 0.76–0.78: constructor includes hasConstants parameter
      sevenParamCtor.newInstance(
        SdkReactNativeModule.NAME,
        SdkReactNativeModule.NAME,
        false, // canOverrideExistingModule
        false, // needsEagerInit
        false, // hasConstants
        false, // isCxxModule
        true   // isTurboModule
      )
    } else {
      // RN 0.79+: hasConstants was removed
      constructors.first { it.parameterTypes.size == 6 }.newInstance(
        SdkReactNativeModule.NAME,
        SdkReactNativeModule.NAME,
        false, // canOverrideExistingModule
        false, // needsEagerInit
        false, // isCxxModule
        true   // isTurboModule
      )
    } as ReactModuleInfo
    mapOf(SdkReactNativeModule.NAME to info)
  }
}
