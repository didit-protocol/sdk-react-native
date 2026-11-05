package me.didit.authreactnative

import android.app.Activity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import me.didit.sdk.auth.DiditAuth
import me.didit.sdk.auth.DiditAuthException
import me.didit.sdk.auth.DiditSession
import me.didit.sdk.auth.DiditStepUpAction
import me.didit.sdk.auth.DiditStepUpResult
import org.json.JSONArray
import org.json.JSONObject

/** Forwards every call to native DiditAuth; its error codes reach JavaScript unchanged. */
@ReactModule(name = DiditAuthModule.NAME)
class DiditAuthModule(context: ReactApplicationContext) : NativeDiditAuthSpec(context) {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

  // One DiditAuth per application, created and read on the main thread only.
  private val instances = mutableMapOf<Pair<String, String>, DiditAuth>()

  override fun getName() = NAME

  override fun signIn(publishableKey: String, redirectUri: String, promise: Promise) =
    forward(publishableKey, redirectUri, promise) { auth -> json(session(auth.signIn(activity()))) }

  override fun signInWithPasskey(publishableKey: String, redirectUri: String, promise: Promise) =
    forward(publishableKey, redirectUri, promise) { auth -> json(session(auth.signInWithPasskey(activity()))) }

  override fun registerPasskey(publishableKey: String, redirectUri: String, promise: Promise) =
    forward(publishableKey, redirectUri, promise) { auth -> auth.registerPasskey(activity()) }

  override fun currentSession(publishableKey: String, redirectUri: String, force: Boolean, promise: Promise) =
    forward(publishableKey, redirectUri, promise) { auth -> auth.currentSession(force)?.let { json(session(it)) } }

  override fun getToken(publishableKey: String, redirectUri: String, promise: Promise) =
    forward(publishableKey, redirectUri, promise) { auth -> auth.getToken() }

  override fun signOut(publishableKey: String, redirectUri: String, promise: Promise) =
    forward(publishableKey, redirectUri, promise) { auth -> auth.signOut(); null }

  override fun stepUp(
    publishableKey: String,
    redirectUri: String,
    action: String,
    amount: String?,
    currency: String?,
    promise: Promise
  ) = forward(publishableKey, redirectUri, promise) { auth ->
    json(stepUpResult(auth.stepUp(activity(), stepUpAction(action, amount, currency))))
  }

  override fun invalidate() {
    scope.cancel()
    super.invalidate()
  }

  private fun forward(
    publishableKey: String,
    redirectUri: String,
    promise: Promise,
    block: suspend (DiditAuth) -> Any?
  ) {
    scope.launch {
      try {
        promise.resolve(block(auth(publishableKey, redirectUri)))
      } catch (e: CancellationException) {
        throw e
      } catch (e: DiditAuthException) {
        promise.reject(e.code, e.message, e, userInfo(e))
      } catch (e: Exception) {
        promise.reject(UNSPECIFIED, e.message, e)
      }
    }
  }

  private fun auth(publishableKey: String, redirectUri: String): DiditAuth =
    instances.getOrPut(publishableKey to redirectUri) {
      try {
        DiditAuth(reactApplicationContext, publishableKey, redirectUri)
      } catch (e: IllegalArgumentException) {
        // Android validates the redirect with require(); iOS throws this code for it.
        throw DiditAuthException("invalid_redirect_uri", e.message ?: "redirectUri is not a valid HTTPS address.")
      }
    }

  private fun activity(): Activity =
    reactApplicationContext.currentActivity
      ?: throw DiditAuthException("browser_unavailable", "No activity is in the foreground to show the Didit page.")

  private fun stepUpAction(action: String, amount: String?, currency: String?): DiditStepUpAction =
    when (action) {
      "payout" -> DiditStepUpAction.Payout(
        amount ?: throw DiditAuthException("invalid_request", "A payout step-up needs an amount."),
        currency
      )
      "bank" -> DiditStepUpAction.BankAccount
      "contact" -> DiditStepUpAction.ContactChange
      else -> throw DiditAuthException("invalid_request", "Unknown step-up action: $action.")
    }

  private fun userInfo(e: DiditAuthException) = Arguments.createMap().apply {
    e.status?.let { putInt("status", it) }
    e.retryAfterSeconds?.let { putInt("retryAfter", it) }
    e.fields?.let { fields ->
      putMap("fields", Arguments.createMap().apply {
        fields.forEach { (field, codes) -> putArray(field, Arguments.fromList(codes)) }
      })
    }
  }

  companion object {
    const val NAME = "DiditAuthReactNative"

    // React Native's code for a rejection that is not a DiditAuth error.
    private const val UNSPECIFIED = "EUNSPECIFIED"

    fun session(session: DiditSession): Map<String, Any?> = mapOf(
      "userId" to session.userId,
      "sessionId" to session.sessionId,
      "applicationId" to session.applicationId,
      "vendorData" to session.vendorData,
      "email" to session.email,
      "emailVerified" to session.emailVerified,
      "phone" to session.phone,
      "methods" to session.methods,
      "mfaVerified" to session.mfaVerified,
      "verified" to session.verified,
      "organizations" to session.organizations.map { mapOf("id" to it.id, "name" to it.name, "role" to it.role) },
      "expiresAt" to session.expiresAt
    )

    fun stepUpResult(result: DiditStepUpResult): Map<String, Any?> = mapOf(
      "id" to result.id,
      "status" to result.status,
      "approved" to result.isApproved,
      "rule" to result.rule,
      "method" to result.method
    )

    /** JSON text, keeping nulls (org.json drops null map values). */
    fun json(value: Map<String, Any?>): String = (toJson(value) as JSONObject).toString()

    private fun toJson(value: Any?): Any = when (value) {
      null -> JSONObject.NULL
      is Map<*, *> -> JSONObject().apply { value.forEach { (key, item) -> put(key.toString(), toJson(item)) } }
      is Iterable<*> -> JSONArray().apply { value.forEach { put(toJson(it)) } }
      else -> value
    }
  }
}
