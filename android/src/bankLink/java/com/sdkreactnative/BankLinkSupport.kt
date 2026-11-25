package com.sdkreactnative

import android.app.Activity
import android.net.Uri
import me.didit.sdk.Configuration
import me.didit.sdk.DiditSdk

/**
 * The native Bank Link calls, compiled only when the pinned native SDK carries
 * Bank Link (a source pin, or `diditNativeSdkVersions.bankLink` once released).
 *
 * The released-only build compiles the counterpart in `src/released` instead,
 * so the module keeps building against a native SDK that predates Bank Link.
 */
internal object BankLinkSupport {

    const val available = true

    /** The JSON `null` a resume answers when nothing is pending. */
    const val NONE = "null"

    fun present(
        activity: Activity,
        token: String,
        configuration: Configuration?,
        onEvent: (String) -> Unit,
        onResult: (String) -> Unit
    ) {
        val presented = DiditSdk.presentBankLink(
            activity = activity,
            token = token,
            configuration = configuration,
            onEvent = { event -> onEvent(BankLinkJson.event(event)) },
            onResult = { result -> onResult(BankLinkJson.result(result)) }
        )
        check(presented) { "Bank Link presentation was declined." }
    }

    fun resume(
        activity: Activity,
        onEvent: (String) -> Unit,
        onResult: (String) -> Unit
    ): Boolean = DiditSdk.resumeBankLink(
        activity = activity,
        onEvent = { event -> onEvent(BankLinkJson.event(event)) },
        onResult = { result -> onResult(BankLinkJson.result(result)) }
    )

    fun handle(uri: Uri) {
        DiditSdk.handleBankLinkReturn(uri)
    }
}
