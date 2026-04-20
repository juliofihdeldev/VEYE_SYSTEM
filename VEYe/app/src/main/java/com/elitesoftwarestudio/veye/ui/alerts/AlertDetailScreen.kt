package com.elitesoftwarestudio.veye.ui.alerts

import android.content.Intent
import android.graphics.Color as AndroidColor
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedIconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.comments.CommentsRepository
import com.elitesoftwarestudio.veye.data.comments.StoredComment
import com.elitesoftwarestudio.veye.data.geo.distanceKm
import com.elitesoftwarestudio.veye.data.map.ViktimAlert
import com.elitesoftwarestudio.veye.data.preferences.MapSessionPrefs
import com.elitesoftwarestudio.veye.ui.components.CommentRow
import com.elitesoftwarestudio.veye.ui.components.PrimaryPillButton
import com.elitesoftwarestudio.veye.ui.components.SeverityBadge
import com.elitesoftwarestudio.veye.ui.components.rememberAvatarColor
import com.elitesoftwarestudio.veye.ui.map.DangerMapPinIcon
import com.elitesoftwarestudio.veye.ui.map.VEYeMapMarkerBitmaps
import com.elitesoftwarestudio.veye.ui.map.pinFillColorArgb
import com.elitesoftwarestudio.veye.ui.theme.SeverityKind
import com.elitesoftwarestudio.veye.ui.theme.VEyeRadius
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing
import com.elitesoftwarestudio.veye.ui.theme.severityFromAlertType
import com.elitesoftwarestudio.veye.ui.theme.severityTokensOf
import com.elitesoftwarestudio.veye.ui.util.DialogTransparentSystemBars
import com.elitesoftwarestudio.veye.ui.zones.CommentThreadPanel
import com.elitesoftwarestudio.veye.ui.zones.firestoreDateToMillis
import com.elitesoftwarestudio.veye.ui.zones.formatRelativeMapTime
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.Circle
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapType
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.MapsComposeExperimentalApi
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.rememberCameraPositionState
import com.google.maps.android.compose.rememberMarkerState
import java.util.concurrent.TimeUnit

private val UserRadiusStroke = Color(0xE61BC21B)
private val UserRadiusFill = Color(0x261BC21B)
private val ReleasedGreen = AndroidColor.parseColor("#22C55E")
private val LiveDotRed = Color(0xFFEF4444)
private val LiveDotGreen = Color(0xFF22C55E)
private const val LIVE_WINDOW_HOURS = 24L

@Composable
fun AlertDetailScreen(
    alert: ViktimAlert?,
    onDismiss: () -> Unit,
    commentsRepository: CommentsRepository,
    mapSession: MapSessionPrefs,
    onReportFromAlert: (ViktimAlert) -> Unit,
) {
    if (alert == null) return

    val context = LocalContext.current
    var commentsOpen by remember(alert.id) { mutableStateOf(false) }

    val threadId = remember(alert.id) { commentsRepository.alertCommentsThreadId(alert) }
    val commentFlow = remember(threadId) { commentsRepository.observeThread(threadId) }
    val comments by commentFlow.collectAsStateWithLifecycle(initialValue = emptyList())

    fun shareAlert() {
        val msg =
            context.getString(
                R.string.alert_details_share_message,
                alert.fullName.orEmpty(),
                alert.city.orEmpty(),
                alert.details.orEmpty(),
            )
        val send =
            Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, msg)
            }
        context.startActivity(Intent.createChooser(send, null))
    }

    fun dialEmergency() {
        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:114")))
    }

    fun openInMaps() {
        val lat = alert.latitude ?: return
        val lng = alert.longitude ?: return
        val label = alert.fullName?.takeIf { it.isNotBlank() } ?: alert.city.orEmpty()
        val uri = Uri.parse("geo:$lat,$lng?q=$lat,$lng(${Uri.encode(label)})")
        val intent = Intent(Intent.ACTION_VIEW, uri)
        runCatching { context.startActivity(intent) }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties =
            DialogProperties(
                usePlatformDefaultWidth = false,
                decorFitsSystemWindows = false,
            ),
    ) {
        DialogTransparentSystemBars()
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            AlertDetailContent(
                alert = alert,
                comments = comments,
                mapSession = mapSession,
                onClose = onDismiss,
                onShare = ::shareAlert,
                onCall = ::dialEmergency,
                onOpenInMaps = ::openInMaps,
                onSubmitTip = {
                    onDismiss()
                    onReportFromAlert(alert)
                },
                onOpenComments = { commentsOpen = true },
            )
        }
    }

    if (commentsOpen) {
        FullCommentsDialog(
            alert = alert,
            threadId = threadId,
            commentsRepository = commentsRepository,
            onDismiss = { commentsOpen = false },
        )
    }
}

