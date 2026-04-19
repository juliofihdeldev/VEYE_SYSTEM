package com.elitesoftwarestudio.veye.ui.zones

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitesoftwarestudio.veye.data.pending.PendingReport
import com.elitesoftwarestudio.veye.data.pending.PendingReportRepository
import com.elitesoftwarestudio.veye.data.location.DeviceLocationRepository
import com.elitesoftwarestudio.veye.data.map.DangerZone
import com.elitesoftwarestudio.veye.data.map.DangerZoneCacheRepository
import com.elitesoftwarestudio.veye.data.map.DemantiRepository
import com.elitesoftwarestudio.veye.data.map.ZoneDangerRepository
import com.elitesoftwarestudio.veye.data.map.filterDangerZonesByRadius
import com.elitesoftwarestudio.veye.data.preferences.MapSessionPrefs
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ZonesViewModel @Inject constructor(
    zoneDangerRepository: ZoneDangerRepository,
    private val userPreferencesRepository: UserPreferencesRepository,
    private val deviceLocationRepository: DeviceLocationRepository,
    private val demantiRepository: DemantiRepository,
    private val pendingReportRepository: PendingReportRepository,
    private val dangerZoneCacheRepository: DangerZoneCacheRepository,
) : ViewModel() {

    /**
     * Stages the zone payload before navigating to the detail destination so the detail
     * screen never opens blank, even on transient network failures or when the user
     * deep-links to a zone outside the current radius slice.
     */
    fun primeZoneCache(zone: DangerZone) {
        dangerZoneCacheRepository.prime(zone)
    }

    val pendingReports: StateFlow<List<PendingReport>> = pendingReportRepository.pendingReports

    val mapSession: StateFlow<MapSessionPrefs> =
        userPreferencesRepository.mapSession
            .stateIn(
                viewModelScope,
                SharingStarted.WhileSubscribed(5_000),
                UserPreferencesRepository.DEFAULT_MAP_SESSION,
            )

    val dangerZonesForMap: StateFlow<List<DangerZone>> = zoneDangerRepository.zones
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val dangerZonesNearby: StateFlow<List<DangerZone>> =
        combine(zoneDangerRepository.zones, mapSession) { zones, session ->
            filterDangerZonesByRadius(
                zones,
                session.latitude,
                session.longitude,
                session.radiusKm,
            )
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun refreshUserLocation() {
        viewModelScope.launch { fetchAndPersistLocation() }
    }

    suspend fun fetchAndPersistLocation(): Pair<Double, Double>? {
        val coords = deviceLocationRepository.getCoordinatesOrNull() ?: return null
        userPreferencesRepository.setMapLocation(coords.first, coords.second)
        return coords
    }

    fun flagZoneAsFalse(
        zone: DangerZone,
        onResult: (DemantiRepository.FlagResult) -> Unit,
    ) {
        viewModelScope.launch {
            onResult(demantiRepository.flagZoneAsFalse(zone))
        }
    }

    fun removePendingReport(id: String) {
        pendingReportRepository.removePendingReport(id)
    }
}
