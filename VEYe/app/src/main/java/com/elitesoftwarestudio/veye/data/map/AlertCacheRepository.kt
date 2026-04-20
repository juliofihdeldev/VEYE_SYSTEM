package com.elitesoftwarestudio.veye.data.map

import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

/**
 * In-memory cache used to bridge the gap between a screen that already has a hydrated
 * [ViktimAlert] (or partial [ViktimMapRow]) in memory and the alert detail destination,
 * which would otherwise have to refetch the row from Supabase by id.
 *
 * Source screens (alerts list, map cluster, map sheet) call [primeFromAlert] or
 * [primeFromMapRow] right before navigating to the detail route. The detail VM then calls
 * [get] to seed its UI immediately, so the user always sees real data even when the
 * background refresh is slow, offline, or fails outright. Eliminates the "blank screen
 * with no additional details" dead-end reported on flaky network.
 */
@Singleton
class AlertCacheRepository @Inject constructor() {
    private val store = ConcurrentHashMap<String, ViktimAlert>()

    fun primeFromAlert(alert: ViktimAlert) {
        store[alert.id] = alert
    }

    fun primeFromMapRow(row: ViktimMapRow) {
        val existing = store[row.id]
        if (existing != null) return
        store[row.id] =
            ViktimAlert(
                id = row.id,
                fullName = row.fullName,
                status = row.status,
                city = row.city,
                details = row.details,
                amount = null,
                imageSource = null,
                type = row.type,
                date = row.date,
                latitude = row.latitude,
                longitude = row.longitude,
            )
    }

    fun get(id: String): ViktimAlert? = store[id]
}
