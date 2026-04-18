package com.elitesoftwarestudio.veye

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.ui.util.localeKey
import com.elitesoftwarestudio.veye.data.preferences.UserPreferencesRepository
import com.elitesoftwarestudio.veye.ui.main.MainViewModel
import com.elitesoftwarestudio.veye.ui.main.ThemeViewModel
import com.elitesoftwarestudio.veye.ui.theme.VEYeTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val themeViewModel: ThemeViewModel by viewModels()
    private val mainViewModel: MainViewModel by viewModels()

    /**
     * First-launch system prompt for `POST_NOTIFICATIONS` (Android 13+). The Profile
     * screen still re-requests if the user toggles notifications back on later.
     * We don't need the granted/denied result here — `VeyeFirebaseMessagingService`
     * registers + delivers regardless, and FCM token sync runs from `VEYeApplication`.
     */
    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        Log.d(TAG, "POST_NOTIFICATIONS granted=$granted")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        mainViewModel.handleIntent(intent)
        maybeRequestNotificationPermission()
        enableEdgeToEdge()
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isStatusBarContrastEnforced = false
            window.isNavigationBarContrastEnforced = false
        }
        setContent {
            val localeKey = LocalConfiguration.current.localeKey()
            key(localeKey) {
                val systemDark = isSystemInDarkTheme()
                val themeMode by themeViewModel.themeMode.collectAsStateWithLifecycle()
                val darkTheme = when (themeMode) {
                    UserPreferencesRepository.THEME_DARK -> true
                    UserPreferencesRepository.THEME_LIGHT -> false
                    else -> systemDark
                }
                val pendingTab by mainViewModel.pendingTabRoute.collectAsStateWithLifecycle()
                VEYeTheme(darkTheme = darkTheme) {
                    val view = LocalView.current
                    SideEffect {
                        val w = (view.context as? Activity)?.window ?: return@SideEffect
                        WindowCompat.getInsetsController(w, view).apply {
                            isAppearanceLightStatusBars = !darkTheme
                            isAppearanceLightNavigationBars = !darkTheme
                        }
                    }
                    VEYeRoot(
                        pendingTabRoute = pendingTab,
                        onConsumedPendingTab = { mainViewModel.consumePendingTab() },
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        mainViewModel.handleIntent(intent)
    }

    private fun maybeRequestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val alreadyGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
        if (alreadyGranted) return
        // Note: after the user explicitly denies twice the system silently no-ops this
        // call. The Profile screen surfaces a Settings deep-link in that case.
        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    private companion object {
        const val TAG = "MainActivity"
    }
}
