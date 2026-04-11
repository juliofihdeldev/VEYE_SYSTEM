package com.elitesoftwarestudio.veye.data.map

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ViktimRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
) {
    /**
     * Same query shape as RN `MapDashboard.fetchAlerts` (`type == kidnaping`), with a higher cap for map density.
     */
    suspend fun fetchKidnapingForMap(limit: Long = 100): List<ViktimMapRow> {
        val snap = firestore.collection("Viktim")
            .whereEqualTo("type", "kidnaping")
            .orderBy("date", Query.Direction.DESCENDING)
            .limit(limit)
            .get()
            .await()
        return snap.documents.map { it.parseViktimMapRow() }
    }

    /** RN `AlertsList.fetchAlerts`: `Viktim` with optional `type` / `status` filter, `date` desc. */
    suspend fun fetchAlertsForList(filter: AlertsListFilter, limit: Long = 400): List<ViktimAlert> {
        var q: Query = firestore.collection("Viktim")
        when (filter) {
            AlertsListFilter.Released ->
                q = q.whereEqualTo("status", "Libérer")
            AlertsListFilter.All -> { }
            AlertsListFilter.Kidnaping ->
                q = q.whereEqualTo("type", "kidnaping")
            AlertsListFilter.Disparut ->
                q = q.whereEqualTo("type", "disparut")
            AlertsListFilter.Danger ->
                q = q.whereEqualTo("type", "danger")
        }
        val snap =
            q.orderBy("date", Query.Direction.DESCENDING)
                .limit(limit)
                .get()
                .await()
        return snap.documents.map { it.parseViktimAlert() }
    }

    suspend fun fetchViktimAlertById(id: String): ViktimAlert? {
        val doc = firestore.collection("Viktim").document(id).get().await()
        if (!doc.exists()) return null
        return doc.parseViktimAlert()
    }
}
