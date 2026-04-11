package com.elitesoftwarestudio.veye.ui.map

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.geo.distanceKm
import com.elitesoftwarestudio.veye.data.map.DangerZone
import com.elitesoftwarestudio.veye.data.map.ViktimMapRow
import com.elitesoftwarestudio.veye.data.preferences.MapSessionPrefs

private val DangerZoneOrange = Color(0xFFE85D04)

@Composable
internal fun DangerZoneShortcutCard(
    subtitle: String,
    onClick: () -> Unit,
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .border(
                width = 1.dp,
                color = DangerZoneOrange.copy(alpha = 0.35f),
                shape = RoundedCornerShape(12.dp),
            )
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        color = DangerZoneOrange.copy(alpha = 0.12f),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(DangerZoneOrange),
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 10.dp),
            ) {
                Text(
                    text = stringResource(R.string.map_danger_zone_label),
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = DangerZoneOrange,
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF111111),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun mapRowSeverityLabelAndColor(row: ViktimMapRow): Pair<Color, String> {
    val type = row.type.orEmpty().lowercase()
    val status = row.status
    return when {
        status == "Libérer" ->
            Color(0xFF228B22) to stringResource(R.string.severity_released)
        type == "kidnaping" || type == "kidnapped" || type == "kidnapping" || type.isEmpty() ->
            Color(0xFFC41E3A) to stringResource(R.string.severity_kidnapping)
        type == "disparut" || type == "missing" ->
            Color(0xFFF4C430) to stringResource(R.string.severity_missing)
        type == "danger" || type == "shooting" ->
            DangerZoneOrange to stringResource(R.string.map_danger_zone_label)
        type == "released" ->
            Color(0xFF228B22) to stringResource(R.string.severity_released)
        else ->
            Color(0xFF2563EB) to stringResource(R.string.severity_alert)
    }
}

@Composable
private fun MapSheetViktimRow(
    row: ViktimMapRow,
    session: MapSessionPrefs,
    onClick: () -> Unit,
) {
    val distanceText = formatDistanceKmLabel(row, session)
    val (dot, typeLabel) = mapRowSeverityLabelAndColor(row)
    Surface(
        modifier =
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick),
        shape = RoundedCornerShape(0.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
        shadowElevation = 0.dp,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 12.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .padding(top = 4.dp)
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(dot),
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = typeLabel,
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                    color = dot,
                )
                Text(
                    text = row.fullName ?: stringResource(R.string.map_alert_untitled),
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                val line = listOfNotNull(row.status, row.city, distanceText)
                    .joinToString(" · ")
                    .ifBlank { null }
                if (line != null) {
                    Text(
                        text = line,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

@Composable
private fun formatDistanceKmLabel(row: ViktimMapRow, session: MapSessionPrefs): String? {
    val lat = session.latitude
    val lon = session.longitude
    val vLat = row.latitude
    val vLon = row.longitude
    if (lat == null || lon == null || vLat == null || vLon == null) return null
    val km = distanceKm(lat, lon, vLat, vLon)
    return stringResource(R.string.map_distance_km, km)
}

@Composable
internal fun MapDashboardSheetContent(
    filteredZones: List<DangerZone>,
    filteredViktims: List<ViktimMapRow>,
    session: MapSessionPrefs,
    viktimLoading: Boolean,
    onNavigateToZones: () -> Unit,
    onViktimClick: (ViktimMapRow) -> Unit,
) {
    val latestZoneName = filteredZones.firstOrNull()?.name
    val subtitle = if (!latestZoneName.isNullOrBlank()) {
        stringResource(R.string.map_danger_zone_latest, latestZoneName)
    } else {
        stringResource(R.string.map_danger_zone_no_latest)
    }
    val primary = MaterialTheme.colorScheme.primary
    val onPrimary = MaterialTheme.colorScheme.onPrimary

    val viktimRows = filteredViktims.take(7)
    LazyColumn(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
    ) {
        item {
            Column(Modifier.padding(bottom = 12.dp)) {
                DangerZoneShortcutCard(subtitle = subtitle, onClick = onNavigateToZones)
            }
        }
        item {
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.map_nearby_alerts),
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Black),
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(primary),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "${filteredViktims.size}",
                        style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                        color = onPrimary,
                    )
                }
            }
        }
        item {
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        }
        when {
            viktimLoading && filteredViktims.isEmpty() -> item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
            !viktimLoading && filteredViktims.isEmpty() -> item {
                Text(
                    text = stringResource(R.string.map_no_alerts_nearby),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 8.dp),
                )
            }
        }
        items(
            count = viktimRows.size,
            key = { viktimRows[it].id },
        ) { index ->
            val row = viktimRows[index]
            Column(Modifier.fillMaxWidth()) {
                MapSheetViktimRow(
                    row = row,
                    session = session,
                    onClick = { onViktimClick(row) },
                )
                if (index < viktimRows.lastIndex) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                }
            }
        }
    }
}
