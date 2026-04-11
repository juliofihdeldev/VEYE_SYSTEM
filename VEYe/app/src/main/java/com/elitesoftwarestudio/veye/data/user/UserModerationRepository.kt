package com.elitesoftwarestudio.veye.data.user

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import javax.inject.Inject
import javax.inject.Singleton

private const val COOLDOWN_MS = 72L * 60L * 60L * 1000L

data class UserModerationState(
    val isBlocked: Boolean,
    /** Epoch millis when posting is allowed again (RN `unblockedAt`). */
    val unblockedAtMs: Long?,
)

@Singleton
class UserModerationRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
) {
    /** RN `UserContext` / `UserModerations/{uid}` snapshot. */
    val moderation: Flow<UserModerationState> = callbackFlow {
        var moderationReg: ListenerRegistration? = null

        fun clearModeration() {
            moderationReg?.remove()
            moderationReg = null
        }

        val listener =
            FirebaseAuth.AuthStateListener { fa ->
                clearModeration()
                val uid = fa.currentUser?.uid
                if (uid == null) {
                    trySend(UserModerationState(isBlocked = false, unblockedAtMs = null))
                    return@AuthStateListener
                }
                moderationReg =
                    firestore.collection("UserModerations")
                        .document(uid)
                        .addSnapshotListener { snap, _ ->
                            if (snap == null || !snap.exists()) {
                                trySend(UserModerationState(false, null))
                                return@addSnapshotListener
                            }
                            val blocked = snap.getBoolean("blocked") == true
                            val blockedAtMs = snap.getTimestamp("blockedAt")?.toDate()?.time
                            val unblockedAt =
                                if (blocked && blockedAtMs != null) {
                                    blockedAtMs + COOLDOWN_MS
                                } else {
                                    null
                                }
                            trySend(UserModerationState(blocked, unblockedAt))
                        }
            }
        auth.addAuthStateListener(listener)
        awaitClose {
            auth.removeAuthStateListener(listener)
            clearModeration()
        }
    }.distinctUntilChanged()
}
