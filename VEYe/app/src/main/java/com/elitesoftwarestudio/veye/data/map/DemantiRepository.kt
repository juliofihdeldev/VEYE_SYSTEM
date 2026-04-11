package com.elitesoftwarestudio.veye.data.map

import android.os.Bundle
import android.util.Log
import com.elitesoftwarestudio.veye.BuildConfig
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.auth.FirebaseAuth
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

/**
 * RN `konfimeManti` — **Edge** `process-demanti` inserts `demanti_alert` and increments Postgres
 * `zone_danger.manti_count` (aligned with `ZoneDangerRepository` Postgres reads).
 */
@Singleton
class DemantiRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val supabase: SupabaseClient,
    private val analytics: FirebaseAnalytics,
) {

    sealed class FlagResult {
        data object Success : FlagResult()
        data object AlreadyDenied : FlagResult()
        data class Error(val throwable: Throwable) : FlagResult()
    }

    suspend fun flagZoneAsFalse(zone: DangerZone): FlagResult {
        val uid = auth.currentUser?.uid ?: return FlagResult.Error(IllegalStateException("no_uid"))
        return withContext(Dispatchers.IO) {
            try {
                val info = "${zone.name.orEmpty()} ${zone.rezon.orEmpty()}".trim()
                val json =
                    JSONObject().apply {
                        put("userId", uid)
                        put("zoneId", zone.id)
                        put("information", info)
                    }
                val response =
                    supabase.functions.invoke("process-demanti") {
                        contentType(ContentType.Application.Json)
                        val secret = BuildConfig.PROCESS_ALERT_SECRET
                        if (secret.isNotBlank()) {
                            headers.append("x-veye-secret", secret)
                        }
                        setBody(json.toString())
                    }
                val raw = response.bodyAsText()
                when {
                    response.status == HttpStatusCode.Unauthorized ->
                        FlagResult.Error(IllegalStateException("demanti_unauthorized"))
                    response.status.isSuccess() -> {
                        val j = runCatching { JSONObject(raw) }.getOrNull()
                        if (j?.optString("skipped") == "already_denied") {
                            FlagResult.AlreadyDenied
                        } else {
                            analytics.logEvent("DemantiAlert", Bundle().apply { putString("id", zone.id) })
                            FlagResult.Success
                        }
                    }
                    else -> FlagResult.Error(IllegalStateException("demanti_http_${response.status.value}"))
                }
            } catch (e: Exception) {
                Log.e(TAG, "flagZoneAsFalse", e)
                FlagResult.Error(e)
            }
        }
    }

    private companion object {
        const val TAG = "DemantiRepository"
    }
}
