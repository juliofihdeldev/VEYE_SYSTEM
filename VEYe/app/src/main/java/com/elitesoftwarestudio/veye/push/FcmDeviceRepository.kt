package com.elitesoftwarestudio.veye.push

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.messaging.FirebaseMessaging
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Pushes the current FCM registration token into `users.device_token` (Postgres) via the
 * Edge function `process-user-merge`. The Edge function `send-notification` then targets
 * any user whose token sits within the alert's `notification_radius_km`.
 *
 * Replaces the OneSignal-based flow that lived here pre-2026-04.
 */
@Singleton
class FcmDeviceRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val supabase: SupabaseClient,
) {
    /**
     * Fetch (or refresh) the FCM token and upsert it under the current Firebase uid.
     * Safe to call repeatedly — Firebase returns a cached token until it rotates,
     * and the Edge function deduplicates by uid.
     */
    suspend fun syncTokenToBackend(token: String? = null) {
        val uid = auth.currentUser?.uid ?: return
        val deviceToken = token ?: runCatching { FirebaseMessaging.getInstance().token.await() }
            .onFailure { Log.w(TAG, "FirebaseMessaging.token failed", it) }
            .getOrNull()
            ?.takeIf { it.isNotBlank() }
            ?: return
        sendMerge(uid, deviceToken)
    }

    private suspend fun sendMerge(uid: String, deviceToken: String) {
        withContext(Dispatchers.IO) {
            try {
                val body = JSONObject().apply {
                    put("userId", uid)
                    put("deviceToken", deviceToken)
                }
                val response = supabase.functions.invoke("process-user-merge") {
                    contentType(ContentType.Application.Json)
                    setBody(body.toString())
                }
                if (!response.status.isSuccess()) {
                    Log.w(TAG, "process-user-merge http=${response.status}")
                }
            } catch (e: Exception) {
                Log.w(TAG, "process-user-merge", e)
            }
        }
    }

    private companion object {
        const val TAG = "FcmDeviceRepository"
    }
}
