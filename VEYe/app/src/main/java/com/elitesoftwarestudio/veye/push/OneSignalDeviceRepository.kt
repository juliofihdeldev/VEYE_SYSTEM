package com.elitesoftwarestudio.veye.push

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.onesignal.OneSignal
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Mirrors RN `App.tsx` `saveDeviceTokenToUser`: `Users/{uid}.deviceToken` = OneSignal user id
 * (`OneSignal.User.getOnesignalId()` on RN).
 */
@Singleton
class OneSignalDeviceRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
) {
    suspend fun syncOnesignalIdToFirestore() {
        val uid = auth.currentUser?.uid ?: return
        val onesignalId = OneSignal.User.onesignalId?.takeIf { it.isNotBlank() } ?: return
        firestore.collection("Users").document(uid)
            .set(
                mapOf("deviceToken" to onesignalId, "userId" to uid),
                SetOptions.merge(),
            )
            .await()
    }
}
