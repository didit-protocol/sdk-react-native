package com.sdkreactnative

import com.facebook.react.bridge.ReactApplicationContext

class SdkReactNativeModule(reactContext: ReactApplicationContext) :
  NativeSdkReactNativeSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeSdkReactNativeSpec.NAME
  }
}
