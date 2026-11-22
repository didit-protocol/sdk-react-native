package com.sdkreactnative

import android.app.Activity
import android.net.Uri
import me.didit.sdk.Configuration

/**
 * Bank Link without the native API: the pinned released SDK predates it.
 *
 * The module checks [available] and rejects `not_available` before calling any
 * of these, so a released-only build never presents a flow the native SDK
 * cannot run.
 */
internal object BankLinkSupport {

    const val available = false

    fun present(
        activity: Activity,
        token: String,
        configuration: Configuration?,
        onEvent: (String) -> Unit,
        onResult: (String) -> Unit
    ) = Unit

    fun resume(
        activity: Activity,
        onEvent: (String) -> Unit,
        onResult: (String) -> Unit
    ): Boolean = false

    fun handle(uri: Uri) = Unit
}
