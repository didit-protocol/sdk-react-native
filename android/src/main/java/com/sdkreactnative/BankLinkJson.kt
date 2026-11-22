package com.sdkreactnative

import me.didit.sdk.BankLinkEvent
import me.didit.sdk.BankLinkResult
import org.json.JSONObject

/**
 * The Bank Link values the TurboModule hands JavaScript.
 *
 * An event travels as `{ name, payload }`, with the wire name of the link
 * contract (`opened`, `consent_shown`, ..., `error`) and its ids-only payload;
 * a presentation travels as one result object. JavaScript maps both, so the
 * keys here are the ones `src/bankLink.ts` reads and nothing else.
 *
 * Native Bank Link is not released yet: this file and the module's three Bank
 * Link overrides are the only place that touches it, and they are reconciled
 * with the native Android API of the Bank Link issue when the version that
 * carries it is pinned.
 */
internal object BankLinkJson {

    /** The JSON `null` a resume answers when nothing is pending. */
    const val NONE = "null"

    fun event(event: BankLinkEvent): String = JSONObject()
        .put("name", event.name)
        .put("payload", JSONObject(event.payload))
        .toString()

    fun result(result: BankLinkResult): String = when (result) {
        is BankLinkResult.Success -> JSONObject()
            .put("type", "success")
            .put("linkId", result.linkId)
            .put("connectionId", result.connectionId ?: JSONObject.NULL)
            .put("checkId", result.checkId ?: JSONObject.NULL)
            .put("resumed", result.resumed)
            .toString()

        is BankLinkResult.Exit -> exit(result.reason, result.step, result.resumed)
    }

    fun exit(reason: String, step: String?, resumed: Boolean): String = JSONObject()
        .put("type", "exit")
        .put("reason", reason)
        .put("step", step ?: JSONObject.NULL)
        .put("resumed", resumed)
        .toString()
}
