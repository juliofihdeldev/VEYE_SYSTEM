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
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material.icons.outlined.Visibility
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.geo.distanceKm
import com.elitesoftwarestudio.veye.data.map.DangerZone
import com.elitesoftwarestudio.veye.ui.components.SeverityCardMetric
import com.elitesoftwarestudio.veye.ui.components.SeverityStripeCard
import com.elitesoftwarestudio.veye.ui.theme.VEyeRadius
import com.elitesoftwarestudio.veye.ui.theme.severityFromZoneRezon
import kotlin.math.roundToInt

private val IgCommentBlue = Color(0xFF0095F6)
private val SwipeActionRed = Color(0xFFC41E3A)
private val SwipeActionWidth = 86.dp

/**
 * Wraps a design-system [SeverityStripeCard] with the existing RN-style swipe behaviour:
 * dragging the card to the left reveals a comment (blue) and a flag-as-false (red) action.
 * The card body itself matches the danger-zones list mockup — colored stripe, severity badge,
 * timestamp, title, body text, and a metric row (distance · verified · selected pin).
 */
@Composable
fun ZoneSwipeRow(
    zone: DangerZone,
    selectedZoneId: String?,
    openSwipeZoneId: String?,
    onOpenSwipeChange: (String?) -> Unit,
    onContentClick: () -> Unit,
    onSwipeComment: () -> Unit,
    onSwipeFlag: () -> Unit,
    formatTime: (DangerZone) -> String,
    modifier: Modifier = Modifier,
    userLatitude: Double? = null,
    userLongitude: Double? = null,
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

    val severityKind = severityFromZoneRezon(zone.rezon, zone.incidentType)
    val isSelected = selectedZoneId == zone.id
    val distanceKm = remember(userLatitude, userLongitude, zone.latitude, zone.longitude) {
        val uLat = userLatitude
        val uLon = userLongitude
        val zLat = zone.latitude
        val zLon = zone.longitude
        if (uLat == null || uLon == null || zLat == null || zLon == null) null
        else distanceKm(uLat, uLon, zLat, zLon)
    }
    val verifiedLabel = stringResource(R.string.danger_zones_card_verified)
    val distanceTemplate = stringResource(R.string.map_distance_km)
    val isVerified = zone.tag?.lowercase()?.contains("verified") == true ||
        zone.tag?.lowercase()?.contains("confirm") == true

    val metrics = buildList {
        if (distanceKm != null) {
            add(
                SeverityCardMetric(
                    icon = Icons.Outlined.Place,
                    label = distanceTemplate.format(distanceKm),
                ),
            )
        }
        if (isSelected) {
            add(
                SeverityCardMetric(
                    icon = Icons.Outlined.Visibility,
                    label = stringResource(R.string.alerts_view_details),
                ),
            )
        }
        if (isVerified) {
            add(
                SeverityCardMetric(
                    icon = Icons.Outlined.Verified,
                    label = verifiedLabel,
                ),
            )
        }
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
                    .matchParentSize()
                    .clip(RoundedCornerShape(VEyeRadius.card))
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
                containerColor = SwipeActionRed,
                icon = Icons.Outlined.Flag,
                label = stringResource(R.string.danger_zones_swipe_report_false),
                onClick = {
                    closeSwipe()
                    onSwipeFlag()
                },
            )
        }

        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
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
                    },
        ) {
            SeverityStripeCard(
                kind = severityKind,
                title = zone.name?.takeIf { it.isNotBlank() }
                    ?: stringResource(R.string.map_alert_untitled),
                subtitle = null,
                body = zone.rezon?.takeIf { it.isNotBlank() },
                timeLabel = formatTime(zone),
                metrics = metrics,
                onClick = onContentClick,
                modifier = Modifier.fillMaxWidth(),
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
                .background(containerColor)
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