@Composable
private fun AlertDetailContent(
    alert: ViktimAlert,
    comments: List<StoredComment>,
    mapSession: MapSessionPrefs,
    onClose: () -> Unit,
    onShare: () -> Unit,
    onCall: () -> Unit,
    onOpenInMaps: () -> Unit,
    onSubmitTip: () -> Unit,
    onOpenComments: () -> Unit,
) {
    val severityKind: SeverityKind = severityFromAlertType(alert.type, alert.status)

    Box(Modifier.fillMaxSize()) {
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
        ) {
            AlertDetailHero(
                alert = alert,
                kind = severityKind,
                onClose = onClose,
                onShare = onShare,
            )

            AlertDetailChipsRow(
                alert = alert,
                mapSession = mapSession,
                commentCount = comments.size,
            )

            Spacer(Modifier.height(VEyeSpacing.sm))

            AlertDetailAboutSection(alert = alert)

            Spacer(Modifier.height(VEyeSpacing.lg))

            AlertDetailLocationSection(
                alert = alert,
                mapSession = mapSession,
                onOpenInMaps = onOpenInMaps,
            )

            Spacer(Modifier.height(VEyeSpacing.lg))

            AlertDetailCommunitySection(
                comments = comments,
                onOpenAll = onOpenComments,
                onLeaveComment = onOpenComments,
            )

            // Reserve space for the sticky bottom bar so the last comment / CTA is reachable.
            Spacer(Modifier.height(120.dp))
            Spacer(modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars))
        }

        AlertDetailBottomActionBar(
            kind = severityKind,
            onCall = onCall,
            onShare = onShare,
            onSubmitTip = onSubmitTip,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}

@Composable
private fun AlertDetailHero(
    alert: ViktimAlert,
    kind: SeverityKind,
    onClose: () -> Unit,
    onShare: () -> Unit,
) {
    val tokens = severityTokensOf(kind)
    val context = LocalContext.current
    val imageUrl = alert.imageSource?.trim()?.takeIf { it.isNotEmpty() }

    Box(
        modifier =
            Modifier
                .fillMaxWidth()
                .height(380.dp),
    ) {
        // Backdrop: photo when available, otherwise a severity-themed gradient with a
        // large faded category icon so the surface still feels intentional, not blank.
        if (imageUrl != null) {
            AsyncImage(
                model =
                    ImageRequest.Builder(context)
                        .data(imageUrl)
                        .crossfade(true)
                        .build(),
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        } else {
            Box(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    tokens.containerSoft,
                                    tokens.accent.copy(alpha = 0.85f),
                                ),
                            ),
                        ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = tokens.icon,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.32f),
                    modifier = Modifier.size(160.dp),
                )
            }
        }

        // Bottom darkening gradient so the overlaid text is always readable.
        Box(
            modifier =
                Modifier
                    .matchParentSize()
                    .background(
                        Brush.verticalGradient(
                            0.40f to Color.Transparent,
                            1f to Color.Black.copy(alpha = 0.85f),
                        ),
                    ),
        )

        // Floating top-row controls.
        Row(
            modifier =
                Modifier
                    .align(Alignment.TopCenter)
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .fillMaxWidth()
                    .padding(horizontal = VEyeSpacing.sm, vertical = VEyeSpacing.xs),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            HeroCircleButton(
                onClick = onClose,
                contentDescription = stringResource(R.string.common_close),
            ) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = null,
                    tint = Color.White,
                )
            }
            HeroCircleButton(
                onClick = onShare,
                contentDescription = stringResource(R.string.common_share),
            ) {
                Icon(
                    Icons.Outlined.Share,
                    contentDescription = null,
                    tint = Color.White,
                )
            }
        }

        // Bottom overlay: severity badge + status pill, name, city · time.
        Column(
            modifier =
                Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(VEyeSpacing.lg),
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(VEyeSpacing.xs),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SeverityBadge(kind = kind)
                AlertStatusPill(alert = alert)
            }
            Spacer(Modifier.height(VEyeSpacing.sm))
            Text(
                text =
                    alert.fullName?.takeIf { it.isNotBlank() }
                        ?: stringResource(R.string.map_alert_untitled),
                style =
                    MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                color = Color.White,
            )
            Spacer(Modifier.height(VEyeSpacing.xxs))
            val context2 = LocalContext.current
            val subtitle =
                buildString {
                    val city = alert.city?.trim().orEmpty()
                    if (city.isNotEmpty()) append(city)
                    val time = formatRelativeMapTime(context2.resources, alert.date)
                    if (time.isNotEmpty() && time != "—") {
                        if (isNotEmpty()) append(" · ")
                        append(time)
                    }
                }
            if (subtitle.isNotBlank()) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.85f),
                )
            }
        }
    }
}

