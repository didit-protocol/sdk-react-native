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
    val constructors = ReactModuleInfo::class.java.constructors
    val sevenParamCtor = constructors.firstOrNull { it.parameterTypes.size == 7 }
    val info = if (sevenParamCtor != null) {
      // RN 0.77-0.78 includes hasConstants; newer versions may retain this overload.
      sevenParamCtor.newInstance(
        DiditAuthModule.NAME,
        DiditAuthModule::class.java.name,
        false, // canOverrideExistingModule
        false, // needsEagerInit
        false, // hasConstants
        false, // isCxxModule
        true   // isTurboModule
      )
    } else {
      // RN 0.79+ also supports registration without hasConstants.
      constructors.first { it.parameterTypes.size == 6 }.newInstance(
        DiditAuthModule.NAME,
        DiditAuthModule::class.java.name,
        false, // canOverrideExistingModule
        false, // needsEagerInit
        false, // isCxxModule
        true   // isTurboModule
      )
    } as ReactModuleInfo
    mapOf(DiditAuthModule.NAME to info)
  }
}
