package com.elitesoftwarestudio.veye.data.auth

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Mirrors RN `App.tsx` behavior: ensure an anonymous Firebase user exists.
 */
@Singleton
class AuthRepository @Inject constructor(
    private val auth: FirebaseAuth,
) {
    suspend fun ensureAnonymousSession(): Result<Unit> = runCatching {
        if (auth.currentUser != null) return@runCatching
        auth.signInAnonymously().await()
        Log.i(TAG, "Anonymous sign-in OK uid=${auth.currentUser?.uid}")
    }.onFailure { e ->
        Log.e(TAG, "Anonymous sign-in failed", e)
    }

    /** RN `Profile` logout: sign out then anonymous again (see `App.tsx` auth listener). */
    suspend fun signOutAndSignInAnonymously(): Result<Unit> = runCatching {
        auth.signOut()
        auth.signInAnonymously().await()
        Unit
    }.onSuccess {
        Log.i(TAG, "Re-signed anonymously uid=${auth.currentUser?.uid}")
    }.onFailure { e ->
        Log.e(TAG, "signOut/re-auth failed", e)
    }

    companion object {
        private const val TAG = "AuthRepository"
    }
}
