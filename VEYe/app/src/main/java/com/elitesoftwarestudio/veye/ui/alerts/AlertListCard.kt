package com.elitesoftwarestudio.veye.ui.alerts

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.geo.distanceKm
import com.elitesoftwarestudio.veye.data.map.ViktimAlert
import com.elitesoftwarestudio.veye.ui.components.SeverityCardMetric
import com.elitesoftwarestudio.veye.ui.components.SeverityStripeCard
import com.elitesoftwarestudio.veye.ui.theme.severityFromAlertType

@Composable
fun AlertListCard(
    alert: ViktimAlert,
    userLat: Double?,
    userLon: Double?,
    onOpenDetail: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val severityKind = severityFromAlertType(alert.type, alert.status)
    val context = LocalContext.current

    val distanceLabel =
        if (userLat != null && userLon != null && alert.latitude != null && alert.longitude != null) {
            stringResource(
                R.string.map_distance_km,
                distanceKm(userLat, userLon, alert.latitude!!, alert.longitude!!),
            )
        } else {
            null
        }
    val relTime = formatAlertRelativeTime(alert.date)

    val metrics = buildList {
        if (!alert.city.isNullOrBlank()) {
            add(
                SeverityCardMetric(
                    icon = Icons.Outlined.LocationOn,
                    label = alert.city ?: "",
                ),
            )
        }
        if (distanceLabel != null) {
            add(
                SeverityCardMetric(
                    icon = Icons.Outlined.LocationOn,
                    label = distanceLabel,
                ),
            )
        }
        // RN parity: show "Verified" subtle hint by default; backend often returns no count
        add(
            SeverityCardMetric(
                icon = Icons.Outlined.Verified,
                label = stringResource(R.string.severity_released).let { _ -> "Verified" },
            ),
        )
    }

    SeverityStripeCard(
        kind = severityKind,
        title = alert.fullName ?: stringResource(R.string.map_alert_untitled),
        subtitle = null,
        body = alert.details?.takeIf { it.isNotBlank() },
        timeLabel = relTime,
        modifier = modifier,
        onClick = onOpenDetail,
        metrics = metrics,
        trailing = {
            val url = alert.imageSource?.trim()?.takeIf { it.isNotEmpty() }
            if (url != null) {
                AsyncImage(
                    model =
                        ImageRequest.Builder(context)
                            .data(url)
                            .crossfade(true)
                            .build(),
                    contentDescription = null,
                    modifier =
                        Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.Crop,
                )
            } else {
                Box(
                    modifier =
                        Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surfaceContainerHighest),
                )
            }
        },
    )
}
