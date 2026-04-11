package com.elitesoftwarestudio.veye.data.map

import com.elitesoftwarestudio.veye.data.geo.distanceKm
import com.google.android.gms.maps.model.LatLng

/** RN `NEAR_DANGER_RADIUS_KM` from `dangerProximity.ts`. */
const val NEAR_DANGER_RADIUS_KM: Double = 5.0

data class DangerBearingLine(
    val from: LatLng,
    val to: LatLng,
)

/**
 * Closest [DangerZone] with coordinates within [maxKm] of the user; RN `nearestDangerBearingWithinKm`.
 */
fun nearestDangerBearingWithinKm(
    userLat: Double,
    userLng: Double,
    zones: List<DangerZone>,
    maxKm: Double = NEAR_DANGER_RADIUS_KM,
): DangerBearingLine? {
    var bestDist = Double.POSITIVE_INFINITY
    var bestLat: Double? = null
    var bestLng: Double? = null
    for (z in zones) {
        val zLat = z.latitude ?: continue
        val zLng = z.longitude ?: continue
        val d = distanceKm(userLat, userLng, zLat, zLng)
        if (d <= maxKm && d < bestDist) {
            bestDist = d
            bestLat = zLat
            bestLng = zLng
        }
    }
    val lat = bestLat ?: return null
    val lng = bestLng ?: return null
    return DangerBearingLine(
        from = LatLng(userLat, userLng),
        to = LatLng(lat, lng),
    )
}
