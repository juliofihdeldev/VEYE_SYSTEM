package com.elitesoftwarestudio.veye.ui.zones

import android.Manifest
import android.app.Activity
import androidx.activity.compose.BackHandler
import android.content.pm.PackageManager
import android.view.WindowManager
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.data.comments.CommentsRepository
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.ui.BottomSheetMaxHeightFraction
import com.elitesoftwarestudio.veye.data.map.DangerZone
import com.elitesoftwarestudio.veye.ui.map.VEYeMapMarkerBitmaps
import com.elitesoftwarestudio.veye.ui.map.dangerPinIconForZone
import com.elitesoftwarestudio.veye.ui.map.pinFillColorArgb
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.Circle
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapType
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MapsComposeExperimentalApi
import com.google.maps.android.compose.rememberCameraPositionState
import com.google.maps.android.compose.rememberMarkerState

private val UserRadiusStroke = Color(0xE61BC21B)
private val UserRadiusFill = Color(0x261BC21B)

@OptIn(MapsComposeExperimentalApi::class)
@Composable
fun DangerZoneDetailScreen(
    onBack: () -> Unit,
    viewModel: DangerZoneDetailViewModel = hiltViewModel(),
) {
    val zone by viewModel.zone.collectAsStateWithLifecycle()
    val snapshotReady by viewModel.hasReceivedZonesSnapshot.collectAsStateWithLifecycle()
    val session by viewModel.mapSession.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var hasFineLocation by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }

    DisposableEffect(Unit) {
        val window = (context as? Activity)?.window
        val prev = window?.attributes?.softInputMode
        window?.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING)
        onDispose {
            if (window != null && prev != null) {
                window.setSoftInputMode(prev)
            }
        }
    }

    BackHandler(onBack = onBack)

    val userLatLng =
        session.latitude?.let { la ->
            session.longitude?.let { lo -> LatLng(la, lo) }
        }

    when {
        zone != null -> {
            val z = zone!!
            val lat = z.latitude
            val lng = z.longitude
            if (lat == null || lng == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        text = stringResource(R.string.map_no_detail),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                DangerZoneDetailContent(
                    zone = z,
                    zoneLatLng = LatLng(lat, lng),
                    userLatLng = userLatLng,
                    radiusKm = session.radiusKm,
                    commentsRepository = viewModel.commentsRepository,
                    showMyLocationDot = hasFineLocation,
                    onBack = onBack,
                )
            }
        }
        !snapshotReady -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        else -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = stringResource(R.string.map_no_detail),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@OptIn(MapsComposeExperimentalApi::class)
@Composable
private fun DangerZoneDetailContent(
    zone: DangerZone,
    zoneLatLng: LatLng,
    userLatLng: LatLng?,
    radiusKm: Double,
    commentsRepository: CommentsRepository,
    showMyLocationDot: Boolean,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val markerState = rememberMarkerState(position = zoneLatLng)
    LaunchedEffect(zone.id, zoneLatLng) {
        markerState.position = zoneLatLng
    }

    val pinIcon = remember(zone.id) { dangerPinIconForZone(zone) }
    val pinArgb = remember(zone.id) { pinFillColorArgb(pinIcon) }
    val icon = remember(zone.id, pinIcon, pinArgb) {
        VEYeMapMarkerBitmaps.pinDescriptor(context, pinIcon, pinArgb, 1f)
    }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(zoneLatLng, 16.5f)
    }
    LaunchedEffect(zone.id, zoneLatLng) {
        cameraPositionState.animate(
            CameraUpdateFactory.newLatLngZoom(zoneLatLng, 16.5f),
            400,
        )
    }

    val threadId = remember(zone.id) { commentsRepository.zoneThreadId(zone.id) }

    Surface(modifier = Modifier.fillMaxSize(), color = Color.Black) {
        Box(Modifier.fillMaxSize()) {
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                properties =
                    MapProperties(
                        mapType = MapType.HYBRID,
                        isBuildingEnabled = true,
                        isMyLocationEnabled = showMyLocationDot,
                    ),
                uiSettings = MapUiSettings(zoomControlsEnabled = false, compassEnabled = true),
            ) {
                if (userLatLng != null) {
                    Circle(
                        center = userLatLng,
                        radius = radiusKm * 1000.0,
                        strokeWidth = 2f,
                        strokeColor = UserRadiusStroke,
                        fillColor = UserRadiusFill,
                    )
                }
                Marker(
                    state = markerState,
                    title = zone.name,
                    snippet = zone.rezon,
                    icon = icon,
                    anchor = Offset(0.5f, 1f),
                )
            }

            Surface(
                modifier =
                    Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .fillMaxHeight(BottomSheetMaxHeightFraction),
                shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 16.dp,
                tonalElevation = 0.dp,
            ) {
                Column(Modifier.fillMaxSize()) {
                    Box(
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .padding(top = 10.dp, bottom = 4.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Box(
                            modifier =
                                Modifier
                                    .size(width = 40.dp, height = 4.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(MaterialTheme.colorScheme.outlineVariant),
                        )
                    }
                    CommentThreadPanel(
                        threadId = threadId,
                        enabled = true,
                        commentsRepository = commentsRepository,
                        modifier =
                            Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                        showSectionTitle = true,
                        listHeader = {
                            ZoneDetailSheetHeader(zone = zone)
                        },
                        detailStyle = true,
                    )
                }
            }

            IconButton(
                onClick = onBack,
                modifier =
                    Modifier
                        .align(Alignment.TopStart)
                        .statusBarsPadding()
                        .padding(12.dp)
                        .zIndex(2f),
            ) {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 4.dp,
                    tonalElevation = 0.dp,
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = stringResource(R.string.common_back),
                        tint = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(10.dp),
                    )
                }
            }
        }
    }
}

private fun buildZoneBracketMetaLine(zone: DangerZone): String {
    fun bracketTag(raw: String): String =
        "[${raw.trim().lowercase().replace(' ', '_')}]"

    val tags = buildList {
        zone.incidentType?.trim()?.takeIf { it.isNotEmpty() }?.let { add(bracketTag(it)) }
        zone.tag?.trim()?.takeIf { it.isNotEmpty() }?.let { add(bracketTag(it)) }
    }
    val prefix = tags.joinToString(" ")
    val desc = zone.rezon?.trim().orEmpty()
    return when {
        prefix.isNotEmpty() && desc.isNotEmpty() -> "$prefix $desc"
        prefix.isNotEmpty() -> prefix
        else -> desc
    }
}

@Composable
private fun ZoneDetailSheetHeader(zone: DangerZone) {
    val res = LocalContext.current.resources
    val meta = buildZoneBracketMetaLine(zone)
    Column(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 8.dp),
    ) {
        val scheme = MaterialTheme.colorScheme
        Text(
            text = zone.name.orEmpty().ifBlank { stringResource(R.string.map_alert_untitled) },
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
            color = scheme.onSurface,
        )
        if (meta.isNotBlank()) {
            Text(
                text = meta,
                style = MaterialTheme.typography.bodySmall,
                color = scheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp),
            )
        }
        Text(
            text = formatRelativeMapTime(res, zone.date),
            style = MaterialTheme.typography.bodySmall,
            color = scheme.outline,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}
