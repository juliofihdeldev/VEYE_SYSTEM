package com.elitesoftwarestudio.veye.ui.map

import androidx.annotation.StringRes
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.map.MapTimeRange

@get:StringRes
private val MapTimeRange.labelRes: Int
    get() = when (this) {
        MapTimeRange.Live -> R.string.map_time_live
        MapTimeRange.SevenDays -> R.string.map_time_7d
        MapTimeRange.All -> R.string.map_time_all
    }

/**
 * RN `MapTimeSegmentControl`: pill row, selected = primary fill + white label; inactive = white
 * surface, hairline border, muted label.
 */
@Composable
fun MapTimeSegmentControl(
    selected: MapTimeRange,
    onSelect: (MapTimeRange) -> Unit,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    val primary = scheme.primary
    val inactiveSurface = scheme.surface
    val inactiveBorder = scheme.outlineVariant
    val inactiveText = scheme.onSurfaceVariant
    val shape = RoundedCornerShape(22.dp)

    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MapTimeRange.entries.forEach { range ->
            val active = selected == range
            val bg = if (active) primary else inactiveSurface
            val borderColor = if (active) primary else inactiveBorder
            val labelColor = if (active) scheme.onPrimary else inactiveText
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .border(1.dp, borderColor, shape)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = { onSelect(range) },
                    ),
                shape = shape,
                color = bg,
                shadowElevation = 4.dp,
                tonalElevation = 0.dp,
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp, horizontal = 6.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = stringResource(range.labelRes),
                        style = MaterialTheme.typography.labelLarge.copy(
                            fontWeight = if (active) FontWeight.Bold else FontWeight.SemiBold,
                            letterSpacing = 0.2.sp,
                        ),
                        color = labelColor,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}
