package com.elitesoftwarestudio.veye.ui.zones

import android.Manifest
import android.content.pm.PackageManager
import androidx.annotation.StringRes
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.Satellite
import androidx.compose.material.icons.outlined.ViewInAr
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.BottomSheetScaffold
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberBottomSheetScaffoldState
import androidx.compose.material3.rememberStandardBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.size
import androidx.compose.ui.text.font.FontWeight
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.ui.theme.VEYeTheme
import com.elitesoftwarestudio.veye.data.map.DangerZone
import com.elitesoftwarestudio.veye.data.pending.PendingReport
import com.elitesoftwarestudio.veye.data.pending.PendingReportStatus
import com.elitesoftwarestudio.veye.data.map.DemantiRepository
import com.elitesoftwarestudio.veye.data.map.MapTimeRange
import com.elitesoftwarestudio.veye.data.map.filterItemsByMapTimeRange
import com.elitesoftwarestudio.veye.data.map.nearestDangerBearingWithinKm
import com.elitesoftwarestudio.veye.ui.map.MapClusteringLayer
import com.elitesoftwarestudio.veye.ui.map.MapHeatmapOverlay
import com.elitesoftwarestudio.veye.ui.map.MapPinKind
import com.elitesoftwarestudio.veye.ui.map.buildClusterItems
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.Circle
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapType
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.MapsComposeExperimentalApi
import com.google.maps.android.compose.Polyline
import com.google.maps.android.compose.rememberCameraPositionState
import kotlinx.coroutines.launch

private val HaitiCenter = LatLng(18.5944, -72.3074)

@get:StringRes
private val MapTimeRange.labelRes: Int
    get() =
        when (this) {
            MapTimeRange.Live -> R.string.map_time_live
            MapTimeRange.SevenDays -> R.string.map_time_7d
            MapTimeRange.All -> R.string.map_time_all
        }

private fun zoneHeatmapPoints(zones: List<DangerZone>): List<LatLng> =
    zones.mapNotNull { z ->
        val lat = z.latitude ?: return@mapNotNull null
        val lng = z.longitude ?: return@mapNotNull null
        LatLng(lat, lng)
    }

