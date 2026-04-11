package com.elitesoftwarestudio.veye.ui.zones

import android.content.res.Resources
import com.elitesoftwarestudio.veye.R
import com.google.firebase.Timestamp
import java.util.Date
import java.util.concurrent.TimeUnit

fun firestoreDateToMillis(date: Any?): Long? =
    when (date) {
        is Timestamp -> date.toDate().time
        is Date -> date.time
        is Number -> date.toLong()
        else -> null
    }

fun formatRelativeMapTime(resources: Resources, date: Any?): String {
    val ms = firestoreDateToMillis(date) ?: return resources.getString(R.string.time_dash)
    val now = System.currentTimeMillis()
    val diffMins = TimeUnit.MILLISECONDS.toMinutes(now - ms).toInt().coerceAtLeast(0)
    val diffHours = diffMins / 60
    val diffDays = diffHours / 24
    val diffWeeks = diffDays / 7
    val diffMonths = diffDays / 30
    val diffYears = diffDays / 365
    return when {
        diffMins < 1 -> resources.getString(R.string.time_just_now)
        diffMins < 60 -> resources.getString(R.string.time_min_ago, diffMins)
        diffHours < 24 -> resources.getString(R.string.time_hours_ago, diffHours)
        diffDays == 1 -> resources.getString(R.string.time_yesterday)
        diffDays < 7 -> resources.getString(R.string.time_days_ago, diffDays)
        diffWeeks < 5 -> resources.getString(R.string.time_weeks_ago, diffWeeks)
        diffMonths < 12 -> resources.getString(R.string.time_months_ago, diffMonths)
        else -> resources.getString(R.string.time_years_ago, diffYears)
    }
}
