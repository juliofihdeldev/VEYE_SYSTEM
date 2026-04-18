package com.elitesoftwarestudio.veye

import android.app.Application
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

        val localeTag = runBlocking { userPreferencesRepository.readLocaleTagForStartup() }
        val locales = if (localeTag.isNotBlank()) {
            LocaleListCompat.forLanguageTags(localeTag)
        } else {
            LocaleListCompat.getEmptyLocaleList()
        }
        AppCompatDelegate.setApplicationLocales(locales)

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
