package com.elitesoftwarestudio.veye.ui.map

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitesoftwarestudio.veye.data.location.DeviceLocationRepository
import com.elitesoftwarestudio.veye.data.map.AlertCacheRepository
import com.elitesoftwarestudio.veye.data.map.DangerZone
import com.elitesoftwarestudio.veye.data.map.DangerZoneCacheRepository
import com.elitesoftwarestudio.veye.data.map.ViktimMapRow
import com.elitesoftwarestudio.veye.data.map.ViktimRepository
import com.elitesoftwarestudio.veye.data.map.ZoneDangerRepository
import com.elitesoftwarestudio.veye.data.map.filterDangerZonesByRadius
import com.elitesoftwarestudio.veye.data.preferences.MapSessionPrefs
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MapViewModel @Inject constructor(
    zoneDangerRepository: ZoneDangerRepository,
    private val viktimRepository: ViktimRepository,
    private val userPreferencesRepository: UserPreferencesRepository,
    private val deviceLocationRepository: DeviceLocationRepository,
    private val alertCacheRepository: AlertCacheRepository,
    private val dangerZoneCacheRepository: DangerZoneCacheRepository,
) : ViewModel() {

    /**
     * Stages the (partial) alert payload before navigating to the detail destination so
     * the detail screen never opens blank, even if Supabase is unreachable. The detail VM
     * still refreshes in the background and replaces the cached row when the network
     * request succeeds.
     */
    fun primeAlertCache(row: ViktimMapRow) {
        alertCacheRepository.primeFromMapRow(row)
    }

    /** Same role as [primeAlertCache] but for the danger-zone detail destination. */
    fun primeZoneCache(zone: DangerZone) {
        dangerZoneCacheRepository.prime(zone)
    }

    val mapSession: StateFlow<MapSessionPrefs> = userPreferencesRepository.mapSession
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5_000),
            UserPreferencesRepository.DEFAULT_MAP_SESSION,
        )

    /**
     * All zones from Supabase `zone_danger` (no radius). Used for map pins + heatmap so the map stays useful
     * when the device GPS is far from Haiti while the camera is still on Haiti (radius filter
     * would hide every marker — looks like a “blank” map).
     */
    val dangerZonesForMap: StateFlow<List<DangerZone>> = zoneDangerRepository.zones
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    /** Radius-filtered list for sheet copy / RN `filteredDangerZones` parity. */
    val dangerZonesNearby: StateFlow<List<DangerZone>> = combine(
        zoneDangerRepository.zones,
        mapSession,
    ) { zones, session ->
        filterDangerZonesByRadius(
            zones,
            session.latitude,
            session.longitude,
            session.radiusKm,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _viktims = MutableStateFlow<List<ViktimMapRow>>(emptyList())
    val viktims: StateFlow<List<ViktimMapRow>> = _viktims.asStateFlow()

    private val _viktimLoading = MutableStateFlow(false)
    val viktimLoading: StateFlow<Boolean> = _viktimLoading.asStateFlow()

    init {
        refreshViktims()
    }

    fun refreshUserLocation() {
        viewModelScope.launch { fetchAndPersistLocation() }
    }

    suspend fun fetchAndPersistLocation(): Pair<Double, Double>? {
        val coords = deviceLocationRepository.getCoordinatesOrNull() ?: return null
        userPreferencesRepository.setMapLocation(coords.first, coords.second)
        return coords
    }

    fun refreshViktims() {
        viewModelScope.launch {
            _viktimLoading.value = true
            try {
                _viktims.value = viktimRepository.fetchKidnapingForMap(100)
            } catch (_: Exception) {
                _viktims.value = emptyList()
            } finally {
                _viktimLoading.value = false
            }
        }
    }
}
