package com.elitesoftwarestudio.veye.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore

internal val Context.userPreferencesDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "veye_user_prefs",
)

internal object PrefKeys {
    val THEME_MODE = stringPreferencesKey("theme_mode")
    val MAP_LATITUDE = doublePreferencesKey("map_latitude")
    val MAP_LONGITUDE = doublePreferencesKey("map_longitude")
    val RADIUS_KM = doublePreferencesKey("radius_km")
    val LOCALE_TAG = stringPreferencesKey("locale_tag")
    val NOTIFICATION_RADIUS_KM = doublePreferencesKey("notification_radius_km")
    val NOTIFICATIONS_ENABLED = booleanPreferencesKey("notifications_enabled")
    val ONBOARDING_COMPLETED = booleanPreferencesKey("onboarding_completed")
    val ONBOARDING_LAST_STEP = intPreferencesKey("onboarding_last_step")
}
