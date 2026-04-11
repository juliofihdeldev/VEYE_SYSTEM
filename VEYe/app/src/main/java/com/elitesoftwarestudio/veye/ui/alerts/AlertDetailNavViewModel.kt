package com.elitesoftwarestudio.veye.ui.alerts

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitesoftwarestudio.veye.data.comments.CommentsRepository
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
class AlertDetailNavViewModel @Inject constructor(
    private val viktimRepository: ViktimRepository,
    userPreferencesRepository: UserPreferencesRepository,
    savedStateHandle: SavedStateHandle,
    val commentsRepository: CommentsRepository,
    private val reportPrefillRepository: ReportPrefillRepository,
) : ViewModel() {

    private val alertId: String = checkNotNull(savedStateHandle.get<String>("alertId"))

    private val _alert = MutableStateFlow<ViktimAlert?>(null)
    val alert: StateFlow<ViktimAlert?> = _alert.asStateFlow()

    private val _loadFinished = MutableStateFlow(false)
    val loadFinished: StateFlow<Boolean> = _loadFinished.asStateFlow()

    val mapSession: StateFlow<MapSessionPrefs> =
        userPreferencesRepository.mapSession
            .stateIn(
                viewModelScope,
                SharingStarted.WhileSubscribed(5_000),
                UserPreferencesRepository.DEFAULT_MAP_SESSION,
            )

    init {
        viewModelScope.launch {
            try {
                _alert.value = viktimRepository.fetchViktimAlertById(alertId)
            } catch (_: Exception) {
                _alert.value = null
            } finally {
                _loadFinished.value = true
            }
        }
    }

    fun stageReportPrefill(alert: ViktimAlert) {
        reportPrefillRepository.stageFromAlert(alert)
    }
}
