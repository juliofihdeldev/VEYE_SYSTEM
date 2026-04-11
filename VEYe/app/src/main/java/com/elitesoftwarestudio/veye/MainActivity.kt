package com.elitesoftwarestudio.veye

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
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

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        mainViewModel.handleIntent(intent)
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
}
