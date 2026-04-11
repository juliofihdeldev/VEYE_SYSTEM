package com.elitesoftwarestudio.veye.ui.map

import android.animation.ValueAnimator
import android.content.Context
import android.view.animation.AccelerateDecelerateInterpolator
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.google.maps.android.clustering.Cluster
import com.google.maps.android.clustering.ClusterManager
import com.google.maps.android.clustering.view.DefaultClusterRenderer

/**
 * RN MapPlaceholder parity:
 * - Pins: 28dp disc + glyph + `colorForDangerMapIcon` (not default marker hue).
 * - Clusters: red bubble + count (styles.clusterBubble / clusterCount).
 * - Pulse: scale 1 → 1.14 → 1, **850ms** each leg, default RN timing curve → [AccelerateDecelerateInterpolator].
 */
class VEYeClusterRenderer(
    private val context: Context,
    map: GoogleMap,
    clusterManager: ClusterManager<VEYeClusterItem>,
) : DefaultClusterRenderer<VEYeClusterItem>(context, map, clusterManager) {

    /** Keyed by stable id — not [Marker], which cluster updates can replace (stale marker → "Unmanaged descriptor"). */
    private val pulseAnimators = mutableMapOf<String, ValueAnimator>()

    init {
        minClusterSize = 2
    }

    override fun getDescriptorForCluster(cluster: Cluster<VEYeClusterItem>): BitmapDescriptor =
        VEYeMapMarkerBitmaps.clusterDescriptor(context, cluster.size)

    override fun onBeforeClusterRendered(cluster: Cluster<VEYeClusterItem>, markerOptions: MarkerOptions) {
        super.onBeforeClusterRendered(cluster, markerOptions)
        markerOptions.anchor(0.5f, 0.5f)
    }

    override fun onClusterUpdated(cluster: Cluster<VEYeClusterItem>, marker: Marker) {
        super.onClusterUpdated(cluster, marker)
        marker.setAnchor(0.5f, 0.5f)
    }

    override fun onBeforeClusterItemRendered(item: VEYeClusterItem, markerOptions: MarkerOptions) {
        super.onBeforeClusterItemRendered(item, markerOptions)
        markerOptions.icon(VEYeMapMarkerBitmaps.pinDescriptor(context, item.pinIcon, item.pinColorArgb, 1f))
        markerOptions.anchor(0.5f, 1f)
    }

    override fun onClusterItemRendered(item: VEYeClusterItem, marker: Marker) {
        stopPulse(item)
        super.onClusterItemRendered(item, marker)
        marker.setAnchor(0.5f, 1f)
        if (item.pulse) {
            startPulse(item)
        } else {
            marker.alpha = 1f
        }
    }

    override fun onClusterItemUpdated(item: VEYeClusterItem, marker: Marker) {
        stopPulse(item)
        marker.setIcon(VEYeMapMarkerBitmaps.pinDescriptor(context, item.pinIcon, item.pinColorArgb, 1f))
        marker.setAnchor(0.5f, 1f)
        super.onClusterItemUpdated(item, marker)
        if (item.pulse) {
            startPulse(item)
        } else {
            marker.alpha = 1f
        }
    }

    private fun pulseKey(item: VEYeClusterItem): String = "${item.kind.name}:${item.rawId}"

    private fun startPulse(item: VEYeClusterItem) {
        val key = pulseKey(item)
        pulseAnimators.remove(key)?.cancel()
        val anim =
            ValueAnimator.ofFloat(1f, PULSE_SCALE_MAX).apply {
                duration = PULSE_HALF_MS
                repeatCount = ValueAnimator.INFINITE
                repeatMode = ValueAnimator.REVERSE
                interpolator = AccelerateDecelerateInterpolator()
                addUpdateListener { va ->
                    val marker = getMarker(item)
                    if (marker == null) {
                        va.cancel()
                        pulseAnimators.remove(key)
                        return@addUpdateListener
                    }
                    val s = va.animatedValue as Float
                    try {
                        marker.setIcon(
                            VEYeMapMarkerBitmaps.pinDescriptor(context, item.pinIcon, item.pinColorArgb, s),
                        )
                    } catch (_: IllegalArgumentException) {
                        va.cancel()
                        pulseAnimators.remove(key)
                    }
                }
            }
        pulseAnimators[key] = anim
        anim.start()
    }

    private fun stopPulse(item: VEYeClusterItem) {
        pulseAnimators.remove(pulseKey(item))?.cancel()
    }

    private companion object {
        const val PULSE_HALF_MS = 850L
        const val PULSE_SCALE_MAX = 1.14f
    }
}
