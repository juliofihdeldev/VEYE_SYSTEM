package com.elitesoftwarestudio.veye.data.user

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.functions.functions
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

private const val MODERATION_POLL_MS = 15L * 60L * 1000L

data class UserModerationState(
    val isBlocked: Boolean,
    /** Epoch millis when posting is allowed again (RN `unblockedAt`); from Edge `isUserBlocked` + 72h rule. */
    val unblockedAtMs: Long?,
)

@Singleton
class UserModerationRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val supabase: SupabaseClient,
) {
    /**
     * Polls Edge **`get-user-moderation`** every **15 minutes** (Postgres `user_moderations`, same
     * cooldown behaviour as **`process-global-alert`**). Replaces Firestore `UserModerations/{uid}` snapshots.
     */
    val moderation: Flow<UserModerationState> = callbackFlow {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        var pollJob: Job? = null

        fun stopPoll() {
            pollJob?.cancel()
            pollJob = null
        }

        fun startPoll(uid: String) {
            stopPoll()
            pollJob =
                scope.launch {
                    while (isActive) {
                        delay(MODERATION_POLL_MS)
                        trySend(fetchModeration(uid))
                    }
                }
        }

        val listener =
            FirebaseAuth.AuthStateListener { fa ->
                stopPoll()
                val uid = fa.currentUser?.uid
                if (uid == null) {
                    trySend(UserModerationState(isBlocked = false, unblockedAtMs = null))
                } else {
                    scope.launch {
                        trySend(fetchModeration(uid))
                        startPoll(uid)
                    }
                }
            }
        auth.addAuthStateListener(listener)
        awaitClose {
            auth.removeAuthStateListener(listener)
            stopPoll()
            scope.cancel()
        }
    }.distinctUntilChanged()

    private suspend fun fetchModeration(uid: String): UserModerationState {
        return try {
            val json = JSONObject().put("userId", uid)
            val response =
                supabase.functions.invoke("get-user-moderation") {
                    contentType(ContentType.Application.Json)
                    setBody(json.toString())
                }
            if (!response.status.isSuccess()) {
                if (response.status != HttpStatusCode.Unauthorized) {
                    Log.w(TAG, "get-user-moderation http=${response.status}")
                }
                return UserModerationState(false, null)
            }
            val raw = response.bodyAsText()
            val j = runCatching { JSONObject(raw) }.getOrNull() ?: return UserModerationState(false, null)
            val blocked = j.optBoolean("blocked", false)
            val unblockedAt =
                when {
                    j.has("unblockedAtMs") && !j.isNull("unblockedAtMs") ->
                        j.optLong("unblockedAtMs", 0L).takeIf { it > 0 }
                    else -> null
                }
            UserModerationState(isBlocked = blocked, unblockedAtMs = unblockedAt)
        } catch (e: Exception) {
            Log.w(TAG, "get-user-moderation", e)
            UserModerationState(false, null)
        }
    }

    private companion object {
        const val TAG = "UserModerationRepository"
    }
}
