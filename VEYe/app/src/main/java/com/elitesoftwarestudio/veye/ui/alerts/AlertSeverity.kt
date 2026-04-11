package com.elitesoftwarestudio.veye.ui.alerts

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.map.ViktimAlert

data class AlertSeverityStyle(
    val label: String,
    val color: Color,
    val dotColor: Color,
)

private val SeverityCritical = Color(0xFFC41E3A)
private val SeverityHigh = Color(0xFFE85D04)
private val SeverityWarning = Color(0xFFF4C430)
private val SeveritySafe = Color(0xFF228B22)
private val SeverityInfo = Color(0xFF2563EB)

@Composable
fun rememberAlertSeverityStyle(alert: ViktimAlert): AlertSeverityStyle {
    val type = alert.type.orEmpty().lowercase()
    val status = alert.status
    return when {
        status == "Libérer" ->
            AlertSeverityStyle(
                label = stringResource(R.string.severity_released),
                color = SeveritySafe,
                dotColor = Color(0xFF22C55E),
            )
        type == "kidnaping" || type == "kidnapped" || type == "kidnapping" ->
            AlertSeverityStyle(
                label = stringResource(R.string.severity_kidnapping),
                color = SeverityCritical,
                dotColor = SeverityCritical,
            )
        type == "disparut" || type == "missing" ->
            AlertSeverityStyle(
                label = stringResource(R.string.severity_missing),
                color = SeverityWarning,
                dotColor = Color(0xFFEAB308),
            )
        type == "danger" || type == "shooting" ->
            AlertSeverityStyle(
                label = stringResource(R.string.severity_shooting),
                color = SeverityHigh,
                dotColor = SeverityHigh,
            )
        type == "released" ->
            AlertSeverityStyle(
                label = stringResource(R.string.severity_released),
                color = SeveritySafe,
                dotColor = Color(0xFF22C55E),
            )
        else ->
            AlertSeverityStyle(
                label = stringResource(R.string.severity_alert),
                color = SeverityInfo,
                dotColor = SeverityInfo,
            )
    }
}
