package com.elitesoftwarestudio.veye.ui.zones

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.zIndex
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.map.DangerZone
import kotlin.math.roundToInt

private val IgCommentBlue = Color(0xFF0095F6)
private val SwipeActionWidth = 86.dp

/**
 * RN `Swipeable` + `renderRightActions`: swipe left to reveal comment (blue) and flag (red).
 */
@Composable
fun ZoneSwipeRow(
    zone: DangerZone,
    barColor: Color,
    selectedZoneId: String?,
    openSwipeZoneId: String?,
    onOpenSwipeChange: (String?) -> Unit,
    onContentClick: () -> Unit,
    onSwipeComment: () -> Unit,
    onSwipeFlag: () -> Unit,
    formatTime: (DangerZone) -> String,
    modifier: Modifier = Modifier,
) {
    val density = LocalDensity.current
    val maxOffsetPx = with(density) { (SwipeActionWidth * 2).toPx() }

    var offsetX by remember(zone.id) { mutableFloatStateOf(0f) }

    LaunchedEffect(openSwipeZoneId, zone.id) {
        if (openSwipeZoneId != zone.id) {
            offsetX = 0f
        }
    }

    fun closeSwipe() {
        offsetX = 0f
        onOpenSwipeChange(null)
    }

    Box(
        modifier =
            modifier
                .fillMaxWidth()
                .height(IntrinsicSize.Min),
    ) {
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(IntrinsicSize.Min)
                    .zIndex(1f)
                    .offset { IntOffset(offsetX.roundToInt(), 0) }
                    .pointerInput(maxOffsetPx, zone.id) {
                        detectHorizontalDragGestures(
                            onHorizontalDrag = { _, dx ->
                                offsetX = (offsetX + dx).coerceIn(-maxOffsetPx, 0f)
                                if (offsetX < -8f) {
                                    onOpenSwipeChange(zone.id)
                                }
                            },
                            onDragEnd = {
                                val target = if (offsetX < -maxOffsetPx / 2f) -maxOffsetPx else 0f
                                offsetX = target
                                onOpenSwipeChange(if (target == 0f) null else zone.id)
                            },
                            onDragCancel = {
                                val target = if (offsetX < -maxOffsetPx / 2f) -maxOffsetPx else 0f
                                offsetX = target
                                onOpenSwipeChange(if (target == 0f) null else zone.id)
                            },
                        )
                    }
                    .clickable { onContentClick() },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(0.dp),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 0.dp,
                shadowElevation = 0.dp,
            ) {
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .height(IntrinsicSize.Min),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier =
                            Modifier
                                .width(4.dp)
                                .fillMaxHeight()
                                .background(barColor),
                    )
                    Column(
                        modifier =
                            Modifier
                                .weight(1f)
                                .padding(horizontal = 12.dp, vertical = 12.dp),
                    ) {
                        Text(
                            zone.name.orEmpty(),
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                        )
                        Text(
                            zone.rezon.orEmpty(),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2,
                        )
                        Text(
                            formatTime(zone),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                    Icon(
                        if (selectedZoneId == zone.id) Icons.Outlined.Place else Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = null,
                        tint =
                            if (selectedZoneId == zone.id) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            },
                        modifier = Modifier.padding(end = 12.dp),
                    )
                }
            }
        }

        Row(
            modifier =
                Modifier
                    .matchParentSize()
                    .align(Alignment.CenterEnd)
                    .zIndex(0f),
            horizontalArrangement = Arrangement.End,
        ) {
            SwipeActionCell(
                width = SwipeActionWidth,
                containerColor = IgCommentBlue,
                icon = Icons.Outlined.ChatBubbleOutline,
                label = stringResource(R.string.comments_swipe_comment),
                onClick = {
                    closeSwipe()
                    onSwipeComment()
                },
            )
            SwipeActionCell(
                width = SwipeActionWidth,
                containerColor = Color(0xFFC41E3A),
                icon = Icons.Outlined.Flag,
                label = stringResource(R.string.danger_zones_swipe_report_false),
                onClick = {
                    closeSwipe()
                    onSwipeFlag()
                },
            )
        }
    }
}

@Composable
private fun SwipeActionCell(
    width: Dp,
    containerColor: Color,
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Surface(
        color = containerColor,
        modifier =
            Modifier
                .width(width)
                .fillMaxHeight()
                .clickable(onClick = onClick),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(icon, contentDescription = null, tint = Color.White)
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = Color.White,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}
