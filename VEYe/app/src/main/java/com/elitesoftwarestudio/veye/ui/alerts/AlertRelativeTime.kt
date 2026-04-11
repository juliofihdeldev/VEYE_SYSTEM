package com.elitesoftwarestudio.veye.ui.alerts

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.elitesoftwarestudio.veye.R
import com.google.firebase.Timestamp
import java.util.Date
import java.util.concurrent.TimeUnit

@Composable
fun formatAlertRelativeTime(date: Any?): String {
    if (date == null) return stringResource(R.string.time_dash)
    val d =
        when (date) {
            is Timestamp -> date.toDate()
            is Date -> date
            is Number -> Date(date.toLong())
            is String -> runCatching { Date(date) }.getOrNull() ?: return stringResource(R.string.time_dash)
            else -> return stringResource(R.string.time_dash)
        }
    val now = System.currentTimeMillis()
    val diffMs = now - d.time
    val diffMins = TimeUnit.MILLISECONDS.toMinutes(diffMs).toInt().coerceAtLeast(0)
    val diffHours = diffMins / 60
    val diffDays = diffHours / 24
    val diffWeeks = diffDays / 7
    val diffMonths = diffDays / 30
    val diffYears = diffDays / 365
    if (diffMins < 1) return stringResource(R.string.time_just_now)
    if (diffMins < 60) return stringResource(R.string.time_min_ago, diffMins)
    if (diffHours < 24) return stringResource(R.string.time_hours_ago, diffHours)
    if (diffDays == 1) return stringResource(R.string.time_yesterday)
    if (diffDays < 7) return stringResource(R.string.time_days_ago, diffDays)
    if (diffWeeks < 5) return stringResource(R.string.time_weeks_ago, diffWeeks)
    if (diffMonths < 12) return stringResource(R.string.time_months_ago, diffMonths)
    return stringResource(R.string.time_years_ago, diffYears)
}
