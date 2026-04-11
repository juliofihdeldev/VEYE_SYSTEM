package com.elitesoftwarestudio.veye.ui.map

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.IconButton
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
    val scheme = MaterialTheme.colorScheme
    val primary = scheme.primary
    val onPrimary = scheme.onPrimary
    val shape = RoundedCornerShape(14.dp)

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalAlignment = Alignment.End,
    ) {
        Surface(
            shape = CircleShape,
            color = scheme.surface,
            shadowElevation = 4.dp,
            tonalElevation = 0.dp,
        ) {
            IconButton(onClick = onRefreshClick) {
                Icon(
                    Icons.Outlined.Refresh,
                    contentDescription = stringResource(R.string.map_refresh_viktims),
                    tint = scheme.onSurfaceVariant,
                )
            }
        }
        MapControlPill(
            label = stringResource(R.string.map_heatmap),
            selected = showHeatmap,
            primary = primary,
            onPrimary = onPrimary,
            onClick = onHeatmapClick,
            shape = shape,
            imageVector = Icons.Outlined.LocalFireDepartment,
            filledToggle = true,
        )
        MapControlPill(
            label = stringResource(R.string.map_view_3d),
            selected = map3d,
            primary = primary,
            onPrimary = onPrimary,
            onClick = on3dClick,
            shape = shape,
            imageVector = Icons.Outlined.ViewInAr,
            filledToggle = false,
        )
        MapControlPill(
            label = stringResource(R.string.map_satellite),
            selected = mapSatellite,
            primary = primary,
            onPrimary = onPrimary,
            onClick = onSatelliteClick,
            shape = shape,
            imageVector = Icons.Outlined.Satellite,
            filledToggle = false,
        )
    }
}

@Composable
private fun MapControlPill(
    label: String,
    selected: Boolean,
    primary: Color,
    onPrimary: Color,
    onClick: () -> Unit,
    shape: RoundedCornerShape,
    imageVector: ImageVector,
    filledToggle: Boolean,
) {
    val scheme = MaterialTheme.colorScheme
    val mutedBorder = scheme.outlineVariant
    val idleFg = scheme.onSurface
    val idleBg = scheme.surface
    val (bg, fg, borderMod) = if (filledToggle) {
        Triple(
            if (selected) primary else idleBg,
            if (selected) onPrimary else idleFg,
            Modifier.border(
                width = 1.dp,
                color = if (selected) primary else mutedBorder,
                shape = shape,
            ),
        )
    } else {
        Triple(
            idleBg,
            idleFg,
            Modifier.border(
                width = if (selected) 2.dp else 1.dp,
                color = if (selected) primary else mutedBorder,
                shape = shape,
            ),
        )
    }
    Surface(
        modifier = Modifier
            .then(borderMod)
            .clickable(onClick = onClick),
        shape = shape,
        color = bg,
        shadowElevation = 4.dp,
        tonalElevation = 0.dp,
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(
                imageVector = imageVector,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = fg,
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                color = fg,
            )
        }
    }
}
