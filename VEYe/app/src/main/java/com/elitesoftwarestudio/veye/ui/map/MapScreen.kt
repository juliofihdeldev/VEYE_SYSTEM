package com.elitesoftwarestudio.veye.ui.map

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.BottomSheetScaffold
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
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
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.ui.BottomSheetMaxHeightFraction
import com.elitesoftwarestudio.veye.data.map.DangerZone
import com.elitesoftwarestudio.veye.data.map.MapTimeRange
import com.elitesoftwarestudio.veye.data.map.ViktimMapRow
import com.elitesoftwarestudio.veye.data.map.filterItemsByMapTimeRange
import com.elitesoftwarestudio.veye.data.map.nearestDangerBearingWithinKm
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

/** Same sources as markers / RN `heatmapPoints`. */
private fun buildHeatmapLatLngs(zones: List<DangerZone>, victims: List<ViktimMapRow>): List<LatLng> {
    val z = zones.mapNotNull { zone ->
        val lat = zone.latitude ?: return@mapNotNull null
        val lng = zone.longitude ?: return@mapNotNull null
        LatLng(lat, lng)
    }
    val v = victims.mapNotNull { row ->
        val lat = row.latitude ?: return@mapNotNull null
        val lng = row.longitude ?: return@mapNotNull null
        LatLng(lat, lng)
    }
    return z + v
}

@OptIn(ExperimentalMaterial3Api::class, MapsComposeExperimentalApi::class)
@Composable
fun MapScreen(
    modifier: Modifier = Modifier,
    viewModel: MapViewModel = hiltViewModel(),
    onNavigateToZones: () -> Unit = {},
    onNavigateToZoneDetail: (DangerZone) -> Unit = {},
    onNavigateToAlertDetail: (String) -> Unit = {},
) {
    val context = LocalContext.current
    var timeRange by remember { mutableStateOf(MapTimeRange.All) }
    var showHeatmap by rememberSaveable { mutableStateOf(true) }
    var mapSatellite by rememberSaveable { mutableStateOf(false) }
    var map3d by rememberSaveable { mutableStateOf(false) }
    val dangerZonesForMap by viewModel.dangerZonesForMap.collectAsStateWithLifecycle()
    val dangerZonesNearby by viewModel.dangerZonesNearby.collectAsStateWithLifecycle()
    val viktims by viewModel.viktims.collectAsStateWithLifecycle()
    val session by viewModel.mapSession.collectAsStateWithLifecycle()
    val viktimLoading by viewModel.viktimLoading.collectAsStateWithLifecycle()

    var hasFineLocation by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
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

    /** RN `mapVariantToMapType`: satellite → hybrid; else 3D uses pitched camera on normal map. */
    val mapType = if (mapSatellite) MapType.HYBRID else MapType.NORMAL

    LaunchedEffect(map3d, mapSatellite) {
        val p = cameraPositionState.position
        val tilt = when {
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
    val filteredViktims = remember(viktims, timeRange) {
        filterItemsByMapTimeRange(viktims, timeRange)
    }
    val clusterItems = remember(mapZonesForPins, filteredViktims) {
        buildClusterItems(mapZonesForPins, filteredViktims)
    }
    val heatmapPoints = remember(mapZonesForPins, filteredViktims) {
        buildHeatmapLatLngs(mapZonesForPins, filteredViktims)
    }

    val userLatLng = session.latitude?.let { lat ->
        session.longitude?.let { lon -> LatLng(lat, lon) }
    }
    val radiusMeters = session.radiusKm * 1000.0

    val dangerBearingLine = remember(userLatLng, nearbyZonesForSheet) {
        val u = userLatLng ?: return@remember null
        nearestDangerBearingWithinKm(u.latitude, u.longitude, nearbyZonesForSheet)
    }

    val sheetState = rememberStandardBottomSheetState(
        skipHiddenState = true,
    )
    val scaffoldState = rememberBottomSheetScaffoldState(bottomSheetState = sheetState)

    Box(modifier = modifier.fillMaxSize()) {
        BottomSheetScaffold(
            scaffoldState = scaffoldState,
            sheetPeekHeight = 200.dp,
            sheetDragHandle = { BottomSheetDefaults.DragHandle() },
            containerColor = Color.Transparent,
            modifier =
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .fillMaxHeight(BottomSheetMaxHeightFraction),
            sheetContent = {
                MapDashboardSheetContent(
                    filteredZones = nearbyZonesForSheet,
                    filteredViktims = filteredViktims,
                    session = session,
                    viktimLoading = viktimLoading,
                    onNavigateToZones = onNavigateToZones,
                    onViktimClick = { onNavigateToAlertDetail(it.id) },
                )
            },
            content = { paddingValues ->
                // Map must live in this slot: a full-screen layer above the map was consuming all
                // pointer input, so pan/zoom never reached GoogleMap.
                Box(Modifier.fillMaxSize()) {
                    GoogleMap(
                        modifier = Modifier.fillMaxSize(),
                        cameraPositionState = cameraPositionState,
                        properties = MapProperties(
                            isMyLocationEnabled = hasFineLocation,
                            mapType = mapType,
                            isBuildingEnabled = true,
                        ),
                        uiSettings = MapUiSettings(zoomControlsEnabled = false, compassEnabled = true),
                    ) {
                        MapHeatmapOverlay(enabled = showHeatmap, points = heatmapPoints)
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
                                when (item.kind) {
                                    MapPinKind.Victim -> {
                                        val row = filteredViktims.find { it.id == item.rawId }
                                        if (row != null) onNavigateToAlertDetail(row.id)
                                    }
                                    MapPinKind.Zone -> {
                                        val z = mapZonesForPins.find { it.id == item.rawId }
                                        if (z != null) onNavigateToZoneDetail(z)
                                    }
                                }
                            },
                        )
                    }
                    Column(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .fillMaxWidth()
                            .windowInsetsPadding(WindowInsets.statusBars)
                            .padding(start = 16.dp, end = 16.dp, top = 8.dp),
                    ) {
                        MapTimeSegmentControl(
                            selected = timeRange,
                            onSelect = { timeRange = it },
                        )
                        Spacer(Modifier.height(10.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top,
                        ) {
                            MapLegendCard()
                            MapRightControlColumn(
                                showHeatmap = showHeatmap,
                                onHeatmapClick = { showHeatmap = !showHeatmap },
                                map3d = map3d,
                                on3dClick = { map3d = !map3d },
                                mapSatellite = mapSatellite,
                                onSatelliteClick = { mapSatellite = !mapSatellite },
                                onRefreshClick = { viewModel.refreshViktims() },
                            )
                        }
                    }
                    Surface(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(end = 16.dp, bottom = 88.dp + paddingValues.calculateBottomPadding()),
                        shape = CircleShape,
                        tonalElevation = 3.dp,
                        shadowElevation = 3.dp,
                    ) {
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
                        ) {
                            Icon(
                                Icons.Outlined.MyLocation,
                                contentDescription = stringResource(R.string.map_my_location),
                            )
                        }
                    }
                }
            },
        )
    }
}
