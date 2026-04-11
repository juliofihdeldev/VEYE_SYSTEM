package com.elitesoftwarestudio.veye.ui.map

import com.elitesoftwarestudio.veye.data.map.DangerZone
import com.elitesoftwarestudio.veye.data.map.MAP_LIVE_WINDOW_MS
import android.graphics.Color as AndroidColor
import com.elitesoftwarestudio.veye.data.map.ViktimMapRow
import com.elitesoftwarestudio.veye.data.map.isWithinLastMs
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.clustering.ClusterItem

enum class MapPinKind { Zone, Victim }

/**
 * [ClusterItem] for Maps Utils clustering; [pulse] mirrors RN `pulse: isWithinLastMs(..., MAP_LIVE_WINDOW_MS)`.
 * [pinIcon] / [pinColorArgb] mirror RN `mapIcon` + `colorForDangerMapIcon` (victims use pistol + severityCritical).
 */
data class VEYeClusterItem(
    val rawId: String,
    val kind: MapPinKind,
    private val pos: LatLng,
    private val titleText: String?,
    private val snippetText: String?,
    val pinIcon: DangerMapPinIcon,
    val pinColorArgb: Int,
    val pulse: Boolean,
) : ClusterItem {
    override fun getPosition(): LatLng = pos
    override fun getTitle(): String? = titleText
    override fun getSnippet(): String? = snippetText
    override fun getZIndex(): Float? = if (pulse) 1.5f else 0f
}

fun buildClusterItems(zones: List<DangerZone>, victims: List<ViktimMapRow>): List<VEYeClusterItem> {
    val z = zones.mapNotNull { zone ->
        val lat = zone.latitude ?: return@mapNotNull null
        val lng = zone.longitude ?: return@mapNotNull null
        val icon = dangerPinIconForZone(zone)
        VEYeClusterItem(
            rawId = zone.id,
            kind = MapPinKind.Zone,
            pos = LatLng(lat, lng),
            titleText = zone.name,
            snippetText = zone.rezon,
            pinIcon = icon,
            pinColorArgb = pinFillColorArgb(icon),
            pulse = isWithinLastMs(zone.date, MAP_LIVE_WINDOW_MS),
        )
    }
    val v = victims.mapNotNull { row ->
        val lat = row.latitude ?: return@mapNotNull null
        val lng = row.longitude ?: return@mapNotNull null
        val icon = DangerMapPinIcon.Pistol
        val releasedArgb = AndroidColor.parseColor("#22C55E")
        VEYeClusterItem(
            rawId = row.id,
            kind = MapPinKind.Victim,
            pos = LatLng(lat, lng),
            titleText = row.fullName,
            snippetText = listOfNotNull(row.status, row.city, row.details).joinToString(" · ").ifBlank { null },
            pinIcon = icon,
            pinColorArgb =
                if (row.status == "Libérer") releasedArgb else pinFillColorArgb(icon),
            pulse = isWithinLastMs(row.date, MAP_LIVE_WINDOW_MS),
        )
    }
    return z + v
}