@Composable
private fun HeroCircleButton(
    onClick: () -> Unit,
    contentDescription: String,
    content: @Composable () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = CircleShape,
        color = Color.Black.copy(alpha = 0.45f),
        modifier = Modifier.size(40.dp),
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            // Reuse the icon-tint hint: callers pass a Color.White Icon in [content].
            content()
        }
    }
}

@Composable
private fun AlertStatusPill(alert: ViktimAlert) {
    val released =
        alert.status == "Libérer" || alert.status?.lowercase() == "released"
    val isLive =
        !released && isAlertWithinLiveWindow(alert.date)
    val (label, dot) =
        when {
            released ->
                stringResource(R.string.alert_detail_status_released) to LiveDotGreen
            isLive ->
                stringResource(R.string.alert_detail_status_live) to LiveDotRed
            else -> return
        }
    Row(
        modifier =
            Modifier
                .clip(RoundedCornerShape(VEyeRadius.chip))
                .background(Color.White.copy(alpha = 0.18f))
                .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier =
                Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(dot),
        )
        Text(
            text = label.uppercase(),
            color = Color.White,
            modifier = Modifier.padding(start = 6.dp),
            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
        )
    }
}

private fun isAlertWithinLiveWindow(date: Any?): Boolean {
    val ms = firestoreDateToMillis(date) ?: return false
    val ageHours = TimeUnit.MILLISECONDS.toHours(System.currentTimeMillis() - ms)
    return ageHours in 0..LIVE_WINDOW_HOURS
}

@Composable
private fun AlertDetailChipsRow(
    alert: ViktimAlert,
    mapSession: MapSessionPrefs,
    commentCount: Int,
) {
    val distanceKm = computeDistanceKm(alert, mapSession)
    val distanceLabel =
        distanceKm?.let { stringResource(R.string.alert_detail_distance_chip, it) }
    val ageLabel =
        alert.amount
            ?.trim()
            ?.takeIf { it.isNotEmpty() && it != "0" }
            ?.let { stringResource(R.string.alert_detail_age_chip, it) }
    val cityLabel = alert.city?.trim()?.takeIf { it.isNotEmpty() }

    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(top = VEyeSpacing.md)
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = VEyeSpacing.md),
        horizontalArrangement = Arrangement.spacedBy(VEyeSpacing.xs),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (distanceLabel != null) {
            DetailChip(icon = Icons.Outlined.LocationOn, label = distanceLabel)
        } else if (cityLabel != null) {
            DetailChip(icon = Icons.Outlined.LocationOn, label = cityLabel)
        }
        if (ageLabel != null) {
            DetailChip(icon = Icons.Outlined.Person, label = ageLabel)
        }
        DetailChip(
            icon = Icons.Outlined.ChatBubbleOutline,
            label = commentCount.toString(),
        )
    }
}

private fun computeDistanceKm(alert: ViktimAlert, session: MapSessionPrefs): Double? {
    val aLat = alert.latitude ?: return null
    val aLng = alert.longitude ?: return null
    val uLat = session.latitude ?: return null
    val uLng = session.longitude ?: return null
    return distanceKm(uLat, uLng, aLat, aLng)
}

