package me.didit.authreactnative

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class DiditAuthPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == DiditAuthModule.NAME) DiditAuthModule(reactContext) else null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(DiditAuthModule.NAME to ReactModuleInfo(
      DiditAuthModule.NAME,
      DiditAuthModule::class.java.name,
      false, // canOverrideExistingModule
      false, // needsEagerInit
      false, // isCxxModule
      true   // isTurboModule
    ))
  }
}
