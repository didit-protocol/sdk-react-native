package me.didit.authreactnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

/** Native auth remains unavailable until its reviewed implementation is linked. */
@ReactModule(name = DiditAuthModule.NAME)
class DiditAuthModule(context: ReactApplicationContext) : NativeDiditAuthSpec(context) {
  override fun getName() = NAME

  override fun signIn(promise: Promise) = unavailable(promise)
  override fun currentSession(promise: Promise) = unavailable(promise)
  override fun getToken(promise: Promise) = unavailable(promise)
  override fun signOut(promise: Promise) = unavailable(promise)
  override fun stepUp(promise: Promise) = unavailable(promise)

  private fun unavailable(promise: Promise) {
    promise.reject("ERR_DIDIT_AUTH_UNAVAILABLE", "DiditAuth is unavailable in this build.")
  }

  companion object {
    const val NAME = "DiditAuthReactNative"
  }
}
