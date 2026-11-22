package com.sdkreactnative

import me.didit.sdk.BankLinkEvent
import me.didit.sdk.BankLinkResult
import org.json.JSONArray
import org.json.JSONException
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

    fun event(event: BankLinkEvent): String = try {
        JSONObject()
            .put("name", event.name)
            .put("payload", payloadJson(event.payload))
            .toString()
    } catch (e: JSONException) {
        // A payload the JSON writer cannot carry must not throw inside the
        // native event callback: the event still arrives, with what is safe.
        JSONObject()
            .put("name", event.name)
            .put("payload", JSONObject())
            .toString()
    }

    /**
     * An event payload as JSON. Mirrors the iOS `jsonSafe` guard: strings,
     * numbers, booleans, arrays and maps travel; anything else becomes `null`
     * instead of throwing inside the callback.
     */
    private fun payloadJson(payload: Map<String, Any?>): JSONObject {
        val json = JSONObject()
        for ((key, value) in payload) {
            json.put(key, jsonSafe(value))
        }
        return json
    }

    private fun jsonSafe(value: Any?): Any = when (value) {
        null -> JSONObject.NULL
        is String, is Boolean -> value
        is Double -> if (value.isFinite()) value else JSONObject.NULL
        is Float -> if (value.isFinite()) value else JSONObject.NULL
        is Number -> value
        is Map<*, *> -> JSONObject().also { json ->
            for ((key, nested) in value) {
                if (key is String) json.put(key, jsonSafe(nested))
            }
        }
        is Iterable<*> -> JSONArray().also { array ->
            for (element in value) array.put(jsonSafe(element))
        }
        else -> JSONObject.NULL
    }

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
