package com.elitesoftwarestudio.veye.ui.alerts

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.geo.distanceKm
import com.elitesoftwarestudio.veye.data.map.ViktimAlert

@Composable
fun AlertListCard(
    alert: ViktimAlert,
    userLat: Double?,
    userLon: Double?,
    onOpenDetail: () -> Unit,
    onShare: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val severity = rememberAlertSeverityStyle(alert)
    val distanceLabel =
        if (userLat != null && userLon != null) {
            val vLat = alert.latitude
            val vLon = alert.longitude
            if (vLat != null && vLon != null) {
                val km = distanceKm(userLat, userLon, vLat, vLon)
                stringResource(R.string.map_distance_km, km)
            } else {
                null
            }
        } else {
            null
        }
    val relTime = formatAlertRelativeTime(alert.date)
    val context = LocalContext.current

    Card(
        modifier =
            modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp)
                .clickable(onClick = onOpenDetail),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier =
                        Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(severity.dotColor),
                )
                Text(
                    text = severity.label,
                    style = MaterialTheme.typography.titleSmall,
                    color = severity.color,
                    modifier = Modifier.padding(start = 8.dp),
                )
            }
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        text = alert.fullName ?: stringResource(R.string.map_alert_untitled),
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    alert.city?.takeIf { it.isNotBlank() }?.let { city ->
                        Row(Modifier.padding(top = 4.dp)) {
                            Text(
                                text = stringResource(R.string.alerts_location_prefix),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                text = city,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                    alert.details?.takeIf { it.isNotBlank() }?.let { d ->
                        Text(
                            text = d,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                    Row(Modifier.padding(top = 4.dp)) {
                        Text(
                            text = relTime,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        distanceLabel?.let { dist ->
                            Text(
                                text = "  $dist",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
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
                                .size(70.dp)
                                .clip(RoundedCornerShape(10.dp)),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Box(
                        modifier =
                            Modifier
                                .size(70.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                    )
                }
            }
            HorizontalDivider(Modifier.padding(top = 12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                TextButton(
                    onClick = onOpenDetail,
                    modifier = Modifier.weight(1f),
                ) {
                    Text(stringResource(R.string.alerts_view_details))
                }
                TextButton(
                    onClick = onShare,
                    modifier = Modifier.weight(1f),
                ) {
                    Text(stringResource(R.string.common_share))
                }
            }
        }
    }
}
