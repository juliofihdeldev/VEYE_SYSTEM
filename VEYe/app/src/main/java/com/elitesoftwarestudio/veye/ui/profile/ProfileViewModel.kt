package com.elitesoftwarestudio.veye.ui.profile

import android.app.Activity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitesoftwarestudio.veye.data.auth.AuthRepository
import com.elitesoftwarestudio.veye.data.preferences.MapSessionPrefs
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import com.elitesoftwarestudio.veye.data.user.UserDocumentRepository
import com.elitesoftwarestudio.veye.push.FcmDeviceRepository
import com.google.firebase.auth.FirebaseAuth
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val userPreferencesRepository: UserPreferencesRepository,
    private val userDocumentRepository: UserDocumentRepository,
    private val authRepository: AuthRepository,
    private val fcmDeviceRepository: FcmDeviceRepository,
    private val firebaseAuth: FirebaseAuth,
) : ViewModel() {

    val mapSession: StateFlow<MapSessionPrefs> = userPreferencesRepository.mapSession
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5_000),
            UserPreferencesRepository.DEFAULT_MAP_SESSION,
        )

    val themeMode: StateFlow<String> = userPreferencesRepository.themeMode
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5_000),
            UserPreferencesRepository.THEME_LIGHT,
        )

    val localeTag: StateFlow<String> = userPreferencesRepository.localeTag
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), "")

    fun userDisplayLabel(fallback: String): String {
        val u = firebaseAuth.currentUser ?: return fallback
        return u.displayName?.takeIf { it.isNotBlank() }
            ?: u.email?.takeIf { it.isNotBlank() }
            ?: fallback
    }

    fun setDarkMode(enabled: Boolean) {
        viewModelScope.launch {
            userPreferencesRepository.setThemeMode(
                if (enabled) UserPreferencesRepository.THEME_DARK
                else UserPreferencesRepository.THEME_LIGHT,
            )
        }
    }

    fun setNotificationsEnabled(enabled: Boolean) {
        viewModelScope.launch {
            userPreferencesRepository.setNotificationsEnabled(enabled)
        }
    }

    /**
     * Persist the "notifications on" preference and (re)push the current FCM token to Postgres
     * so the user starts receiving radius-targeted alerts. The system POST_NOTIFICATIONS prompt
     * is handled by the calling Composable via `ActivityResultContracts.RequestPermission`.
     */
    fun enableNotificationsAndSyncToken() {
        viewModelScope.launch {
            userPreferencesRepository.setNotificationsEnabled(true)
            runCatching { fcmDeviceRepository.syncTokenToBackend() }
        }
    }

    /**
     * Persists locale, applies it app-wide, and recreates the activity on the next frame so the
     * entire UI (Compose + resources) reloads. Pass [tag] empty to follow the system language.
     */
    fun applyLanguage(tag: String, activity: Activity) {
        viewModelScope.launch {
            userPreferencesRepository.setLocaleTag(tag)
            withContext(Dispatchers.Main) {
                val locales = if (tag.isBlank()) {
                    LocaleListCompat.getEmptyLocaleList()
                } else {
                    LocaleListCompat.forLanguageTags(tag)
                }
                AppCompatDelegate.setApplicationLocales(locales)
                val decor = activity.window?.decorView
                val recreate = Runnable {
                    if (!activity.isFinishing && !activity.isDestroyed) {
                        activity.recreate()
                    }
                }
                if (decor != null) {
                    decor.post(recreate)
                } else {
                    recreate.run()
                }
            }
        }
    }

    fun setRadiusKm(km: Double) {
        viewModelScope.launch {
            userPreferencesRepository.setRadiusKm(km)
            runCatching { userDocumentRepository.mergeRadiusKm(km) }
        }
    }

    fun setNotificationRadiusKm(km: Double) {
        viewModelScope.launch {
            userPreferencesRepository.setNotificationRadiusKm(km)
            runCatching { userDocumentRepository.mergeNotificationRadiusKm(km) }
        }
    }

    fun logout(activity: Activity) {
        viewModelScope.launch {
            authRepository.signOutAndSignInAnonymously()
            // After re-signing in (anonymously, with a new uid), re-bind the device's FCM
            // token under that uid so notifications continue to land on this device.
            runCatching { fcmDeviceRepository.syncTokenToBackend() }
            withContext(Dispatchers.Main.immediate) {
                activity.recreate()
            }
        }
    }
}
