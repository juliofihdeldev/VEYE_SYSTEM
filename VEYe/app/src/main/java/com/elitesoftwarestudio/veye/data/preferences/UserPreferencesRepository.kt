package com.elitesoftwarestudio.veye.data.preferences

import android.content.Context
import androidx.datastore.preferences.core.edit
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

data class MapSessionPrefs(
    val latitude: Double?,
    val longitude: Double?,
    val radiusKm: Double,
    val notificationRadiusKm: Double,
    val notificationsEnabled: Boolean,
)

/** Theme / locale / map session / notification prefs. */
@Singleton
class UserPreferencesRepository @Inject constructor(
    @param:ApplicationContext private val context: Context,
) {
    private val store get() = context.userPreferencesDataStore

    val themeMode: Flow<String> = store.data.map { prefs ->
        prefs[PrefKeys.THEME_MODE] ?: THEME_LIGHT
    }

    val localeTag: Flow<String> = store.data.map { prefs ->
        prefs[PrefKeys.LOCALE_TAG] ?: ""
    }

    /** True once the user has completed (or explicitly skipped) the first-launch flow. */
    val onboardingCompleted: Flow<Boolean> = store.data.map { prefs ->
        prefs[PrefKeys.ONBOARDING_COMPLETED] ?: false
    }

    /** Last finished step index (0-based). Used to resume mid-flow on relaunch. */
    val onboardingLastStep: Flow<Int> = store.data.map { prefs ->
        prefs[PrefKeys.ONBOARDING_LAST_STEP] ?: 0
    }

    val mapSession: Flow<MapSessionPrefs> = store.data.map { prefs ->
        val hasLat = prefs.contains(PrefKeys.MAP_LATITUDE)
        val hasLon = prefs.contains(PrefKeys.MAP_LONGITUDE)
        MapSessionPrefs(
            latitude = if (hasLat) prefs[PrefKeys.MAP_LATITUDE] else null,
            longitude = if (hasLon) prefs[PrefKeys.MAP_LONGITUDE] else null,
            radiusKm = prefs[PrefKeys.RADIUS_KM] ?: DEFAULT_RADIUS_KM,
            notificationRadiusKm = prefs[PrefKeys.NOTIFICATION_RADIUS_KM]
                ?: DEFAULT_NOTIFICATION_RADIUS_KM,
            notificationsEnabled = prefs[PrefKeys.NOTIFICATIONS_ENABLED] ?: true,
        )
    }

    suspend fun setThemeMode(mode: String) {
        store.edit { it[PrefKeys.THEME_MODE] = mode }
    }

    suspend fun setLocaleTag(tag: String) {
        store.edit { it[PrefKeys.LOCALE_TAG] = tag }
    }

    suspend fun setMapLocation(latitude: Double, longitude: Double) {
        store.edit {
            it[PrefKeys.MAP_LATITUDE] = latitude
            it[PrefKeys.MAP_LONGITUDE] = longitude
        }
    }

    suspend fun setRadiusKm(km: Double) {
        store.edit { it[PrefKeys.RADIUS_KM] = km }
    }

    suspend fun setNotificationRadiusKm(km: Double) {
        store.edit { it[PrefKeys.NOTIFICATION_RADIUS_KM] = km }
    }

    suspend fun setNotificationsEnabled(enabled: Boolean) {
        store.edit { it[PrefKeys.NOTIFICATIONS_ENABLED] = enabled }
    }

    suspend fun setOnboardingCompleted(completed: Boolean) {
        store.edit { it[PrefKeys.ONBOARDING_COMPLETED] = completed }
    }

    suspend fun setOnboardingLastStep(index: Int) {
        store.edit { it[PrefKeys.ONBOARDING_LAST_STEP] = index }
    }

    /** Used on cold start before first Activity. */
    suspend fun readLocaleTagForStartup(): String =
        store.data.map { it[PrefKeys.LOCALE_TAG] ?: "" }.first()

    /**
     * Cold-start gate. Reads the onboarding flag synchronously so the activity can route
     * straight to the onboarding flow without flashing the home shell.
     */
    suspend fun readOnboardingCompletedForStartup(): Boolean =
        store.data.map { it[PrefKeys.ONBOARDING_COMPLETED] ?: false }.first()

    companion object {
        const val THEME_SYSTEM = "system"
        const val THEME_LIGHT = "light"
        const val THEME_DARK = "dark"
        const val DEFAULT_RADIUS_KM = 300.0
        const val DEFAULT_NOTIFICATION_RADIUS_KM = 25.0

        val DEFAULT_MAP_SESSION = MapSessionPrefs(
            latitude = null,
            longitude = null,
            radiusKm = DEFAULT_RADIUS_KM,
            notificationRadiusKm = DEFAULT_NOTIFICATION_RADIUS_KM,
            notificationsEnabled = true,
        )
    }
}