@OptIn(ExperimentalMaterial3Api::class, MapsComposeExperimentalApi::class)
@Composable
fun ZonesScreen(
    modifier: Modifier = Modifier,
    viewModel: ZonesViewModel = hiltViewModel(),
    onNavigateToZoneDetail: (DangerZone) -> Unit = {},
) {
    val context = LocalContext.current
    var timeRange by remember { mutableStateOf(MapTimeRange.All) }
    var showHeatmap by rememberSaveable { mutableStateOf(true) }
    var mapSatellite by rememberSaveable { mutableStateOf(false) }
    var map3d by rememberSaveable { mutableStateOf(false) }
    var selectedZoneId by rememberSaveable { mutableStateOf<String?>(null) }
    var flagTarget by remember { mutableStateOf<DangerZone?>(null) }
    var flagMessage by remember { mutableStateOf<String?>(null) }
    var openSwipeZoneId by remember { mutableStateOf<String?>(null) }

    val dangerZonesForMap by viewModel.dangerZonesForMap.collectAsStateWithLifecycle()
    val dangerZonesNearby by viewModel.dangerZonesNearby.collectAsStateWithLifecycle()
    val pendingReports by viewModel.pendingReports.collectAsStateWithLifecycle()
    val session by viewModel.mapSession.collectAsStateWithLifecycle()

    var hasFineLocation by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    val permissionLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            hasFineLocation = granted
        }

    val scope = rememberCoroutineScope()
    var shouldAutoCenterOnce by rememberSaveable { mutableStateOf(true) }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(HaitiCenter, 8.2f)
    }

    LaunchedEffect(hasFineLocation) {
        if (!hasFineLocation || !shouldAutoCenterOnce) return@LaunchedEffect
        val c = viewModel.fetchAndPersistLocation() ?: return@LaunchedEffect
        shouldAutoCenterOnce = false
        cameraPositionState.animate(
            CameraUpdateFactory.newLatLngZoom(LatLng(c.first, c.second), 11f),
            durationMs = 900,
        )
    }

    val mapType = if (mapSatellite) MapType.HYBRID else MapType.NORMAL

    LaunchedEffect(map3d, mapSatellite) {
        val p = cameraPositionState.position
        val tilt =
            when {
                mapSatellite -> 0f
                map3d -> 45f
                else -> 0f
            }
        val zoom = if (!mapSatellite && map3d && p.zoom < 14f) 15f else p.zoom
        cameraPositionState.animate(
            CameraUpdateFactory.newCameraPosition(
                CameraPosition.Builder()
                    .target(p.target)
                    .zoom(zoom)
                    .tilt(tilt)
                    .bearing(p.bearing)
                    .build(),
            ),
            durationMs = 450,
        )
    }

    val mapZonesForPins = remember(dangerZonesForMap, timeRange) {
        filterItemsByMapTimeRange(dangerZonesForMap, timeRange)
    }
    val nearbyZonesForSheet = remember(dangerZonesNearby, timeRange) {
        filterItemsByMapTimeRange(dangerZonesNearby, timeRange)
    }
    val clusterItems = remember(mapZonesForPins) {
        buildClusterItems(mapZonesForPins, emptyList())
    }
    val heatPoints = remember(mapZonesForPins) { zoneHeatmapPoints(mapZonesForPins) }

    val userLatLng =
        session.latitude?.let { lat ->
            session.longitude?.let { lon -> LatLng(lat, lon) }
        }
    val radiusMeters = session.radiusKm * 1000.0

    val dangerBearingLine =
        remember(userLatLng, nearbyZonesForSheet) {
            val u = userLatLng ?: return@remember null
            nearestDangerBearingWithinKm(u.latitude, u.longitude, nearbyZonesForSheet)
        }

    val sheetState = rememberStandardBottomSheetState(skipHiddenState = true)
    val scaffoldState = rememberBottomSheetScaffoldState(bottomSheetState = sheetState)

    Box(modifier = modifier.fillMaxSize()) {
        BottomSheetScaffold(
            scaffoldState = scaffoldState,
            sheetPeekHeight = 120.dp,
            sheetDragHandle = { BottomSheetDefaults.DragHandle() },
            containerColor = Color.Transparent,
            sheetContainerColor = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxSize(),
            sheetContent = {
                ZonesSheetList(
                    pendingReports = pendingReports,
                    onDismissPending = { viewModel.removePendingReport(it) },
                    zones = nearbyZonesForSheet,
                    selectedZoneId = selectedZoneId,
                    openSwipeZoneId = openSwipeZoneId,
                    onOpenSwipeChange = { openSwipeZoneId = it },
                    onZoneClick = { zone ->
                        val lat = zone.latitude ?: return@ZonesSheetList
                        val lng = zone.longitude ?: return@ZonesSheetList
                        selectedZoneId = zone.id
                        openSwipeZoneId = null
                        onNavigateToZoneDetail(zone)
                        scope.launch {
                            cameraPositionState.animate(
                                CameraUpdateFactory.newLatLngZoom(LatLng(lat, lng), 14f),
                                durationMs = 600,
                            )
                        }
                    },
                    onOpenComments = { z -> onNavigateToZoneDetail(z) },
                    onRequestFlag = { flagTarget = it },
                    formatTime = { z -> formatRelativeMapTime(context.resources, z.date) },
                )
            },
            content = { paddingValues ->
                Box(Modifier.fillMaxSize()) {
                    GoogleMap(
                        modifier = Modifier.fillMaxSize(),
                        cameraPositionState = cameraPositionState,
                        properties =
                            MapProperties(
                                isMyLocationEnabled = hasFineLocation,
                                mapType = mapType,
                                isBuildingEnabled = true,
                            ),
                        uiSettings = MapUiSettings(zoomControlsEnabled = false, compassEnabled = true),
                    ) {
                        MapHeatmapOverlay(enabled = showHeatmap, points = heatPoints)
                        if (userLatLng != null) {
                            Circle(
                                center = userLatLng,
                                radius = radiusMeters,
                                strokeWidth = 2f,
                                strokeColor = Color(0xFFE1306C),
                                fillColor = Color(0x33E1306C),
                            )
                        }
                        dangerBearingLine?.let { line ->
                            Polyline(
                                points = listOf(line.from, line.to),
                                color = Color(0xFFC41E3A),
                                width = 12f,
                                geodesic = true,
                            )
                        }
                        MapClusteringLayer(
                            items = clusterItems,
                            onClusterItemClick = { item ->
                                if (item.kind == MapPinKind.Zone) {
                                    val z = mapZonesForPins.find { it.id == item.rawId } ?: return@MapClusteringLayer
                                    selectedZoneId = z.id
                                    openSwipeZoneId = null
                                    onNavigateToZoneDetail(z)
                                    val lat = z.latitude ?: return@MapClusteringLayer
                                    val lng = z.longitude ?: return@MapClusteringLayer
                                    scope.launch {
                                        cameraPositionState.animate(
                                            CameraUpdateFactory.newLatLngZoom(LatLng(lat, lng), 14f),
                                            durationMs = 600,
                                        )
                                    }
                                }
                            },
                        )
                    }

                    Surface(
                        modifier =
                            Modifier
                                .align(Alignment.TopStart)
                                .windowInsetsPadding(WindowInsets.statusBars)
                                .padding(start = 16.dp, top = 8.dp),
                        shape = RoundedCornerShape(10.dp),
                        tonalElevation = 2.dp,
                    ) {
                        Column(Modifier.padding(10.dp)) {
                            LegendDot(Color(0xFFC41E3A), stringResource(R.string.danger_zones_high_risk))
                            LegendDot(Color(0xFFE85D04), stringResource(R.string.danger_zones_medium_risk))
                            LegendDot(Color(0xFFEAB308), stringResource(R.string.danger_zones_low_risk))
                        }
                    }

                    Column(
                        modifier =
                            Modifier
                                .align(Alignment.TopEnd)
                                .windowInsetsPadding(WindowInsets.statusBars)
                                .padding(end = 16.dp, top = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        horizontalAlignment = Alignment.End,
                    ) {
                        FilterChip(
                            selected = showHeatmap,
                            onClick = { showHeatmap = !showHeatmap },
                            label = { Text(stringResource(R.string.map_heatmap)) },
                            leadingIcon = {
                                Icon(
                                    Icons.Outlined.LocalFireDepartment,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                )
                            },
                        )
                        FilterChip(
                            selected = map3d,
                            onClick = { map3d = !map3d },
                            label = { Text(stringResource(R.string.map_view_3d)) },
                            leadingIcon = {
                                Icon(
                                    Icons.Outlined.ViewInAr,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                )
                            },
                        )
                        FilterChip(
                            selected = mapSatellite,
                            onClick = { mapSatellite = !mapSatellite },
                            label = { Text(stringResource(R.string.map_satellite)) },
                            leadingIcon = {
                                Icon(
                                    Icons.Outlined.Satellite,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                )
                            },
                        )
                    }

                    IconButton(
                        onClick = {
                            if (!hasFineLocation) {
                                permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                            } else {
                                scope.launch {
                                    val c = viewModel.fetchAndPersistLocation() ?: return@launch
                                    cameraPositionState.animate(
                                        CameraUpdateFactory.newLatLngZoom(LatLng(c.first, c.second), 11f),
                                        durationMs = 900,
                                    )
                                }
                            }
                        },
                        modifier =
                            Modifier
                                .align(Alignment.BottomEnd)
                                .padding(end = 16.dp, bottom = 88.dp + paddingValues.calculateBottomPadding()),
                    ) {
                        Icon(Icons.Outlined.MyLocation, contentDescription = stringResource(R.string.map_my_location))
                    }
                }
            },
        )
    }

    flagTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { flagTarget = null },
            title = { Text(stringResource(R.string.danger_zones_flag_false_title)) },
            text = { Text(stringResource(R.string.danger_zones_flag_false_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        val z = target
                        flagTarget = null
                        viewModel.flagZoneAsFalse(z) { result ->
                            flagMessage =
                                when (result) {
                                    is DemantiRepository.FlagResult.Success ->
                                        context.getString(R.string.context_thanks) + "\n" +
                                            context.getString(R.string.context_noted)
                                    DemantiRepository.FlagResult.AlreadyDenied ->
                                        context.getString(R.string.context_attention) + "\n" +
                                            context.getString(R.string.context_already_denied)
                                    is DemantiRepository.FlagResult.Error ->
                                        context.getString(R.string.common_error_generic)
                                }
                        }
                    },
                ) {
                    Text(stringResource(R.string.danger_zones_flag_false_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { flagTarget = null }) {
                    Text(stringResource(R.string.danger_zones_flag_false_cancel))
                }
            },
        )
    }

    flagMessage?.let { msg ->
        AlertDialog(
            onDismissRequest = { flagMessage = null },
            text = { Text(msg) },
            confirmButton = {
                TextButton(onClick = { flagMessage = null }) {
                    Text(stringResource(android.R.string.ok))
                }
            },
        )
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(vertical = 2.dp),
    ) {
        Surface(color = color, shape = CircleShape, modifier = Modifier.size(8.dp)) {}
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(start = 6.dp),
        )
    }
}

