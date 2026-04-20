package com.elitesoftwarestudio.veye.data.map

import com.google.firebase.Timestamp
import java.util.Date

/** Window used for the "live" pulse animation on recent map pins. Mirrors the RN constant. */
const val MAP_LIVE_WINDOW_MS: Long = 72L * 60 * 60 * 1000

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
