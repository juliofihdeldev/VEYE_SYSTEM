package com.elitesoftwarestudio.veye.ui.map

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Satellite
import androidx.compose.material.icons.outlined.ViewInAr
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.R

private val LegendKidnap = Color(0xFFC41E3A)
private val LegendDanger = Color(0xFFE85D04)
private val LegendMissing = Color(0xFFF4C430)
private val LegendInfo = Color(0xFF2563EB)

@Composable
fun MapLegendCard(modifier: Modifier = Modifier) {
    val cardBg = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f)
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = cardBg,
        shadowElevation = 6.dp,
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            LegendLine(dot = LegendKidnap, label = stringResource(R.string.severity_kidnapping))
            LegendLine(dot = LegendDanger, label = stringResource(R.string.map_danger_zone_label))
            LegendLine(dot = LegendMissing, label = stringResource(R.string.severity_missing))
            LegendLine(dot = LegendInfo, label = stringResource(R.string.map_legend_info))
        }
    }
}

@Composable
private fun LegendLine(dot: Color, label: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(dot),
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
fun MapRightControlColumn(
    showHeatmap: Boolean,
    onHeatmapClick: () -> Unit,
    map3d: Boolean,
    on3dClick: () -> Unit,
    mapSatellite: Boolean,
    onSatelliteClick: () -> Unit,
    onRefreshClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalAlignment = Alignment.End,
    ) {
        MapControlIconButton(
            selected = false,
            onClick = onRefreshClick,
            imageVector = Icons.Outlined.Refresh,
            contentDescription = stringResource(R.string.map_refresh_viktims),
        )
        MapControlIconButton(
            selected = showHeatmap,
            onClick = onHeatmapClick,
            imageVector = Icons.Outlined.LocalFireDepartment,
            contentDescription = stringResource(R.string.map_heatmap),
        )
        MapControlIconButton(
            selected = map3d,
            onClick = on3dClick,
            imageVector = Icons.Outlined.ViewInAr,
            contentDescription = stringResource(R.string.map_view_3d),
        )
        MapControlIconButton(
            selected = mapSatellite,
            onClick = onSatelliteClick,
            imageVector = Icons.Outlined.Satellite,
            contentDescription = stringResource(R.string.map_satellite),
        )
    }
}

/**
 * Square-ish rounded button used for every map overlay control.
 * - Inactive: surface (white in light theme) with on-surface icon tint.
 * - Active:   inverseSurface (near-black) with inverseOnSurface icon tint.
 */
@Composable
private fun MapControlIconButton(
    selected: Boolean,
    onClick: () -> Unit,
    imageVector: ImageVector,
    contentDescription: String?,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    val shape = RoundedCornerShape(14.dp)
    val bg = if (selected) scheme.inverseSurface else scheme.surface
    val fg = if (selected) scheme.inverseOnSurface else scheme.onSurface
    Surface(
        modifier = modifier
            .size(44.dp)
            .clickable(onClick = onClick),
        shape = shape,
        color = bg,
        shadowElevation = 4.dp,
        tonalElevation = 0.dp,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = imageVector,
                contentDescription = contentDescription,
                tint = fg,
                modifier = Modifier.size(22.dp),
            )
        }
    }
}
