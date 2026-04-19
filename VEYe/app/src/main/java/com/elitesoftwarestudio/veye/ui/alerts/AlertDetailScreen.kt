package com.elitesoftwarestudio.veye.ui.alerts

import android.content.Intent
import android.graphics.Color as AndroidColor
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import coil.request.ImageRequest
import androidx.compose.material.icons.outlined.AltRoute
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.comments.CommentsRepository
import com.elitesoftwarestudio.veye.ui.components.ActionButton
import com.elitesoftwarestudio.veye.ui.components.ActionTriad
import com.elitesoftwarestudio.veye.ui.components.SeverityHero
import com.elitesoftwarestudio.veye.ui.theme.SeverityKind
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing
import com.elitesoftwarestudio.veye.ui.theme.severityFromAlertType
import com.elitesoftwarestudio.veye.ui.util.DialogTransparentSystemBars
import com.elitesoftwarestudio.veye.data.map.ViktimAlert
import com.elitesoftwarestudio.veye.data.preferences.MapSessionPrefs
import com.elitesoftwarestudio.veye.ui.map.DangerMapPinIcon
import com.elitesoftwarestudio.veye.ui.map.VEYeMapMarkerBitmaps
import com.elitesoftwarestudio.veye.ui.map.pinFillColorArgb
import com.elitesoftwarestudio.veye.ui.zones.CommentThreadPanel
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.firebase.Timestamp
import com.google.maps.android.compose.Circle
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapsComposeExperimentalApi
import com.google.maps.android.compose.MapType
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.rememberCameraPositionState
import com.google.maps.android.compose.rememberMarkerState
import java.text.DateFormat
import java.util.Date

private val EmergencyRed = Color(0xFFC41E3A)
private val UserRadiusStroke = Color(0xE61BC21B)
private val UserRadiusFill = Color(0x261BC21B)
private val ReleasedGreen = AndroidColor.parseColor("#22C55E")

