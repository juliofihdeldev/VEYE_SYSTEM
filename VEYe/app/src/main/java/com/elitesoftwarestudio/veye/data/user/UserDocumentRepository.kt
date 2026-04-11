package com.elitesoftwarestudio.veye.data.user

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/** Mirrors RN `UserContext` Firestore merges on `Users/{uid}`. */
@Singleton
class UserDocumentRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
) {
    suspend fun mergeRadiusKm(km: Double) {
        val uid = auth.currentUser?.uid ?: return
        firestore.collection("Users").document(uid)
            .set(
                mapOf("userId" to uid, "radiusKm" to km),
                SetOptions.merge(),
            )
            .await()
    }

    suspend fun mergeNotificationRadiusKm(km: Double) {
        val uid = auth.currentUser?.uid ?: return
        firestore.collection("Users").document(uid)
            .set(
                mapOf("userId" to uid, "notificationRadiusKm" to km),
                SetOptions.merge(),
            )
            .await()
    }
}
