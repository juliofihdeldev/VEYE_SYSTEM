package com.elitesoftwarestudio.veye.ui.map

import androidx.annotation.StringRes
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AllInclusive
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
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

private val MapTimeRange.icon: ImageVector
    get() = when (this) {
        MapTimeRange.Live -> Icons.Outlined.Bolt
        MapTimeRange.SevenDays -> Icons.Outlined.CalendarMonth
        MapTimeRange.All -> Icons.Outlined.AllInclusive
    }

/**
 * Capsule segmented control: selected pill = light surface + dark label, unselected pill =
 * inverse-surface (dark) + inverse-on-surface label, each with a leading icon.
 */
@Composable
fun MapTimeSegmentControl(
    selected: MapTimeRange,
    onSelect: (MapTimeRange) -> Unit,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    val activeBg = scheme.surface
    val activeFg = scheme.onSurface
    val inactiveBg = scheme.inverseSurface
    val inactiveFg = scheme.inverseOnSurface
    val shape = RoundedCornerShape(percent = 50)

    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MapTimeRange.entries.forEach { range ->
            val active = selected == range
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = { onSelect(range) },
                    ),
                shape = shape,
                color = if (active) activeBg else inactiveBg,
                shadowElevation = if (active) 4.dp else 0.dp,
                tonalElevation = 0.dp,
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = range.icon,
                        contentDescription = null,
                        tint = if (active) activeFg else inactiveFg,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        text = stringResource(range.labelRes),
                        style = MaterialTheme.typography.labelLarge.copy(
                            fontWeight = if (active) FontWeight.Bold else FontWeight.SemiBold,
                            letterSpacing = 0.2.sp,
                        ),
                        color = if (active) activeFg else inactiveFg,
                        maxLines = 1,
                        modifier = Modifier.padding(start = 6.dp),
                    )
                }
            }
        }
    }
}
