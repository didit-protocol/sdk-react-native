package com.sdkreactnative

import me.didit.sdk.transactions.DiditTransactionInfo
import me.didit.sdk.transactions.DiditTransactionParticipant
import me.didit.sdk.transactions.DiditTransactionPayload
import me.didit.sdk.transactions.DiditTransactionPaymentMethod
import me.didit.sdk.transactions.DiditTransactionResult
import me.didit.sdk.transactions.DiditTravelRule
import org.json.JSONArray
import org.json.JSONObject

/**
 * Converts transaction payloads and results between the JSON strings used on
 * the React Native bridge and the native SDK transaction models.
 */
internal object TransactionJson {

    fun parsePayload(raw: String): DiditTransactionPayload {
        val json = JSONObject(raw)
        return DiditTransactionPayload(
            txnId = json.getString("txnId"),
            txnDate = json.stringOrNull("txnDate"),
            zoneId = json.stringOrNull("zoneId"),
            type = json.stringOrNull("type"),
            info = json.optJSONObject("info")?.let(::parseInfo),
            subject = json.optJSONObject("subject")?.let(::parseParticipant),
            counterparty = json.optJSONObject("counterparty")?.let(::parseParticipant),
            props = json.optJSONObject("props")?.toPlainMap(),
            travelRule = json.optJSONObject("travelRule")?.let(::parseTravelRule),
            includeCryptoScreening = json.booleanOrNull("includeCryptoScreening")
        )
    }

    fun resultJson(result: DiditTransactionResult): String = resultObject(result).toString()

    fun eventJson(callId: String, result: DiditTransactionResult): String =
        JSONObject()
            .put("callId", callId)
            .put("result", resultObject(result))
            .toString()

    private fun parseInfo(json: JSONObject) = DiditTransactionInfo(
        direction = json.stringOrNull("direction"),
        amount = json.doubleOrNull("amount"),
        currency = json.stringOrNull("currency"),
        currencyType = json.stringOrNull("currencyType"),
        amountInDefaultCurrency = json.doubleOrNull("amountInDefaultCurrency"),
        defaultCurrencyCode = json.stringOrNull("defaultCurrencyCode"),
        paymentDetails = json.stringOrNull("paymentDetails"),
        paymentTxnId = json.stringOrNull("paymentTxnId"),
        type = json.stringOrNull("type"),
        cryptoParams = json.optJSONObject("cryptoParams")?.toPlainMap()
    )

    private fun parseParticipant(json: JSONObject) = DiditTransactionParticipant(
        type = json.stringOrNull("type"),
        externalUserId = json.stringOrNull("externalUserId"),
        fullName = json.stringOrNull("fullName"),
        firstName = json.stringOrNull("firstName"),
        lastName = json.stringOrNull("lastName"),
        dob = json.stringOrNull("dob"),
        address = json.optJSONObject("address")?.toPlainMap(),
        institutionInfo = json.optJSONObject("institutionInfo")?.toPlainMap(),
        device = json.optJSONObject("device")?.toPlainMap(),
        paymentMethod = json.optJSONObject("paymentMethod")?.let(::parsePaymentMethod)
    )

    private fun parsePaymentMethod(json: JSONObject) = DiditTransactionPaymentMethod(
        type = json.stringOrNull("type"),
        accountId = json.stringOrNull("accountId"),
        issuingCountry = json.stringOrNull("issuingCountry")
    )

    private fun parseTravelRule(json: JSONObject) = DiditTravelRule(
        status = json.stringOrNull("status"),
        protocol = json.stringOrNull("protocol"),
        required = json.booleanOrNull("required"),
        obligationsCount = json.intOrNull("obligationsCount"),
        originatorData = json.optJSONObject("originatorData")?.toPlainMap(),
        beneficiaryData = json.optJSONObject("beneficiaryData")?.toPlainMap(),
        metadata = json.optJSONObject("metadata")?.toPlainMap()
    )

    private fun resultObject(result: DiditTransactionResult): JSONObject {
        val json = JSONObject()
            .put("transactionId", result.transactionId)
            .putOpt("status", result.status)
            .putOpt("travelRuleStatus", result.travelRuleStatus)
        result.actionRequired?.let { action ->
            json.put(
                "actionRequired",
                JSONObject()
                    .put("type", action.type)
                    .putOpt("url", action.url)
                    .putOpt("sessionId", action.sessionId)
                    .putOpt("sessionToken", action.sessionToken)
                    .putOpt("status", action.status)
                    .putOpt("widgetSessionId", action.widgetSessionId)
                    .putOpt("expiresAt", action.expiresAt)
            )
        }
        return json
    }

    private fun JSONObject.stringOrNull(key: String): String? =
        if (isNull(key)) null else optString(key)

    private fun JSONObject.booleanOrNull(key: String): Boolean? =
        if (isNull(key)) null else optBoolean(key)

    private fun JSONObject.doubleOrNull(key: String): Double? =
        if (isNull(key)) null else optDouble(key)

    private fun JSONObject.intOrNull(key: String): Int? =
        if (isNull(key)) null else optInt(key)

    private fun JSONObject.toPlainMap(): Map<String, Any?> =
        keys().asSequence().associateWith { key -> get(key).toPlainValue() }

    private fun JSONArray.toPlainList(): List<Any?> =
        (0 until length()).map { get(it).toPlainValue() }

    private fun Any?.toPlainValue(): Any? = when (this) {
        JSONObject.NULL -> null
        is JSONObject -> toPlainMap()
        is JSONArray -> toPlainList()
        else -> this
    }
}
