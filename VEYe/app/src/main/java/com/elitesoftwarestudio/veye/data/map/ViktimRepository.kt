package com.elitesoftwarestudio.veye.data.map

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ViktimRepository @Inject constructor(
    private val supabase: SupabaseClient,
) {
    /**
     * Same query shape as RN `MapDashboard.fetchAlerts` (`type == kidnaping`), with a higher cap for map density.
     */
    suspend fun fetchKidnapingForMap(limit: Long = 100): List<ViktimMapRow> {
        val rows =
            supabase.from("viktim").select {
                filter {
                    eq("type", "kidnaping")
                }
                order("date", Order.DESCENDING)
                limit(limit)
            }.decodeList<ViktimRow>()
        return rows.map { it.toMapRow() }
    }

    /** RN `AlertsList.fetchAlerts`: `Viktim` with optional `type` / `status` filter, `date` desc. */
    suspend fun fetchAlertsForList(filter: AlertsListFilter, limit: Long = 400): List<ViktimAlert> {
        val rows =
            supabase.from("viktim").select {
                when (filter) {
                    AlertsListFilter.Released ->
                        filter {
                            eq("status", "Libérer")
                        }
                    AlertsListFilter.All -> Unit
                    AlertsListFilter.Kidnaping ->
                        filter {
                            eq("type", "kidnaping")
                        }
                    AlertsListFilter.Disparut ->
                        filter {
                            eq("type", "disparut")
                        }
                    AlertsListFilter.Danger ->
                        filter {
                            eq("type", "danger")
                        }
                }
                order("date", Order.DESCENDING)
                limit(limit)
            }.decodeList<ViktimRow>()
        return rows.map { it.toAlert() }
    }

    suspend fun fetchViktimAlertById(id: String): ViktimAlert? {
        val row =
            supabase.from("viktim").select {
                filter {
                    eq("id", id)
                }
                single()
            }.decodeSingleOrNull<ViktimRow>()
        return row?.toAlert()
    }
}
