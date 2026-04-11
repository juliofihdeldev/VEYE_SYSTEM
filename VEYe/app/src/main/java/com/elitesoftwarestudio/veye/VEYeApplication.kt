package com.elitesoftwarestudio.veye

import android.app.Application
import android.util.Log
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import com.elitesoftwarestudio.veye.data.auth.AuthRepository
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import com.elitesoftwarestudio.veye.push.OneSignalDeviceRepository
import com.elitesoftwarestudio.veye.push.OneSignalPushCoordinator
import com.google.firebase.auth.FirebaseAuth
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel
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
    lateinit var oneSignalPushCoordinator: OneSignalPushCoordinator

    @Inject
    lateinit var oneSignalDeviceRepository: OneSignalDeviceRepository

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

        if (BuildConfig.DEBUG) {
            OneSignal.Debug.logLevel = LogLevel.WARN
        }
        OneSignal.initWithContext(this, BuildConfig.ONESIGNAL_APP_ID)
        oneSignalPushCoordinator.attachListeners()

        applicationScope.launch {
            authRepository.ensureAnonymousSession().exceptionOrNull()?.let { e ->
                Log.e(TAG, "Could not start anonymous session", e)
            }
            val uid = firebaseAuth.currentUser?.uid
            if (uid != null) {
                OneSignal.login(uid)
                runCatching { oneSignalDeviceRepository.syncOnesignalIdToFirestore() }
                    .exceptionOrNull()?.let { e ->
                        Log.w(TAG, "OneSignal id → user merge (Postgres) skipped", e)
                    }
            }
        }

        applicationScope.launch(Dispatchers.Main) {
            runCatching { OneSignal.Notifications.requestPermission(false) }
        }
    }

    companion object {
        private const val TAG = "VEYeApplication"
    }
}
