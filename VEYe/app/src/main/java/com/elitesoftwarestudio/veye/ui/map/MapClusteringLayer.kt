package com.elitesoftwarestudio.veye.ui.map

import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import com.google.android.gms.maps.GoogleMap
import com.google.maps.android.clustering.ClusterManager
import com.google.maps.android.compose.GoogleMapComposable
import com.google.maps.android.compose.MapEffect
import com.google.maps.android.compose.MapsComposeExperimentalApi
import com.google.maps.android.compose.clustering.Clustering

@OptIn(MapsComposeExperimentalApi::class)
@Composable
@GoogleMapComposable
internal fun MapClusteringLayer(
    items: List<VEYeClusterItem>,
    onClusterItemClick: (VEYeClusterItem) -> Unit,
) {
    val context = LocalContext.current
    val clusterManagerState = remember { mutableStateOf<ClusterManager<VEYeClusterItem>?>(null) }

    MapEffect(context) { map: GoogleMap ->
        val cm = ClusterManager<VEYeClusterItem>(context, map)
        cm.renderer = VEYeClusterRenderer(context, map, cm)
        cm.setOnClusterItemClickListener { item ->
            onClusterItemClick(item)
            true
        }
        clusterManagerState.value = cm
    }

    val cm = clusterManagerState.value ?: return
    Clustering(items = items, clusterManager = cm)
}
