package com.elitesoftwarestudio.veye.push

import android.util.Log
import com.elitesoftwarestudio.veye.BuildConfig
import com.google.firebase.auth.FirebaseAuth
import com.onesignal.OneSignal
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.ktor.client.request.setBody
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
 * Mirrors RN `App.tsx` `saveDeviceTokenToUser`: OneSignal user id → Postgres `users.device_token`
 * via Edge `process-user-merge`.
 */
@Singleton
class OneSignalDeviceRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val supabase: SupabaseClient,
) {
    suspend fun syncOnesignalIdToFirestore() {
        val uid = auth.currentUser?.uid ?: return
        val onesignalId = OneSignal.User.onesignalId?.takeIf { it.isNotBlank() } ?: return
        withContext(Dispatchers.IO) {
            try {
                val json =
                    JSONObject().apply {
                        put("userId", uid)
                        put("deviceToken", onesignalId)
                    }
                val response =
                    supabase.functions.invoke("process-user-merge") {
                        contentType(ContentType.Application.Json)
                        val secret = BuildConfig.PROCESS_ALERT_SECRET
                        if (secret.isNotBlank()) {
                            headers.append("x-veye-secret", secret)
                        }
                        setBody(json.toString())
                    }
                if (!response.status.isSuccess() && response.status != HttpStatusCode.Unauthorized) {
                    Log.w(TAG, "process-user-merge http=${response.status}")
                }
            } catch (e: Exception) {
                Log.w(TAG, "process-user-merge", e)
            }
        }
    }

    private companion object {
        const val TAG = "OneSignalDeviceRepository"
    }
}