@Composable
private fun ZonesSheetList(
    pendingReports: List<PendingReport>,
    onDismissPending: (String) -> Unit,
    zones: List<DangerZone>,
    selectedZoneId: String?,
    openSwipeZoneId: String?,
    onOpenSwipeChange: (String?) -> Unit,
    onZoneClick: (DangerZone) -> Unit,
    onOpenComments: (DangerZone) -> Unit,
    onRequestFlag: (DangerZone) -> Unit,
    formatTime: (DangerZone) -> String,
) {
    Column(Modifier.fillMaxWidth()) {

        Text(
            text = stringResource(R.string.danger_zones_title),
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Black),
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(12.dp),
        )

        LazyColumn(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .heightIn(max = 520.dp),
        ) {
            items(pendingReports, key = { it.id }) { report ->
                PendingReportCard(
                    report = report,
                    onDismiss = { onDismissPending(report.id) },
                )
            }
            items(
                count = zones.size,
                key = { zones[it].id },
            ) { index ->
                val zone = zones[index]
                val bar = zoneSeverityBarColor(zone.rezon)
                Column(Modifier.fillMaxWidth()) {
                    ZoneSwipeRow(
                        zone = zone,
                        barColor = bar,
                        selectedZoneId = selectedZoneId,
                        openSwipeZoneId = openSwipeZoneId,
                        onOpenSwipeChange = onOpenSwipeChange,
                        onContentClick = { onZoneClick(zone) },
                        onSwipeComment = { onOpenComments(zone) },
                        onSwipeFlag = { onRequestFlag(zone) },
                        formatTime = formatTime,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    if (index < zones.lastIndex) {
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    }
                }
            }
            if (zones.isEmpty() && pendingReports.isEmpty()) {
                item {
                    Text(
                        stringResource(R.string.danger_zones_no_nearby),
                        modifier = Modifier.padding(24.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

private fun sampleZone(
    id: String,
    name: String,
    rezon: String,
    minutesAgo: Long,
    incidentType: String? = "shooting",
): DangerZone =
    DangerZone(
        id = id,
        name = name,
        latitude = 18.5944,
        longitude = -72.3074,
        rezon = rezon,
        date = System.currentTimeMillis() - minutesAgo * 60_000L,
        incidentType = incidentType,
        tag = null,
    )

private val sampleZones: List<DangerZone> =
    listOf(
        sampleZone("z1", "Delmas 32", "high", minutesAgo = 12),
        sampleZone("z2", "Pétion-Ville", "medium", minutesAgo = 95),
        sampleZone("z3", "Carrefour", "low", minutesAgo = 60 * 26, incidentType = "kidnapping"),
    )

private val samplePending: List<PendingReport> =
    listOf(
        PendingReport(
            id = "p1",
            rezon = "high",
            name = "Champ de Mars",
            status = PendingReportStatus.Sending,
            createdAt = System.currentTimeMillis() - 5_000L,
        ),
    )

@Preview(name = "Sheet — populated", showBackground = true, widthDp = 380, heightDp = 700)
@Composable
private fun ZonesSheetListPreview() {
    VEYeTheme {
        Surface(color = MaterialTheme.colorScheme.surface) {
            ZonesSheetList(
                pendingReports = samplePending,
                onDismissPending = {},
                zones = sampleZones,
                selectedZoneId = "z1",
                openSwipeZoneId = null,
                onOpenSwipeChange = {},
                onZoneClick = {},
                onOpenComments = {},
                onRequestFlag = {},
                formatTime = { z ->
                    when (z.id) {
                        "z1" -> "12 min"
                        "z2" -> "1 h 35 min"
                        else -> "1 d"
                    }
                },
            )
        }
    }
}

@Preview(name = "Sheet — empty", showBackground = true, widthDp = 380, heightDp = 360)
@Composable
private fun ZonesSheetListEmptyPreview() {
    VEYeTheme {
        Surface(color = MaterialTheme.colorScheme.surface) {
            ZonesSheetList(
                pendingReports = emptyList(),
                onDismissPending = {},
                zones = emptyList(),
                selectedZoneId = null,
                openSwipeZoneId = null,
                onOpenSwipeChange = {},
                onZoneClick = {},
                onOpenComments = {},
                onRequestFlag = {},
                formatTime = { "" },
            )
        }
    }
}

@Preview(name = "Map legend", showBackground = true, widthDp = 220, heightDp = 110)
@Composable
private fun LegendDotPreview() {
    VEYeTheme {
        Surface(tonalElevation = 2.dp, shape = RoundedCornerShape(10.dp)) {
            Column(Modifier.padding(10.dp)) {
                LegendDot(Color(0xFFC41E3A), "High risk")
                LegendDot(Color(0xFFE85D04), "Medium risk")
                LegendDot(Color(0xFFEAB308), "Low risk")
            }
        }
    }
}
