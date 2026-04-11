package com.elitesoftwarestudio.veye.data.map

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ZoneDangerRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth,
) {
    /**
     * Real-time `ZoneDanger` stream; mirrors RN `AlertContext.subscribeZoneDanger` (starts when user signed in).
     */
    val zones: Flow<List<DangerZone>> = callbackFlow {
        var registration: ListenerRegistration? = null

        fun clearListener() {
            registration?.remove()
            registration = null
        }

        val listener = FirebaseAuth.AuthStateListener { fa ->
            clearListener()
            if (fa.currentUser?.uid == null) {
                trySend(emptyList())
                return@AuthStateListener
            }
            val query = firestore.collection("ZoneDanger")
                .orderBy("date", Query.Direction.DESCENDING)
            registration = query.addSnapshotListener { snap, err ->
                if (err != null || snap == null) return@addSnapshotListener
                val list = snap.documents.map { it.parseDangerZone() }
                trySend(list)
            }
        }

        auth.addAuthStateListener(listener)
        awaitClose {
            auth.removeAuthStateListener(listener)
            clearListener()
        }
    }.distinctUntilChanged()
}
