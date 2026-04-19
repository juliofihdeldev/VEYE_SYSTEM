package com.elitesoftwarestudio.veye.ui.theme

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.PersonSearch
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import com.elitesoftwarestudio.veye.R

/**
 * One source of truth for every "severity" surface in VEYe (alerts, zones, report types,
 * map pins, badges …). Anything that needs a coloured pill, dot, stripe, or icon should
 * resolve a [SeverityKind] first and then read its [SeverityTokens] — never hard-code the
 * RGB values.
 */
enum class SeverityKind {
    Kidnapping,
    DangerZone,
    Shooting,
    Missing,
    Suspicious,
    Released,
    Info,
}

/** Visual + textual tokens for a single [SeverityKind]. */
@Immutable
data class SeverityTokens(
    val kind: SeverityKind,
    val accent: Color,
    val onAccent: Color,
    val containerSoft: Color,
    val onContainerSoft: Color,
    val icon: ImageVector,
    @StringRes val labelRes: Int,
)

/** Returns the accent color for a [SeverityKind] without a Composable context. */
fun severityAccent(kind: SeverityKind): Color =
    when (kind) {
        SeverityKind.Kidnapping -> Color(0xFFE11D48)
        SeverityKind.DangerZone -> Color(0xFFE85D04)
        SeverityKind.Shooting -> Color(0xFFEA580C)
        SeverityKind.Missing -> Color(0xFFEAB308)
        SeverityKind.Suspicious -> Color(0xFFD97706)
        SeverityKind.Released -> Color(0xFF22C55E)
        SeverityKind.Info -> Color(0xFF2563EB)
    }

private fun softContainer(kind: SeverityKind): Color =
    severityAccent(kind).copy(alpha = 0.16f)

private fun onSoftContainer(kind: SeverityKind): Color =
    when (kind) {
        SeverityKind.Released -> Color(0xFF15803D)
        SeverityKind.Missing -> Color(0xFFB45309)
        else -> severityAccent(kind)
    }

private fun severityIcon(kind: SeverityKind): ImageVector =
    when (kind) {
        SeverityKind.Kidnapping -> Icons.Outlined.Warning
        SeverityKind.DangerZone -> Icons.Outlined.LocalFireDepartment
        SeverityKind.Shooting -> Icons.Outlined.LocalFireDepartment
        SeverityKind.Missing -> Icons.Outlined.PersonSearch
        SeverityKind.Suspicious -> Icons.Outlined.Visibility
        SeverityKind.Released -> Icons.Outlined.CheckCircle
        SeverityKind.Info -> Icons.Outlined.Info
    }

private fun severityLabelRes(kind: SeverityKind): Int =
    when (kind) {
        SeverityKind.Kidnapping -> R.string.severity_kidnapping
        SeverityKind.DangerZone -> R.string.map_danger_zone_label
        SeverityKind.Shooting -> R.string.severity_shooting
        SeverityKind.Missing -> R.string.severity_missing
        SeverityKind.Suspicious -> R.string.report_type_suspicious
        SeverityKind.Released -> R.string.severity_released
        SeverityKind.Info -> R.string.severity_alert
    }

fun severityTokensOf(kind: SeverityKind): SeverityTokens =
    SeverityTokens(
        kind = kind,
        accent = severityAccent(kind),
        onAccent = Color.White,
        containerSoft = softContainer(kind),
        onContainerSoft = onSoftContainer(kind),
        icon = severityIcon(kind),
        labelRes = severityLabelRes(kind),
    )

@Composable
fun SeverityTokens.label(): String = stringResource(labelRes)

/** Heuristic mapping from raw alert/zone "type" or "rezon" strings to [SeverityKind]. */
fun severityFromAlertType(type: String?, status: String?): SeverityKind {
    if (status == "Libérer" || status?.lowercase() == "released") return SeverityKind.Released
    val t = type.orEmpty().lowercase()
    return when {
        t == "kidnaping" || t == "kidnapping" || t == "kidnapped" -> SeverityKind.Kidnapping
        t == "disparut" || t == "missing" -> SeverityKind.Missing
        t == "danger" || t == "danger_zone" -> SeverityKind.DangerZone
        t == "shooting" -> SeverityKind.Shooting
        t == "suspicious" -> SeverityKind.Suspicious
        t == "released" -> SeverityKind.Released
        else -> SeverityKind.Info
    }
}

/** Heuristic mapping from `zone_danger.rezon` strings to [SeverityKind] (RN parity). */
fun severityFromZoneRezon(rezon: String?, incidentType: String? = null): SeverityKind {
    val incident = incidentType?.lowercase().orEmpty()
    if (incident.contains("kidnap")) return SeverityKind.Kidnapping
    if (rezon.isNullOrBlank()) return SeverityKind.DangerZone
    val lower = rezon.lowercase()
    return when {
        lower.contains("shoot") || lower.contains("active") || lower.contains("high") -> SeverityKind.Shooting
        lower.contains("danger") || lower.contains("medium") -> SeverityKind.DangerZone
        else -> SeverityKind.Missing
    }
}

/** Heuristic mapping from a free-form report type key to [SeverityKind]. */
fun severityFromReportType(typeKey: String?): SeverityKind =
    when (typeKey) {
        "kidnapping" -> SeverityKind.Kidnapping
        "missing" -> SeverityKind.Missing
        "danger_zone" -> SeverityKind.DangerZone
        "shooting" -> SeverityKind.Shooting
        "suspicious" -> SeverityKind.Suspicious
        else -> SeverityKind.Info
    }
