package com.elitesoftwarestudio.veye.ui.onboarding

import android.app.Activity
import android.app.LocaleManager
import android.os.Build
import android.os.LocaleList
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitesoftwarestudio.veye.data.location.DeviceLocationRepository
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import com.elitesoftwarestudio.veye.data.user.UserDocumentRepository
import com.elitesoftwarestudio.veye.push.FcmDeviceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * Drives the three-step first-launch flow:
 *   0 = Welcome + language
 *   1 = Notifications + alert radius
 *   2 = Location + privacy
 *
 * The current step lives in a [StateFlow] (not Compose `remember`) so it survives the
 * activity recreation that fires when the user picks a language on step 0.
 *
 * Permission *outcomes* are mirrored into `notificationsGranted` / `locationGranted`
 * so the UI can light up CTAs without re-querying the system on every recomposition.
 * Both flags persist across config changes because they live in the ViewModel.
 */
@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val userPreferencesRepository: UserPreferencesRepository,
    private val userDocumentRepository: UserDocumentRepository,
    private val fcmDeviceRepository: FcmDeviceRepository,
    private val deviceLocationRepository: DeviceLocationRepository,
) : ViewModel() {

    private val _currentStep = MutableStateFlow(0)
    val currentStep: StateFlow<Int> = _currentStep.asStateFlow()

    val localeTag: StateFlow<String> = userPreferencesRepository.localeTag
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    val notificationRadiusKm: StateFlow<Double> = userPreferencesRepository.mapSession
        .map { it.notificationRadiusKm }
        .stateIn(
            viewModelScope,
            SharingStarted.Eagerly,
            UserPreferencesRepository.DEFAULT_NOTIFICATION_RADIUS_KM,
        )

    private val _notificationsGranted = MutableStateFlow(false)
    val notificationsGranted: StateFlow<Boolean> = _notificationsGranted.asStateFlow()

    private val _notificationsDecisionMade = MutableStateFlow(false)
    val notificationsDecisionMade: StateFlow<Boolean> = _notificationsDecisionMade.asStateFlow()

    private val _locationGranted = MutableStateFlow(deviceLocationRepository.hasFineLocationPermission())
    val locationGranted: StateFlow<Boolean> = _locationGranted.asStateFlow()

    private val _locationDecisionMade = MutableStateFlow(false)
    val locationDecisionMade: StateFlow<Boolean> = _locationDecisionMade.asStateFlow()

    init {
        viewModelScope.launch {
            // Resume mid-flow if the user backgrounded the app between steps. We never
            // jump *past* a step they didn't see, so worst case they re-confirm one screen.
            val resumeAt = userPreferencesRepository.onboardingLastStep.first()
                .coerceIn(0, TOTAL_STEPS - 1)
            _currentStep.value = resumeAt
        }
    }

    fun goToStep(index: Int) {
        val clamped = index.coerceIn(0, TOTAL_STEPS - 1)
        _currentStep.value = clamped
        viewModelScope.launch { userPreferencesRepository.setOnboardingLastStep(clamped) }
    }

    fun next() = goToStep(_currentStep.value + 1)

    fun back(): Boolean {
        if (_currentStep.value == 0) return false
        goToStep(_currentStep.value - 1)
        return true
    }

    /**
     * Persists the chosen locale and applies it app-wide. Empty [tag] follows the system
     * language. The platform fires a configuration change which recreates the activity;
     * because [_currentStep] lives in this ViewModel (and ViewModels survive recreation)
     * the user lands back on step 0 with the new language without losing flow state.
     */
    fun applyLanguage(tag: String, activity: Activity) {
        viewModelScope.launch {
            userPreferencesRepository.setLocaleTag(tag)
            withContext(Dispatchers.Main) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    val manager = activity.getSystemService(LocaleManager::class.java)
                    manager?.applicationLocales =
                        if (tag.isBlank()) LocaleList.getEmptyLocaleList()
                        else LocaleList.forLanguageTags(tag)
                } else {
                    val locales = if (tag.isBlank()) {
                        LocaleListCompat.getEmptyLocaleList()
                    } else {
                        LocaleListCompat.forLanguageTags(tag)
                    }
                    AppCompatDelegate.setApplicationLocales(locales)
                }
            }
        }
    }

    fun setNotificationRadiusKm(km: Double) {
        viewModelScope.launch {
            userPreferencesRepository.setNotificationRadiusKm(km)
            runCatching { userDocumentRepository.mergeNotificationRadiusKm(km) }
        }
    }

    /**
     * Called by the screen after [android.content.pm.PackageManager.PERMISSION_GRANTED] /
     * `_DENIED` comes back from the system prompt. We persist the toggle either way so the
     * user's stated intent is honored, then quietly attempt to (re)bind their FCM token
     * when granted so push starts working immediately on the very first run.
     */
    fun onNotificationsResult(granted: Boolean) {
        _notificationsGranted.value = granted
        _notificationsDecisionMade.value = true
        viewModelScope.launch {
            userPreferencesRepository.setNotificationsEnabled(granted)
            if (granted) {
                runCatching { fcmDeviceRepository.syncTokenToBackend() }
            }
        }
    }

    fun onLocationResult(granted: Boolean) {
        _locationGranted.value = granted
        _locationDecisionMade.value = true
        if (!granted) return
        viewModelScope.launch {
            // Best-effort warm-cache so step 2 can finish to the home shell with the map
            // pre-centered on the user instead of falling back to the default region.
            runCatching {
                deviceLocationRepository.getCoordinatesOrNull()?.let { (lat, lon) ->
                    userPreferencesRepository.setMapLocation(lat, lon)
                }
            }
        }
    }

    /** Marks onboarding done and lets the host swap to the main app. */
    fun complete(onComplete: () -> Unit) {
        viewModelScope.launch {
            userPreferencesRepository.setOnboardingCompleted(true)
            withContext(Dispatchers.Main.immediate) { onComplete() }
        }
    }

    companion object {
        const val TOTAL_STEPS = 3
    }
}
