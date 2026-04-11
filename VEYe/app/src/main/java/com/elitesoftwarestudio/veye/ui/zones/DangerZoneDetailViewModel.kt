package com.elitesoftwarestudio.veye.ui.zones

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitesoftwarestudio.veye.data.comments.CommentsRepository
import com.elitesoftwarestudio.veye.data.map.DangerZone
import com.elitesoftwarestudio.veye.data.map.ZoneDangerRepository
import com.elitesoftwarestudio.veye.data.preferences.MapSessionPrefs
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class DangerZoneDetailViewModel @Inject constructor(
    zoneDangerRepository: ZoneDangerRepository,
    userPreferencesRepository: UserPreferencesRepository,
    savedStateHandle: SavedStateHandle,
    val commentsRepository: CommentsRepository,
) : ViewModel() {

    private val zoneId: String = checkNotNull(savedStateHandle.get<String>("zoneId"))

    /** True after the first zone list emission (even if empty). */
    val hasReceivedZonesSnapshot: StateFlow<Boolean> =
        zoneDangerRepository.zones
            .map { true }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    val zone: StateFlow<DangerZone?> =
        zoneDangerRepository.zones
            .map { zones -> zones.find { it.id == zoneId } }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val mapSession: StateFlow<MapSessionPrefs> =
        userPreferencesRepository.mapSession
            .stateIn(
                viewModelScope,
                SharingStarted.WhileSubscribed(5_000),
                UserPreferencesRepository.DEFAULT_MAP_SESSION,
            )
}
