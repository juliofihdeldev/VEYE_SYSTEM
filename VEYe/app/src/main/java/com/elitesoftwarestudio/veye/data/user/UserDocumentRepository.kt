package com.elitesoftwarestudio.veye.data.user

import android.util.Log
import com.elitesoftwarestudio.veye.BuildConfig
import com.google.firebase.auth.FirebaseAuth
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

/** Mirrors RN `UserContext` merges on `Users/{uid}` via Edge `process-user-merge` → Postgres `users`. */
@Singleton
class UserDocumentRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val supabase: SupabaseClient,
) {
    suspend fun mergeRadiusKm(km: Double) {
        val uid = auth.currentUser?.uid ?: return
        postMerge(uid) { put("radiusKm", km) }
    }

    suspend fun mergeNotificationRadiusKm(km: Double) {
        val uid = auth.currentUser?.uid ?: return
        postMerge(uid) { put("notificationRadiusKm", km) }
    }

    private suspend fun postMerge(uid: String, patch: JSONObject.() -> Unit) {
        withContext(Dispatchers.IO) {
            try {
                val json =
                    JSONObject().apply {
                        put("userId", uid)
                        patch()
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
        const val TAG = "UserDocumentRepository"
    }
}