@OptIn(ExperimentalMaterial3Api::class)
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
    val commentCount = comments.size

    val severity = rememberAlertSeverityStyle(alert)

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
            Scaffold(
                topBar = {
                    CenterAlignedTopAppBar(
                        title = { Text(stringResource(R.string.alerts_title)) },
                        navigationIcon = {
                            IconButton(onClick = onDismiss) {
                                Icon(Icons.Default.Close, contentDescription = stringResource(R.string.common_close))
                            }
                        },
                        actions = {
                            IconButton(onClick = { dialEmergency() }) {
                                Icon(Icons.Outlined.Phone, contentDescription = stringResource(R.string.header_sos))
                            }
                        },
                    )
                },
            ) { padding ->
                Column(
                    modifier =
                        Modifier
                            .padding(padding)
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp)
                            .padding(bottom = 32.dp),
                ) {
                    val severityKind: SeverityKind =
                        severityFromAlertType(alert.type, alert.status)
                    SeverityHero(
                        kind = severityKind,
                        statusLabel = if (alert.status == "Libérer") "RELEASED" else "LIVE",
                        modifier = Modifier.padding(bottom = VEyeSpacing.sm),
                    )

                    Card(
                        shape = RoundedCornerShape(14.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
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
                                            .size(100.dp, 120.dp)
                                            .clip(RoundedCornerShape(12.dp)),
                                    contentScale = ContentScale.Crop,
                                )
                            } else {
                                Box(
                                    modifier =
                                        Modifier
                                            .size(100.dp, 120.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(MaterialTheme.colorScheme.surfaceVariant),
                                )
                            }
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                InfoLine(stringResource(R.string.alert_details_name), alert.fullName)
                                InfoLine(
                                    stringResource(R.string.alert_details_age),
                                    alert.amount?.takeIf { it.isNotBlank() } ?: stringResource(R.string.time_dash),
                                )
                                InfoLine(stringResource(R.string.alert_details_location), alert.city)
                                InfoLine(
                                    stringResource(R.string.alert_details_time),
                                    formatAlertDetailDate(alert.date),
                                )
                            }
                        }
                    }

                    alert.details?.takeIf { it.isNotBlank() }?.let { details ->
                        Card(
                            modifier = Modifier.padding(top = 12.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Text(
                                    text = stringResource(R.string.alert_details_description),
                                    style = MaterialTheme.typography.titleSmall,
                                )
                                Text(
                                    text = details,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(top = 6.dp),
                                )
                            }
                        }
                    }

                    OutlinedButton(
                        onClick = { commentsOpen = true },
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .padding(top = 12.dp),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Icon(Icons.Outlined.ChatBubbleOutline, contentDescription = null)
                        Text(
                            text = stringResource(R.string.comments_title),
                            style = MaterialTheme.typography.titleSmall,
                            modifier =
                                Modifier
                                    .padding(horizontal = 10.dp)
                                    .weight(1f),
                        )
                        if (commentCount > 0) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant,
                            ) {
                                Text(
                                    text = commentCount.toString(),
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.labelMedium,
                                )
                            }
                        }
                        Icon(Icons.Outlined.ChevronRight, contentDescription = null)
                    }

                    Text(
                        text = stringResource(R.string.alert_details_last_known_location),
                        style = MaterialTheme.typography.titleSmall,
                        modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
                    )
                    AlertLocationMiniMap(alert = alert, mapSession = mapSession)

                    Text(
                        text = stringResource(R.string.alert_details_actions),
                        style = MaterialTheme.typography.titleSmall,
                        modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
                    )
                    ActionTriad(
                        actions =
                            listOf(
                                ActionButton(
                                    label = stringResource(R.string.common_share),
                                    icon = Icons.Outlined.Share,
                                    onClick = { shareAlert() },
                                    isPrimary = true,
                                ),
                                ActionButton(
                                    label = stringResource(R.string.alerts_call_emergency_short),
                                    icon = Icons.Outlined.Phone,
                                    onClick = { dialEmergency() },
                                ),
                                ActionButton(
                                    label = stringResource(R.string.alerts_action_reroute),
                                    icon = Icons.Outlined.AltRoute,
                                    onClick = {
                                        onDismiss()
                                        onReportFromAlert(alert)
                                    },
                                ),
                            ),
                    )
                }
            }
        }
    }

    if (commentsOpen) {
        Dialog(
            onDismissRequest = { commentsOpen = false },
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
                            IconButton(onClick = { commentsOpen = false }) {
                                Icon(Icons.Default.Close, contentDescription = stringResource(R.string.common_close))
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
}

@Composable
private fun InfoLine(label: String, value: String?) {
    Row(Modifier.fillMaxWidth()) {
        Text(
            text = "$label:",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(end = 8.dp),
        )
        Text(
            text = value?.takeIf { it.isNotBlank() } ?: stringResource(R.string.time_dash),
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f),
        )
    }
}

private fun formatAlertDetailDate(date: Any?): String {
    if (date == null) return "—"
    val d: Date =
        when (date) {
            is Timestamp -> date.toDate()
            is Date -> date
            is Number -> Date(date.toLong())
            else -> return "—"
        }
    return DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(d)
}

@OptIn(MapsComposeExperimentalApi::class)
@Composable
private fun AlertLocationMiniMap(
    alert: ViktimAlert,
    mapSession: MapSessionPrefs,
) {
    val lat = alert.latitude
    val lng = alert.longitude
    val context = LocalContext.current
    if (lat == null || lng == null) {
        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
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
                .height(160.dp)
                .clip(RoundedCornerShape(14.dp)),
    ) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties =
                MapProperties(
                    mapType = MapType.HYBRID,
                    isBuildingEnabled = true,
                ),
            uiSettings = MapUiSettings(zoomControlsEnabled = false, compassEnabled = false),
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
    }
}
