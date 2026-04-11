package com.elitesoftwarestudio.veye.data.map

import com.google.firebase.Timestamp
import java.util.Date

/** Parity with RN `dangerZoneTimeFilter.ts`. */
const val MAP_LIVE_WINDOW_MS: Long = 72L * 60 * 60 * 1000
const val MAP_SEVEN_DAYS_MS: Long = 7L * 24 * 60 * 60 * 1000

fun reportedAtMs(date: Any?): Long? {
    if (date == null) return null
    if (date is Timestamp) return date.toDate().time
    if (date is Date) return date.time
    if (date is Number && date.toDouble().isFinite()) return date.toLong()
    val parsed = runCatching { Date(date.toString()) }.getOrNull() ?: return null
    return parsed.time.takeUnless { it == 0L }
}

fun isWithinLastMs(date: Any?, windowMs: Long): Boolean {
    val ms = reportedAtMs(date) ?: return false
    return System.currentTimeMillis() - ms <= windowMs
}

/** Undated rows: excluded from Live, included in 7d and All (RN parity). */
fun <T : MapTimedRow> filterItemsByMapTimeRange(items: List<T>, range: MapTimeRange): List<T> {
    if (range == MapTimeRange.All) return items
    val now = System.currentTimeMillis()
    val windowMs = if (range == MapTimeRange.Live) MAP_LIVE_WINDOW_MS else MAP_SEVEN_DAYS_MS
    return items.filter { item ->
        val ms = reportedAtMs(item.date)
        if (ms == null) return@filter range != MapTimeRange.Live
        now - ms <= windowMs
    }
}

interface MapTimedRow {
    val date: Any?
}
