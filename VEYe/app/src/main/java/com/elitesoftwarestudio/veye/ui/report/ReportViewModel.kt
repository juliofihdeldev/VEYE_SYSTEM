package com.elitesoftwarestudio.veye.ui.report

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitesoftwarestudio.veye.data.pending.PendingReportRepository
import com.elitesoftwarestudio.veye.data.pending.PendingReportStatus
import com.elitesoftwarestudio.veye.data.preferences.MapSessionPrefs
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import com.elitesoftwarestudio.veye.data.report.GlobalAlertRepository
import com.elitesoftwarestudio.veye.data.report.ReportPrefillRepository
import com.elitesoftwarestudio.veye.data.report.SubmitGlobalAlertResult
import com.elitesoftwarestudio.veye.data.user.UserModerationRepository
import com.elitesoftwarestudio.veye.data.user.UserModerationState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface ReportUiEffect {
    data object ThankYou : ReportUiEffect

    data class ServerBlocked(
        val unblockedAtMs: Long?,
    ) : ReportUiEffect
}

@HiltViewModel
class ReportViewModel @Inject constructor(
    private val userPreferencesRepository: UserPreferencesRepository,
    private val userModerationRepository: UserModerationRepository,
    private val globalAlertRepository: GlobalAlertRepository,
    private val pendingReportRepository: PendingReportRepository,
    private val reportPrefillRepository: ReportPrefillRepository,
) : ViewModel() {

    val mapSession: StateFlow<MapSessionPrefs> = userPreferencesRepository.mapSession
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5_000),
            UserPreferencesRepository.DEFAULT_MAP_SESSION,
        )

    val moderation: StateFlow<UserModerationState> = userModerationRepository.moderation
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5_000),
            UserModerationState(isBlocked = false, unblockedAtMs = null),
        )

    private val _effects = MutableSharedFlow<ReportUiEffect>(extraBufferCapacity = 4)
    val effects = _effects.asSharedFlow()

    /** Call when Report tab is shown; returns text only if description should be prefilled (RN `relatedAlert`). */
    fun consumeStagedPrefillText(): String? {
        val a = reportPrefillRepository.consumeStagedAlert() ?: return null
        val text = "Info about ${a.fullName.orEmpty()}: ${a.details.orEmpty()}".trim()
        return text.takeIf { it.isNotBlank() }
    }

    fun submitReport(
        typeKey: String,
        description: String,
        victimName: String,
        contactPhone: String,
        anonymous: Boolean,
        photoUris: List<Uri>,
        displayAddress: String,
        fullAddressJson: String,
    ) {
        val trimmed = description.trim()
        val rezon = "[$typeKey] $trimmed"
        val name = victimName.ifBlank { displayAddress.ifBlank { "Unknown location" } }
        val pendingId = pendingReportRepository.addPendingReport(rezon, name)
        viewModelScope.launch {
            _effects.emit(ReportUiEffect.ThankYou)
        }
        viewModelScope.launch {
            val session = mapSession.value
            when (
                val result =
                    globalAlertRepository.submitUserReport(
                        selectedTypeKey = typeKey,
                        description = trimmed,
                        victimName = victimName,
                        contactPhone = contactPhone,
                        anonymous = anonymous,
                        photoUris = photoUris,
                        latitude = session.latitude,
                        longitude = session.longitude,
                        displayAddress = displayAddress,
                        fullAddressJson = fullAddressJson,
                    )
            ) {
                SubmitGlobalAlertResult.Success ->
                    pendingReportRepository.updateReportStatus(pendingId, PendingReportStatus.Success)
                is SubmitGlobalAlertResult.UserBlocked -> {
                    pendingReportRepository.updateReportStatus(pendingId, PendingReportStatus.Error)
                    _effects.emit(ReportUiEffect.ServerBlocked(result.unblockedAtMs))
                }
                SubmitGlobalAlertResult.NetworkError ->
                    pendingReportRepository.updateReportStatus(pendingId, PendingReportStatus.Error)
            }
        }
    }
}
