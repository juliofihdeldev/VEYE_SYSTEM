package com.elitesoftwarestudio.veye.ui.zones

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitesoftwarestudio.veye.data.comments.CommentsRepository
import com.elitesoftwarestudio.veye.data.map.DangerZone
import com.elitesoftwarestudio.veye.data.map.DangerZoneCacheRepository
import com.elitesoftwarestudio.veye.data.map.ZoneDangerRepository
import com.elitesoftwarestudio.veye.data.preferences.MapSessionPrefs
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DangerZoneDetailViewModel @Inject constructor(
    private val zoneDangerRepository: ZoneDangerRepository,
    private val zoneCacheRepository: DangerZoneCacheRepository,
    userPreferencesRepository: UserPreferencesRepository,
    savedStateHandle: SavedStateHandle,
    val commentsRepository: CommentsRepository,
) : ViewModel() {

    private val zoneId: String = checkNotNull(savedStateHandle.get<String>("zoneId"))

    /** True after the first realtime zone list emission (even if empty). */
    private val hasReceivedZonesSnapshot: StateFlow<Boolean> =
        zoneDangerRepository.zones
            .map { true }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    /**
     * Holds whatever fresh row arrives later via the realtime [ZoneDangerRepository.zones]
     * stream OR via the explicit by-id fetch performed by [refresh]. Either source is fine
     * — the UI just wants "any non-stale [DangerZone] for this id".
     */
    private val freshZone: StateFlow<DangerZone?> =
        zoneDangerRepository.zones
            .map { zones -> zones.find { it.id == zoneId } }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    private val explicitFetchedZone = MutableStateFlow<DangerZone?>(null)

    /**
     * Effective zone shown by the screen. Order of precedence:
     *  1. Fresh row from the realtime stream (most up-to-date).
     *  2. Row returned by an explicit by-id fetch (used when the stream doesn't have it).
     *  3. Row pre-staged by the source screen via [DangerZoneCacheRepository.prime].
     *
     * This guarantees the detail screen never opens blank when the source screen had the
     * zone in hand.
     */
    val zone: StateFlow<DangerZone?> =
        combine(freshZone, explicitFetchedZone) { fresh, explicit ->
            fresh ?: explicit ?: zoneCacheRepository.get(zoneId)
        }.stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5_000),
            zoneCacheRepository.get(zoneId),
        )

    /** True until the first signal — realtime emission or explicit fetch — completes. */
    private val _loadFinished = MutableStateFlow(false)
    val loadFinished: StateFlow<Boolean> = _loadFinished.asStateFlow()

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    /**
     * `null` when the last fetch succeeded, `"not_found"` when the row is verifiably
     * missing, otherwise the raw exception message for QA / power users.
     */
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    val mapSession: StateFlow<MapSessionPrefs> =
        userPreferencesRepository.mapSession
            .stateIn(
                viewModelScope,
                SharingStarted.WhileSubscribed(5_000),
                UserPreferencesRepository.DEFAULT_MAP_SESSION,
            )

    private var fetchJob: Job? = null

    init {
        // Mark load finished as soon as either the realtime stream emits or the
        // explicit fetch completes, so the UI knows when to fall through to the
        // error state instead of spinning forever.
        viewModelScope.launch {
            hasReceivedZonesSnapshot.collect { ready ->
                if (ready) _loadFinished.value = true
            }
        }
        refresh()
    }

    fun retry() {
        refresh()
    }

    private fun refresh() {
        fetchJob?.cancel()
        _refreshing.value = true
        _errorMessage.value = null
        fetchJob =
            viewModelScope.launch {
                try {
                    val fresh = zoneDangerRepository.fetchZoneById(zoneId)
                    if (fresh != null) {
                        explicitFetchedZone.value = fresh
                        zoneCacheRepository.prime(fresh)
                    } else if (zone.value == null) {
                        _errorMessage.value = ERROR_NOT_FOUND
                    }
                } catch (t: Throwable) {
                    Log.e(TAG, "fetchZoneById($zoneId) failed", t)
                    _errorMessage.value = t.message?.takeIf { it.isNotBlank() } ?: ERROR_GENERIC
                } finally {
                    _loadFinished.value = true
                    _refreshing.value = false
                }
            }
    }

    private companion object {
        const val TAG = "DangerZoneDetailVM"
        const val ERROR_NOT_FOUND = "not_found"
        const val ERROR_GENERIC = "generic"
    }
}