@Composable
private fun DetailChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
) {
    Row(
        modifier =
            Modifier
                .clip(RoundedCornerShape(VEyeRadius.chip))
                .background(MaterialTheme.colorScheme.surfaceContainerHighest)
                .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = label,
            modifier = Modifier.padding(start = 6.dp),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun AlertDetailAboutSection(alert: ViktimAlert) {
    Column(
        modifier = Modifier.padding(horizontal = VEyeSpacing.md),
    ) {
        SectionTitle(text = stringResource(R.string.alert_detail_about))
        val description =
            alert.details?.trim()?.takeIf { it.isNotEmpty() }
        Text(
            text = description ?: stringResource(R.string.alert_detail_no_description),
            style = MaterialTheme.typography.bodyLarge,
            color =
                if (description != null) MaterialTheme.colorScheme.onSurface
                else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = VEyeSpacing.xs),
        )
    }
}

@Composable
private fun SectionTitle(
    text: String,
    trailing: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = text,
            style =
                MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f),
        )
        trailing?.invoke()
    }
}

@Composable
private fun AlertDetailLocationSection(
    alert: ViktimAlert,
    mapSession: MapSessionPrefs,
    onOpenInMaps: () -> Unit,
) {
    Column(modifier = Modifier.padding(horizontal = VEyeSpacing.md)) {
        SectionTitle(text = stringResource(R.string.alert_details_last_known_location))
        Spacer(Modifier.height(VEyeSpacing.sm))
        AlertLocationMap(
            alert = alert,
            mapSession = mapSession,
            onOpenInMaps = onOpenInMaps,
        )
    }
}

@Composable
private fun AlertDetailCommunitySection(
    comments: List<StoredComment>,
    onOpenAll: () -> Unit,
    onLeaveComment: () -> Unit,
) {
    Column(modifier = Modifier.padding(horizontal = VEyeSpacing.md)) {
        SectionTitle(
            text =
                "${stringResource(R.string.alert_detail_community)}  ·  ${comments.size}",
            trailing = {
                if (comments.isNotEmpty()) {
                    TextButton(onClick = onOpenAll) {
                        Text(text = stringResource(R.string.alert_detail_see_all))
                    }
                }
            },
        )

        if (comments.isEmpty()) {
            Text(
                text = stringResource(R.string.alert_detail_no_comments_short),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = VEyeSpacing.sm),
            )
        } else {
            // Show only the two most recent root-level comments inline. Power users tap
            // "See all" to drop into the full thread modal.
            val context = LocalContext.current
            comments
                .filter { it.parentId == null }
                .sortedByDescending { it.createdAt }
                .take(2)
                .forEach { comment ->
                    val authorName =
                        if (comment.isSelf) {
                            stringResource(R.string.comments_you)
                        } else {
                            stringResource(R.string.common_user)
                        }
                    CommentRow(
                        authorName = authorName,
                        timeLabel =
                            formatRelativeMapTime(context.resources, comment.createdAt),
                        body = comment.text,
                        avatarColor = rememberAvatarColor(comment.id),
                    )
                }
        }

        Spacer(Modifier.height(VEyeSpacing.xs))
        OutlinedButton(
            onClick = onLeaveComment,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(VEyeRadius.pill),
        ) {
            Icon(
                imageVector = Icons.Outlined.ChatBubbleOutline,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.size(VEyeSpacing.xs))
            Text(text = stringResource(R.string.alert_detail_leave_comment))
        }
    }
}

