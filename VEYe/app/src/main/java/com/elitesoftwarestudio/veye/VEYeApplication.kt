package com.elitesoftwarestudio.veye

import android.app.Application
import android.app.LocaleManager
import android.os.Build
import android.os.LocaleList
import android.util.Log
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import com.elitesoftwarestudio.veye.data.auth.AuthRepository
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import com.elitesoftwarestudio.veye.push.FcmDeviceRepository
import com.google.firebase.auth.FirebaseAuth
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import javax.inject.Inject

@HiltAndroidApp
class VEYeApplication : Application() {

    @Inject
    lateinit var authRepository: AuthRepository

    @Inject
    lateinit var firebaseAuth: FirebaseAuth

    @Inject
    lateinit var userPreferencesRepository: UserPreferencesRepository

    @Inject
    lateinit var fcmDeviceRepository: FcmDeviceRepository

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()

        // Re-apply the user's chosen locale before the first activity is created. On API
        // 33+ the framework already remembers the per-app locale across launches, so this
        // is a defensive sync from our DataStore (the source of truth) into whichever
        // locale store the platform reads from. On older API levels AppCompat only honours
        // the call when `AppLocalesMetadataHolderService` is declared in the manifest.
        val localeTag = runBlocking { userPreferencesRepository.readLocaleTagForStartup() }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val manager = getSystemService(LocaleManager::class.java)
            val current = manager?.applicationLocales?.toLanguageTags().orEmpty()
            val desired =
                if (localeTag.isBlank()) LocaleList.getEmptyLocaleList()
                else LocaleList.forLanguageTags(localeTag)
            // Avoid touching the framework when nothing changed — setting the same value
            // would still tear the activity down on subsequent launches.
            if (current != desired.toLanguageTags()) {
                manager?.applicationLocales = desired
            }
        } else {
            val locales = if (localeTag.isNotBlank()) {
                LocaleListCompat.forLanguageTags(localeTag)
            } else {
                LocaleListCompat.getEmptyLocaleList()
            }
            AppCompatDelegate.setApplicationLocales(locales)
        }

        applicationScope.launch {
            authRepository.ensureAnonymousSession().exceptionOrNull()?.let { e ->
                Log.e(TAG, "Could not start anonymous session", e)
            }
            // Push the current FCM token under the (now resolved) Firebase uid.
            // Subsequent token rotations are handled by VeyeFirebaseMessagingService.onNewToken.
            runCatching { fcmDeviceRepository.syncTokenToBackend() }
                .exceptionOrNull()?.let { e ->
                    Log.w(TAG, "FCM token → process-user-merge skipped", e)
                }
        }
    }

    companion object {
        private const val TAG = "VEYeApplication"
    }
}
