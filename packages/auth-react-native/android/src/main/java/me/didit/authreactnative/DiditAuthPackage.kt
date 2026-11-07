package me.didit.authreactnative

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class DiditAuthPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == DiditAuthModule.NAME) DiditAuthModule(reactContext) else null

  // Direct call, never a reflective lookup: R8's optimizing pass rewrites
  // ReactModuleInfo's constructors, so counting their parameters at runtime
  // crashed minified apps on launch. This 6-parameter constructor exists in
  // every React Native release this package supports.
  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      DiditAuthModule.NAME to ReactModuleInfo(
        DiditAuthModule.NAME,
        DiditAuthModule::class.java.name,
        false, // canOverrideExistingModule
        false, // needsEagerInit
        false, // isCxxModule
        true   // isTurboModule
      )
    )
  }
}
