package com.elitesoftwarestudio.veye.ui.alerts

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitesoftwarestudio.veye.data.comments.CommentsRepository
import com.elitesoftwarestudio.veye.data.map.AlertCacheRepository
import com.elitesoftwarestudio.veye.data.map.ViktimAlert
import com.elitesoftwarestudio.veye.data.map.ViktimRepository
import com.elitesoftwarestudio.veye.data.preferences.MapSessionPrefs
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import com.elitesoftwarestudio.veye.data.report.ReportPrefillRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
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
    private val alertCacheRepository: AlertCacheRepository,
    userPreferencesRepository: UserPreferencesRepository,
    savedStateHandle: SavedStateHandle,
    val commentsRepository: CommentsRepository,
    private val reportPrefillRepository: ReportPrefillRepository,
) : ViewModel() {

    private val alertId: String = checkNotNull(savedStateHandle.get<String>("alertId"))

    /** Cached row served immediately so the detail screen never opens blank. */
    private val _alert = MutableStateFlow<ViktimAlert?>(alertCacheRepository.get(alertId))
    val alert: StateFlow<ViktimAlert?> = _alert.asStateFlow()

    private val _loadFinished = MutableStateFlow(false)
    val loadFinished: StateFlow<Boolean> = _loadFinished.asStateFlow()

    /** True while a (possibly background) refresh is in flight. */
    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    /**
     * Holds the message of the most recent fetch failure, or null if the last fetch
     * succeeded. Surfaces through the UI as a small banner / blocker depending on whether
     * we have any cached row to fall back to.
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
        fetch()
    }

    fun retry() {
        fetch()
    }

    private fun fetch() {
        fetchJob?.cancel()
        _refreshing.value = true
        _errorMessage.value = null
        fetchJob =
            viewModelScope.launch {
                try {
                    val fresh = viktimRepository.fetchViktimAlertById(alertId)
                    if (fresh != null) {
                        _alert.value = fresh
                        alertCacheRepository.primeFromAlert(fresh)
                    } else if (_alert.value == null) {
                        _errorMessage.value = ERROR_NOT_FOUND
                    }
                } catch (t: Throwable) {
                    Log.e(TAG, "fetchViktimAlertById($alertId) failed", t)
                    _errorMessage.value = t.message?.takeIf { it.isNotBlank() } ?: ERROR_GENERIC
                } finally {
                    _loadFinished.value = true
                    _refreshing.value = false
                }
            }
    }

    fun stageReportPrefill(alert: ViktimAlert) {
        reportPrefillRepository.stageFromAlert(alert)
    }

    private companion object {
        const val TAG = "AlertDetailNavVM"
        const val ERROR_NOT_FOUND = "not_found"
        const val ERROR_GENERIC = "generic"
    }
}
