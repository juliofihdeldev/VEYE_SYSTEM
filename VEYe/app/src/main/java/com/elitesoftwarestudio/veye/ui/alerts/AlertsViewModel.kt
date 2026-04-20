package com.elitesoftwarestudio.veye.ui.alerts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitesoftwarestudio.veye.data.comments.CommentsRepository
import com.elitesoftwarestudio.veye.data.location.DeviceLocationRepository
import com.elitesoftwarestudio.veye.data.map.AlertsListFilter
import com.elitesoftwarestudio.veye.data.map.ViktimAlert
import com.elitesoftwarestudio.veye.data.map.ViktimRepository
import com.elitesoftwarestudio.veye.data.preferences.MapSessionPrefs
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import com.elitesoftwarestudio.veye.data.report.ReportPrefillRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AlertsViewModel @Inject constructor(
    private val viktimRepository: ViktimRepository,
    private val userPreferencesRepository: UserPreferencesRepository,
    private val deviceLocationRepository: DeviceLocationRepository,
    val commentsRepository: CommentsRepository,
    private val reportPrefillRepository: ReportPrefillRepository,
) : ViewModel() {

    fun stageReportPrefill(alert: ViktimAlert) {
        reportPrefillRepository.stageFromAlert(alert)
    }

    val mapSession: StateFlow<MapSessionPrefs> = userPreferencesRepository.mapSession
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5_000),
            UserPreferencesRepository.DEFAULT_MAP_SESSION,
        )

    private val _filter = MutableStateFlow(AlertsListFilter.All)
    val filter: StateFlow<AlertsListFilter> = _filter.asStateFlow()

    private val _alerts = MutableStateFlow<List<ViktimAlert>>(emptyList())
    val alerts: StateFlow<List<ViktimAlert>> = _alerts.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    init {
        refresh()
    }

    fun setFilter(filter: AlertsListFilter) {
        if (_filter.value == filter) return
        _filter.value = filter
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _loading.value = true
            try {
                _alerts.value = viktimRepository.fetchAlertsForList(_filter.value)
            } catch (_: Exception) {
                _alerts.value = emptyList()
            } finally {
                _loading.value = false
            }
        }
    }

    fun refreshUserLocation() {
        viewModelScope.launch {
            val coords = deviceLocationRepository.getCoordinatesOrNull() ?: return@launch
            userPreferencesRepository.setMapLocation(coords.first, coords.second)
        }
    }
}
