package com.elitesoftwarestudio.veye.data.map

import android.os.Bundle
import android.util.Log
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/** RN `konfimeManti` — `DemantiAlert` + increment `ZoneDanger.mantiCount`. */
@Singleton
class DemantiRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth,
    private val analytics: FirebaseAnalytics,
) {

    sealed class FlagResult {
        data object Success : FlagResult()
        data object AlreadyDenied : FlagResult()
        data class Error(val throwable: Throwable) : FlagResult()
    }

    suspend fun flagZoneAsFalse(zone: DangerZone): FlagResult {
        val uid = auth.currentUser?.uid ?: return FlagResult.Error(IllegalStateException("no_uid"))
        val docId = uid + zone.id
        return try {
            val ref = firestore.collection("DemantiAlert").document(docId)
            val snap = ref.get().await()
            if (snap.exists()) {
                FlagResult.AlreadyDenied
            } else {
                val info = "${zone.name.orEmpty()} ${zone.rezon.orEmpty()}".trim()
                ref.set(
                    hashMapOf(
                        "information" to info,
                        "userId" to uid,
                    ),
                ).await()
                firestore.collection("ZoneDanger").document(zone.id).update(
                    mapOf(
                        "mantiCount" to FieldValue.increment(1),
                        "userId" to uid,
                    ),
                ).await()
                analytics.logEvent("DemantiAlert", Bundle().apply { putString("id", zone.id) })
                FlagResult.Success
            }
        } catch (e: Exception) {
            Log.e(TAG, "flagZoneAsFalse", e)
            FlagResult.Error(e)
        }
    }

    private companion object {
        const val TAG = "DemantiRepository"
    }
}
