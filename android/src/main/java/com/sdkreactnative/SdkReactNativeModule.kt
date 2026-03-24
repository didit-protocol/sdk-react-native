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
import me.didit.sdk.Configuration
import me.didit.sdk.DiditSdk
import me.didit.sdk.DiditSdkState
import me.didit.sdk.SessionData
import me.didit.sdk.VerificationError
import me.didit.sdk.VerificationResult
import me.didit.sdk.VerificationStatus
import me.didit.sdk.core.localization.SupportedLanguage

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
        Log.d(TAG, "startVerification: token=${token.take(8)}..., config=$config")
        val activity = currentActivity
        scope.launch {
            try {
                val configuration = parseConfiguration(config)
                Log.d(TAG, "startVerification: parsed configuration=$configuration")

                DiditSdk.startVerification(
                    token = token,
                    configuration = configuration
                ) { result ->
                    Log.d(TAG, "startVerification: onResult callback fired, type=${result::class.simpleName}")
                    promise.resolve(mapVerificationResult(result))
                }

                awaitReadyAndLaunchUI(promise, activity)
            } catch (e: Exception) {
                Log.e(TAG, "startVerification: exception", e)
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
        Log.d(TAG, "startVerificationWithWorkflow: workflowId=$workflowId, vendorData=$vendorData, metadata=$metadata")
        Log.d(TAG, "startVerificationWithWorkflow: contactDetails=$contactDetails, expectedDetails=$expectedDetails, config=$config")
        val activity = currentActivity
        scope.launch {
            try {
                val configuration = parseConfiguration(config)
                Log.d(TAG, "startVerificationWithWorkflow: parsed configuration=$configuration")

                DiditSdk.startVerification(
                    workflowId = workflowId,
                    vendorData = vendorData,
                    configuration = configuration
                ) { result ->
                    Log.d(TAG, "startVerificationWithWorkflow: onResult callback fired, type=${result::class.simpleName}")
                    promise.resolve(mapVerificationResult(result))
                }

                awaitReadyAndLaunchUI(promise, activity)
            } catch (e: Exception) {
                Log.e(TAG, "startVerificationWithWorkflow: exception", e)
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
            Log.e(TAG, "awaitReadyAndLaunchUI: no active Activity at call time")
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
                Log.d(TAG, "awaitReadyAndLaunchUI: SDK state = $state")
                when (state) {
                    is DiditSdkState.Ready -> {
                        Log.d(TAG, "awaitReadyAndLaunchUI: launching verification UI")
                        DiditSdk.launchVerificationUI(activity)
                        true
                    }
                    is DiditSdkState.Error -> {
                        Log.e(TAG, "awaitReadyAndLaunchUI: SDK entered Error state: ${state.message}")
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
            Log.e(TAG, "awaitReadyAndLaunchUI: timed out waiting for SDK state after ${TIMEOUT_MS}ms")
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
            fontFamily = if (map.hasKey("fontFamily")) map.getString("fontFamily") else null,
            loggingEnabled = if (map.hasKey("loggingEnabled")) map.getBoolean("loggingEnabled") else false,
            showCloseButton = if (map.hasKey("showCloseButton")) map.getBoolean("showCloseButton") else true,
            showExitConfirmation = if (map.hasKey("showExitConfirmation")) map.getBoolean("showExitConfirmation") else true,
            closeOnComplete = if (map.hasKey("closeOnComplete")) map.getBoolean("closeOnComplete") else false
        )
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

    companion object {
        const val NAME = NativeSdkReactNativeSpec.NAME
        private const val TAG = "DiditSdkRN"
    }
}
