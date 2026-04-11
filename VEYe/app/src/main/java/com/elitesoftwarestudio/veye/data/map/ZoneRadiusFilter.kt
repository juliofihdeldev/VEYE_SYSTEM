package com.elitesoftwarestudio.veye.data.map

import com.elitesoftwarestudio.veye.data.geo.distanceKm

/** Parity with `AlertContext` `filteredDangerZones` when user has coords + radius. */
fun filterDangerZonesByRadius(
    zones: List<DangerZone>,
    userLat: Double?,
    userLon: Double?,
    radiusKm: Double,
): List<DangerZone> {
    if (userLat == null || userLon == null) return zones
    return zones.filter { z ->
        val zLat = z.latitude
        val zLng = z.longitude
        if (zLat == null || zLng == null) return@filter true
        distanceKm(userLat, userLon, zLat, zLng) <= radiusKm
    }
}