@Composable
private fun AlertDetailBottomActionBar(
    kind: SeverityKind,
    onCall: () -> Unit,
    onShare: () -> Unit,
    onSubmitTip: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val accent = severityTokensOf(kind).accent
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 12.dp,
        tonalElevation = 0.dp,
    ) {
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .windowInsetsPadding(WindowInsets.navigationBars)
                    .padding(
                        horizontal = VEyeSpacing.md,
                        vertical = VEyeSpacing.sm,
                    ),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(VEyeSpacing.xs),
        ) {
            OutlinedIconButton(
                onClick = onCall,
                modifier = Modifier.size(52.dp),
                shape = CircleShape,
            ) {
                Icon(
                    imageVector = Icons.Outlined.Phone,
                    contentDescription = stringResource(R.string.alerts_call_emergency_short),
                )
            }
            OutlinedIconButton(
                onClick = onShare,
                modifier = Modifier.size(52.dp),
                shape = CircleShape,
            ) {
                Icon(
                    imageVector = Icons.Outlined.Share,
                    contentDescription = stringResource(R.string.common_share),
                )
            }
            PrimaryPillButton(
                label = stringResource(R.string.alert_detail_submit_tip),
                onClick = onSubmitTip,
                accent = accent,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@OptIn(MapsComposeExperimentalApi::class)
@Composable
private fun AlertLocationMap(
    alert: ViktimAlert,
    mapSession: MapSessionPrefs,
    onOpenInMaps: () -> Unit,
) {
    val lat = alert.latitude
    val lng = alert.longitude
    val context = LocalContext.current
    if (lat == null || lng == null) {
        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .clip(RoundedCornerShape(VEyeRadius.card))
                    .background(MaterialTheme.colorScheme.surfaceContainerHighest),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = stringResource(R.string.alert_details_no_map_location),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }

    val alertLatLng = remember(alert.id, lat, lng) { LatLng(lat, lng) }
    val markerState = rememberMarkerState(position = alertLatLng)
    val pinArgb =
        if (alert.status == "Libérer") ReleasedGreen else pinFillColorArgb(DangerMapPinIcon.Pistol)
    val icon =
        remember(alert.id, pinArgb) {
            VEYeMapMarkerBitmaps.pinDescriptor(context, DangerMapPinIcon.Pistol, pinArgb, 1f)
        }

    val userLatLng =
        mapSession.latitude?.let { la ->
            mapSession.longitude?.let { lo -> LatLng(la, lo) }
        }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(alertLatLng, 15f)
    }

    LaunchedEffect(alert.id, lat, lng) {
        markerState.position = LatLng(lat, lng)
        cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(LatLng(lat, lng), 15f), 400)
    }

    Box(
        modifier =
            Modifier
                .fillMaxWidth()
                .height(200.dp)
                .clip(RoundedCornerShape(VEyeRadius.card)),
    ) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties =
                MapProperties(
                    mapType = MapType.HYBRID,
                    isBuildingEnabled = true,
                ),
            uiSettings =
                MapUiSettings(
                    zoomControlsEnabled = false,
                    compassEnabled = false,
                    scrollGesturesEnabled = false,
                    zoomGesturesEnabled = false,
                    tiltGesturesEnabled = false,
                    rotationGesturesEnabled = false,
                ),
        ) {
            userLatLng?.let { u ->
                Circle(
                    center = u,
                    radius = mapSession.radiusKm * 1000.0,
                    strokeWidth = 2f,
                    strokeColor = UserRadiusStroke,
                    fillColor = UserRadiusFill,
                )
            }
            Marker(
                state = markerState,
                title = alert.fullName,
                snippet = alert.city,
                icon = icon,
                anchor = Offset(0.5f, 1f),
            )
        }

        // Floating "Open in Maps" pill — turns the map into an actual jumping-off point
        // instead of a passive thumbnail.
        Surface(
            onClick = onOpenInMaps,
            shape = RoundedCornerShape(VEyeRadius.pill),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 4.dp,
            modifier =
                Modifier
                    .align(Alignment.BottomEnd)
                    .padding(VEyeSpacing.sm),
        ) {
            Row(
                modifier =
                    Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.OpenInNew,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.onSurface,
                )
                Spacer(Modifier.size(6.dp))
                Text(
                    text = stringResource(R.string.alert_detail_open_in_maps),
                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }

}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FullCommentsDialog(
    alert: ViktimAlert,
    threadId: String,
    commentsRepository: CommentsRepository,
    onDismiss: () -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties =
            DialogProperties(
                usePlatformDefaultWidth = false,
                decorFitsSystemWindows = false,
            ),
    ) {
        DialogTransparentSystemBars()
        Surface(modifier = Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize()) {
                CenterAlignedTopAppBar(
                    title = { Text(stringResource(R.string.comments_title)) },
                    navigationIcon = {
                        IconButton(onClick = onDismiss) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = stringResource(R.string.common_close),
                            )
                        }
                    },
                )
                CommentThreadPanel(
                    threadId = threadId,
                    enabled = true,
                    commentsRepository = commentsRepository,
                    modifier = Modifier.weight(1f),
                    listHeader = {
                        alert.fullName?.takeIf { it.isNotBlank() }?.let { name ->
                            Text(
                                text = name,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            )
                        }
                    },
                )
            }
        }
    }
}
