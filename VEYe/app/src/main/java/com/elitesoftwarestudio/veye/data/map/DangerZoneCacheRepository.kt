package com.elitesoftwarestudio.veye.data.map

import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

/**
 * In-memory cache used to bridge the gap between a screen that already has a hydrated
 * [DangerZone] in memory and the danger-zone detail destination, which would otherwise
 * have to wait for the realtime [ZoneDangerRepository.zones] flow to re-emit and find
 * the matching id.
 *
 * Source screens (map cluster, map sheet, zones list) call [prime] right before
 * navigating to the detail route. The detail VM then calls [get] to seed its UI
 * immediately, so the user always sees real data even when the realtime flow is slow,
 * the user is offline, or the zone has scrolled off the radius-filtered list. Eliminates
 * the "no additional details" dead-end on flaky network and on race conditions where
 * the click lands before the zone list has emitted.
 */
@Singleton
class DangerZoneCacheRepository @Inject constructor() {
    private val store = ConcurrentHashMap<String, DangerZone>()

    fun prime(zone: DangerZone) {
        store[zone.id] = zone
    }

    fun get(id: String): DangerZone? = store[id]
}
