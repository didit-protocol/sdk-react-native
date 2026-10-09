package com.sdkreactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import me.didit.sdk.CameraLens
import me.didit.sdk.Configuration
import me.didit.sdk.DiditSdk
import me.didit.sdk.DiditSdkState
import me.didit.sdk.SessionData
import me.didit.sdk.VerificationError
import me.didit.sdk.VerificationResult
import me.didit.sdk.VerificationStatus
import me.didit.sdk.core.localization.SupportedLanguage
import me.didit.sdk.transactions.DiditTransactionException
import me.didit.sdk.transactions.DiditTransactionOptions
import org.json.JSONException
import org.json.JSONObject

class SdkReactNativeModule(reactContext: ReactApplicationContext) :
    NativeSdkReactNativeSpec(reactContext) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun initialize() {
        super.initialize()
        // Auto-initialize the SDK so consumers don't need to modify MainApplication
        if (!DiditSdk.isInitialized()) {
            DiditSdk.initialize(reactApplicationContext)
        }
    }

    // ─── Start Verification with Token ───────────────────────────────────────

    override fun startVerification(
        token: String,
        config: ReadableMap?,
        promise: Promise
    ) {
        logDebug("startVerification: started")
        val activity = reactApplicationContext.currentActivity
        scope.launch {
            try {
                val configuration = parseConfiguration(config)

                DiditSdk.startVerification(
                    token = token,
                    configuration = configuration
                ) { result ->
                    logDebug("startVerification: onResult callback fired, type=${result::class.simpleName}")
                    promise.resolve(mapVerificationResult(result))
                }

                awaitReadyAndLaunchUI(promise, activity)
            } catch (e: Exception) {
                logDebugError("startVerification: exception", e)
                rejectWithError(promise, e)
            }
        }
    }

    // ─── Start Verification with Workflow ────────────────────────────────────

    override fun startVerificationWithWorkflow(
        workflowId: String,
        vendorData: String?,
        metadata: String?,
        contactDetails: ReadableMap?,
        expectedDetails: ReadableMap?,
        config: ReadableMap?,
        promise: Promise
    ) {
        logDebug("startVerificationWithWorkflow: started")
        val activity = reactApplicationContext.currentActivity
        scope.launch {
            try {
                val configuration = parseConfiguration(config)

                DiditSdk.startVerification(
                    workflowId = workflowId,
                    vendorData = vendorData,
                    configuration = configuration
                ) { result ->
                    logDebug("startVerificationWithWorkflow: onResult callback fired, type=${result::class.simpleName}")
                    promise.resolve(mapVerificationResult(result))
                }

                awaitReadyAndLaunchUI(promise, activity)
            } catch (e: Exception) {
                logDebugError("startVerificationWithWorkflow: exception", e)
                rejectWithError(promise, e)
            }
        }
    }

    // ─── State Observation & UI Launching ────────────────────────────────────

    /**
     * Waits for the SDK state to become Ready, then launches the verification UI.
     * If the state becomes Error, resolves the promise with a failure result.
     * Includes a timeout to prevent the promise from hanging indefinitely.
     */
    private suspend fun awaitReadyAndLaunchUI(promise: Promise, activity: android.app.Activity?) {
        if (activity == null) {
            logDebugError("awaitReadyAndLaunchUI: no active Activity at call time")
            val errorResult = mapVerificationResult(
                VerificationResult.Failed(
                    error = VerificationError.Unknown("No active Activity available to present verification UI."),
                    session = null
                )
            )
            promise.resolve(errorResult)
            return
        }

        val TIMEOUT_MS = 30_000L

        val stateReached = withTimeoutOrNull(TIMEOUT_MS) {
            DiditSdk.state.first { state ->
                logDebug("awaitReadyAndLaunchUI: SDK state = ${state::class.simpleName}")
                when (state) {
                    is DiditSdkState.Ready -> {
                        logDebug("awaitReadyAndLaunchUI: launching verification UI")
                        DiditSdk.launchVerificationUI(activity)
                        true
                    }
                    is DiditSdkState.Error -> {
                        logDebugError("awaitReadyAndLaunchUI: SDK entered Error state")
                        val errorResult = mapVerificationResult(
                            VerificationResult.Failed(
                                error = VerificationError.Unknown(state.message ?: "SDK entered error state."),
                                session = null
                            )
                        )
                        promise.resolve(errorResult)
                        true
                    }
                    else -> false
                }
            }
        }

        if (stateReached == null) {
            logDebugError("awaitReadyAndLaunchUI: timed out waiting for SDK state after ${TIMEOUT_MS}ms")
            val errorResult = mapVerificationResult(
                VerificationResult.Failed(
                    error = VerificationError.Unknown("Timed out waiting for verification SDK to become ready."),
                    session = null
                )
            )
            promise.resolve(errorResult)
        }
    }

    // ─── Configuration Parsing ───────────────────────────────────────────────

    private fun parseConfiguration(map: ReadableMap?): Configuration? {
        if (map == null || !map.keySetIterator().hasNextKey()) return null

        var language: SupportedLanguage? = null
        if (map.hasKey("languageCode")) {
            val code = map.getString("languageCode")
            if (code != null) {
                language = SupportedLanguage.fromCode(code)
            }
        }

        return Configuration(
            languageLocale = language,
            showLanguageSelector = if (map.hasKey("showLanguageSelector")) map.getBoolean("showLanguageSelector") else false,
            fontFamily = if (map.hasKey("fontFamily")) map.getString("fontFamily") else null,
            loggingEnabled = if (map.hasKey("loggingEnabled")) map.getBoolean("loggingEnabled") else false,
            showCloseButton = if (map.hasKey("showCloseButton")) map.getBoolean("showCloseButton") else true,
            showExitConfirmation = if (map.hasKey("showExitConfirmation")) map.getBoolean("showExitConfirmation") else true,
            closeOnComplete = if (map.hasKey("closeOnComplete")) map.getBoolean("closeOnComplete") else false,
            defaultDocumentCamera = if (map.hasKey("defaultDocumentCamera")) parseCameraLens(map.getString("defaultDocumentCamera")) ?: CameraLens.BACK else CameraLens.BACK,
            defaultLivenessCamera = if (map.hasKey("defaultLivenessCamera")) parseCameraLens(map.getString("defaultLivenessCamera")) ?: CameraLens.FRONT else CameraLens.FRONT,
            showDocumentCameraSwitchButton = if (map.hasKey("showDocumentCameraSwitchButton")) map.getBoolean("showDocumentCameraSwitchButton") else true,
            showLivenessCameraSwitchButton = if (map.hasKey("showLivenessCameraSwitchButton")) map.getBoolean("showLivenessCameraSwitchButton") else true
        )
    }

    private fun parseCameraLens(value: String?): CameraLens? = when (value?.lowercase()) {
        "front" -> CameraLens.FRONT
        "back" -> CameraLens.BACK
        else -> null
    }


    // ─── Result Mapping ──────────────────────────────────────────────────────

    private fun mapVerificationResult(result: VerificationResult): WritableMap {
        val map = Arguments.createMap()

        when (result) {
            is VerificationResult.Completed -> {
                map.putString("type", "completed")
                putSessionData(map, result.session)
            }
            is VerificationResult.Cancelled -> {
                map.putString("type", "cancelled")
                result.session?.let { putSessionData(map, it) }
            }
            is VerificationResult.Failed -> {
                map.putString("type", "failed")
                map.putString("errorType", mapErrorType(result.error))
                map.putString("errorMessage", result.error.message ?: "An unknown error occurred.")
                result.session?.let { putSessionData(map, it) }
            }
        }

        return map
    }

    private fun putSessionData(map: WritableMap, session: SessionData) {
        map.putString("sessionId", session.sessionId)
        map.putString("status", session.status.rawValue)
    }

    private fun mapErrorType(error: VerificationError): String {
        return when (error) {
            is VerificationError.SessionExpired -> "sessionExpired"
            is VerificationError.NetworkError -> "networkError"
            is VerificationError.CameraAccessDenied -> "cameraAccessDenied"
            is VerificationError.NotInitialized -> "notInitialized"
            is VerificationError.ApiError -> "apiError"
            is VerificationError.RetryBlocked -> "retryBlocked"
            is VerificationError.Unknown -> "unknown"
        }
    }

    private fun rejectWithError(promise: Promise, e: Exception) {
        val result = Arguments.createMap()
        result.putString("type", "failed")
        result.putString("errorType", "unknown")
        result.putString("errorMessage", e.message ?: "An unexpected error occurred.")
        promise.resolve(result)
    }

    // ─── Transactions ────────────────────────────────────────────────────────

    override fun submitTransaction(
        transactionToken: String,
        transactionJson: String,
        optionsJson: String,
        promise: Promise
    ) {
        scope.launch {
            try {
                val payload = TransactionJson.parsePayload(transactionJson)
                val options = JSONObject(optionsJson)
                val callId = options.optString("callId")
                val result = DiditSdk.submitTransaction(
                    transactionToken = transactionToken,
                    transaction = payload,
                    options = DiditTransactionOptions(
                        baseUrl = options.optString("baseUrl").takeIf { it.isNotEmpty() },
                        autoLaunchAction = options.optBoolean("autoLaunchAction", true),
                        onTransactionUpdated = { refreshed ->
                            emitOnTransactionUpdated(TransactionJson.eventJson(callId, refreshed))
                        }
                    )
                )
                promise.resolve(TransactionJson.resultJson(result))
            } catch (e: Exception) {
                logDebugError("submitTransaction: exception", e)
                rejectTransactionError(promise, e)
            }
        }
    }

    override fun getTransaction(
        transactionToken: String,
        transactionId: String,
        optionsJson: String,
        promise: Promise
    ) {
        scope.launch {
            try {
                val options = JSONObject(optionsJson)
                val result = DiditSdk.getTransaction(
                    transactionToken = transactionToken,
                    transactionId = transactionId,
                    options = DiditTransactionOptions(
                        baseUrl = options.optString("baseUrl").takeIf { it.isNotEmpty() }
                    )
                )
                promise.resolve(TransactionJson.resultJson(result))
            } catch (e: Exception) {
                logDebugError("getTransaction: exception", e)
                rejectTransactionError(promise, e)
            }
        }
    }

    private fun rejectTransactionError(promise: Promise, e: Exception) {
        when (e) {
            is DiditTransactionException.InvalidToken ->
                promise.reject("invalid_token", e.message, e)
            is DiditTransactionException.ExpiredToken ->
                promise.reject("expired_token", e.message, e)
            is DiditTransactionException.Validation -> {
                val userInfo = Arguments.createMap()
                userInfo.putString("fieldErrors", JSONObject(e.fieldErrors).toString())
                promise.reject("validation", e.message, e, userInfo)
            }
            is DiditTransactionException.Network ->
                promise.reject("network", e.message, e)
            is JSONException ->
                promise.reject("validation", e.message ?: "Invalid transaction payload.", e)
            else ->
                promise.reject("network", e.message ?: "Transaction request failed.", e)
        }
    }

    // ─── Diagnostics ─────────────────────────────────────────────────────────

    /**
     * Debug-build-only logging. The release build type does not minify, so
     * nothing strips a plain Log call: every diagnostic goes through these two
     * helpers, and no call site may pass a session token, personal data or a
     * native error message. src/__tests__/android-logging-privacy.test.ts fails
     * the build if one does.
     */
    private fun logDebug(message: String) {
        if (BuildConfig.DEBUG) Log.d(TAG, message)
    }

    private fun logDebugError(message: String, error: Throwable? = null) {
        if (BuildConfig.DEBUG) Log.e(TAG, message, error)
    }

    companion object {
        const val NAME = NativeSdkReactNativeSpec.NAME
        private const val TAG = "DiditSdkRN"
    }
}
