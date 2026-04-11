package com.elitesoftwarestudio.veye.ui.map

import androidx.compose.runtime.Composable
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.TileOverlayOptions
import com.google.maps.android.compose.MapEffect
import com.google.maps.android.compose.MapsComposeExperimentalApi
import com.google.maps.android.heatmaps.HeatmapTileProvider
import kotlinx.coroutines.awaitCancellation

/**
 * RN parity: same point sources as markers (`MapDashboard` `heatmapPoints`).
 * Uses Maps Utils [HeatmapTileProvider] via experimental [MapEffect].
 */
@OptIn(MapsComposeExperimentalApi::class)
@Composable
internal fun MapHeatmapOverlay(
    enabled: Boolean,
    points: List<LatLng>,
) {
    MapEffect(enabled, points) { map: GoogleMap ->
        if (!enabled || points.isEmpty()) return@MapEffect
        val provider = HeatmapTileProvider.Builder()
            .data(points)
            .radius(50)
            .opacity(0.72)
            .build()
        val overlay = map.addTileOverlay(TileOverlayOptions().tileProvider(provider))
        try {
            awaitCancellation()
        } finally {
            overlay?.remove()
        }
    }
}
