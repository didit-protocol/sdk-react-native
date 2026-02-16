package com.sdkreactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import me.didit.sdk.Configuration
import me.didit.sdk.DiditSdk
import me.didit.sdk.DiditSdkState
import me.didit.sdk.SessionData
import me.didit.sdk.VerificationError
import me.didit.sdk.VerificationResult
import me.didit.sdk.VerificationStatus
import me.didit.sdk.core.localization.SupportedLanguage
import me.didit.sdk.models.ContactDetails
import me.didit.sdk.models.ExpectedDetails

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
        scope.launch {
            try {
                val configuration = parseConfiguration(config)

                DiditSdk.startVerification(
                    token = token,
                    configuration = configuration
                ) { result ->
                    promise.resolve(mapVerificationResult(result))
                }

                // Wait for state to become Ready, then launch the UI
                awaitReadyAndLaunchUI(promise)
            } catch (e: Exception) {
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
        scope.launch {
            try {
                val configuration = parseConfiguration(config)
                val contact = parseContactDetails(contactDetails)
                val expected = parseExpectedDetails(expectedDetails)

                DiditSdk.startVerification(
                    workflowId = workflowId,
                    vendorData = vendorData,
                    metadata = metadata,
                    contactDetails = contact,
                    expectedDetails = expected,
                    configuration = configuration
                ) { result ->
                    promise.resolve(mapVerificationResult(result))
                }

                // Wait for state to become Ready, then launch the UI
                awaitReadyAndLaunchUI(promise)
            } catch (e: Exception) {
                rejectWithError(promise, e)
            }
        }
    }

    // ─── State Observation & UI Launching ────────────────────────────────────

    /**
     * Waits for the SDK state to become Ready, then launches the verification UI.
     * If the state becomes Error, the SDK's onResult callback will fire with a failure.
     */
    private suspend fun awaitReadyAndLaunchUI(promise: Promise) {
        // Collect state until Ready or Error
        DiditSdk.state.first { state ->
            when (state) {
                is DiditSdkState.Ready -> {
                    val activity = currentActivity
                    if (activity != null) {
                        DiditSdk.launchVerificationUI(activity)
                    } else {
                        // Cannot launch UI without an activity
                        val errorResult = mapVerificationResult(
                            VerificationResult.Failed(
                                error = VerificationError.Unknown("No active Activity available to present verification UI."),
                                session = null
                            )
                        )
                        promise.resolve(errorResult)
                    }
                    true // Stop collecting
                }
                is DiditSdkState.Error -> {
                    // The SDK's onResult callback will handle the error
                    true // Stop collecting
                }
                else -> false // Keep waiting
            }
        }
    }

    // ─── Configuration Parsing ───────────────────────────────────────────────

    private fun parseConfiguration(map: ReadableMap?): Configuration? {
        if (map == null) return null

        var language: SupportedLanguage? = null
        if (map.hasKey("languageCode")) {
            val code = map.getString("languageCode")
            if (code != null) {
                language = SupportedLanguage.fromCode(code)
            }
        }

        return Configuration(
            languageLocale = language,
            customIntroScreen = if (map.hasKey("customIntroScreen")) map.getBoolean("customIntroScreen") else false,
            fontFamily = if (map.hasKey("fontFamily")) map.getString("fontFamily") else null,
            loggingEnabled = if (map.hasKey("loggingEnabled")) map.getBoolean("loggingEnabled") else false
        )
    }

    private fun parseContactDetails(map: ReadableMap?): ContactDetails? {
        if (map == null) return null

        return ContactDetails(
            email = if (map.hasKey("email")) map.getString("email") else null,
            sendNotificationEmails = if (map.hasKey("sendNotificationEmails")) map.getBoolean("sendNotificationEmails") else null,
            emailLang = if (map.hasKey("emailLang")) map.getString("emailLang") else null,
            phone = if (map.hasKey("phone")) map.getString("phone") else null
        )
    }

    private fun parseExpectedDetails(map: ReadableMap?): ExpectedDetails? {
        if (map == null) return null

        return ExpectedDetails(
            firstName = if (map.hasKey("firstName")) map.getString("firstName") else null,
            lastName = if (map.hasKey("lastName")) map.getString("lastName") else null,
            dateOfBirth = if (map.hasKey("dateOfBirth")) map.getString("dateOfBirth") else null,
            gender = if (map.hasKey("gender")) map.getString("gender") else null,
            nationality = if (map.hasKey("nationality")) map.getString("nationality") else null,
            country = if (map.hasKey("country")) map.getString("country") else null,
            address = if (map.hasKey("address")) map.getString("address") else null,
            identificationNumber = if (map.hasKey("identificationNumber")) map.getString("identificationNumber") else null,
            ipAddress = if (map.hasKey("ipAddress")) map.getString("ipAddress") else null,
            portraitImage = if (map.hasKey("portraitImage")) map.getString("portraitImage") else null
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
    }
}
