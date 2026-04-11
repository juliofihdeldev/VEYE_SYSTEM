package com.elitesoftwarestudio.veye.ui.zones

import androidx.compose.ui.graphics.Color

/** RN `getSeverityColor` in DangerZones / zone detail. */
fun zoneSeverityBarColor(rezon: String?): Color {
    if (rezon.isNullOrBlank()) return Color(0xFFE85D04)
    val lower = rezon.lowercase()
    return when {
        lower.contains("shoot") || lower.contains("active") -> Color(0xFFC41E3A)
        lower.contains("danger") -> Color(0xFFE85D04)
        else -> Color(0xFFEAB308)
    }
}
