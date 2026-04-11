package com.elitesoftwarestudio.veye.data.auth

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Mirrors RN `App.tsx`: **Firebase** anonymous session (uid for Edge payloads) + **Supabase Auth**
 * anonymous session (JWT for Realtime / future RLS).
 */
@Singleton
class AuthRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val supabase: SupabaseClient,
) {
    suspend fun ensureAnonymousSession(): Result<Unit> = runCatching {
        if (auth.currentUser == null) {
            auth.signInAnonymously().await()
            Log.i(TAG, "Firebase anonymous OK uid=${auth.currentUser?.uid}")
        }
        if (supabase.auth.currentSessionOrNull() == null) {
            runCatching { supabase.auth.signInAnonymously() }
                .onSuccess { Log.i(TAG, "Supabase anonymous session OK") }
                .onFailure { e ->
                    Log.w(
                        TAG,
                        "Supabase anonymous sign-in failed (enable Anonymous in Supabase Auth + config.toml enable_anonymous_sign_ins for local)",
                        e,
                    )
                }
        }
        Unit
    }.onFailure { e ->
        Log.e(TAG, "ensureAnonymousSession failed", e)
    }

    /** RN `Profile` logout: new Firebase + Supabase anonymous sessions. */
    suspend fun signOutAndSignInAnonymously(): Result<Unit> = runCatching {
        auth.signOut()
        supabase.auth.signOut()
        auth.signInAnonymously().await()
        runCatching { supabase.auth.signInAnonymously() }
            .onFailure { e -> Log.w(TAG, "Supabase anonymous re-sign-in failed", e) }
        Log.i(TAG, "Re-signed anonymously firebase=${auth.currentUser?.uid}")
        Unit
    }.onFailure { e ->
        Log.e(TAG, "signOut/re-auth failed", e)
    }

    private companion object {
        private const val TAG = "AuthRepository"
    }
}
